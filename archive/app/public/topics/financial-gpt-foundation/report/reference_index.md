# Reference Index — Financial GPT / Foundation Model Training

Open the JSON files in order shown.

## Must Read

- **BloombergGPT: A Large Language Model for Finance** (2023)
  Path: `topics/financial-gpt-foundation/records/works_json/bloomberggpt.json`
  Analysis depth: deep · Routes: `domain_adaptive_pretraining`, `finance_data_curation`
  Read because: only deep record; the canonical from-scratch finance-pretraining anchor; defines the corpus-scale calibration (~360B finance tokens at 50B params) we plan around. Pay attention to `must_test_hypotheses` (H_bloom1–3) — those are the experiments that, if run, would decide our pretraining strategy.

- **FinanceBench: A New Benchmark for Financial Question Answering** (2023)
  Path: `topics/financial-gpt-foundation/records/works_json/financebench.json`
  Analysis depth: medium · Routes: `finance_benchmarks_and_eval`, `long_context_and_retrieval_finance`
  Read because: defines what counts as deployable financial competence (retrieval + reasoning + refusal over real filings); closed-book is uninterpretable, which reframes our entire pretraining question; the refusal-rubric scoring is directly borrowable for in-house evals.

## Important Supporting Reads

- **FinGPT: Open-Source Financial Large Language Models** (2023)
  Path: `topics/financial-gpt-foundation/records/works_json/fingpt.json`
  Analysis depth: medium · Routes: `open_finance_llms`, `instruction_tuning_finance`
  Read because: defines the cheap-LoRA-on-strong-base recipe and gives us a reusable finance instruction-dataset pipeline. Treat the paper as the framing and the GitHub repo as the actual artifact — the data pipeline is more valuable than the model weights. Caveat: "competitive with BloombergGPT" is reported only on shallow contaminable benchmarks (FPB, FiQA).

## Shallow But Strategic

_(none yet — first record likely a Llama-3 finance fork or PIXIU, where the work itself is incremental but the recipe matters for our SFT layer)_

## Lower Priority

_(none yet)_

---

## What's missing — researcher-loop priority list

From `logs/research_state.md` and `indexes/route_index.json`, ordered by how much each would reshape the report:

1. **Continued-pretraining recipe (`domain_adaptive_pretraining`):** FinPythia, FinLLaMA, or FinTral with a clean continued-pretrain ablation. Directly addresses H_bloom1 — the load-bearing question.
2. **Instruction tuning at scale (`instruction_tuning_finance`):** PIXIU / FinMA-IT with structured-extraction tasks (filings → tables), not just sentiment.
3. **Retriever ablation on FinanceBench (`long_context_and_retrieval_finance`):** any controlled study that holds retrieval fixed across base models, so headline FinanceBench numbers actually compare.
4. **Public-source finance corpus pipeline (`finance_data_curation`):** EDGAR pipeline + decontamination methodology paper. The route is anchored by BloombergGPT but FinPile is proprietary; the actionable detail is open.
5. **MoE for domain models (`mixture_of_experts_finance`):** at least one anchor (DeepSeek-MoE adaptation report, DBRX with finance shards, or a scaling-law replication). Starts informing the "smaller-domain vs larger-general" question.
6. **Controlled finance-tuned vs stronger-general comparison:** if such a study exists at all. Its absence would itself be elevated as a structural finding.

Deferred (per `logs/research_state.md`, revisit after mainline routes are deeper):
- `rlhf_dpo_finance` (UNCERTAIN, thin literature)
- `agentic_finance` (UNCERTAIN, narrow scope)
- `finance_native_foundation_models` (FM-training lens on non-text finance foundation models)
