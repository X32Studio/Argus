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
