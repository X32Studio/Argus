# LIFT: Language-Interfaced Fine-Tuning for Non-Language Machine Learning Tasks

- **Authors:** Tuan Dinh*, Yuchen Zeng* (equal), Ruisu Zhang, Ziqian Lin, Michael Gira, Shashank Rajput, Jy-yong Sohn, Dimitris Papailiopoulos, Kangwook Lee — University of Wisconsin-Madison
- **Year / Venue:** 2022 — NeurIPS 2022; arXiv:2206.06565v4
- **URL:** https://arxiv.org/abs/2206.06565
- **Code:** https://github.com/UW-Madison-Lee-Lab/LanguageInterfacedFineTuning
- **Primary route:** `llm-tabular-serialization` (sibling to TabLLM, GReaT)
- **Concept layers touched:** token-granularity (subword text), learning-signal (transfer from NL pretraining + supervised FT), feature-typing (none — numerics and categoricals undifferentiated). **Not** temporal-static-fusion, **not** scaling-interaction (capped by context).
- **Analysis depth:** deep — **Confidence:** high

## 1. What this work actually does

LIFT answers a clean question: can you make a pretrained LM solve a *non-language* supervised task (classification or regression) **without changing the architecture, the input/output layers, or the loss function** — using only the text interface? The recipe is two steps: (1) serialize each labeled row into one English sentence with a fixed template; (2) fine-tune the LM with ordinary next-token cross-entropy. At inference, serialize the test row with the answer blank, let the LM complete it, and parse the completion (string-match a class name for classification; string→float for regression). It is the "no-code ML with LMs" framing, studied empirically rather than for SOTA. It handles **both** classification and regression (TabLLM is classification-centric).

## 2. Technical mechanism

- **Serialization (the "tokenizer").** There is no learned tabular tokenizer. Two templates:
  - Generic: `When we have x1=<r.x1>, x2=<r.x2>, ..., xp=<r.xp>, what should be y? ### y = <r.y> @@@` — `###` is OpenAI's Q/A separator, `@@@` is the end-of-answer stop token.
  - Context-aware: each value sits under its real column name in a natural sentence (Iris → "An Iris plant with sepal length …, … is `<class>`."). Seven prompt variants studied.
- **Tokenization granularity.** Whatever the GPT-J / GPT-3 BPE emits. A number like `10.35` fragments into several subwords; feature names span multiple tokens; sequence length grows with (#features × string length) and is hard-capped by the context window.
- **Numerics.** Raw decimal digit strings — no binning/scaling/PLE/periodic/quantile. The LM compares *tokens*, not magnitudes, so regression error is token-wise; the authors conjecture "level encoding (binary representation of numbers)" would help.
- **Models.** GPT-J (6B) fine-tuned with **LoRA**; GPT-3 (175B) via OpenAI's **black-box fine-tuning API**.
- **Inference robustness plumbing.** Invalid regression parses retry with decoding temperature 0→0.75 up to 5× then fall back to the train mean; invalid outputs are rare (~≤1).

## 3. Why it matters for the topic's stated goals

The topic wants a tokenizer for **70+ heterogeneous mixed-type (numeric + high-card categorical + temporal/static) features** feeding a deep model. LIFT is the foundational NeurIPS-2022 anchor of the LLM-serialization route and the natural pair to TabLLM/GReaT: it demonstrates the *zero-learned-tabular-tokenizer* paradigm and is the one route member that also covers **regression**. But its honest verdict is a warning sign for our scope: the paper's own framing is **"low-dimensional"** tasks, and where it does scale to many features (MNIST 784, Mfeat 216) those are simple small-integer pixels, not rich heterogeneous columns. It tells us what the serialization paradigm *cannot* do for our setting as much as what it can.

## 4. What is reusable

1. **Shuffled-names ablation protocol (Table 9)** — randomly permuting which feature name attaches to which value drops accuracy significantly, proving the model genuinely uses correct name↔value association. A clean, cheap test to import when validating *any* name-aware tokenizer (also lets us reconcile the TabLLM disagreement).
2. **Column-name-as-semantics** serialization idea (shared with TabLLM, CARTE) — names carry prior knowledge when they are common-knowledge interpretable.
3. **Two-stage pretext warm-up (Sec 5.1):** fine-tune 2–3 epochs on synthetic Gaussian data matching the target's feature count + label space *before* the real data → lower sample complexity in the low-data regime. Transferable to any from-scratch tokenizer/model bootstrap.
4. **Data augmentation** (noisy copies) to harden against test-time feature corruption.
5. **The numerics weakness as a pointer:** the explicit "level/binary encoding" conjecture is the seed of why our route should prefer real numerical embeddings (PLE/periodic) over digit strings.

## 5. Key results (with conditions)

- **Classification (Table 4, accuracy).** Top-3 ranked on most OpenML/synthetic/vision tasks; learns nonlinear boundaries LogReg cannot (circles 81.2% vs LogReg 48.6%≈MCC; two-circles 81.4% vs 49.8%). Competitive with XGBoost (Spambase 94.9 vs 95.9; OPT 99.0 vs 97.5). MNIST 98.15% (GPT-3). **Degrades hard with many classes** — Margin/Texture 100-class ~50–67% vs RBF-SVM ~82% (~30-pt gap).
- **Regression (Tables 19–20, RAE).** Good on 2D functions (linear RAE 0.10), never beats GP, **collapses in high-D**: Linear p=50 → LIFT/GPT-3 RAE 1.18 vs GP 0.13; p=100 worse; **GPT-J could not run 50D/120D due to memory**.
- **Pretraining ablation (Table 8).** Rand-GPT-J ≈ MCC (Iris 27.8%); code-pretrained models far worse; gibberish-FT only slightly worse than GPT-J → **NL pretraining is load-bearing, scale alone is not**.
- **vs ICL (Table 5):** LIFT/full-data > in-context learning; at equal sample count LIFT/Subset ≈ ICL.
- **Robustness:** very robust to training-set outliers + label corruption; **vulnerable to test-time feature corruption / transferred adversarial** (MNIST ε=0.01 → 44.9%) unless trained with augmentation. **Calibrated** (prediction variance tracks injected noise).
- **Baselines:** classical ML (LogReg/DT/KNN/RBF-SVM/RF/XGBoost/MCC; PR/KR/KNN/MLP/GBT/RF/GP) — **no FT-Transformer / SAINT / TabPFN deep-tabular baselines.**

## 6. Refute-before-write — strongest reasons the transfer claims could be wrong / overstated

- **"LIFT scales to hundreds of features" (the high-p classification rows) is misleading for our scope.** Those are image/digit pixels (simple, low-entropy small integers, homogeneous type), not 70+ rich heterogeneous columns. Claim kept only as *negative/conditional* evidence, scoped to "simple homogeneous many-feature data."
- **"Feature names help" is conditional.** Gains are largest when names are common-knowledge interpretable (CMC shows little gain); on opaque domain codes the benefit can vanish — so this is scoped, not absolute.
- **"Comparable to baselines" must not be read as SOTA.** No deep-tabular tokenizer baselines were run; survives only as "comparable to classical ML + MLP."
- The serialization *mechanism* itself does **not** survive transfer to 70+ mixed features (context wall + regression collapse + no temporal/missing) — only the *ablation protocol* and *auxiliary tricks* survive.

## 7. Pitfalls / contradictions

1. **Scope mismatch (topic-critical):** "low-dimensional" by the authors' own framing.
2. **Regression collapse in high-D** (p=50/100) — wrong anchor if the target is continuous.
3. **No temporal, no missing-value handling** — zero coverage of the time-varying/static-fusion half.
4. **Raw-digit numerics** — authors flag level/binary encoding as the fix; not a numerical-tokenization recipe.
5. **Absent deep-tabular baselines** (FT-Transformer/SAINT/TabPFN).
6. **Context + memory wall** explicit (couldn't run high-D regression on GPT-J for lack of memory).
7. **Partial contradiction with TabLLM** on feature-name importance: LIFT's shuffled-names shows names clearly matter; TabLLM's pitfalls note fine-tuned GPT-3 couldn't always confirm name importance at fractional data → sample/LM/setting dependent.

## Proposed graph edges

- `lift-language-interfaced-finetuning` —[`belongs_to_route`]→ `route:llm-tabular-serialization`
- `lift-language-interfaced-finetuning` —[`introduces_technique`]→ `technique:text-serialization-finetuning`
- `lift-language-interfaced-finetuning` —[`uses_technique`]→ `technique:lora`
- `lift-language-interfaced-finetuning` —[`alternative_to`]→ `tabllm-few-shot-llm-serialization` (fine-tune-on-full-data + regression vs few-shot classification)
- `lift-language-interfaced-finetuning` —[`compared_against`]→ `tree-models-outperform-deep-tabular` (classical ML + XGBoost baselines)
- `lift-language-interfaced-finetuning` —[`contradicts`]→ `tabllm-few-shot-llm-serialization` (feature-name importance is setting-dependent)
- `lift-language-interfaced-finetuning` —[`has_pitfall`]→ `pitfall:llm-serialization-context-and-regression-wall`
