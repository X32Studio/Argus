# Argus — Workflow/Ultracode Engine — Design

**Date:** 2026-06-16
**Status:** Approved (brainstorming), ready for implementation plan
**Supersedes (in-session path only):** Amendment J (2026-05-26) hand-rolled orchestrator. The cron path is untouched.

## Problem

The Argus in-session orchestrator hand-rolls exactly what the Claude Code **Workflow** tool does natively, and pays for it in fragility:

- **Two nested `Bash sleep 420` watchdogs** — one in `SKILL.md` step 8 (cycle loop), one in `loop.md` "Parallel Deep-Read" (per-work fan-out). Each forces a 7-minute floor per multi-subagent step *even when every subagent returns in seconds*, purely because the `Agent` tool has no kill primitive and no fan-out-and-join.
- **Manual return parsing + "presumed_hung" bookkeeping** (`## subagent_unnotified`, `## iteration_runner_unnotified`) — a workaround for the absence of structured, validated agent returns.
- **A `cycle.txt` single-writer dance** spread across prose rules.
- **No claim verification at all.** The methodology is "collect + summarize"; nothing adversarially checks whether a record's transfer claims actually hold before they flow into the report.

The Workflow tool replaces the orchestration machinery with native primitives (`agent({schema})`, `parallel()`/`pipeline()`, JS control flow, `budget`) and makes ultracode quality patterns (adversarial verify, budget-scaled fan-out, loop-until-dry) cheap to express.

## Goals

1. Replace the in-session hand-rolled orchestration with a **Workflow-native** per-cycle engine. Delete both watchdogs, the inter-cycle sleep, manual parsing, and presumed-hung bookkeeping.
2. Add **ultracode quality** to research: adversarial claim verification, budget-scaled fan-out, loop-until-dry discovery.
3. Keep the methodology files sharper for **both** paths via pure-prompt quality bumps.

## Non-goals

- **Do not touch the cron `/argus loop` path.** A cron tick is a plain isolated session and cannot host a Workflow; it keeps using `loop.md`/`loop-summary.md` with their hand-rolled mechanics.
- **Do not parallelize synthesis.** It stays single-threaded (Amendment H stands); it only gains pure-prompt quality.
- **Do not touch** the dashboard (`app/`), the frontend contract, `validate-contract.sh`, the `topic.yaml` schema, or the `topics/<slug>/` data layout.

## Decisions (locked during brainstorming, 2026-06-16)

| # | Decision | Rationale |
|---|---|---|
| D1 | **One workflow invocation = one research cycle's fan-out.** The skill drives the cycle-to-cycle loop and re-fires the same workflow each cycle. | Keeps cross-cycle state (counter, saturation, stop conditions, notices, "user said stop") in the interactive skill where it can react; confines the workflow to stateless fan-out. |
| D2 | **Workflow replaces the in-session orchestrator; cron stays as-is.** | Workflow is session-bound and can't survive a Claude Code restart; cron remains the "run overnight" path. |
| D3 | **Both axes:** workflow engine **and** ultracode quality. | User intent. |
| D4 | **Synthesis stays single-threaded**, dispatched directly with the `Agent` tool (not wrapped in a workflow). | No fan-out to orchestrate; avoids spinning the workflow runtime for one agent. |
| D5 | **Adversarial verify is budget-gated** — runs when `budget.total` is set (ultracode/"+Nk" runs); plain runs skip it for speed. | Keeps non-ultracode runs cheap. |
| D6 | **Document in both places:** this brainstorming spec (implementation handoff) **+** Amendment K in `.claude/skills/argus/docs/plans/2026-05-25-…design.md` (repo continuity). | Matches the repo's amendment convention while satisfying the brainstorming process. |

## Architecture

```
Skill (interactive session, orchestrator)
  • front door: confirm intent · /argus init · dashboard · mode choice   (UNCHANGED — workflows can't AskUserQuestion)
  • cycle loop: read cycle.txt → decide mode → fire engine → record summary → stop-checks → repeat
       │
       ├─ RESEARCH cycle ──▶ Workflow(".claude/workflows/argus-cycle.js", {slug,dir,cycle,today})
       │                        └─ plan → parallel deep-read → (budget-gated) parallel adversarial-verify → collate → validate
       │
       └─ SYNTHESIS cycle ─▶ one synthesis agent via Agent tool (single-threaded, reads loop-summary.md)
```

The skill remains the **only writer** of cross-cycle state: `cycle.txt`, the in-memory saturation/dry counters, `logs/orchestrator.jsonl`, and dashboard notices. The workflow has **no cross-cycle memory**.

### Hard sandbox constraint

A Workflow script has **no filesystem access** and cannot call `Date.now()`/`Math.random()`/`new Date()`. Therefore:
- The JS holds only control flow + schemas. **Every file read/write is done by an agent.**
- `slug / dir / today / cycle / fanout` (and `synthesis_every_n` for the skill's own loop) are passed via `args` / read once by the skill.
- `cycle.txt` keeps its single-writer guarantee for free: the **skill** advances it after the workflow returns; runner agents never touch it.

## Component 1 — `templates/claude/workflows/argus-cycle.js` (NEW)

Per-research-cycle workflow. Bootstrapped into the watch dir like every other template.

```js
export const meta = {
  name: 'argus-cycle',
  description: 'One Argus research cycle: plan, deep-read, verify, collate',
  phases: [{title:'Plan'},{title:'Deep-read'},{title:'Verify'},{title:'Collate'}],
}

const {slug, dir, cycle, today} = args
// D5: verify is budget-gated. FANOUT scales candidate count to the budget; defaults to 3 with no budget.
const FANOUT = budget.total ? Math.min(8, Math.max(2, Math.floor(budget.remaining()/150_000))) : 3
const VERIFY = !!budget.total

// PLAN — 1 agent: reads topic.yaml + indexes + report + research_state, applies the dedup gate,
//   returns up to FANOUT candidates respecting topic.yaml.iteration_mix (new/deepen/challenge minimums).
const plan = await agent(PLAN(slug,dir,cycle,FANOUT), {phase:'Plan', schema:PLAN_SCHEMA})
if (!plan.candidates.length)
  return {mode:'RESEARCH', cycle, candidates_processed:0, new_works_added:0,
          depth_upgrades:0, flagged_claims:0, saturation_signal:false, narrative:'no new directions'}

// DEEP-READ → VERIFY/ANNOTATE, pipelined per candidate. Per-work isolation preserved:
//   each candidate's agents touch ONLY works_json/<slug>.json + works_md/<slug>.md.
const records = await pipeline(plan.candidates,
  c   => agent(READ(c,dir), {phase:'Deep-read', schema:RECORD_SCHEMA, label:`read:${c.slug}`}),
  rec => VERIFY ? verifyRecord(rec,dir) : rec)

// verifyRecord(rec,dir): spawn 2-3 perspective-diverse skeptics (lenses: mechanism / transfer / evidence-honesty),
//   each prompted to REFUTE one of rec.key_claims; if majority verdict is overstated|wrong, a fixup agent
//   annotates THAT record's own works_json with the flag and downgrades depth/confidence. Returns {...rec, verdicts}.
//   Skeptics READ only (source + record); the single fixup write is to the record's own file ⇒ no shared-file race.

// COLLATE — 1 agent, single-writer for ALL shared files
//   (knowledge_graph.json, master_index.jsonl, route_index.json, search_log.jsonl, research_state.md),
//   then runs `bash .claude/skills/argus/scripts/validate-contract.sh --fix <slug>` and records residual violations.
const c = await agent(COLLATE(slug,dir,records.filter(Boolean)), {phase:'Collate', schema:COLLATE_SCHEMA})

return {mode:'RESEARCH', cycle, candidates_processed:records.length,
        new_works_added:c.works_added, depth_upgrades:c.depth_upgrades,
        flagged_claims:c.flagged_claims, saturation_signal:false, narrative:c.narrative}
```

### Schemas

```
PLAN_SCHEMA = {
  candidates: [{ slug, title, url, primary_route, existing_depth: null|shallow|medium|deep,
                 intended_depth: shallow|medium|deep, why_new }],
  under_covered_routes: [route_key],
  weak_report_claims: [string],
  notes: string
}

RECORD_SCHEMA = {
  slug, title, year, analysis_depth: shallow|medium|deep,
  record_written: bool,                       // wrote works_json/<slug>.json + works_md/<slug>.md
  key_claims: [{ id, text, kind: mechanism|transfer|evidence }],
  proposed_graph_edges: [{src,dst,rel}],
  proposed_route_index_updates: { <route_key>: {...} },
  proposed_search_log_entry: {...},
  notes
}

VERDICT_SCHEMA = { claim_id, lens: mechanism|transfer|evidence, verdict: holds|overstated|wrong, note }

COLLATE_SCHEMA = { works_added, depth_upgrades, edges_added, flagged_claims, residual_violations:[string], narrative }
```

### Mapping to existing methodology

- **Per-work isolation** (`loop.md` "Parallel Deep-Read" hard rule) → preserved by `pipeline` per-candidate; only the collate agent writes shared files.
- **Parent post-collation phase** (single-writer index/graph/log merges) → the collate agent.
- **Parent watchdog `Bash sleep 420`** → **deleted**; `pipeline` joins natively, `null` on terminal failure.
- **Dedup gate** (skip `deep`, upgrade `shallow|medium`, reuse existing slug on title match) → the PLAN agent (still single-point dedup in the orchestrating context, exactly as the methodology requires).
- **NEW — adversarial verify** → `verifyRecord`. No equivalent exists today.

## Component 2 — Skill orchestrator loop (revised `SKILL.md` Flow A step 8)

```
read cycle.txt → N (once; then hold in memory)
repeat until STOP:
  next = N+1;  mode = (next % synthesis_every_n == 0 && next > 0) ? SYNTHESIS : RESEARCH
  emit notice  info  "Cycle <next> starting (mode=<mode>)"
  if RESEARCH:  summary = Workflow(".claude/workflows/argus-cycle.js", {slug,dir,cycle:next,today})
  else:         summary = <dispatch ONE synthesis agent (Agent tool) reading .claude/loop-summary.md>
  write cycle.txt = next                         ← skill single-writer; runner/synthesis agents forbidden
  append logs/orchestrator.jsonl  {ts,cycle:next,mode,summary}
  counters:
    RESEARCH & new_works_added==0 → dryRounds++   (dryRounds>=2 ⇒ STOP_SATURATED)
    RESEARCH & new_works_added>0  → dryRounds=0
    SYNTHESIS & saturation_signal → satCount++     (satCount>=3 ⇒ STOP_SATURATED)
    SYNTHESIS & !saturation_signal → satCount=0
  emit notice  info  "Cycle <next> done: +<new> works, +<upgrades> upgrades, <flagged> flagged"
  N = next
  context self-check → STOP_CONTEXT
```

**Deleted vs Amendment J:** both `Bash sleep 420` watchdogs, the `Bash sleep 30` inter-cycle pause, manual return parsing, and the `## subagent_unnotified` / `## iteration_runner_unnotified` headings. The workflow returns only when every agent has joined (or failed terminally to `null`), so "presumed hung" is no longer something the skill reasons about. Notice emission (info/attention/blocked) and stop conditions (STOP_USER / STOP_SATURATED / STOP_CONTEXT / STOP_BLOCKER) are otherwise preserved.

**Budget directive:** under ultracode the user's "+Nk" directive flows into `budget.total`, scaling `FANOUT` and enabling verify. With no budget, `FANOUT=3` and verify is skipped; the loop runs until saturation. The skill surfaces "pass a token budget like +800k to go deeper."

**Opt-in:** the in-session path is the user's explicit choice in the Flow A step-5 `AskUserQuestion` (relabel: *"Run it here in this session (workflow engine)"*). That choice authorizes the skill to call `Workflow` (a sanctioned trigger: "a skill whose instructions tell you to call Workflow").

## Component 3 — Synthesis (unchanged structure, D4)

A SYNTHESIS cycle dispatches **one** agent via the `Agent` tool that reads `.claude/loop-summary.md` and performs the read-many-write-one pass, returning `{saturation_signal, narrative}`. No workflow, no fan-out. It still publishes (git) per the existing loop-summary methodology.

## Component 4 — Pure-prompt quality bumps (both paths)

Added as prose to the methodology files so the cron path benefits too:

- `loop.md`: **refute-before-write** (before keeping any transfer claim, state how it could fail; keep only if it survives); **honesty gate** on `analysis_depth` (no `deep` without methods+ablations+transfer extracted).
- `loop-summary.md`: **completeness self-check** (for each `[Ref: …]`, confirm the cited record actually supports the sentence; mark unverified/shallow claims explicitly).

Also annotate the `loop.md` "Parallel Deep-Read / Parent watchdog / Parent post-collation" sections: *these are the cron path's hand-rolled mechanics; the in-session path uses `.claude/workflows/argus-cycle.js`, which supersedes them with native `parallel()`.*

## Data flow (one research cycle)

1. Skill → `Workflow(argus-cycle.js, {slug,dir,cycle,today})` — `fanout` is **not** passed; the workflow computes it from the ambient `budget`.
2. PLAN agent reads `topic.yaml`, `master_index.jsonl`, `route_index.json`, `knowledge_graph.json`, `report/main.md`, `research_state.md`; dedups; returns candidates.
3. Per candidate: READ agent fetches source, writes `records/works_json/<slug>.json` + `works_md/<slug>.md` (its files only); (budget-gated) VERIFY skeptics refute key claims; fixup agent flags overstated claims in the record's own file.
4. COLLATE agent merges shared indexes/graph/logs (single writer), runs `validate-contract.sh --fix`, returns counts + narrative.
5. Workflow returns structured summary → skill advances `cycle.txt`, logs, updates counters, emits notice.

## Error handling

- **Agent terminal failure** → `pipeline` yields `null`; `.filter(Boolean)` drops it; the slug rolls forward (`search_log` `subagent_failed` + `failure_count`, as today). One bad candidate never poisons the batch; 3 same-slug failures ⇒ demote to historical-anchor.
- **Whole-cycle workflow dies** → skill sees a failed task, logs to `research_state.md`, re-fires or STOP_BLOCKER. `cycle.txt` not advanced (skill writes only on success) ⇒ re-fire is idempotent; on-disk records make the dedup gate skip done works.
- **Budget exhaustion mid-cycle** → `agent()` throws past the ceiling; cycle returns partial; skill stops and surfaces "+Nk to continue."

## File-by-file change list

| File | Change |
|---|---|
| `templates/claude/workflows/argus-cycle.js` | **NEW** — the per-research-cycle workflow (Component 1). |
| `SKILL.md` | **CHANGED** — Flow A step 8 loop body (Component 2); relabel step-5 in-session option; add budget-directive guidance. |
| `templates/claude/loop.md` | **CHANGED** — pure-prompt quality bumps; annotate orchestration sections as cron-path-only. |
| `templates/claude/loop-summary.md` | **CHANGED** — completeness self-check; stays single-threaded. |
| `scripts/bootstrap.sh` | **CHANGED** — copy `templates/claude/workflows/` into the watch dir's `.claude/workflows/`. |
| `docs/plans/2026-05-25-…design.md` | **CHANGED** — add Amendment K (D6). |
| `app/`, `frontend-contract.md`, `validate-contract.sh`, `topic.yaml` schema, cron `/argus loop` | **UNTOUCHED**. |

## Testing

- `argus-cycle.js` parses and runs as a workflow against a throwaway topic dir: one cycle adds ≥1 record, updates the graph, and passes `validate-contract.sh`.
- Existing `app/src/lib/*` vitest suite stays green (frontend contract unchanged).
- Doc check: bootstrap creates `.claude/workflows/argus-cycle.js` at the path the skill's step-8 prose references.

## Migration / compatibility

- Existing topics need no migration — the data layout is unchanged. Re-running `bootstrap.sh` adds `.claude/workflows/` and refreshes the methodology files (preserving `topics/` and `.claude/loops/`, per existing bootstrap rules).
- A user mid-run on the old in-session orchestrator simply restarts the skill; the new loop reads `cycle.txt` and continues.
- The cron path is byte-for-byte compatible.
