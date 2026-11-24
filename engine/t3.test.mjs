import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDecisionBoard, collateTopic, getTopicStatus, manageQueue, parseTopicYaml } from "./t3.mjs";

const SAMPLE_YAML = `meta:
  slug: sample-t3-topic
  name: Sample T3 Topic
  description: Testing T3 incremental runtime
  archetype: decision
  engine_mode: jev-hybrid
  status: accepted
  created_at: 2026-11-24

execution_routes:
  - name: Route Alpha
    key: route-alpha
    description: First route
  - name: Route Beta
    key: route-beta
    description: Second route

graph_edge_types:
  - key: belongs_to_route
    description: Work belongs to route
  - key: uses_technique
    description: Work uses technique
  - key: compares_against
    description: Work compares against another work

iteration_mix:
  new_min: 2
  deepen_min: 1
  challenge_min: 1
  synthesis_every_n_cycles: 4
`;

function createFixtureTopic() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "argus-t3-"));
  const topicDir = path.join(root, "topics", "sample-t3-topic");
  fs.mkdirSync(path.join(topicDir, "records", "works_json"), { recursive: true });
  fs.mkdirSync(path.join(topicDir, "records", "works_md"), { recursive: true });
  fs.mkdirSync(path.join(topicDir, "indexes"), { recursive: true });
  fs.mkdirSync(path.join(topicDir, "logs"), { recursive: true });
  fs.mkdirSync(path.join(topicDir, "decisions"), { recursive: true });
  fs.writeFileSync(path.join(topicDir, "topic.yaml"), SAMPLE_YAML, "utf8");
  fs.writeFileSync(path.join(topicDir, "logs", "cycle.txt"), "0\n", "utf8");
  return { root, topicDir };
}

test("parseTopicYaml extracts meta, execution_routes, graph_edge_types, and iteration_mix", () => {
  const parsed = parseTopicYaml(SAMPLE_YAML);
  assert.equal(parsed.meta.slug, "sample-t3-topic");
  assert.equal(parsed.meta.archetype, "decision");
  assert.equal(parsed.execution_routes.length, 2);
  assert.equal(parsed.execution_routes[0].key, "route-alpha");
  assert.equal(parsed.graph_edge_types.length, 3);
  assert.equal(parsed.iteration_mix.synthesis_every_n_cycles, 4);
});

test("T3 durable queue + incremental collate survives partial progress and preserves graph contract", async (t) => {
  const { root, topicDir } = createFixtureTopic();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  // 1. Seed queue with 3 works
  const addRes = manageQueue(topicDir, "add", {
    items: [
      { slug: "work-a", title: "Work A", primary_route: "route-alpha" },
      { slug: "work-b", title: "Work B", primary_route: "route-beta" },
      { slug: "work-c", title: "Work C", primary_route: "route-alpha" },
    ],
  });
  assert.equal(addRes.added, 3);

  const batch1 = manageQueue(topicDir, "next", { batch: 2 });
  assert.deepEqual(batch1.batch.map((x) => x.slug), ["work-a", "work-b"]);

  // 2. Simulate only 1 of 2 works finishing before a crash/restart
  fs.writeFileSync(
    path.join(topicDir, "records", "works_json", "work-a.json"),
    JSON.stringify({
      slug: "work-a",
      title: "Work A Title",
      year: 2026,
      primary_route: "route-alpha",
      analysis_depth: "deep",
      one_liner: "Concrete A takeaway",
      proposed_nodes: [{ id: "technique:tech-a", kind: "technique", label: "Tech A" }],
      proposed_edges: [
        { src: "work:work-a", dst: "technique:tech-a", rel: "uses_technique" },
        { src: "work:work-a", dst: "work:nonexistent", rel: "compares_against" },
      ],
    }),
  );
  fs.writeFileSync(path.join(topicDir, "records", "works_md", "work-a.md"), "# Work A\n");

  // 3. Incremental collate commits work-a cleanly and drops dangling edges
  const collated = collateTopic({ topicDir, advanceCycle: true });
  assert.equal(collated.cycle, 1);
  assert.equal(collated.works_count, 1);

  const kg = JSON.parse(fs.readFileSync(path.join(topicDir, "indexes", "knowledge_graph.json"), "utf8"));
  assert.ok(kg.nodes.some((n) => n.id === "route:route-alpha"));
  assert.ok(kg.nodes.some((n) => n.id === "work:work-a" && n.analysis_depth === "deep"));
  assert.ok(kg.nodes.some((n) => n.id === "technique:tech-a"));
  assert.ok(kg.edges.some((e) => e.src === "work:work-a" && e.dst === "route:route-alpha" && e.rel === "belongs_to_route"));
  assert.ok(kg.edges.some((e) => e.src === "work:work-a" && e.dst === "technique:tech-a" && e.rel === "uses_technique"));
  assert.ok(!kg.edges.some((e) => e.dst === "work:nonexistent"));

  // 4. Queue next skips already-done work-a!
  const batch2 = manageQueue(topicDir, "next", { batch: 2 });
  assert.deepEqual(batch2.batch.map((x) => x.slug), ["work-b", "work-c"]);

  const status = await getTopicStatus(topicDir, { checkServices: false });
  assert.equal(status.works_count, 1);
  assert.equal(status.uncollated_works.length, 0);
  assert.equal(status.queue_pending, 2);
});

test("buildDecisionBoard generates UI-compliant decision_board.json via CLI and offline baseline", async (t) => {
  const { root, topicDir } = createFixtureTopic();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(
    path.join(topicDir, "decisions", "decision_input.json"),
    JSON.stringify({
      question: "Pick ontology compilation architecture",
      options: [
        { id: "hybrid", name: "Hybrid Compiler + ReBAC", summary: "Best of both", flip_triggers: ["Latency > 500ms"] },
        { id: "flat-rag", name: "Flat RAG", summary: "Simple chunks", flip_triggers: ["Zero ACL requirement"] },
      ],
      claims: [
        { id: "C1", option_ids: ["hybrid"], text: "Pre-filtering via ReBAC prevents leakage" },
        { id: "C2", option_ids: ["flat-rag"], text: "Flat RAG handles multi-hop joins accurately" },
      ],
      evidenceByClaim: {
        C1: [{ id: "work:openfga", stance: "support", text: "Verified via list-objects pre-filter" }],
        C2: [{ id: "work:nvidia", stance: "refute", text: "Fails cross-table semantic joins" }],
      },
    }),
  );

  const board = await buildDecisionBoard({ topicDir, jevMode: "offline" });
  assert.equal(board.schema, "argus-decision-board/v1");
  assert.equal(board.options[0].id, "hybrid");
  assert.equal(board.claims[0].verdict, "supported");
  assert.equal(board.claims[1].verdict, "refuted");
  assert.ok(fs.existsSync(path.join(topicDir, "decisions", "decision_board.json")));

  // Verify CLI status works end-to-end
  const cliPath = path.resolve(import.meta.dirname, "cli.mjs");
  const run = spawnSync(process.execPath, [cliPath, "status", "--topic", topicDir, "--no-services"], {
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const parsedOut = JSON.parse(run.stdout);
  assert.equal(parsedOut.has_decision_board, true);
});
