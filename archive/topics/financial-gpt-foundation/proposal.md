# Financial GPT / Foundation Model Training — Topic Framing

Structured config lives in `topic.yaml`. Read both.

## Why these 4 concept layers (not the 10 routes)

`execution_routes[]` are coverage scaffolding — stable search buckets to ensure the loop hasn't ignored, say, preference optimization or finance benchmarks. They do not tell you how to *reason* about a claim.

`concept_layers[]` (data / objective / backbone_and_scale / adaptation_and_eval) do. Every paper in this space decomposes cleanly along these four: what corpus, what learning signal, what carries it at what scale, and how is the resulting model adapted and measured. A claim is well-understood when you can pin down all four. A "shallow" record is one where any of these is hand-waved — most often **data** (vague corpus claims) or **evaluation** (leaderboard scores with no contamination check).

When records are tagged primarily by route, the report drifts toward "route X is good / route Y is bad" — vacuous. The real question is always: which concept-layer choice is load-bearing for the headline claim, and would it survive substitution?

## End goal is in-house training, not survey

This topic exists because the user wants to *train a financial foundation model in-house*. That fixes the value function: a record is high-value if it gives a concrete, borrowable signal on data, objective, backbone, or evaluation. A record is low-value if it is mostly a leaderboard report with no recipe.

Every record's `why_relevant_for_inhouse_training` and `deployment_risks` are therefore required. If a paper sounds exciting but has no plausible answer to "how would I borrow this for our training run," it goes in `low` reference value with a one-line note.

## Scope nuance

This topic is about *training and deploying* foundation models the firm can use — text-side LLMs primarily, plus non-text finance foundation models when viewed from a recipe / scale / eval / deployment angle (route `finance_native_foundation_models`).

Pure time-series / LOB / event-stream / order-flow sequence-modeling work, at the microstructure level, is out of scope (see `scope_out` in `topic.yaml`). If you encounter a borderline paper, prefer to record it here with `scope_out` reasoning made explicit rather than discarding it silently.

## Where contradictions usually come from

Three sources in this field, in order of frequency:

1. **Eval contamination & leaderboard inflation** — same benchmark (FinanceBench, FinBen) reported with subtle data leakage; FinGPT-style papers and BloombergGPT-style papers report incomparable splits.
2. **Base-model attribution confusion** — finance-tuned model X beats finance-tuned model Y; the gap is mostly from the underlying base model being newer/larger, not the finance tuning. Hard to find papers that control for this.
3. **"Domain adaptation helps" overclaim** — papers comparing finance-tuned 7B to general 7B without comparing to a *stronger general 13B / 70B* that may already match or beat the domain-tuned model on the same eval.

When two records appear to disagree, run through this checklist first before treating it as a genuine theoretical contradiction.

## Reading order for humans

1. `report/main.md` — current best synthesis. Start here.
2. `report/reference_index.md` — which JSONs to open next.
3. `records/works_md/<slug>.md` for must-reads.
4. `summaries/route_map.md` — the 10-route partitioning, anchors, reusable vs do-not-reuse.

## Things that look reusable across routes (initial view — to be validated)

Synthesis layer maintains this list; researcher loop should keep validating or updating it.

- A small, well-curated finance corpus mixed with a large general-pretrain mixture tends to beat finance-only pretraining at small scales — but the breakeven point versus a stronger general LLM is the open question.
- Instruction tuning on tabular / structured-extraction finance tasks transfers more reliably than free-form finance QA tuning.
- MoE for domain models is under-explored in finance specifically; cross-domain MoE evidence is promising but not finance-validated.
- Eval contamination is the single biggest threat to interpreting any reported gain.

## Anti-patterns to flag in records

- Finance-tuned model claims gains over base, but does not compare to a same-or-newer general LLM at equal or larger scale.
- "Trained on financial data" with no corpus composition disclosed.
- Hallucination / numerical-accuracy claims with no held-out test from a temporally later period.
- Repackaged general benchmarks (MMLU subsets) presented as financial competence.
- Trading-backtest results used as proxy for model quality, with no separation of model from strategy.

## Notes for the researcher loop

- When labeling a work's primary `concept_layer`, prefer the layer most affected by the work's *novel* contribution, not the layer it touches superficially. Cite the affected layer explicitly in `core_mechanism`.
- `deployment_risks` should always include at least one of {hallucination / numerical infidelity, look-ahead or temporal leakage, base-model attribution confound, eval contamination, regime/non-stationarity mismatch}. If none apply, say so explicitly and explain why.
