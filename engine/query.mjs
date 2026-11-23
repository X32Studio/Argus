/**
 * Dual-Entry Context Engine for Argus 2.0 (`search` + `gather`).
 *
 * Implements two entry points over one persistent Argus topic store:
 *   - mode: "search" — Precision lookup for a rare needle / exact record / specific claim
 *   - mode: "gather" — Task-scoped context assembly for downstream agents (e.g. self-loop)
 *
 * Pipeline:
 *   Stage 1: Deterministic coarse index scan over records/works_json/* & decisions/decision_board.json
 *   Stage 2: JEV Layer-1 routing (`routeCandidates`, live System One or offline baseline)
 *   Stage 3: Provenance-stamped bundle (exact relative path + SHA-256 + conflict warnings)
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { routeCandidates, DEFAULT_ROUTE_DROP_BELOW, DEFAULT_PASS_FLOOR } from "./jev.mjs";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function loadTopicDocuments(topicDir) {
  const docs = [];
  const worksDir = path.join(topicDir, "records", "works_json");
  if (fs.existsSync(worksDir)) {
    const files = fs.readdirSync(worksDir).filter((f) => f.endsWith(".json")).sort();
    for (const file of files) {
      const fullPath = path.join(worksDir, file);
      const raw = fs.readFileSync(fullPath);
      try {
        const rec = JSON.parse(raw.toString("utf8"));
        const slug = rec.slug ?? file.replace(/\.json$/, "");
        const summaryParts = [
          rec.title,
          rec.one_liner,
          rec.core_contribution,
          rec.summary,
          Array.isArray(rec.key_claims) ? rec.key_claims.map((c) => c.text ?? c).join(" ") : "",
          Array.isArray(rec.limitations) ? rec.limitations.join(" ") : "",
        ].filter(Boolean);
        docs.push({
          id: `work:${slug}`,
          kind: "work",
          title: rec.title ?? slug,
          url: rec.url ?? null,
          depth: rec.analysis_depth ?? "shallow",
          route: rec.primary_route ?? null,
          tags: Array.isArray(rec.tags) ? rec.tags : [],
          text: summaryParts.join(" — "),
          source_path: path.relative(topicDir, fullPath),
          sha256: sha256(raw),
        });
      } catch {
        // Skip malformed record without blocking the rest of the topic
      }
    }
  }

  const decisionPath = path.join(topicDir, "decisions", "decision_board.json");
  if (fs.existsSync(decisionPath)) {
    const raw = fs.readFileSync(decisionPath);
    try {
      const board = JSON.parse(raw.toString("utf8"));
      for (const claim of board.claims ?? []) {
        docs.push({
          id: `claim:${claim.id}`,
          kind: "claim",
          title: `[${claim.verdict ?? "unknown"}] ${claim.text}`,
          verdict: claim.verdict ?? "unknown",
          conflict: Boolean(claim.conflict || claim.verdict === "contested"),
          tags: [...(claim.option_ids ?? []), claim.verdict ?? "unknown"],
          text: `${claim.text} ${claim.reason ?? ""}`.trim(),
          source_path: path.relative(topicDir, decisionPath),
          sha256: sha256(raw),
        });
      }
      for (const opt of board.options ?? []) {
        docs.push({
          id: `option:${opt.id}`,
          kind: "decision_option",
          title: `${opt.name} (${Math.round((opt.probability ?? 0) * 100)}% · ${opt.status ?? "viable"})`,
          tags: [opt.id, opt.status ?? "viable"],
          text: [opt.summary, ...(opt.pros ?? []), ...(opt.cons ?? []), ...(opt.flip_triggers ?? [])]
            .filter(Boolean)
            .join(" — "),
          source_path: path.relative(topicDir, decisionPath),
          sha256: sha256(raw),
        });
      }
    } catch {
      // Ignore malformed decision board
    }
  }

  return docs;
}

export async function queryTopic({
  topicDir,
  task,
  mode = "gather",
  limit = mode === "search" ? 5 : 10,
  routeDropBelow = DEFAULT_ROUTE_DROP_BELOW,
  passFloor = DEFAULT_PASS_FLOOR,
  client = null,
}) {
  if (!topicDir || !fs.existsSync(topicDir)) {
    throw new Error(`topic directory not found: ${topicDir}`);
  }
  if (!task || !String(task).trim()) {
    throw new Error("query task/question is required");
  }
  const normalizedMode = mode === "search" ? "search" : "gather";
  const allDocs = loadTopicDocuments(topicDir);

  const routed = await routeCandidates({
    query: task,
    candidates: allDocs,
    routeDropBelow: normalizedMode === "search" ? Math.max(routeDropBelow, 0.30) : routeDropBelow,
    passFloor,
    client,
  });

  const selected = routed.kept.slice(0, limit);
  const conflicts = allDocs
    .filter((d) => d.kind === "claim" && d.conflict)
    .map((d) => ({ id: d.id, title: d.title, source_path: d.source_path }));

  return {
    schema: "argus-context-bundle/v1",
    mode: normalizedMode,
    engine: routed.mode,
    topic_dir: path.resolve(topicDir),
    task,
    total_indexed: allDocs.length,
    returned: selected.length,
    telemetry: routed.telemetry,
    conflicts,
    items: selected.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      jev_score: item.jev_score,
      jev_band: item.jev_band,
      source_path: item.source_path,
      sha256: item.sha256,
      url: item.url ?? null,
      excerpt: item.text.slice(0, 320),
    })),
  };
}

export function formatBundleMarkdown(bundle) {
  const lines = [
    `# Argus Context Bundle (${bundle.mode.toUpperCase()} · ${bundle.engine})`,
    "",
    `- **Task:** ${bundle.task}`,
    `- **Indexed:** ${bundle.total_indexed} · **Returned:** ${bundle.returned} · **Dropped:** ${bundle.telemetry.dropped} · **Ambiguous Preserved:** ${bundle.telemetry.ambiguous_preserved}`,
    "",
  ];
  if (bundle.conflicts.length > 0) {
    lines.push("## Active Conflicts (Do Not Smooth Over)");
    for (const c of bundle.conflicts) {
      lines.push(`- \`${c.id}\`: ${c.title} (\`${c.source_path}\`)`);
    }
    lines.push("");
  }
  lines.push("## Selected Evidence");
  for (const item of bundle.items) {
    lines.push(
      `- **[${item.jev_band.toUpperCase()} ${item.jev_score}] ${item.title}** (\`${item.source_path}\` · \`sha256:${item.sha256.slice(0, 12)}\`)`,
    );
    lines.push(`  ${item.excerpt}`);
  }
  return lines.join("\n") + "\n";
}
