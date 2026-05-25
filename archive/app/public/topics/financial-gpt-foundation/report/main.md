# Financial GPT / Foundation Model Training — Synthesis Report

> Iteration 2. Record base: **3 records** (1 deep, 2 medium). 6 of 10 execution routes anchor-seeded; 4 still unexplored. Conclusions are still load-bearing on a small base — treat directional, not quantitative.

## executive_summary

The record base now triangulates the central tension of the topic. Three records define three corners:

- **BloombergGPT** — from-scratch 50B on a 1:1 finance/general mix; architecturally null, corpus is the entire lever. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]
- **FinGPT** — LoRA SFT on a strong open base; cheap, competitive only on shallow finance NLP. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]
- **FinanceBench** — the canonical filings-QA evaluation; closed-book is uninterpretable, the real test is **retrieval + reasoning + refusal**. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]

These three frame the question for our in-house plan: **what does a financial FM need to do that retrieval over a strong general base cannot?** If the answer is "shallow finance NLP," FinGPT-style LoRA is sufficient. If the answer is "long-context filings reasoning under realistic retrieval," the question is open and FinanceBench is the eval that resolves it. The from-scratch BloombergGPT path is the only one currently in the record base that *claims* to address the latter at scale, but it does so without a same-scale general-only baseline — exactly the recurring confound `proposal.md` warns about. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]

**Best current call:** build the public FinPile-analogue corpus pipeline now (longest lead time, required under both branches), default to continued pretraining of a strong general open base, evaluate continuously on FinanceBench with retrieval held fixed. Confidence: low-medium.

## research_map

| route | records | depth | next angle |
|---|---|---|---|
| `domain_adaptive_pretraining` | bloomberggpt | deep | FinPythia / FinLLaMA continued-pretrain recipes |
| `open_finance_llms` | fingpt | medium | FinMA, FinLLaMA, Llama-3 finance forks |
| `instruction_tuning_finance` | fingpt | medium | PIXIU, FinMA-IT, structured-extraction sets |
| `rlhf_dpo_finance` | — | — | unexplored, `UNCERTAIN` per topic.yaml |
| `mixture_of_experts_finance` | — | — | unexplored, high priority for "smaller-domain vs larger-general" |
| `long_context_and_retrieval_finance` | financebench | medium | LongBench-Finance, retriever ablations |
| `finance_data_curation` | bloomberggpt | deep (proprietary) | public EDGAR pipelines, decontamination methodology |
| `finance_native_foundation_models` | — | — | unexplored, recorded through the FM-training lens |
| `finance_benchmarks_and_eval` | financebench | medium | FinBen, BizBench, DocFinQA, FLUE |
| `agentic_finance` | — | — | unexplored, `UNCERTAIN` |

**Cross-route theme (now backed by 3 records, not 1):** none of the three records makes an architectural bet — all three accept dense-Transformer-on-open-base as a given. The lever is **data** (corpus on the train side, retrieval corpus on the eval side) and **objective** (causal LM, SFT, or RAG). The `backbone_and_scale` concept layer is currently the least informed and may stay that way until an MoE record lands.

**Strongest implicit comparison so far:** FinGPT explicitly compares-against BloombergGPT and claims competitiveness on shallow benchmarks. The graph encodes this as `compares_against` but flags the comparison as benchmark-shallow — FPB / FiQA / Headline are the contaminated, classification-style benchmarks that anti-pattern #1 in `proposal.md` warns about. The cross-paper "tie" therefore tells us little about FM-level competence. [Refs: topics/financial-gpt-foundation/records/works_json/fingpt.json, topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]

## how_the_research_evolved

From `logs/research_state.md` (iteration 1):

- Three anchors seeded simultaneously, deliberately one per "side" of the topic: a pretraining anchor (BloombergGPT), an SFT/open-LLM anchor (FinGPT), and an evaluation/long-context anchor (FinanceBench). This gives the program a triangulated starting position rather than depth on one corner.
- Two `contradicts` edges were introduced in the knowledge graph at iteration 1, both via experiment nodes — H_fb1 (RAG over strong general beats finetuned 7B finance on FinanceBench) would invalidate BloombergGPT's headline framing; H_fg2 (FinGPT-LoRA does not close the gap on long-context filings) would invalidate FinGPT's "competitive with BloombergGPT" claim.
- Three pitfall nodes (`eval_contamination`, `base_attribution_confound`, `missing_stronger_general_baseline`) were introduced as first-class entities. Every record so far is connected to at least one. This says the topic's risk model is structural rather than per-paper — the same three risks appear in every record we read, so a single-record fix doesn't make them go away.
- Routes deliberately deferred: `rlhf_dpo_finance` and `agentic_finance` (both `UNCERTAIN`), and `finance_native_foundation_models`. These will be revisited only once mainline routes are deeper.

No conclusion has been reversed yet (n=1 → n=3 is too small for reversals); the iteration-1 directional recommendation has been **strengthened** by the FinanceBench record, because FinanceBench's existence and closed-book-is-uninterpretable framing makes "retrieval + reasoning + refusal" the load-bearing axis. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]

## high_value_technical_points

1. **The corpus is the lever, not the architecture (still holds at n=3).** Across BloombergGPT (corpus-driven from-scratch), FinGPT (corpus-driven SFT), and FinanceBench (eval defined by *which filings* are in scope), none of the three records claims any architectural novelty. Concept layer: **data**. [Refs: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json, topics/financial-gpt-foundation/records/works_json/fingpt.json]

2. **Closed-book is uninterpretable on real filings QA.** FinanceBench shows that closed-book performance is near-random on questions over real recent 10-Ks; the eval is fundamentally retrieval + reasoning + refusal. This single observation reframes the entire pretraining question: if the deployment target is filings QA, the marginal value of finance-specific pretraining must show up *on top of* retrieval, not against closed-book baselines. Concept layer: **adaptation_and_eval**. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]

3. **Three recurring pitfalls structurally shape every comparison in the literature**: eval contamination (FPB/FiQA likely in pretraining), base-model attribution confound (newer base credited to "finance tuning"), missing stronger general baseline (finance-tuned-7B vs general-7B, not vs general-70B). These appear on every record in the base. They are not paper-specific defects; they are how this subfield publishes. Treat any headline cross-paper comparison as suspect until all three are controlled for. Concept layer: **adaptation_and_eval**. [Refs: all 3 records]

4. **LoRA SFT closes shallow gaps cheaply, but H_fg2 predicts it does not close long-context gaps.** This is the cleanest experimental split queued in the graph: shallow finance NLP appears LoRA-tractable; long-context filings QA likely requires either continued pretraining or retrieval (or both). Until H_fg2 is tested, the SFT-only strategy cannot be ruled out, but the prior on it covering filings QA should be weak. Concept layers: **objective**, **adaptation_and_eval**. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]

5. **FinanceBench-style refusal-rubric scoring is borrowable directly.** Tri-category (correct / refuse / wrong) with citation-grounded human grading is exactly the protocol needed for in-house evals to avoid hallucination-as-correct false positives. Concept layer: **adaptation_and_eval**. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]

## what_seems_reusable

Promoted or held over from iteration 1, ranked by ROI for the in-house plan:

- **FinanceBench as primary deployable-side eval, with retrieval held fixed across iterations.** Borrow: the benchmark itself, the refusal-aware scoring rubric, the open-vs-closed-book separation. Assumption load: US-only, large-cap-only — supplement with internal evals for other regimes. Concept layer: **adaptation_and_eval**. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
- **FinGPT's finance instruction datasets and dataloaders as the SFT-layer seed.** Borrow: data pipeline and instruction format; discard the "FinGPT model" framing. Assumption load: FinGPT's data is news/sentiment-heavy — for filings-extraction tasks we will need supplementary instruction data not yet recorded. Concept layer: **objective**. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]
- **BloombergGPT's calibrated corpus scale (~360B finance tokens at 50B params for a noticeable lift) as a planning anchor.** Borrow: the order-of-magnitude data-budget number for finance tokens. Assumption load: BloombergGPT's lift was measured against weak general baselines (GPT-NeoX 20B / OPT 66B) and on shallow benchmarks — the same data budget against a 2026-vintage strong base on FinanceBench is the unproven question. Concept layers: **data**, **backbone_and_scale**. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]
- **Public FinPile-analogue corpus pipeline: EDGAR (10-K/10-Q/8-K) + transcripts + finance news + regulatory text, ~1:1 with general at the starting point.** Borrow: the design pattern, not the specific corpus (FinPile is proprietary and irreproducible). Assumption load: the 1:1 ratio is calibrated for 50B from-scratch — at continued-pretraining of a strong base, expect to need a lower finance ratio (H_bloom2). Concept layer: **data**. [Refs: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json, knowledge_graph node `data:public-filings-corpus`]
- **Strict temporal eval holdout from day 1** — train data ends T-1, eval on T. Cheap, no downside, prevents anti-pattern #1 from `proposal.md`. Concept layer: **adaptation_and_eval**. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]

## what_is_weak_shallow_or_risky

- **Three records and three deferred routes** — every claim about MoE for domain models, RLHF/DPO for finance, finance-native non-text FMs, or agentic finance is currently absent from this report. Treat synthesis as silent on those routes, not as a vote against them.
- **FinGPT's "competitive with BloombergGPT" claim** is the single most leaderboard-noisy claim in the record base. It is reported on FPB / FiQA / Headline — exactly the benchmarks `proposal.md` flags as contaminated and shallow. The graph already encodes this as anti-pattern-prone via the `pitfall:eval_contamination` edge. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]
- **No record in the base controls for stronger general baseline** at the relevant scale. Until one does, "finance-specific pretraining helps" remains an asserted but unproven claim. The most likely future invalidator is H_fb1 (RAG over strong general beats finetuned 7B finance on FinanceBench ≥10pp). [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
- **`route:finance_data_curation` is anchor-seeded by BloombergGPT, but FinPile is proprietary** — so the route currently has no reusable public-pipeline record. The "research_map" entry is anchored but the actionable detail (decontamination methodology, EDGAR pipeline specifics) is open. Treat this route as actionability=high, evidence=low.
- **`logs/research_state.md` notes that BloombergGPT, FinanceBench, and FinGPT could all be deepened** with paper-PDF citations on specific training-recipe / refusal-rubric / LoRA-rank choices. None of this has been done — the records read clean but are based on abstract-level rather than methods-section-level reading. A `sources/` fetch pass is the right next deepening.

## contradictions_and_open_questions

**Queued contradictions (in graph, not yet tested):**

1. **H_fb1 vs BloombergGPT.** If a strong RAG pipeline over a vanilla strong general Instruct model beats finetuned 7B finance models on FinanceBench by ≥10pp, the from-scratch finance-pretraining ROI is severely undermined. The graph encodes this as a `contradicts` edge from H_fb1 → BloombergGPT. Status: highest-priority experiment to find evidence on. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
2. **H_fg2 vs FinGPT.** If FinGPT-style LoRA does not close the gap on long-context filings QA (FinanceBench, LongBench-Finance), FinGPT's "competitive with BloombergGPT" framing is exposed as narrow-benchmark-only. Status: testable cheaply with existing checkpoints. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]

**Open questions inherited from records and not yet addressed:**

- BloombergGPT vs a 70B+ general open base on the same evals — no record yet, and likely no clean public study exists. The absence is itself the finding. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]
- Is the 1:1 finance/general mix dominated by ratios closer to 1:9 once the base is itself competitive? (H_bloom2.) Needs a continued-pretrain record. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]
- What fraction of BloombergGPT's finance gain comes from FinPile coverage of niche entities/jargon vs. general finance corpus density? (H_bloom3.) Cheaply testable in a from-base continued-pretrain setting. [Ref: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json]
- Has anyone re-run FinanceBench with a *fixed-retrieval* protocol across multiple base models, so headline numbers become comparable? Most reporting uses different retrieval configs. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
- What is the marginal value of finance SFT *on top of* strong general instruct? (Implicit in H_fg1.) [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]

## priority_reading_guide

See `report/reference_index.md` for the structured ranking. One-line summary here:

- **Must read:** BloombergGPT (the from-scratch anchor), FinanceBench (the eval that defines the deployable side).
- **Important supporting:** FinGPT (the SFT recipe — read repo, not just paper).
- **Shallow but strategic:** _none yet_ — will populate once thin records arrive (PIXIU, FinMA, Llama-3 finance forks).
- **Lower priority:** _none yet._

## bottom_line_synthesis

For the in-house FM decision at iteration 2:

1. **The deployable side is retrieval + reasoning + refusal over filings, not closed-book finance QA.** FinanceBench has effectively defined this for us. All training decisions should be justified by their measured contribution to this pipeline. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
2. **Continued pretraining of a strong general open base + retrieval > from-scratch finance pretraining** is the working bet, but only weakly supported. The only direct piece of evidence for from-scratch (BloombergGPT) lacks a same-scale general-only baseline. The strongest contradiction-in-waiting (H_fb1) would, if it holds, settle this decisively against from-scratch. [Refs: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json, topics/financial-gpt-foundation/records/works_json/financebench.json]
3. **LoRA SFT is sufficient for shallow finance NLP (sentiment, classification, headline). It is plausibly insufficient for filings QA.** Therefore SFT alone should not be the in-house plan; it can be a downstream layer. [Ref: topics/financial-gpt-foundation/records/works_json/fingpt.json]
4. **Build the public FinPile-analogue corpus pipeline now** — EDGAR + transcripts + finance news + regulatory — because it is required under both training branches and is the longest-lead-time item. [Refs: topics/financial-gpt-foundation/records/works_json/bloomberggpt.json, knowledge_graph node `data:public-filings-corpus`]
5. **Adopt FinanceBench-style refusal-rubric eval scoring from day 1**, with retrieval held fixed across iterations. [Ref: topics/financial-gpt-foundation/records/works_json/financebench.json]
6. **The next 3–5 records to add (per `logs/research_state.md` and `route_index.json`)** will reshape this synthesis materially: a continued-pretraining record (FinPythia / FinLLaMA), an instruction-tuning-at-scale record (PIXIU / FinMA-IT), and a MoE-for-domain record. Until then, all numerical-flavored conclusions should remain directional.
