# FinGPT (2023)

- **Source**: [arxiv 2306.06031](https://arxiv.org/abs/2306.06031) · [pdf](https://arxiv.org/pdf/2306.06031) · [code](https://github.com/AI4Finance-Foundation/FinGPT)
- **Routes**: `open_finance_llms`, `instruction_tuning_finance`
- **Primary concept layers**: `objective`, `adaptation_and_eval`
- **Reference value**: supporting (paper); repo is must-read
- **Analysis depth**: medium

## 1. What this work actually does

FinGPT is not a single model — it is a recipe and a data pipeline. Take an open foundation model (Llama-2/3, ChatGLM, etc.), attach LoRA adapters, train on finance instruction-style datasets (sentiment from FPB/FiQA, headline classification, news-derived tasks, simple forecasting framed as instructions). Compare against BloombergGPT and base models on public finance benchmarks. The paper argues this cheap recipe is competitive at a tiny fraction of the cost.

## 2. Technical mechanism

LoRA finetuning of a base LLM on finance instruction data. No architectural change. No long-context work. No continued pretraining. The data pipeline is the substantive contribution — they curate news feeds (Yahoo Finance, Reuters), assemble instruction templates around sentiment / classification / headline / forecasting, and provide a single-GPU training recipe. Multiple base models are supported via the same data and recipe.

## 3. Why it matters for the topic's stated goals

Two implications for our in-house plan:

1. For *easy* finance NLP (sentiment, headline classification, structured extraction), LoRA on a strong open base is the default starting point. The from-scratch pretraining budget should be justified by tasks LoRA can't reach — long-context filings reasoning, novel financial reasoning under retrieval, agentic tool use, multimodal numeric+text.
2. The public finance instruction datasets and dataloaders in the FinGPT repo are the cheapest viable seed for our own SFT layer. Worth borrowing the dataset assembly code even if we replace most of the model side.

## 4. What is reusable

- The instruction dataset assembly pipeline and the per-task instruction templates.
- LoRA configurations tuned for finance instruction data at 7-13B.
- The implicit recipe for cheap base-model upgrades (swap base, reuse data) — useful for tracking the moving frontier of strong open bases.

## 5. What is not safely transferable (within this topic's scope)

- The headline "competitive with BloombergGPT" claim is on shallow benchmarks (sentiment, classification). It does not transfer to long-context filings QA, where LoRA without continued pretraining or retrieval almost certainly under-performs.
- Reported gains often conflate base-model improvement (Llama-2 → Llama-3) with finance-tuning improvement. The published numbers don't decompose this cleanly.
- The forecasting framing (predicting price direction from news under SFT) is fragile — it assumes a stable news→price mapping that the test sets don't preserve out of sample, and is a deployment risk if treated as production capability.

## 6. Evidence quality

Lower than headline framing suggests. Most evaluations are sentiment / classification — easy tasks where the test set is contaminable and the gap between models is small. Missing controls: no same-base SFT on general instruction data (so the marginal value of *finance* SFT vs *any* SFT is not pinned down); no FinanceBench numbers; no temporal holdout. The repo evolves faster than the paper, so the actively useful artifact is the repo, not the publication.

## 7. Concrete next experiments or hypotheses

- **H_fg1**: A strong general-purpose Instruct model with no finance SFT matches FinGPT-7B on FPB and FiQA. If true, FinGPT-style SFT is justified only at base scales where strong general Instruct is unavailable. *Setup*: zero-shot eval of current-generation Instruct vs FinGPT-LoRA on the same prompts.
- **H_fg2**: FinGPT-style LoRA does NOT close the gap on long-context filings benchmarks (FinanceBench, LongBench-Finance). *Setup*: run both on FinanceBench with matched retrieval.

## Cross-references

`bloomberggpt` (compares-against on cost), `finma` (parallel instruction-tuning effort), `financebench` (the eval FinGPT-style models should be measured on but typically aren't).
