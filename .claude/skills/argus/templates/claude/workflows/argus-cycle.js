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
