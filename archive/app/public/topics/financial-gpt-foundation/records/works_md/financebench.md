# FinanceBench (2023)

- **Source**: [arxiv 2311.11944](https://arxiv.org/abs/2311.11944) · [pdf](https://arxiv.org/pdf/2311.11944) · [code](https://github.com/patronus-ai/financebench)
- **Routes**: `finance_benchmarks_and_eval`, `long_context_and_retrieval_finance`
- **Primary concept layers**: `adaptation_and_eval`
- **Reference value**: must-read
- **Analysis depth**: medium

## 1. What this work actually does

10,231 hand-curated questions over real recent 10-K, 10-Q, 8-K, and earnings reports of large US public companies. Each question has a grounded answer and supporting passage citations. The benchmark explicitly includes "refuse if not in context" cases. They evaluate both closed-book and open-book (retrieval-augmented) settings across a range of strong general LLMs and report that strong models reach only ~20-30% correctness under realistic open-book settings.

## 2. Technical mechanism

The substantive design choices that matter:

- **Real filings, real questions**: not synthetic. Questions require locating line items across periods, computing derived figures, or finding disclosures across exhibits.
- **Refusal in the rubric**: a model that confidently makes up a number is penalized harder than a model that refuses. This pulls the eval away from leaderboard-gaming.
- **Open-book by design**: the closed-book numbers are near-random, which forces every report to be in the retrieval-augmented setting.
- **Citation-grounded scoring**: answers are graded with the support passage in hand, which means a model that gives a right answer for the wrong reason can still be caught.

## 3. Why it matters for the topic's stated goals

This is the single best public benchmark to optimize an in-house financial FM against on the filings side — exactly because closed-book is uninterpretable. It forces the full pipeline (retrieval + reasoning + refusal) to be evaluated together, which is what deployment actually demands. Every iteration of in-house training should be measured here, with retrieval fixed for cross-iteration comparability.

## 4. What is reusable

- The benchmark itself as the canonical filings-side eval.
- The refusal-rubric design — adopt the same answer / refuse / wrong tri-category scoring for any in-house eval set we build.
- The closed-book vs open-book ablation as a fast diagnostic: if a model's gains evaporate under closed-book, the gain is from training-data memorization rather than reasoning capability.

## 5. What is not safely transferable (within this topic's scope)

- US-only, large-cap-only — does not represent EU/CN filings structure or smaller-cap data quality.
- Finite question set — overfitting risk if used as both training-mixture seed and eval. Need to hold out a contamination-free split.
- The 20-30% headline number is sensitive to retrieval setup; cross-paper comparisons under different retrievers are not meaningful.

## 6. Evidence quality

Strong on construction (real filings, citation-grounded, refusal-aware). Weaker on cross-paper comparability because retrieval configs vary across reports. The closed-book vs open-book delta is the cleanest reported finding and is the one to anchor on.

## 7. Concrete next experiments or hypotheses

- **H_fb1**: A strong RAG pipeline over a vanilla current-generation Instruct model outperforms fine-tuned 7B finance models on FinanceBench by ≥10pp. *Setup*: fixed retriever (BM25 + embedding hybrid), held constant across models; report correct/wrong/refuse.
- **H_fb2**: Filings-specific continued pretraining helps FinanceBench only in combination with retrieval — closed-book lift is not worth the compute. *Setup*: train continued-pretrained variant; evaluate closed-book and open-book; if closed-book stays flat and open-book gains, the lever is retrieval-quality + reasoning, not memorization.

## Cross-references

`bloomberggpt` (the FinanceBench number is the missing eval on BloombergGPT), `fingpt` (likely under-performs here), `finma`.
