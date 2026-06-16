# Argus Workflow/Ultracode Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Argus's hand-rolled in-session orchestration (two `Bash sleep 420` watchdogs + manual return parsing) with a per-cycle Workflow script, and add ultracode quality (budget-scaled fan-out + adversarial claim verification), while leaving the cron path and dashboard untouched.

**Architecture:** The skill stays the interactive orchestrator and drives the cycle-to-cycle loop. Each RESEARCH cycle fires one Workflow (`.claude/workflows/argus-cycle.js`: plan → parallel deep-read → budget-gated parallel adversarial-verify → single-writer collate → validate). SYNTHESIS cycles stay single-threaded via a direct `Agent` dispatch. Cross-cycle state (`cycle.txt`, saturation/dry counters, notices) stays in the skill; the workflow has no cross-cycle memory and (per the Workflow sandbox) does no file I/O itself — every read/write is an agent's job.

**Tech Stack:** Claude Code Workflow tool (JS orchestration), `Agent` subagents, Markdown methodology prompts, Bash bootstrap, Node 24 (test harness via `node:assert`, no new deps), existing vitest for the dashboard regression.

**Spec:** `docs/superpowers/specs/2026-06-16-argus-workflow-ultracode-engine-design.md`

**Working branch:** `argus-workflow-engine` (already created off `main`).

**Conventions for this plan:**
- All paths are relative to the repo root `/home/kang.ruiyuan/research-loop/Argus`.
- The canonical engine source lives under `.claude/skills/argus/`. Editing `templates/…` is editing the shipped engine; `bootstrap.sh` copies templates into a watch dir.
- Skill-development tests live under `.claude/skills/argus/test/` (NOT under `templates/`, so bootstrap never ships them into a watch dir).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `.claude/skills/argus/templates/claude/workflows/argus-cycle.js` | The per-research-cycle Workflow: control flow, schemas, prompt builders, adversarial verify. Self-contained (no imports). | Create |
| `.claude/skills/argus/test/argus-cycle.harness.mjs` | Node test that wraps the workflow body with stubbed globals and asserts control-flow behavior (empty plan, no-budget, budgeted-verify). | Create |
| `.claude/skills/argus/test/bootstrap.test.sh` | Bash test: bootstrap into a temp dir, assert `.claude/workflows/argus-cycle.js` lands. | Create |
| `.claude/skills/argus/test/run.sh` | Tiny runner: executes the harness + bootstrap tests, exits non-zero on any failure. | Create |
| `.claude/skills/argus/scripts/bootstrap.sh` | Add a copy step for `templates/claude/workflows/` → `$TARGET/.claude/workflows/`. | Modify |
| `.claude/skills/argus/SKILL.md` | Flow A step 8 loop body → fire Workflow / synthesis agent; step 5 option relabel; budget guidance; delete watchdog/sleep/presumed-hung prose. | Modify |
| `.claude/skills/argus/templates/claude/loop.md` | Pure-prompt quality bumps (refute-before-write, honesty gate); annotate orchestration sections as cron-path-only. | Modify |
| `.claude/skills/argus/templates/claude/loop-summary.md` | Completeness self-check on `[Ref: …]`; stays single-threaded. | Modify |
| `.claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md` | Append Amendment K (workflow/ultracode engine). | Modify |

No app/, frontend-contract, validate-contract, topic.yaml-schema, or cron-path files change.

---

## Task 1: Create the per-cycle workflow script + harness test

**Files:**
- Create: `.claude/skills/argus/test/argus-cycle.harness.mjs`
- Create: `.claude/skills/argus/templates/claude/workflows/argus-cycle.js`

- [ ] **Step 1: Write the failing harness test**

Create `.claude/skills/argus/test/argus-cycle.harness.mjs` with the full content below. It loads the workflow file as text, replaces `export const meta` with `const meta`, wraps the body in an async IIFE inside a `new Function` (so top-level `await`/`return` are legal), injects the workflow globals as parameters, and drives three scenarios.

```javascript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'

const __dir = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(__dir, '..', 'templates', 'claude', 'workflows', 'argus-cycle.js')

// Build a callable from the workflow script: strip the ESM export, wrap so that
// the script's top-level `await` and `return` run inside an async function, and
// expose the workflow globals as parameters.
function loadCycle() {
  const raw = readFileSync(SCRIPT, 'utf8').replace(/^export const meta/m, 'const meta')
  const fn = new Function(
    'agent', 'parallel', 'pipeline', 'budget', 'args', 'log', 'phase',
    `return (async () => {\n${raw}\n})()`
  )
  return fn
}

// Faithful-enough stand-ins for the workflow runtime primitives.
const parallel = (thunks) => Promise.all(thunks.map((t) => t()))
const pipeline = async (items, ...stages) => {
  const out = []
  for (let i = 0; i < items.length; i++) {
    let v = items[i]
    for (const stage of stages) v = await stage(v, items[i], i)
    out.push(v)
  }
  return out
}
const noop = () => {}

// Configurable agent stub. Routes on opts.phase / opts.label and records calls.
function makeAgent(cfg) {
  const calls = []
  const agent = async (prompt, opts = {}) => {
    calls.push({ prompt, ...opts })
    const label = opts.label || ''
    if (opts.phase === 'Plan') return cfg.plan
    if (label.startsWith('read:')) {
      const slug = label.slice('read:'.length)
      return { ...cfg.record(slug), slug }
    }
    if (label.startsWith('refute:')) return cfg.verdict(label)
    if (label.startsWith('annotate:')) return { annotated: true }
    if (opts.phase === 'Collate') return cfg.collation
    throw new Error('unexpected agent call: ' + JSON.stringify(opts))
  }
  agent.calls = calls
  return agent
}

const baseArgs = { slug: 't', dir: 'topics/t', cycle: 3, today: '2026-06-16' }
const noBudget = { total: null, remaining: () => Infinity, spent: () => 0 }
const bigBudget = { total: 1_000_000, remaining: () => 1_000_000, spent: () => 0 }

let failures = 0
async function scenario(name, fn) {
  try { await fn(); console.log('ok   - ' + name) }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n      ' + e.message) }
}

// Scenario 1: empty plan → early return, no read/collate.
await scenario('empty plan returns no-new and skips read/collate', async () => {
  const agent = makeAgent({ plan: { candidates: [] } })
  const result = await loadCycle()(agent, parallel, pipeline, noBudget, baseArgs, noop, noop)
  assert.equal(result.new_works_added, 0)
  assert.match(result.narrative, /no new/i)
  assert.equal(agent.calls.filter((c) => (c.label || '').startsWith('read:')).length, 0)
  assert.equal(agent.calls.filter((c) => c.phase === 'Collate').length, 0)
})

// Scenario 2: candidates, NO budget → verify disabled, fanout=3, read per candidate, one collate.
await scenario('no budget: reads per candidate, no verify, single collate', async () => {
  const agent = makeAgent({
    plan: { candidates: [{ slug: 'a', title: 'A', url: 'u', primary_route: 'r', intended_depth: 'deep' },
                          { slug: 'b', title: 'B', url: 'u', primary_route: 'r', intended_depth: 'deep' }] },
    record: () => ({ title: 'X', year: 2025, analysis_depth: 'deep', record_written: true, key_claims: [] }),
    collation: { works_added: 2, depth_upgrades: 0, flagged_claims: 0, narrative: 'added 2' },
  })
  const result = await loadCycle()(agent, parallel, pipeline, noBudget, baseArgs, noop, noop)
  assert.equal(agent.calls.filter((c) => (c.label || '').startsWith('refute:')).length, 0)
  assert.equal(agent.calls.filter((c) => (c.label || '').startsWith('read:')).length, 2)
  assert.equal(agent.calls.filter((c) => c.phase === 'Collate').length, 1)
  assert.equal(result.new_works_added, 2)
  assert.ok(agent.calls.find((c) => c.phase === 'Plan').prompt.includes('up to 3'))
})

// Scenario 3: budget set → verify runs (3 lenses per claim), fanout scales, annotate fires on 'overstated'.
await scenario('budget: adversarial verify runs and scales fanout', async () => {
  const agent = makeAgent({
    plan: { candidates: [{ slug: 'a', title: 'A', url: 'u', primary_route: 'r', intended_depth: 'deep' }] },
    record: () => ({ title: 'X', year: 2025, analysis_depth: 'deep', record_written: true,
                     key_claims: [{ id: 'c1', text: 'reusable', kind: 'transfer' }] }),
    verdict: (label) => ({ claim_id: 'c1', lens: label.split(':').pop(), verdict: 'overstated', note: 'n' }),
    collation: { works_added: 1, depth_upgrades: 0, flagged_claims: 1, narrative: 'added 1' },
  })
  await loadCycle()(agent, parallel, pipeline, bigBudget, baseArgs, noop, noop)
  // 1 candidate × 1 claim × 3 lenses = 3 refute calls
  assert.equal(agent.calls.filter((c) => (c.label || '').startsWith('refute:')).length, 3)
  assert.equal(agent.calls.filter((c) => (c.label || '').startsWith('annotate:')).length, 1)
  assert.ok(agent.calls.find((c) => c.phase === 'Plan').prompt.includes('up to 6')) // floor(1e6/150000)=6
})

console.log(failures === 0 ? '\nall harness scenarios passed' : `\n${failures} scenario(s) failed`)
process.exit(failures === 0 ? 0 : 1)
```

- [ ] **Step 2: Run the harness to verify it fails**

Run: `node .claude/skills/argus/test/argus-cycle.harness.mjs`
Expected: FAIL — `readFileSync` throws `ENOENT` because `templates/claude/workflows/argus-cycle.js` does not exist yet (non-zero exit).

- [ ] **Step 3: Create the workflow script**

Create `.claude/skills/argus/templates/claude/workflows/argus-cycle.js` with this exact content:

```javascript
export const meta = {
  name: 'argus-cycle',
  description: 'One Argus research cycle: plan, deep-read, adversarially verify, collate',
  phases: [
    { title: 'Plan' },
    { title: 'Deep-read' },
    { title: 'Verify' },
    { title: 'Collate' },
  ],
}

// ── Output schemas (JSON Schema; the workflow runtime forces agents to match) ──
const PLAN_SCHEMA = {
  type: 'object', required: ['candidates'], properties: {
    candidates: { type: 'array', items: {
      type: 'object', required: ['slug', 'title', 'url', 'primary_route', 'intended_depth'], properties: {
        slug: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' },
        primary_route: { type: 'string' },
        existing_depth: { type: ['string', 'null'], enum: ['shallow', 'medium', 'deep', null] },
        intended_depth: { type: 'string', enum: ['shallow', 'medium', 'deep'] },
        why_new: { type: 'string' } } } },
    under_covered_routes: { type: 'array', items: { type: 'string' } },
    weak_report_claims: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' } } }

const RECORD_SCHEMA = {
  type: 'object', required: ['slug', 'analysis_depth', 'record_written'], properties: {
    slug: { type: 'string' }, title: { type: 'string' }, year: { type: ['integer', 'null'] },
    analysis_depth: { type: 'string', enum: ['shallow', 'medium', 'deep'] },
    record_written: { type: 'boolean' },
    key_claims: { type: 'array', items: { type: 'object', required: ['id', 'text', 'kind'], properties: {
      id: { type: 'string' }, text: { type: 'string' },
      kind: { type: 'string', enum: ['mechanism', 'transfer', 'evidence'] } } } },
    proposed_graph_edges: { type: 'array', items: { type: 'object' } },
    proposed_route_index_updates: { type: 'object' },
    proposed_search_log_entry: { type: 'object' },
    notes: { type: 'string' } } }

const VERDICT_SCHEMA = {
  type: 'object', required: ['claim_id', 'lens', 'verdict'], properties: {
    claim_id: { type: 'string' }, lens: { type: 'string', enum: ['mechanism', 'transfer', 'evidence'] },
    verdict: { type: 'string', enum: ['holds', 'overstated', 'wrong'] }, note: { type: 'string' } } }

const ANNOTATE_SCHEMA = {
  type: 'object', required: ['annotated', 'slug'], properties: {
    annotated: { type: 'boolean' }, slug: { type: 'string' } } }

const COLLATE_SCHEMA = {
  type: 'object', required: ['works_added', 'depth_upgrades', 'flagged_claims', 'narrative'], properties: {
    works_added: { type: 'integer' }, depth_upgrades: { type: 'integer' },
    edges_added: { type: 'integer' }, flagged_claims: { type: 'integer' },
    residual_violations: { type: 'array', items: { type: 'string' } },
    narrative: { type: 'string' } } }

// ── Pure helpers ──
function computeFanout(b) {
  if (!b || !b.total) return 3
  return Math.min(8, Math.max(2, Math.floor(b.remaining() / 150000)))
}

// ── Prompt builders (agents read the bootstrapped methodology; prompts stay self-contained) ──
function planPrompt(slug, dir, cycle, fanout) {
  return [
    `You are the Argus research planner for topic \`${slug}\` at \`${dir}\` (cycle ${cycle}).`,
    `Read, in order: ${dir}/topic.yaml, ${dir}/indexes/master_index.jsonl, ${dir}/indexes/route_index.json,`,
    `${dir}/indexes/knowledge_graph.json, ${dir}/report/main.md, ${dir}/logs/research_state.md.`,
    `Follow the "Iteration Protocol" and "Dedup gate" in .claude/loop.md: build the dedup ledger, then choose`,
    `up to ${fanout} candidate works that satisfy topic.yaml.iteration_mix (new/deepen/challenge minimums).`,
    `Apply the dedup gate: SKIP slugs already at analysis_depth deep; mark shallow/medium ones as upgrades`,
    `(set existing_depth so the reader extends, never reduces); when a title closely matches an existing record,`,
    `reuse that existing slug. Do NOT dispatch any reading and do NOT write any files.`,
    `Return ONLY the planned candidates as JSON matching the schema. If nothing genuinely new remains, return an empty candidates array.`,
  ].join('\n')
}

function readPrompt(c, dir) {
  const upg = c.existing_depth ? `, existing_depth ${c.existing_depth} (extend the existing record, never reduce it)` : ''
  return [
    `You are an Argus paper-reader for the topic at \`${dir}\`. Deep-read exactly ONE work:`,
    `"${c.title}" — ${c.url} (slug ${c.slug}, primary_route ${c.primary_route}${upg}).`,
    `Follow .claude/loop.md sections "Deep Analysis Standard", "Collection Rules", "Structured Records".`,
    `Fill every required topic.yaml.record_fields[]. Write ONLY your own two files:`,
    `${dir}/records/works_json/${c.slug}.json and ${dir}/records/works_md/${c.slug}.md.`,
    `PER-WORK ISOLATION (hard): do NOT touch knowledge_graph.json, master_index.jsonl, route_index.json,`,
    `research_state.md, search_log.jsonl, or any other shared file — those belong to the collation editor.`,
    `Surface up to 5 key_claims (kind mechanism|transfer|evidence) a skeptic should check.`,
    `Self-limit: if this exceeds ~6 min or ~20 turns, downgrade analysis_depth, write the partial record, and return.`,
    `Return JSON matching the schema (set record_written true only if both files were written).`,
  ].join('\n')
}

function refutePrompt(claim, rec, dir, lens) {
  const lensDef = {
    mechanism: 'is the described technical mechanism accurate to the primary source?',
    transfer: "does the claimed reusability actually hold for this topic's scope_in, or is it overstated?",
    evidence: 'is analysis_depth honest given what the source actually supports?',
  }[lens]
  return [
    `You are a skeptical reviewer. The Argus record ${dir}/records/works_json/${rec.slug}.json asserts this claim:`,
    `"${claim.text}" (kind: ${claim.kind}).`,
    `Adversarially try to REFUTE it through the ${lens} lens: ${lensDef}`,
    `Read the primary source and the record. Default to "overstated" if you are uncertain. Do NOT write any file.`,
    `Return JSON {claim_id:"${claim.id}", lens:"${lens}", verdict, note}.`,
  ].join('\n')
}

function annotatePrompt(rec, dir, overstated) {
  return [
    `Update ONLY ${dir}/records/works_json/${rec.slug}.json (its own file — no shared files).`,
    `For each flagged claim, add a "verification" entry {claim_id, verdict, note}. If a mechanism/transfer claim`,
    `is "wrong" and it underpinned a deep label, lower the record's confidence and downgrade analysis_depth one step.`,
    `Flagged: ${JSON.stringify(overstated)}.`,
    `Return JSON {annotated:true, slug:"${rec.slug}"}.`,
  ].join('\n')
}

function collatePrompt(slug, dir, records) {
  const proposals = records.map((r) => ({
    slug: r.slug, analysis_depth: r.analysis_depth,
    proposed_graph_edges: r.proposed_graph_edges, proposed_route_index_updates: r.proposed_route_index_updates,
    proposed_search_log_entry: r.proposed_search_log_entry, flagged: r.flagged || 0, verdicts: r.verdicts || [],
  }))
  return [
    `You are the Argus collation editor for topic \`${slug}\` at \`${dir}\`. ${records.length} per-work records were`,
    `written this cycle. You are the SINGLE writer of the shared files. Follow .claude/loop.md "Parent post-collation phase":`,
    `merge proposed_graph_edges into indexes/knowledge_graph.json (dedupe by (src,dst,rel); ensure every new`,
    `work:<slug> node has a belongs_to_route edge), append one line per record to indexes/master_index.jsonl,`,
    `merge route updates into indexes/route_index.json, append search-log entries to logs/search_log.jsonl, and`,
    `write this cycle's narrative to logs/research_state.md (note any flagged claims). Then run`,
    `\`bash .claude/skills/argus/scripts/validate-contract.sh --fix ${slug}\` and record residual violations under`,
    `a "## contract_violations" heading. Per-record proposals: ${JSON.stringify(proposals)}.`,
    `Return counts JSON matching the schema.`,
  ].join('\n')
}

// ── Adversarial verify (ultracode): refute each record's key claims from 3 lenses ──
async function verifyRecord(rec, dir) {
  if (!rec || !rec.record_written) return rec
  const claims = (rec.key_claims || []).slice(0, 3)
  if (!claims.length) return rec
  const lenses = ['mechanism', 'transfer', 'evidence']
  const verdicts = (await parallel(
    claims.flatMap((claim) => lenses.map((lens) => () =>
      agent(refutePrompt(claim, rec, dir, lens), {
        phase: 'Verify', label: `refute:${rec.slug}:${claim.id}:${lens}`, schema: VERDICT_SCHEMA,
      })))
  )).filter(Boolean)
  const overstated = verdicts.filter((v) => v.verdict === 'overstated' || v.verdict === 'wrong')
  if (overstated.length) {
    await agent(annotatePrompt(rec, dir, overstated), {
      phase: 'Verify', label: `annotate:${rec.slug}`, schema: ANNOTATE_SCHEMA,
    })
  }
  return { ...rec, verdicts, flagged: overstated.length }
}

// ── Main: one research cycle ──
const { slug, dir, cycle } = args
const FANOUT = computeFanout(budget)
const VERIFY = !!(budget && budget.total)
log(`argus cycle ${cycle}: fanout=${FANOUT} verify=${VERIFY}`)

const plan = await agent(planPrompt(slug, dir, cycle, FANOUT), { phase: 'Plan', schema: PLAN_SCHEMA })

if (!plan.candidates || !plan.candidates.length) {
  return {
    mode: 'RESEARCH', cycle, candidates_processed: 0, new_works_added: 0,
    depth_upgrades: 0, flagged_claims: 0, saturation_signal: false, narrative: 'no new directions',
  }
}

const records = await pipeline(
  plan.candidates,
  (c) => agent(readPrompt(c, dir), { phase: 'Deep-read', label: `read:${c.slug}`, schema: RECORD_SCHEMA }),
  (rec) => (VERIFY ? verifyRecord(rec, dir) : rec)
)

const kept = records.filter(Boolean)
const collation = await agent(collatePrompt(slug, dir, kept), { phase: 'Collate', schema: COLLATE_SCHEMA })

return {
  mode: 'RESEARCH', cycle, candidates_processed: records.length,
  new_works_added: collation.works_added, depth_upgrades: collation.depth_upgrades,
  flagged_claims: collation.flagged_claims, saturation_signal: false, narrative: collation.narrative,
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run: `node .claude/skills/argus/test/argus-cycle.harness.mjs`
Expected: PASS — three `ok   - …` lines and `all harness scenarios passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/argus/templates/claude/workflows/argus-cycle.js .claude/skills/argus/test/argus-cycle.harness.mjs
git commit -m "feat(argus): per-cycle workflow engine with adversarial verify + harness test"
```

---

## Task 2: Bootstrap copies the workflow + bootstrap test

**Files:**
- Create: `.claude/skills/argus/test/bootstrap.test.sh`
- Create: `.claude/skills/argus/test/run.sh`
- Modify: `.claude/skills/argus/scripts/bootstrap.sh`

- [ ] **Step 1: Write the failing bootstrap test**

Create `.claude/skills/argus/test/bootstrap.test.sh`:

```bash
#!/usr/bin/env bash
# Verifies bootstrap.sh copies the workflow template into a fresh watch dir.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP="$SCRIPT_DIR/../scripts/bootstrap.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bash "$BOOTSTRAP" "$TMP" >/dev/null

fail=0
for f in .claude/loop.md .claude/loop-summary.md .claude/commands/argus.md .claude/workflows/argus-cycle.js; do
  if [ ! -f "$TMP/$f" ]; then echo "MISSING: $f"; fail=1; fi
done
if [ "$fail" -eq 0 ]; then echo "ok   - bootstrap copies workflows + engine files"; else echo "FAIL - bootstrap"; fi
exit "$fail"
```

Make it executable: `chmod +x .claude/skills/argus/test/bootstrap.test.sh`

- [ ] **Step 2: Run it to verify it fails**

Run: `bash .claude/skills/argus/test/bootstrap.test.sh`
Expected: FAIL — prints `MISSING: .claude/workflows/argus-cycle.js` and exits non-zero (bootstrap doesn't copy workflows yet).

- [ ] **Step 3: Add the workflow copy step to bootstrap.sh**

In `.claude/skills/argus/scripts/bootstrap.sh`, find this block (the `.claude/` engine files section, currently ending after the `commands/argus.md` copy):

```bash
cp -f "$TEMPLATES/claude/commands/argus.md" "$TARGET/.claude/commands/argus.md"
echo "  + .claude/loop.md"
echo "  + .claude/loop-summary.md"
echo "  + .claude/commands/argus.md"
```

Replace it with (adds a `workflows/` copy):

```bash
cp -f "$TEMPLATES/claude/commands/argus.md" "$TARGET/.claude/commands/argus.md"
mkdir -p "$TARGET/.claude/workflows"
cp -f "$TEMPLATES/claude/workflows/argus-cycle.js" "$TARGET/.claude/workflows/argus-cycle.js"
echo "  + .claude/loop.md"
echo "  + .claude/loop-summary.md"
echo "  + .claude/commands/argus.md"
echo "  + .claude/workflows/argus-cycle.js"
```

- [ ] **Step 4: Run the bootstrap test to verify it passes**

Run: `bash .claude/skills/argus/test/bootstrap.test.sh`
Expected: PASS — `ok   - bootstrap copies workflows + engine files`, exit 0.

- [ ] **Step 5: Write the combined runner**

Create `.claude/skills/argus/test/run.sh`:

```bash
#!/usr/bin/env bash
# Runs all Argus engine-development tests. Exits non-zero if any fail.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rc=0
echo "== argus-cycle harness =="
node "$SCRIPT_DIR/argus-cycle.harness.mjs" || rc=1
echo "== bootstrap test =="
bash "$SCRIPT_DIR/bootstrap.test.sh" || rc=1
echo ""
[ "$rc" -eq 0 ] && echo "ALL ARGUS TESTS PASSED" || echo "SOME ARGUS TESTS FAILED"
exit "$rc"
```

Make it executable: `chmod +x .claude/skills/argus/test/run.sh`

- [ ] **Step 6: Run the full suite**

Run: `bash .claude/skills/argus/test/run.sh`
Expected: both sections pass; final line `ALL ARGUS TESTS PASSED`, exit 0.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/argus/scripts/bootstrap.sh .claude/skills/argus/test/bootstrap.test.sh .claude/skills/argus/test/run.sh
git commit -m "feat(argus): bootstrap copies workflow template; add engine test runner"
```

---

## Task 3: Rewrite SKILL.md orchestration (Flow A steps 5 + 8) for the workflow engine

**Files:**
- Modify: `.claude/skills/argus/SKILL.md`

This task is prose. There is no unit test; verification is a structural grep plus reading. The edits replace the hand-rolled Agent-dispatch + two `Bash sleep` watchdogs with a Workflow call, relabel the step-5 option, and add budget guidance.

- [ ] **Step 1: Relabel the in-session option in Flow A step 5**

In `.claude/skills/argus/SKILL.md`, find this option line (under step 5's `AskUserQuestion` options):

```
   - `Run it here in this session (recommended)` — skill orchestrates, no further typing needed; loop dies when you close Claude Code, but state persists on disk and you can resume any time by re-triggering this skill
```

Replace it with:

```
   - `Run it here in this session — workflow engine (recommended)` — skill orchestrates via the per-cycle Workflow (`.claude/workflows/argus-cycle.js`), no further typing needed. Each research cycle fans out deep-reads and (when you set a token budget) adversarial claim verification. Loop dies when you close Claude Code, but state persists on disk and you can resume any time by re-triggering this skill. Tip: prefix your request with a token budget like `+800k` to scale fan-out depth and enable verification.
```

- [ ] **Step 2: Replace the step-8 loop body**

In `.claude/skills/argus/SKILL.md`, replace the entire block from `**Loop body — repeat until a stop condition (step 9) fires:**` through the end of substep `j.` (the line `j. Loop back to step (a) for the next iteration.`) with the following:

````
   **Loop body — repeat until a stop condition (step 9) fires:**

   a. Read `topics/<slug>/logs/cycle.txt` once at loop entry into an in-memory `N` (single integer). Each pass: `next_cycle = N + 1`. Read `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default 7). Decide `mode = (next_cycle % synthesis_every_n_cycles == 0 && next_cycle > 0) ? "SYNTHESIS" : "RESEARCH"`. **Emit notice:** `info`, "Cycle <next_cycle> starting (mode=<mode>)".

   b. **Run the cycle.**

      - **RESEARCH** → call the **Workflow** tool with `scriptPath: ".claude/workflows/argus-cycle.js"` and `args: { "slug": "<slug>", "dir": "topics/<slug>", "cycle": <next_cycle>, "today": "<YYYY-MM-DD>" }`. The workflow runs plan → parallel deep-read → (budget-gated) adversarial verify → single-writer collate → `validate-contract.sh --fix`, and returns a structured summary: `{mode, cycle, candidates_processed, new_works_added, depth_upgrades, flagged_claims, saturation_signal, narrative}`. Do NOT pass a fan-out count — the workflow derives it from the turn's token budget (`+Nk` directive). The Workflow tool returns when every agent has joined or failed; you do not poll or sleep.

      - **SYNTHESIS** → dispatch ONE synthesis agent with the `Agent` tool (`subagent_type: "general-purpose"`, `run_in_background: true`). Synthesis is single-threaded — do NOT use the workflow here. The prompt MUST be self-contained: literal `TOPIC_SLUG`/`TOPIC_DIR`, `mode = SYNTHESIS`, `next_cycle = <N>`, the instruction "Read `.claude/loop-summary.md` and execute exactly ONE synthesis iteration", the hard rule "Do NOT touch `topics/<slug>/logs/cycle.txt`", and this return schema: `{mode, cycle, saturation_signal, narrative}`.

   c. **Collect the result.** For RESEARCH, the Workflow tool result is the structured summary. For SYNTHESIS, parse the agent's returned summary. There is no watchdog and no inter-cycle sleep — the workflow/agent has fully completed (all sub-agents joined; collation and file writes are done) before control returns to you.

   d. **Parent updates `cycle.txt`** (the ONE shared file the orchestrator writes directly): overwrite with `next_cycle` + newline, then set in-memory `N = next_cycle`. Runner/synthesis agents are forbidden from this file. Only advance `cycle.txt` on a successful return; if the cycle errored (see step 9 STOP_BLOCKER), leave it so a re-fire is idempotent.

   e. **Append orchestrator log** to `topics/<slug>/logs/orchestrator.jsonl` (create if missing):
      ```json
      {"ts": "<ISO>", "cycle": <next_cycle>, "mode": "...", "summary": "<narrative>", "new_works": <int>, "flagged_claims": <int>}
      ```

   f. **Counters** (in-memory only):
      - RESEARCH & `new_works_added == 0` → `dry_rounds++`. If `dry_rounds >= 2` → trigger STOP_SATURATED.
      - RESEARCH & `new_works_added > 0` → `dry_rounds = 0`.
      - SYNTHESIS & `saturation_signal == true` → `saturation_count++`. If `saturation_count >= 3` → trigger STOP_SATURATED.
      - SYNTHESIS & `saturation_signal == false` → `saturation_count = 0`.

   g. **Emit notice:** `info`, "Cycle <next_cycle> done: +<new_works_added> works, +<depth_upgrades> upgrades, <flagged_claims> flagged".

   h. **Context-exhaustion self-check** (every ~10 cycles): the orchestrator now holds only per-cycle summaries (the fan-out context lives inside each workflow, not here), so the ceiling is high — but if your own context still approaches ~80% of capacity, trigger STOP_CONTEXT.

   i. Loop back to step (a) for the next cycle.
````

- [ ] **Step 3: Delete the now-obsolete dispatch/watchdog prose in step 8b–8e**

In `.claude/skills/argus/SKILL.md`, the original step 8 contained a `b. **Dispatch ONE iteration runner subagent.**` block, a `c. **Watchdog:** call Bash ... sleep 420` block, a `d.` parse/unnotified block, an `e.` cycle.txt block, a `g. **Saturation counter**` block, and an `h. **Inter-iteration pause:** Bash sleep 30` block. These are fully replaced by the Step 2 rewrite above. Confirm none of the following strings remain anywhere in step 8: `sleep 420`, `sleep 30`, `iteration_runner_unnotified`, `Watchdog`. Remove any leftover fragments.

- [ ] **Step 4: Update the "Things this skill must NOT do" list**

In `.claude/skills/argus/SKILL.md`, find this bullet:

```
- Do not kill iteration runner subagents. There's no Agent kill primitive; the watchdog is the `Bash sleep` budget, not active termination. Hung runners die with the Claude Code session.
```

Replace it with:

```
- Do not hand-roll subagent watchdogs. The RESEARCH cycle runs as a Workflow (`.claude/workflows/argus-cycle.js`), which joins or fails its agents natively — no `Bash sleep` budget, no manual "presumed hung" bookkeeping. The SYNTHESIS cycle is a single `Agent` dispatch.
```

- [ ] **Step 5: Update the Notice emission table row for cycle start/end**

In `.claude/skills/argus/SKILL.md`, in the "Required emit points" table, the rows referencing `step 8a` / `step 8d/e` and "Runner unnotified after watchdog" should reflect the new substeps. Find the row:

```
| Runner unnotified after watchdog (step 8d) | per-topic | `attention` | "Cycle <N> runner: no response after 7m. Continuing." |
```

Delete that entire table row (there is no watchdog anymore). Leave the cycle-start and cycle-done rows, updating their step references from `8a`/`8d/e` to `8a`/`8g`.

- [ ] **Step 6: Verify the edits structurally**

Run: `grep -nE 'sleep 420|sleep 30|iteration_runner_unnotified|no response after 7m' .claude/skills/argus/SKILL.md`
Expected: no output (all watchdog prose gone).

Run: `grep -nE 'argus-cycle\.js|workflow engine|Workflow tool|\+800k|\+Nk' .claude/skills/argus/SKILL.md`
Expected: several matches (the new workflow prose is present).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/argus/SKILL.md
git commit -m "feat(argus): drive in-session cycles via per-cycle Workflow, drop Bash-sleep watchdogs"
```

---

## Task 4: Pure-prompt quality bumps in loop.md (benefit both paths)

**Files:**
- Modify: `.claude/skills/argus/templates/claude/loop.md`

Prose edits to the researcher methodology. These help the cron path AND give the workflow's read agents the standard to follow.

- [ ] **Step 1: Add the refute-before-write rule to the Deep Analysis Standard**

In `.claude/skills/argus/templates/claude/loop.md`, find the "## Deep Analysis Standard" section. After its existing paragraph that ends `Never pretend shallow understanding is deep understanding.`, append:

```
**Refute-before-write (hard).** Before you keep any *transfer* or *mechanism* claim in a record, state — to yourself — the strongest reason it could be wrong or overstated for THIS topic's `scope_in`. Keep the claim only if it survives that challenge; otherwise weaken it, scope it, or drop it. A record that quietly inflates reusability is worse than one that honestly marks a claim as unverified.

**Honesty gate on `analysis_depth` (hard).** Do not write `deep` unless you actually extracted the mechanism, the ablations/evidence, AND the transfer assessment. If any of those is missing, the record is at most `medium`. Surface the strongest 3-5 `key_claims` (mechanism / transfer / evidence) so a downstream skeptic can check them.
```

- [ ] **Step 2: Mark the orchestration sections as cron-path mechanics**

In `.claude/skills/argus/templates/claude/loop.md`, find the heading `## Parallel Deep-Read via Subagents`. Immediately under that heading (before its first paragraph), insert this note:

```
> **Path note.** The mechanics in this section (manual subagent dispatch, the `Bash sleep` parent watchdog, and the parent post-collation phase) are how the **cron `/argus loop` path** runs a multi-work iteration inside a single plain session. The **in-session path supersedes them** with `.claude/workflows/argus-cycle.js`, which expresses the same plan → parallel-read → collate shape using the Workflow tool's native `parallel()`/`pipeline()` (no `Bash sleep`, no "presumed hung" bookkeeping). The per-work isolation rule and the single-writer collation rule below apply identically to BOTH paths — only the dispatch/watchdog plumbing differs.
```

- [ ] **Step 3: Verify**

Run: `grep -nE 'Refute-before-write|Honesty gate|Path note|argus-cycle\.js' .claude/skills/argus/templates/claude/loop.md`
Expected: four matches (the three new anchors plus the workflow reference in the Path note).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/argus/templates/claude/loop.md
git commit -m "feat(argus): refute-before-write + honesty gate; mark cron-only orchestration sections"
```

---

## Task 5: Completeness self-check in loop-summary.md (stays single-threaded)

**Files:**
- Modify: `.claude/skills/argus/templates/claude/loop-summary.md`

- [ ] **Step 1: Add the completeness self-check to Core Principles**

In `.claude/skills/argus/templates/claude/loop-summary.md`, find the "## Core Principles" numbered list. After the existing item `6. Every important claim in the report must point back to one or more JSON records.`, insert a new item (renumber the following items accordingly, so the list stays sequential):

```
7. **Completeness self-check (hard).** For every `[Ref: …]` you write, confirm the cited record actually supports the sentence it backs — open the record if unsure. If a sentence has no record that genuinely supports it, either find one, weaken the sentence to what the evidence allows, or mark it explicitly as unverified. Do not let a citation imply support the record does not provide.
```

(The current items 7 and 8 become 8 and 9.)

- [ ] **Step 2: Verify**

Run: `grep -n 'Completeness self-check' .claude/skills/argus/templates/claude/loop-summary.md`
Expected: one match.

Run: `grep -nE '^[0-9]+\. ' .claude/skills/argus/templates/claude/loop-summary.md | head -20`
Expected: the Core Principles list is sequentially numbered with no duplicate numbers.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/argus/templates/claude/loop-summary.md
git commit -m "feat(argus): synthesis completeness self-check on citations"
```

---

## Task 6: Record Amendment K in the engine design doc

**Files:**
- Modify: `.claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md`

- [ ] **Step 1: Append Amendment K**

At the end of `.claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md`, append:

```markdown

---

## Amendment — 2026-06-16 (K):in-session orchestrator → per-cycle Workflow + ultracode quality

**Decision:** 把 Amendment J 的"skill 手搓 orchestration loop（dispatch Agent + 两层 `Bash sleep 420` watchdog + 手动 parse + presumed-hung 记账）"换成 **per-cycle Workflow**。每个 RESEARCH cycle = 一次 `Workflow(.claude/workflows/argus-cycle.js)` 调用：plan → 并行 deep-read → (budget-gated) 对抗式 verify → 单写者 collate → validate。SYNTHESIS cycle 保持单线程，直接 `Agent` dispatch（Amendment H 立场不变）。

**为什么:**
- Workflow 的 `agent({schema})` + `parallel()`/`pipeline()` 原生处理 fan-out-and-join，**两层 `Bash sleep 420` watchdog 整段删除**——不再有"即使 subagent 30 秒返回也要等满 7 分钟"的钟表浪费，也不再需要 `## subagent_unnotified` / `## iteration_runner_unnotified` 记账。
- Orchestrator 退化成一个 JS 控制流，几乎不持有 context，所以 **STOP_CONTEXT 风险大幅下降**（fan-out 的 context 在每个 workflow 内部，不在 skill）。
- ultracode：`budget` 原语让 fan-out 深度随用户 `+Nk` directive 伸缩；新增**对抗式 claim verification**（per record 派 2-3 个 perspective-diverse skeptic 去 refute mechanism/transfer/evidence claim，过半 overstated/wrong → 在该 record 自己的文件里 flag + 降级）——这是原 methodology 完全没有的能力。

**边界（keep）:**
- **Cron `/argus loop` 路径完全不动**：cron tick 是一个 plain isolated session，host 不了 Workflow，继续用 `loop.md`/`loop-summary.md` 的手搓 mechanics。Workflow 是 session-bound background task，不跨 Claude Code 重启——这正是 cron 仍然存在的理由。
- Dashboard、`frontend-contract.md`、`validate-contract.sh`、`topic.yaml` schema、`topics/<slug>/` 数据布局：全部不变。
- `cycle.txt` 单写者原则不变：**skill** 在 workflow 返回后写它；runner/synthesis agent 仍禁止碰。

**Workflow sandbox 约束（设计要点）:** Workflow script 无文件系统访问、不能 `Date.now()`。所以 JS 只持控制流 + schema，**所有读写都由 agent 做**；`slug/dir/cycle/today` 经 `args` 传入；`budget` 是 ambient（不经 args）。

**双层 quality 分层:**
- **Prompt-level**（refute-before-write、honesty gate on `analysis_depth`、synthesis completeness self-check）写进 `loop.md`/`loop-summary.md` → cron + workflow 两条路都受益。
- **Orchestration-level**（并行对抗 verify、budget-scaled fan-out、loop-until-dry）写进 workflow script → 仅 workflow 路。

**测试:** `.claude/skills/argus/test/` 下新增 harness（stub 注入 workflow globals 跑控制流断言）+ bootstrap 拷贝测试，`run.sh` 汇总。Dashboard vitest 不受影响。

**Spec:** `docs/superpowers/specs/2026-06-16-argus-workflow-ultracode-engine-design.md`；实现 plan：`docs/superpowers/plans/2026-06-16-argus-workflow-ultracode-engine.md`。
```

- [ ] **Step 2: Verify**

Run: `grep -n 'Amendment — 2026-06-16 (K)' .claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md`
Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md
git commit -m "docs(argus): record Amendment K — per-cycle Workflow + ultracode quality"
```

---

## Task 7: Final verification & regression

**Files:** none (verification only).

- [ ] **Step 1: Run the full Argus engine test suite**

Run: `bash .claude/skills/argus/test/run.sh`
Expected: `ALL ARGUS TESTS PASSED`, exit 0.

- [ ] **Step 2: Dashboard regression — vitest still green**

Run: `cd app && npm test` (run `npm install` first only if `app/node_modules` is absent), then return to repo root.
Expected: the existing `src/lib/*` and `src/state/*` vitest suites pass (we changed nothing under `app/`). If `npm install` is undesirable in this environment, instead confirm no files under `app/` were modified: `git diff --name-only main... -- app/` → expected empty.

- [ ] **Step 3: Doc-consistency check — skill references the path bootstrap creates**

Run: `grep -rn 'argus-cycle.js' .claude/skills/argus/SKILL.md .claude/skills/argus/scripts/bootstrap.sh .claude/skills/argus/templates/claude/loop.md`
Expected: the same path `.claude/workflows/argus-cycle.js` appears in SKILL.md (the Workflow call), bootstrap.sh (the copy), and loop.md (the Path note).

- [ ] **Step 4: Manual integration smoke (documented, optional — costs tokens)**

This is the only end-to-end check that actually spends agent tokens; run it once when validating for real, not on every change.

1. Copy the tracked fixture to a scratch watch dir and bootstrap it:
   ```bash
   rm -rf /tmp/argus-smoke && mkdir -p /tmp/argus-smoke && cp -r test/topics /tmp/argus-smoke/
   bash .claude/skills/argus/scripts/bootstrap.sh /tmp/argus-smoke
   ```
2. From a Claude Code session opened at `/tmp/argus-smoke`, invoke the Workflow tool with `scriptPath: ".claude/workflows/argus-cycle.js"`, `args: {slug:"open-source-agent-frameworks", dir:"topics/open-source-agent-frameworks", cycle:1, today:"2026-06-16"}`.
3. Expected after it returns: at least one new/updated file under `topics/open-source-agent-frameworks/records/works_json/`, an updated `indexes/knowledge_graph.json`, and `bash .claude/skills/argus/scripts/validate-contract.sh open-source-agent-frameworks` exits 0 (or logs only known residual violations).

- [ ] **Step 5: Final commit (only if Step 2's `git diff` confirmation or any cleanup produced changes)**

```bash
git add -A
git commit -m "test(argus): final verification of workflow engine conversion" || echo "nothing to commit"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** D1 per-cycle workflow → Tasks 1, 3. D2 cron untouched → enforced by scope (no cron files in any task) + Task 4 Path note + Amendment K. D3 both axes → Task 1 (engine) + Tasks 1/4/5 (quality). D4 single-threaded synthesis via Agent → Task 3 Step 2 SYNTHESIS branch. D5 budget-gated verify → Task 1 (`VERIFY = !!budget.total`) + harness Scenario 3. D6 both doc homes → spec (already committed) + Task 6 Amendment K. Watchdog deletion → Task 3 Steps 3–5. Bootstrap → Task 2. Tests → Tasks 1, 2, 7.
- **Placeholder scan:** none — every code/prompt/edit step contains literal content; no "TBD"/"handle errors"/"similar to".
- **Type consistency:** the workflow return shape `{mode, cycle, candidates_processed, new_works_added, depth_upgrades, flagged_claims, saturation_signal, narrative}` is identical in `argus-cycle.js` (Task 1) and the skill's consumption (Task 3 step 8b/e/f/g). Schema names (`PLAN_SCHEMA`, `RECORD_SCHEMA`, `VERDICT_SCHEMA`, `ANNOTATE_SCHEMA`, `COLLATE_SCHEMA`) and helper names (`computeFanout`, `verifyRecord`) are used consistently. Harness stub field names (`works_added`, `key_claims`, `verdict`) match the script.
- **Scope:** single coherent subsystem (the in-session engine); fits one plan.
```
