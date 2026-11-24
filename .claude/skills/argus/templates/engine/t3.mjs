/**
 * Argus for T3 — Crash-Resilient, Incremental T3 Native Runtime.
 *
 * Solves the failure modes of Claude-only JS Workflows / all-or-nothing parallel fan-out:
 *   1. Durable on-disk candidate queue (`logs/t3_queue.json`) so work survives restarts & cron ticks.
 *   2. Deterministic incremental collation (`collateTopic`) directly from `records/works_json/*.json`
 *      so every single finished work is immediately reflected in `knowledge_graph.json`,
 *      `master_index.jsonl`, `route_index.json`, `research_state.md`, and the dashboard UI.
 *   3. Native local JEV endpoint integration (`--jev auto`) for Layer-1 screening, Layer-2
 *      claim adjudication, and `decisions/decision_board.json` generation.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  DEFAULT_PASS_FLOOR,
  DEFAULT_ROUTE_DROP_BELOW,
  evaluateDecisionBoard,
  resolveJevClient,
  routeCandidates,
} from "./jev.mjs";

const ALLOWED_KINDS = new Set(["route", "work", "technique", "transferable_idea", "pitfall"]);

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, filePath);
}

function writeTextAtomic(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, filePath);
}

export function emitNotice(topicDir, { level = "info", source = "t3-runner", cycle = null, text }) {
  const noticesPath = path.join(topicDir, "logs", "notices.jsonl");
  fs.mkdirSync(path.dirname(noticesPath), { recursive: true });
  const entry = {
    ts: nowIso(),
    level,
    source,
    cycle,
    text: String(text ?? "").slice(0, 140),
  };
  fs.appendFileSync(noticesPath, JSON.stringify(entry) + "\n", "utf8");
  return entry;
}

/**
 * Lightweight, dependency-free parser for the structured sections of topic.yaml
 * that collation and status checks need (meta, execution_routes, graph_edge_types).
 */
export function parseTopicYaml(yamlText) {
  const lines = String(yamlText ?? "").split(/\r?\n/);
  const result = {
    meta: {},
    execution_routes: [],
    graph_edge_types: [],
    iteration_mix: {},
  };

  let section = null;
  let currentItem = null;

  const flushItem = () => {
    if (!currentItem) return;
    if (section === "execution_routes" && currentItem.key) {
      result.execution_routes.push(currentItem);
    } else if (section === "graph_edge_types" && currentItem.key) {
      result.graph_edge_types.push(currentItem);
    }
    currentItem = null;
  };

  const unquote = (s) => {
    const trimmed = s.replace(/\s+#.*$/, "").trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const topMatch = line.match(/^([a-z_]+):\s*$/);
    if (topMatch) {
      flushItem();
      section = topMatch[1];
      continue;
    }

    if (section === "meta" || section === "iteration_mix") {
      const kv = line.match(/^\s{2}([a-z_]+):\s*(.+?)\s*$/);
      if (kv) {
        const val = unquote(kv[2]);
        result[section][kv[1]] = /^\d+$/.test(val) ? Number(val) : val;
      }
      continue;
    }

    if (section === "execution_routes" || section === "graph_edge_types") {
      const inlineObj = line.match(/^\s{2}-\s*\{(.+)\}\s*$/);
      if (inlineObj) {
        flushItem();
        const obj = {};
        const keyMatch = inlineObj[1].match(/\bkey\s*:\s*([^,}]+)/);
        const nameMatch = inlineObj[1].match(/\bname\s*:\s*([^,}]+)/);
        if (keyMatch) obj.key = unquote(keyMatch[1]);
        if (nameMatch) obj.name = unquote(nameMatch[1]);
        currentItem = obj;
        flushItem();
        continue;
      }

      const itemStart = line.match(/^\s{2}-\s+([a-z_]+):\s*(.+?)\s*$/);
      if (itemStart) {
        flushItem();
        currentItem = { [itemStart[1]]: unquote(itemStart[2]) };
        continue;
      }

      const itemProp = line.match(/^\s{4}([a-z_]+):\s*(.+?)\s*$/);
      if (itemProp && currentItem) {
        currentItem[itemProp[1]] = unquote(itemProp[2]);
      }
    }
  }
  flushItem();
  return result;
}

export function readCycle(topicDir) {
  const p = path.join(topicDir, "logs", "cycle.txt");
  if (!fs.existsSync(p)) return 0;
  const raw = fs.readFileSync(p, "utf8").trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function loadWorks(topicDir) {
  const worksDir = path.join(topicDir, "records", "works_json");
  if (!fs.existsSync(worksDir)) return [];
  const files = fs.readdirSync(worksDir).filter((f) => f.endsWith(".json")).sort();
  const out = [];
  for (const file of files) {
    const full = path.join(worksDir, file);
    const stem = file.replace(/\.json$/, "");
    try {
      const data = JSON.parse(fs.readFileSync(full, "utf8"));
      out.push({ stem, file: full, data });
    } catch (err) {
      out.push({ stem, file: full, error: err.message, data: null });
    }
  }
  return out;
}

function probeHttpStatus(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

export async function getTopicStatus(topicDir, { checkServices = true } = {}) {
  const yamlPath = path.join(topicDir, "topic.yaml");
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`topic.yaml not found in ${topicDir}`);
  }
  const parsed = parseTopicYaml(fs.readFileSync(yamlPath, "utf8"));
  const slug = parsed.meta.slug || path.basename(topicDir);
  const cycle = readCycle(topicDir);
  const works = loadWorks(topicDir);
  const validWorks = works.filter((w) => w.data);
  const brokenWorks = works.filter((w) => !w.data);

  const mdDir = path.join(topicDir, "records", "works_md");
  const mdStems = new Set(
    fs.existsSync(mdDir)
      ? fs.readdirSync(mdDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [],
  );

  const kg = readJsonSafe(path.join(topicDir, "indexes", "knowledge_graph.json"), { nodes: [], edges: [] });
  const kgWorkSlugs = new Set(
    (kg.nodes ?? []).filter((n) => n.kind === "work" && typeof n.id === "string").map((n) => n.id.replace(/^work:/, "")),
  );

  const uncollated = validWorks.map((w) => w.stem).filter((s) => !kgWorkSlugs.has(s));
  const missingMd = validWorks.map((w) => w.stem).filter((s) => !mdStems.has(s));

  const queuePath = path.join(topicDir, "logs", "t3_queue.json");
  const queue = readJsonSafe(queuePath, { items: [] });
  const doneSet = new Set(validWorks.map((w) => w.stem));
  const pendingQueue = (queue.items ?? []).filter((it) => it.status !== "skipped" && !doneSet.has(it.slug));

  const decisionPath = path.join(topicDir, "decisions", "decision_board.json");
  const hasDecisionBoard = fs.existsSync(decisionPath);

  const synthEvery = parsed.iteration_mix.synthesis_every_n_cycles || 7;
  const nextCycle = cycle + 1;
  const nextMode = nextCycle > 0 && nextCycle % synthEvery === 0 ? "SYNTHESIS" : "RESEARCH";

  let dashboardUp = null;
  let jevStatus = null;
  if (checkServices) {
    dashboardUp = await probeHttpStatus("http://127.0.0.1:5173/topics/_index.json", 1000);
    const resolved = await resolveJevClient({ mode: "auto", probeTimeoutMs: 1500 });
    jevStatus = resolved.meta;
  }

  return {
    slug,
    topic_dir: path.resolve(topicDir),
    status: parsed.meta.status ?? "draft",
    archetype: parsed.meta.archetype ?? "research",
    engine_mode: parsed.meta.engine_mode ?? "llm",
    cycle,
    next_cycle: nextCycle,
    next_mode: nextMode,
    works_count: validWorks.length,
    broken_works: brokenWorks.map((w) => ({ slug: w.stem, error: w.error })),
    missing_md: missingMd,
    graph_nodes: (kg.nodes ?? []).length,
    graph_edges: (kg.edges ?? []).length,
    uncollated_works: uncollated,
    queue_total: (queue.items ?? []).length,
    queue_pending: pendingQueue.length,
    queue_next: pendingQueue.slice(0, 3).map((x) => x.slug),
    has_decision_board: hasDecisionBoard,
    dashboard_up: dashboardUp,
    dashboard_url: `http://localhost:5173/t/${slug}`,
    jev: jevStatus,
  };
}

/**
 * Durable candidate queue stored at `logs/t3_queue.json`.
 */
export function manageQueue(topicDir, action, { items = [], batch = 2, slug = null } = {}) {
  const queuePath = path.join(topicDir, "logs", "t3_queue.json");
  const queue = readJsonSafe(queuePath, { updated_at: nowIso(), items: [] });
  const existingWorks = new Set(loadWorks(topicDir).filter((w) => w.data).map((w) => w.stem));

  const syncStatuses = () => {
    for (const item of queue.items) {
      if (existingWorks.has(item.slug)) {
        item.status = "done";
      } else if (!item.status) {
        item.status = "pending";
      }
    }
  };
  syncStatuses();

  if (action === "add") {
    const bySlug = new Map(queue.items.map((it) => [it.slug, it]));
    let added = 0;
    let updated = 0;
    for (const raw of items) {
      if (!raw || !raw.slug) continue;
      const status = existingWorks.has(raw.slug) ? "done" : (raw.status || "pending");
      if (bySlug.has(raw.slug)) {
        Object.assign(bySlug.get(raw.slug), raw, { status, updated_at: nowIso() });
        updated += 1;
      } else {
        const rec = { ...raw, status, updated_at: nowIso() };
        queue.items.push(rec);
        bySlug.set(raw.slug, rec);
        added += 1;
      }
    }
    queue.updated_at = nowIso();
    writeJsonAtomic(queuePath, queue);
    return { action: "add", added, updated, total: queue.items.length };
  }

  if (action === "done" && slug) {
    const found = queue.items.find((it) => it.slug === slug);
    if (found) {
      found.status = "done";
      found.updated_at = nowIso();
      queue.updated_at = nowIso();
      writeJsonAtomic(queuePath, queue);
    }
    return { action: "done", slug, updated: Boolean(found) };
  }

  if (action === "next") {
    queue.updated_at = nowIso();
    writeJsonAtomic(queuePath, queue);
    const pending = queue.items.filter((it) => it.status === "pending" && !existingWorks.has(it.slug));
    return {
      action: "next",
      pending_total: pending.length,
      batch: pending.slice(0, batch),
    };
  }

  queue.updated_at = nowIso();
  writeJsonAtomic(queuePath, queue);
  return {
    action: "list",
    total: queue.items.length,
    done: queue.items.filter((it) => it.status === "done").length,
    pending: queue.items.filter((it) => it.status === "pending").length,
    items: queue.items,
  };
}

function normalizeNodeId(id, kind) {
  if (typeof id !== "string" || !id.trim()) return null;
  const trimmed = id.trim();
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0) {
    const prefix = trimmed.slice(0, colonIdx);
    const rest = trimmed.slice(colonIdx + 1);
    if (ALLOWED_KINDS.has(prefix) && rest) return { id: `${prefix}:${rest}`, kind: prefix };
  }
  const safeKind = ALLOWED_KINDS.has(kind) ? kind : "technique";
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? { id: `${safeKind}:${slug}`, kind: safeKind } : null;
}

/**
 * Deterministic, idempotent collation from `records/works_json/*.json` on disk.
 * Safe to run after every single micro-batch or restart — never loses partial work.
 */
export function collateTopic({
  topicDir,
  advanceCycle = false,
  noticeText = null,
  crossEdges = [],
} = {}) {
  const yamlPath = path.join(topicDir, "topic.yaml");
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`topic.yaml not found in ${topicDir}`);
  }
  const parsed = parseTopicYaml(fs.readFileSync(yamlPath, "utf8"));
  const slug = parsed.meta.slug || path.basename(topicDir);
  const routeKeys = new Set(parsed.execution_routes.map((r) => r.key));
  const allowedEdgeRels = new Set(parsed.graph_edge_types.map((e) => e.key));
  allowedEdgeRels.add("belongs_to_route");

  const works = loadWorks(topicDir).filter((w) => w.data);
  const ts = nowIso();

  const kgPath = path.join(topicDir, "indexes", "knowledge_graph.json");
  const existingKg = readJsonSafe(kgPath, { nodes: [], edges: [] });

  // Build nodes map with routes first (preserving topic.yaml order for dashboard sidebar)
  const nodesById = new Map();
  for (const r of parsed.execution_routes) {
    const id = `route:${r.key}`;
    nodesById.set(id, { id, kind: "route", label: r.name || r.key });
  }
  // Preserve existing non-work/non-route nodes (techniques, ideas, pitfalls)
  for (const n of existingKg.nodes ?? []) {
    if (!n || !n.id) continue;
    if (n.kind === "route" || n.kind === "work") continue;
    const norm = normalizeNodeId(n.id, n.kind);
    if (norm && !nodesById.has(norm.id)) {
      nodesById.set(norm.id, { id: norm.id, kind: norm.kind, label: n.label || norm.id });
    }
  }

  const edgeSet = new Set();
  const edges = [];
  const addEdge = (src, dst, rel) => {
    if (!src || !dst || !rel) return false;
    if (!allowedEdgeRels.has(rel)) return false;
    if (!nodesById.has(src) || !nodesById.has(dst)) return false;
    const key = `${src}|${dst}|${rel}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    edges.push({ src, dst, rel });
    return true;
  };

  // First pass: register all work nodes + proposed nodes
  const pendingEdges = [];
  for (const { stem, data } of works) {
    const workId = `work:${stem}`;
    const depth = ["deep", "medium", "shallow"].includes(data.analysis_depth) ? data.analysis_depth : "medium";
    const year = typeof data.year === "number" ? data.year : Number.parseInt(String(data.year ?? ""), 10) || new Date().getFullYear();

    nodesById.set(workId, {
      id: workId,
      kind: "work",
      label: data.title || stem,
      year,
      analysis_depth: depth,
    });

    for (const pn of data.proposed_nodes ?? []) {
      const norm = normalizeNodeId(pn?.id, pn?.kind);
      if (norm && !nodesById.has(norm.id)) {
        nodesById.set(norm.id, { id: norm.id, kind: norm.kind, label: pn.label || norm.id });
      }
    }

    if (data.primary_route && routeKeys.has(data.primary_route)) {
      pendingEdges.push({ src: workId, dst: `route:${data.primary_route}`, rel: "belongs_to_route" });
    } else if (parsed.execution_routes.length > 0) {
      pendingEdges.push({ src: workId, dst: `route:${parsed.execution_routes[0].key}`, rel: "belongs_to_route" });
    }

    for (const pe of data.proposed_edges ?? []) {
      if (pe?.src && pe?.dst && pe?.rel) {
        pendingEdges.push(pe);
      }
    }
  }

  // Re-add valid existing edges + newly proposed + explicit cross edges
  for (const e of existingKg.edges ?? []) {
    if (e?.src && e?.dst && e?.rel) addEdge(e.src, e.dst, e.rel);
  }
  for (const e of pendingEdges) {
    addEdge(e.src, e.dst, e.rel);
  }
  for (const e of crossEdges) {
    const src = Array.isArray(e) ? e[0] : e?.src;
    const dst = Array.isArray(e) ? e[1] : e?.dst;
    const rel = Array.isArray(e) ? e[2] : e?.rel;
    addEdge(src, dst, rel);
  }

  const nextKg = {
    nodes: Array.from(nodesById.values()),
    edges,
    updated_at: ts,
  };
  writeJsonAtomic(kgPath, nextKg);

  // Rebuild master_index.jsonl cleanly from disk works
  const masterLines = works.map(({ stem, data }) =>
    JSON.stringify({
      slug: stem,
      title: data.title || stem,
      year: data.year ?? null,
      depth: data.analysis_depth || "medium",
      route_key: data.primary_route || (parsed.execution_routes[0]?.key ?? "general"),
      one_liner: data.one_liner || "",
    }),
  );
  writeTextAtomic(
    path.join(topicDir, "indexes", "master_index.jsonl"),
    masterLines.length ? masterLines.join("\n") + "\n" : "",
  );

  // Update route_index.json
  const routeIndexPath = path.join(topicDir, "indexes", "route_index.json");
  const routeIndex = readJsonSafe(routeIndexPath, {});
  for (const r of parsed.execution_routes) {
    if (!routeIndex[r.key]) {
      routeIndex[r.key] = {
        direction: r.key,
        status: "active",
        search_count: 0,
        last_searched_at: ts,
        representative_works: [],
        next_angles: [],
        novelty_remaining: "medium",
        evidence_quality: "medium",
        actionability_for_the_topic: "high",
      };
    }
  }
  for (const { stem, data } of works) {
    const rk = data.primary_route && routeKeys.has(data.primary_route)
      ? data.primary_route
      : parsed.execution_routes[0]?.key;
    if (!rk || !routeIndex[rk]) continue;
    const entry = routeIndex[rk];
    if (!Array.isArray(entry.representative_works)) entry.representative_works = [];
    if (!entry.representative_works.includes(stem)) {
      entry.representative_works.push(stem);
    }
    entry.search_count = Math.max(entry.search_count || 0, entry.representative_works.length);
    entry.last_searched_at = ts;
    if (data.analysis_depth === "deep") entry.evidence_quality = "high";
  }
  writeJsonAtomic(routeIndexPath, routeIndex);

  // Sync queue if present
  const queuePath = path.join(topicDir, "logs", "t3_queue.json");
  if (fs.existsSync(queuePath)) {
    manageQueue(topicDir, "list");
  }

  // Advance cycle if requested
  let cycle = readCycle(topicDir);
  if (advanceCycle) {
    cycle += 1;
    writeTextAtomic(path.join(topicDir, "logs", "cycle.txt"), `${cycle}\n`);
    const orchLogPath = path.join(topicDir, "logs", "orchestrator.jsonl");
    fs.mkdirSync(path.dirname(orchLogPath), { recursive: true });
    fs.appendFileSync(
      orchLogPath,
      JSON.stringify({
        ts,
        cycle,
        mode: "RESEARCH",
        summary: noticeText || `Collated ${works.length} works (${nextKg.nodes.length} nodes, ${nextKg.edges.length} edges)`,
        works_total: works.length,
      }) + "\n",
      "utf8",
    );
  }

  // Update logs/research_state.md
  const deepCount = works.filter((w) => w.data.analysis_depth === "deep").length;
  const medCount = works.filter((w) => w.data.analysis_depth === "medium").length;
  const shallowCount = works.filter((w) => w.data.analysis_depth === "shallow").length;
  const stateLines = [
    `# Research State — Cycle ${cycle}`,
    "",
    `- **Updated:** ${ts}`,
    `- **Works collated:** ${works.length} (${deepCount} deep, ${medCount} medium, ${shallowCount} shallow)`,
    `- **Knowledge graph:** ${nextKg.nodes.length} nodes, ${nextKg.edges.length} edges`,
    "",
    "## Collated Works",
    ...works.map(
      ({ stem, data }) =>
        `- \`${stem}\` (${data.analysis_depth || "medium"} · \`${data.primary_route || "unassigned"}\`): ${data.one_liner || data.title}`,
    ),
    "",
  ];
  writeTextAtomic(path.join(topicDir, "logs", "research_state.md"), stateLines.join("\n"));

  // Persist T3 checkpoint state
  const t3State = {
    schema: "argus-t3-state/v1",
    slug,
    cycle,
    updated_at: ts,
    works_count: works.length,
    work_slugs: works.map((w) => w.stem),
    graph_nodes: nextKg.nodes.length,
    graph_edges: nextKg.edges.length,
  };
  writeJsonAtomic(path.join(topicDir, "logs", "t3_state.json"), t3State);

  emitNotice(topicDir, {
    level: "info",
    source: "t3-runner",
    cycle,
    text: noticeText || `Cycle ${cycle} collated: ${works.length} works, ${nextKg.nodes.length} nodes, ${nextKg.edges.length} edges`,
  });

  return t3State;
}

/**
 * Evaluates a Decision Board input JSON via JEV (live loopback JEV endpoint when available,
 * offline deterministic fallback otherwise) and writes `decisions/decision_board.json`.
 */
export async function buildDecisionBoard({
  topicDir,
  inputPath = null,
  jevMode = "auto",
  client = null,
} = {}) {
  const yamlPath = path.join(topicDir, "topic.yaml");
  const parsed = fs.existsSync(yamlPath) ? parseTopicYaml(fs.readFileSync(yamlPath, "utf8")) : { meta: {} };
  const slug = parsed.meta.slug || path.basename(topicDir);

  const resolvedInput = inputPath
    ? path.resolve(inputPath)
    : path.join(topicDir, "decisions", "decision_input.json");
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`decision input not found: ${resolvedInput}`);
  }
  const spec = JSON.parse(fs.readFileSync(resolvedInput, "utf8"));

  let activeClient = client;
  let jevMeta = { mode: client ? "jev" : "offline" };
  if (!activeClient) {
    const resolved = await resolveJevClient({ mode: jevMode });
    activeClient = resolved.client;
    jevMeta = resolved.meta;
  }

  // Optional Layer-1 routing telemetry over candidate pool (or topic works)
  let telemetry = spec.jev_telemetry ?? null;
  const candidatePool = Array.isArray(spec.candidates)
    ? spec.candidates
    : loadWorks(topicDir)
        .filter((w) => w.data)
        .map((w) => ({
          id: `work:${w.stem}`,
          title: w.data.title || w.stem,
          text: `${w.data.one_liner || ""} ${w.data.technical_mechanism || ""}`.trim(),
        }));

  if (candidatePool.length > 0) {
    const routed = await routeCandidates({
      query: spec.question,
      candidates: candidatePool,
      routeDropBelow: spec.route_drop_below ?? DEFAULT_ROUTE_DROP_BELOW,
      passFloor: spec.pass_floor ?? DEFAULT_PASS_FLOOR,
      client: activeClient,
    });
    telemetry = {
      model: activeClient ? `${jevMeta.model || "jev-router-v1"} (JEV live)` : "offline-deterministic-baseline",
      route_drop_below: spec.route_drop_below ?? DEFAULT_ROUTE_DROP_BELOW,
      candidates_screened: routed.telemetry.screened,
      candidates_kept: routed.telemetry.kept,
      candidates_dropped: routed.telemetry.dropped,
      ambiguous_preserved: routed.telemetry.ambiguous_preserved,
      estimated_llm_tokens_saved: routed.telemetry.estimated_llm_tokens_saved,
    };
  }

  const evaluated = await evaluateDecisionBoard({
    question: spec.question,
    options: spec.options ?? [],
    claims: spec.claims ?? [],
    evidenceByClaim: spec.evidenceByClaim ?? {},
    passFloor: spec.pass_floor ?? DEFAULT_PASS_FLOOR,
    client: activeClient,
  });

  const board = {
    schema: "argus-decision-board/v1",
    slug,
    archetype: parsed.meta.archetype || spec.archetype || "decision",
    engine_mode: activeClient ? "jev-hybrid" : (parsed.meta.engine_mode || "jev-hybrid"),
    jev_runtime: jevMeta,
    updated_at: nowIso(),
    question: evaluated.question,
    overall_status: evaluated.overall_status,
    pass_floor: evaluated.pass_floor,
    jev_telemetry: telemetry,
    options: evaluated.options,
    claims: evaluated.claims,
    next_probes: evaluated.next_probes,
  };

  const outPath = path.join(topicDir, "decisions", "decision_board.json");
  writeJsonAtomic(outPath, board);

  emitNotice(topicDir, {
    level: "attention",
    source: "t3-runner",
    cycle: readCycle(topicDir),
    text: `Decision board updated (${jevMeta.mode}): ${board.overall_status}, top=${board.options[0]?.id ?? "none"}`,
  });

  return board;
}
