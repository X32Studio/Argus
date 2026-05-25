# research_state.md — financial-gpt-foundation

Last updated: 2026-05-25 (iteration 1)

## Current iteration: 1 (bootstrap)

Three anchor works seeded. Six of ten routes still unexplored. Report is initial.

### Routes seeded this iteration

| Route | Anchor | Status after this iteration |
|---|---|---|
| `domain_adaptive_pretraining` | BloombergGPT | anchor seeded, needs FinPythia / FinLLaMA / FinTral next |
| `open_finance_llms` | FinGPT | anchor seeded, needs FinMA / FinLLaMA |
| `instruction_tuning_finance` | FinGPT | anchor seeded, needs PIXIU / structured-extraction instruction sets |
| `finance_data_curation` | BloombergGPT (FinPile) | anchor seeded, needs public-source pipelines (EDGAR, decontamination methodology) |
| `long_context_and_retrieval_finance` | FinanceBench | anchor seeded, needs LongBench-Finance, retriever ablations |
| `finance_benchmarks_and_eval` | FinanceBench | anchor seeded, needs FinBen / BizBench / DocFinQA / FLUE |

### Routes still unexplored

- `rlhf_dpo_finance` — UNCERTAIN per topic.yaml note; anchor list thin in public literature.
- `mixture_of_experts_finance` — high priority for the "smaller domain vs larger general" question.
- `finance_native_foundation_models` — recorded here through the foundation-model-training lens (recipe / scale / eval / deployment), not pure microstructure sequence modeling.
- `agentic_finance` — UNCERTAIN per topic.yaml note; narrow scope.

## Works deeply analyzed this iteration

- **bloomberggpt** (deep): from-scratch 50B on 1:1 finance/general; corpus is the lever, architecture is null.
- **financebench** (medium): canonical filings QA eval; closed-book is uninterpretable, the test is retrieval + reasoning + refusal.
- **fingpt** (medium): LoRA-on-strong-base recipe; competitive only on shallow finance NLP, repo is more useful than paper.

## Records still shallow and needing deeper reading

- All three could be deepened with specific numerical citations from the source PDFs. BloombergGPT in particular has many training-recipe details (data mixing, deduplication strategy, evaluation prompts) that should be extracted on the next deepen pass.
- FinanceBench needs a deeper read of the refusal-rubric scoring code in the repo before we adopt the same protocol for in-house evals.

## Strongest actionable technical ideas so far

1. **Treat FinanceBench as the primary deployable-side eval, with retrieval held fixed across iterations.** Adopt its tri-category answer/refuse/wrong scoring for any in-house eval set we build.
2. **Default to continued pretraining of a strong open base over from-scratch.** BloombergGPT calibrates the scale needed but does not prove from-scratch is the right path against 2026-vintage strong bases. H_bloom1 is the single most important experiment to run early.
3. **Borrow FinGPT's instruction datasets and dataloaders as the SFT-layer seed.** Replace its base-model framing; keep its data pipeline.
4. **Plan corpus from day 1 as EDGAR + transcripts + finance news + regulatory, ~1:1 with general, with a strict temporal holdout.** Specific mix ratio is open; 1:1 is the calibrated starting point but likely too finance-heavy at strong-base scale.

## Weakest or misleading directions identified

- The "competitive with BloombergGPT on finance NLP" framing common in finance-LLM papers is largely an artifact of (a) contaminable benchmarks (FPB, FiQA) and (b) base-model attribution confound. Treat headline comparisons as misleading until they include FinanceBench-style retrieval-grounded evals.
- The from-scratch path (BloombergGPT pattern) has no clean ablation against continued pretraining of a stronger base. Until we have a public data point on this, the from-scratch budget is hard to justify.

## Graph changes this iteration

- 27 nodes, 26 edges seeded.
- Two `contradicts` edges flag where pending experiments would invalidate existing claims (H_fb1 → BloombergGPT; H_fg2 → FinGPT).
- Pitfalls (`eval_contamination`, `base_attribution_confound`, `missing_stronger_general_baseline`) introduced as first-class nodes — they are the recurring cross-route risks per `proposal.md`.

## Report conclusions strengthened / weakened / redirected

- N/A — this is the first iteration. Subsequent iterations should track this section.

## Best next directions (for iteration 2)

Priority order (deepen-bias on the routes already seeded, plus one route expansion):

1. **deepen**: FinPythia + FinLLaMA (continued pretraining recipes — directly tests H_bloom1's qualitative direction).
2. **deepen**: PIXIU + FinMA (instruction tuning at scale beyond FinGPT).
3. **new**: One MoE-for-domain anchor (`mixture_of_experts_finance` — DeepSeek-MoE or Mixtral domain-adaptation report) to start mapping that route.
4. **challenge**: A controlled study that compares finance-tuned model vs stronger general LLM on the same eval — these are rare; look hard. If absent, that absence itself is a finding to elevate in the report.

Skip for next 2 iterations: `agentic_finance` (UNCERTAIN, narrow), `rlhf_dpo_finance` (UNCERTAIN, thin literature). Revisit once mainline routes are deeper.
