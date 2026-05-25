# BloombergGPT (2023)

- **Source**: [arxiv 2303.17564](https://arxiv.org/abs/2303.17564) · [pdf](https://arxiv.org/pdf/2303.17564)
- **Routes**: `domain_adaptive_pretraining`, `finance_data_curation`
- **Primary concept layers**: `data`, `backbone_and_scale`
- **Reference value**: must-read
- **Analysis depth**: deep

## 1. What this work actually does

Trains a 50B-parameter dense Transformer from scratch on ~569B tokens, with the training corpus being roughly a 1:1 mix of Bloomberg's proprietary "FinPile" (~363B finance tokens from web, news, filings, press releases, Bloomberg-curated content) and a general corpus (The Pile + C4 + Wikipedia, ~345B tokens). Evaluates zero/few-shot on finance NLP tasks (FPB, FiQA SA, Headline, ConvFinQA, finance NER) and general benchmarks (BIG-bench, MMLU). Reports that the model beats similarly-sized general open LLMs on the finance tasks while staying competitive on the general ones.

## 2. Technical mechanism

The architectural bet is null: standard BLOOM-style decoder-only Transformer with ALiBi positional encoding, 2048 context, unigram tokenizer (~131k vocab) trained on a finance-tilted corpus. No finance-specific architectural change, no special numeric or tabular encoding, no MoE, no extended context. Training is standard causal LM with cosine schedule, peak LR ~6e-5, batch ~2048 sequences. The empirical bet is entirely on the corpus.

## 3. Why it matters for the topic's stated goals

This is the canonical reference point for the from-scratch-on-finance-corpus path. It calibrates two key numbers for our in-house plan: at 50B, roughly 360B finance tokens with a 1:1 general mix is the regime they explored, and that gives a *measurable* lift on finance tasks. Without an analogous data point in the public literature, every later finance-LLM claim is partly being read against BloombergGPT as the implicit baseline.

## 4. What is reusable

- The ~1:1 finance/general mix as a defensible starting point — not finance-only.
- The corpus categories (web, news, filings, press releases, curated) as a template; substitute public sources for the proprietary Bloomberg streams (EDGAR 10-K/10-Q/8-K, licensable transcripts, regulatory text, finance news).
- The implicit lesson that at 50B, a finance-specialized tokenizer is not necessary — vocabulary tilt comes from corpus mixture, not vocab engineering.
- The temporal-split discipline (training cutoff T-1, evals on T) is the right pattern even if the paper doesn't argue for it explicitly.

## 5. What is not safely transferable (within this topic's scope)

- The FinPile corpus itself is irreproducible. Most of its tokens come from Bloomberg's internal content streams; the public-source analogue is materially smaller and qualitatively different (no Bloomberg analyst content, no internal terminal data, no proprietary news flow).
- The "50B from scratch" budget is no longer the relevant baseline in 2026 — public open bases at 70B+ exist, and continued pretraining of those is the dominant alternative path. BloombergGPT's experimental setup does not address this comparison.
- The win-margin on FPB / FiQA is unreliable as a metric because contamination of those benchmarks in modern pretraining corpora is essentially guaranteed.

## 6. Evidence quality

Mixed. The headline finance-vs-general comparison at 50B is internally consistent, but the critical baseline — a same-scale general-only model — was not trained. The paper also does not test continued pretraining of a strong open base, which is the obvious cheaper alternative. Eval set choice (FPB, FiQA) is contaminable. Reading: trust the *qualitative* result (finance corpus helps finance tasks at this scale) but not the *quantitative* margin.

## 7. Concrete next experiments or hypotheses

- **H_bloom1**: At ≤13B, continued-pretraining a strong general open base (current 70B-class equivalent) on a FinPile-analogue matches or exceeds from-scratch 50B at a fraction of the budget. *Setup*: build the public-source corpus; pick two compute budgets (1/10 and 1/3 of BloombergGPT); evaluate on FinanceBench + FPB + a fresh held-out temporal eval.
- **H_bloom2**: The 1:1 finance/general mix is dominated by ratios closer to 1:9 once the base model is itself strong. *Setup*: continued pretraining at fixed total budget, varying mix ratio.
- **H_bloom3**: Most BloombergGPT finance gain comes from FinPile coverage of niche entities and finance jargon — testable by training on filings + news only (subset of FinPile) and seeing whether the gap on FPB/FiQA closes.

## Cross-references

`fingpt` (compares-against, alternative path), `financebench` (the eval BloombergGPT was not measured on but should have been), `finma`, `finpythia`.
