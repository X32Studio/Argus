#!/usr/bin/env node
/**
 * 5-Second Offline Walkthrough of Argus 2.0 (Zero API Keys Required).
 *
 * Demonstrates:
 *   1. Universal 4-Archetype exploration model (hunt / intel / decision / research)
 *   2. JEV Layer-1 fast candidate screening (noise dropped, ambiguous rare signal preserved)
 *   3. JEV Layer-2 calibrated claim adjudication & conflict preservation (contested != fake pass)
 *   4. Dual-entry `gather` + `search` agent context assembly over a live topic
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { listArchetypes } from "./archetypes.mjs";
import { evaluateDecisionBoard, routeCandidates } from "./jev.mjs";
import { queryTopic } from "./query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function main() {
  console.log("=== ARGUS 2.0 // UNIVERSAL DEEP EXPLORATION + JEV DECISION ENGINE ===\n");

  console.log("1. Four Universal Exploration Archetypes:");
  for (const a of listArchetypes()) {
    console.log(`   - ${a.id.padEnd(9)} (${a.zhLabel}): ${a.tagline}`);
  }

  console.log("\n2. JEV Layer-1 Screening (Drop noise < 0.35; preserve ambiguous rare signals 0.35-0.70):");
  const routed = await routeCandidates({
    query: "cross-vendor coding agent verification exact git tree gates self-loop",
    candidates: [
      { id: "c1", title: "self-loop v0.4.10 exact-tree git/CI gates & cross-vendor judge", text: "Enforces cross-vendor Critic/Actor/Judge verification and exact git tree receipts." },
      { id: "c2", title: "Rare benchmark note on agent verification sycophancy", text: "Obscure empirical note showing single-vendor coding agent verification misses premise errors." },
      { id: "c3", title: "Top 10 coffee recipes for remote workers", text: "Pour-over grind sizes and espresso extraction tips." },
      { id: "c4", title: "Generic AI newsletter roundup #412", text: "Weekly funding announcements and event calendar." },
    ],
  });
  console.log(
    `   Screened=${routed.telemetry.screened} | Kept=${routed.telemetry.kept} | Dropped=${routed.telemetry.dropped} | AmbiguousPreserved=${routed.telemetry.ambiguous_preserved} | EstLLMTokensSaved=${routed.telemetry.estimated_llm_tokens_saved}`,
  );
  for (const k of routed.kept) {
    console.log(`   [KEEP ${k.jev_band.toUpperCase()} ${k.jev_score}] ${k.id}: ${k.title}`);
  }
  for (const d of routed.dropped) {
    console.log(`   [DROP ${d.jev_score}] ${d.id}: ${d.title}`);
  }

  console.log("\n3. JEV Layer-2 Decision & Conflict Preservation:");
  const board = await evaluateDecisionBoard({
    question: "Which multi-agent coding architecture should X32 standardize on?",
    options: [
      { id: "harness-protocol", name: "Thin Protocol + Hard Git/CI Gates (self-loop)", flip_triggers: ["Native agent harness adds built-in cross-vendor judge"] },
      { id: "heavy-orchestrator", name: "Custom State-Machine Orchestrator", flip_triggers: ["Orchestrator proves <1% false-verdict rate across 50 rounds"] },
    ],
    claims: [
      { id: "CL-1", option_ids: ["harness-protocol"], text: "Cross-vendor Judge + exact-tree CI gates prevent self-grading regressions" },
      { id: "CL-2", option_ids: ["heavy-orchestrator"], text: "Custom state-machine orchestrators scale cleanly without false verdicts" },
      { id: "CL-3", option_ids: ["harness-protocol", "heavy-orchestrator"], text: "Single-vendor multi-turn retry loops suffice for production releases" },
    ],
    evidenceByClaim: {
      "CL-1": [
        { id: "e1", stance: "support", text: "Verified in production: exact-tree receipts + cross-vendor judge caught async regressions." },
        { id: "e2", stance: "support", text: "Independent evaluation confirms role isolation eliminates test-gaming." },
      ],
      "CL-2": [
        { id: "e3", stance: "support", text: "Initial prototype improved dispatch speed on linear tasks." },
        { id: "e4", stance: "refute", text: "L-0002 post-mortem: 865-line state machine failed two independent audits with false verdicts." },
      ],
      "CL-3": [
        { id: "e5", stance: "refute", text: "Single-vendor retries suffer sycophancy and patch broken premises." },
      ],
    },
  });
  for (const opt of board.options) {
    console.log(`   Option ${opt.id.padEnd(20)} -> p=${opt.probability} [${opt.status.toUpperCase()}]`);
  }
  for (const cl of board.claims) {
    console.log(`   Claim  ${cl.id} -> ${cl.verdict.toUpperCase()} (${cl.reason})`);
  }
  console.log(`   Auto-spawned disambiguation probes: ${board.next_probes.length}`);

  const showcaseDir = path.join(repoRoot, "topics", "ai-coding-harness-selection");
  try {
    const bundle = await queryTopic({
      topicDir: showcaseDir,
      task: "competitive analysis cross-vendor verification coding agents",
      mode: "gather",
      limit: 3,
    });
    console.log(`\n4. Dual-Entry Context Gather (${bundle.topic_dir.split(path.sep).slice(-1)[0]}):`);
    console.log(`   Indexed=${bundle.total_indexed} | Returned=${bundle.returned} | ActiveConflicts=${bundle.conflicts.length}`);
    for (const item of bundle.items) {
      console.log(`   - [${item.jev_score}] ${item.title} (sha256:${item.sha256.slice(0, 10)})`);
    }
  } catch {
    // Showcase topic optional
  }

  console.log("\nDEMO OK — Argus 2.0 ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
