import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ARCHETYPE_IDS, getArchetype, listArchetypes } from "./archetypes.mjs";
import {
  adjudicateClaim,
  createSystemOneClient,
  evaluateDecisionBoard,
  routeCandidates,
  validateLoopbackEndpoint,
} from "./jev.mjs";
import { formatBundleMarkdown, queryTopic } from "./query.mjs";

test("archetypes expose all four universal deep-exploration modes", () => {
  assert.deepEqual([...ARCHETYPE_IDS].sort(), ["decision", "hunt", "intel", "research"]);
  assert.equal(listArchetypes().length, 4);
  assert.equal(getArchetype("hunt").id, "hunt");
  assert.equal(getArchetype("intel").id, "intel");
  assert.equal(getArchetype("unknown-mode").id, "research");
});

test("JEV Layer-1 offline routing drops noise and preserves ambiguous rare signals", async () => {
  const result = await routeCandidates({
    query: "cross-vendor coding agent verification git gates",
    candidates: [
      { id: "hit", title: "cross-vendor coding agent verification git gates", text: "exact tree verification" },
      { id: "ambig", title: "rare coding agent note", text: "partial mention of verification" },
      { id: "noise", title: "sourdough bread recipe", text: "flour water yeast fermentation" },
    ],
  });

  assert.equal(result.mode, "offline");
  assert.ok(result.kept.some((x) => x.id === "hit"));
  assert.ok(result.dropped.some((x) => x.id === "noise"));
  assert.equal(result.telemetry.screened, 3);
  assert.equal(result.telemetry.dropped, result.dropped.length);
  assert.ok(result.telemetry.estimated_llm_tokens_saved > 0);
});

test("JEV Layer-2 enforces Outis conflict preservation (never fakes consensus)", async () => {
  const contested = await adjudicateClaim({
    claim: "Custom orchestrator scales cleanly",
    evidence: [
      { id: "a", stance: "support", text: "Improves dispatch on small tasks" },
      { id: "b", stance: "refute", text: "Fails audits with false verdicts" },
    ],
  });
  assert.equal(contested.verdict, "contested");
  assert.equal(contested.conflict, true);

  const stale = await adjudicateClaim({
    claim: "Old policy allows copy",
    evidence: [
      { id: "old", current: false, stance: "support", text: "Confirmed" },
      { id: "unapproved", approved: false, stance: "support", text: "Confirmed" },
    ],
  });
  assert.equal(stale.verdict, "unknown");
  assert.equal(stale.confidence, 0);

  const supported = await adjudicateClaim({
    claim: "Exact-tree receipts prevent stale pushes",
    evidence: [{ id: "e1", stance: "support", text: "Verified by deterministic CI gate" }],
  });
  assert.equal(supported.verdict, "supported");
  assert.ok(supported.confidence >= 0.70);
});

test("evaluateDecisionBoard aggregates option probabilities and emits probes for contested claims", async () => {
  const board = await evaluateDecisionBoard({
    question: "Pick verification harness",
    options: [
      { id: "opt-a", name: "Option A", flip_triggers: ["Trigger A"] },
      { id: "opt-b", name: "Option B", flip_triggers: ["Trigger B"] },
    ],
    claims: [
      { id: "C1", option_ids: ["opt-a"], text: "A passes independent audit" },
      { id: "C2", option_ids: ["opt-b"], text: "B has zero regressions" },
    ],
    evidenceByClaim: {
      C1: [{ id: "e1", stance: "support", text: "Verified" }],
      C2: [
        { id: "e2", stance: "support", text: "Passed round 1" },
        { id: "e3", stance: "refute", text: "Failed round 2 audit" },
      ],
    },
  });

  assert.equal(board.options[0].id, "opt-a");
  assert.equal(board.options.find((o) => o.id === "opt-b").status, "contested");
  assert.equal(board.next_probes.length, 1);
  assert.equal(board.next_probes[0].claim_id, "C2");
  assert.equal(board.next_probes[0].priority, "high");
});

test("System One loopback client validates endpoint, usage contract, and two-layer live flow", async (t) => {
  assert.throws(() => validateLoopbackEndpoint("https://evil.example/v1/systemone"));
  assert.throws(() => validateLoopbackEndpoint("http://127.0.0.1:8001/v1/chat/completions"));

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const answers = {};
      for (const [qid, q] of Object.entries(body.questions)) {
        if (q.type === "noul") {
          answers[qid] = { type: "noul", noul: qid === "noise" ? 0.12 : qid === "edge" ? 0.48 : 0.91 };
        } else {
          answers[qid] = {
            type: "choice",
            choice: "support",
            probabilities: { support: 0.86, refute: 0.04, unknown: 0.10 },
          };
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: body.model, answers, usage: { input_tokens: 120, output_tokens: 0 } }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const client = createSystemOneClient({
    endpoint: `http://127.0.0.1:${port}/v1/systemone`,
    model: "d3-mini",
    apiKey: "test-key",
  });

  const routed = await routeCandidates({
    query: "rare signal test",
    candidates: [
      { id: "hit", title: "Hit", text: "Strong hit" },
      { id: "edge", title: "Edge", text: "Ambiguous edge signal" },
      { id: "noise", title: "Noise", text: "Unrelated" },
    ],
    client,
  });
  assert.equal(routed.mode, "systemone");
  assert.deepEqual(routed.kept.map((x) => x.id), ["hit", "edge"]);
  assert.equal(routed.telemetry.ambiguous_preserved, 1);
  assert.deepEqual(routed.dropped.map((x) => x.id), ["noise"]);

  const adj = await adjudicateClaim({
    claim: "Live System One verifies claim",
    evidence: [{ id: "e1", text: "Confirmed" }],
    client,
  });
  assert.equal(adj.verdict, "supported");
  assert.equal(adj.confidence, 0.86);
});

test("dual-entry queryTopic supports gather & search with SHA-256 provenance and active conflicts", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "argus-query-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  fs.mkdirSync(path.join(dir, "records", "works_json"), { recursive: true });
  fs.mkdirSync(path.join(dir, "decisions"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "records", "works_json", "w1.json"),
    JSON.stringify({
      slug: "w1",
      title: "Cross-Vendor Judge Architecture",
      one_liner: "Separates Actor and Judge vendors to prevent sycophancy",
      analysis_depth: "deep",
      tags: ["judge", "verification"],
    }),
  );
  fs.writeFileSync(
    path.join(dir, "decisions", "decision_board.json"),
    JSON.stringify({
      archetype: "decision",
      claims: [
        { id: "CL-9", text: "Single-vendor self-review is sufficient", verdict: "contested", conflict: true },
      ],
      options: [],
    }),
  );

  const gathered = await queryTopic({
    topicDir: dir,
    task: "cross-vendor judge verification",
    mode: "gather",
  });
  assert.equal(gathered.mode, "gather");
  assert.ok(gathered.items.length >= 1);
  assert.match(gathered.items[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(gathered.conflicts.length, 1);
  const md = formatBundleMarkdown(gathered);
  assert.match(md, /Active Conflicts/);
  assert.match(md, /Cross-Vendor Judge Architecture/);
});

test("System One routeCandidates automatically batches large candidate lists within 16KB budget", async (t) => {
  let requestCount = 0;
  let maxObservedBytes = 0;

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      requestCount += 1;
      const buf = Buffer.concat(chunks);
      maxObservedBytes = Math.max(maxObservedBytes, buf.byteLength);
      const body = JSON.parse(buf.toString("utf8"));
      const answers = {};
      for (const qid of Object.keys(body.questions)) {
        answers[qid] = { type: "noul", noul: qid.endsWith("0") ? 0.85 : 0.2 };
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: body.model, answers, usage: { input_tokens: 50, output_tokens: 0 } }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const client = createSystemOneClient({
    endpoint: `http://127.0.0.1:${port}/v1/systemone`,
    model: "d3-mini",
    apiKey: "test-key",
  });

  const manyCandidates = Array.from({ length: 40 }, (_, i) => ({
    id: `c${i}`,
    title: `Candidate work #${i} on multi-agent verification`,
    text: "x".repeat(420),
  }));

  const res = await routeCandidates({ query: "verification", candidates: manyCandidates, client });
  assert.ok(requestCount >= 2, `expected multi-batch calls, got ${requestCount}`);
  assert.ok(maxObservedBytes <= 16384, `batch exceeded 16KB cap: ${maxObservedBytes}`);
  assert.equal(res.telemetry.screened, 40);
  assert.equal(res.telemetry.batches, requestCount);
  assert.equal(res.telemetry.input_tokens, requestCount * 50);
  assert.equal(res.kept.length, 4);
});

test("CLI rejects invalid --limit, missing --task, and invalid --mode with non-zero exit", async () => {
  const { spawnSync } = await import("node:child_process");
  const cases = [
    ["query", "--topic", "ai-coding-harness-selection", "--task", "test", "--limit", "abc"],
    ["query", "--topic", "ai-coding-harness-selection", "--task", "test", "--limit", "-2"],
    ["query", "--topic", "ai-coding-harness-selection", "--task", "test", "--limit"],
    ["query", "--topic", "ai-coding-harness-selection", "--task", "--mode", "search"],
    ["query", "--topic", "ai-coding-harness-selection", "--task", "test", "--mode", "bogus"],
  ];
  for (const argv of cases) {
    const run = spawnSync(process.execPath, ["engine/cli.mjs", ...argv], {
      cwd: path.resolve(import.meta.dirname, ".."),
      encoding: "utf8",
    });
    assert.notEqual(run.status, 0, `expected non-zero exit for ${argv.join(" ")}`);
  }
});
