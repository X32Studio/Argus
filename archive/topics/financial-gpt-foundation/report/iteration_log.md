# Iteration Log — Financial GPT / Foundation Model Training

## 2026-05-25 — iteration 1 (first synthesis)

**Files read:**
- `topics/financial-gpt-foundation/topic.yaml`
- `topics/financial-gpt-foundation/proposal.md`
- `topics/financial-gpt-foundation/records/works_json/bloomberggpt.json`
- `.claude/loop-summary.md`

**Files NOT read (because they don't exist yet):**
- `topics/financial-gpt-foundation/logs/search_log.jsonl`
- `topics/financial-gpt-foundation/logs/research_state.md`
- `topics/financial-gpt-foundation/indexes/*`
- `topics/financial-gpt-foundation/records/works_md/*`

**What changed in the main report:**
- Created `report/main.md` from scratch with all 9 sections from `topic.yaml.report_sections[]`.
- `how_the_research_evolved` is intentionally a stub — no `logs/` content exists to reconstruct intent from.

**Newly promoted must-read records:**
- `bloomberggpt.json` (the only record; trivially "must-read" at n=1).

**Newly identified weak or risky claims:**
- The bottom-line recommendation ("do not replicate BloombergGPT; build the FinPile-analogue corpus + continued pretrain on a stronger general open base") is explicitly marked **low confidence** because it rests on one extreme datapoint (from-scratch at 50B). Expect this to move materially once open-finance-LLM and continued-pretraining records land.
- Both `rlhf_dpo_finance` and `agentic_finance` routes carry `# UNCERTAIN:` markers in `topic.yaml` — these were accepted as-is at `/topic accept` time. Records landing in those routes should be scrutinized for fit.

**Sources fetched / files downloaded:**
- None this iteration.

**Publish step:**
- Skipped — `.../personal/autoresearch` is not a git repository (per session environment). No commit, no push.

## 2026-05-25 — iteration 2

**Files read (new since iteration 1):**
- `topics/financial-gpt-foundation/records/works_json/fingpt.json`
- `topics/financial-gpt-foundation/records/works_json/financebench.json`
- `topics/financial-gpt-foundation/logs/research_state.md`
- `topics/financial-gpt-foundation/indexes/master_index.jsonl`
- `topics/financial-gpt-foundation/indexes/route_index.json`
- `topics/financial-gpt-foundation/indexes/knowledge_graph.json`

**What changed in the main report:**
- Full rewrite of every section in `main.md`. The synthesis is no longer single-anchor.
- `executive_summary`: reframed as a 3-corner triangulation (BloombergGPT / FinGPT / FinanceBench) rather than a single-anchor extrapolation.
- `research_map`: replaced the "everything empty except DAP" table with a 6-of-10-routes-seeded map. Added cross-route theme that all three records have null architectural bets.
- `how_the_research_evolved`: now has actual content sourced from `logs/research_state.md` (iteration-1 deliberate triangulation strategy, the introduction of pitfall nodes as first-class entities).
- `high_value_technical_points`: rewritten around 5 points, including the new load-bearing observation that **closed-book is uninterpretable on real filings QA** (from FinanceBench).
- `what_seems_reusable`: expanded to 5 borrowable items, ranked by ROI. FinanceBench eval scoring is now the #1 borrow.
- `what_is_weak_shallow_or_risky`: now calls out FinGPT's contamination-prone benchmark claim, the structural absence of any record controlling for a stronger general baseline, and the proprietary-FinPile blocker on the data-curation route.
- `contradictions_and_open_questions`: surfaces the 2 graph-queued `contradicts` edges (H_fb1 → BloombergGPT; H_fg2 → FinGPT) as the highest-priority experiments to find external evidence on.
- `priority_reading_guide` and `reference_index.md`: promoted FinanceBench to must-read alongside BloombergGPT; FinGPT moved to important-supporting (paper) with the repo flagged as the actual valuable artifact.
- `bottom_line_synthesis`: directional recommendation is unchanged but is now **strengthened** by FinanceBench rather than reasoned-from-one-record. Specifically the "deployable side = retrieval + reasoning + refusal" framing is now sourced rather than inferred.

**Newly promoted must-read records:**
- `financebench.json` (medium depth, but the eval defines our deployment target).

**Newly identified weak or risky claims:**
- FinGPT's "competitive with BloombergGPT" claim is now explicitly tied to the `pitfall:eval_contamination` and `pitfall:base_attribution_confound` graph nodes; treated as benchmark-shallow and not as evidence that SFT closes the FM-level gap.
- All three records share the structural absence of a stronger-general-baseline control. This is now framed as "how the subfield publishes" rather than per-paper sloppiness — the in-house plan needs to defend against the pattern, not the papers.

**Sources fetched / files downloaded:**
- None this iteration. `logs/research_state.md` itself notes that BloombergGPT / FinanceBench / FinGPT could each be deepened via methods-section reads of the source PDFs; this should be a `sources/papers/` fetch pass in iteration 3 rather than the default "add more records" reflex.

**Publish step:**
- Skipped — not a git repository.
