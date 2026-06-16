# GReaT: Language Models are Realistic Tabular Data Generators

- **Authors:** Vadim Borisov, Kathrin Seßler, Tobias Leemann, Martin Pawelczyk, Gjergji Kasneci (U. Tübingen; TU Munich)
- **Venue / Year:** ICLR 2023 — arXiv:2210.06280v2 (2023)
- **URL:** https://arxiv.org/abs/2210.06280
- **Code:** https://github.com/kathrinse/be_great (`pip install be-great`)
- **Primary route:** `llm-tabular-serialization`
- **Concept layers spanned:** token-granularity (subword text), feature-typing (no explicit typing — all to text), scaling-interaction (serial autoregressive cost), learning-signal (causal-LM transfer + permutation objective)
- **Analysis depth:** deep — **Confidence:** high

---

## 1. What this work actually does

GReaT (Generation of Realistic Tabular data) fine-tunes an off-the-shelf autoregressive LLM (GPT-2 / DistilGPT-2) to **generate** synthetic tabular rows. Unlike the VAE/GAN line (CTGAN, TVAE, CopulaGAN) that maps the whole table into a fully-numeric space with extensive preprocessing, GReaT converts each row into a natural-language sentence of `column-name is value` clauses, applies a **random feature-order permutation** per row at training time, and fine-tunes the LLM with the ordinary causal-LM objective. At inference it samples rows by completing a textual prefix; because of the permutation training, that prefix can be **any subset of features**, giving "arbitrary conditioning" (joint sampling, single-feature conditioning, or multi-feature conditioning / imputation) with **no retraining**. It is a **generator**, evaluated by how realistic the synthetic data is — not a discriminative tokenizer.

## 2. Technical mechanism

- **Textual encoding (Eq. 1–2):** cell `(i,j)` -> clause `t_{i,j} = [f_j, "is", v_{i,j}, ","]`; row -> `t_i = concat(t_{i,1..m})`. Example: `"Age is 39, Education is Bachelors, Occupation is Adm-clerical, Gender is Male, Income is <=50K,"`. Column NAME and raw VALUE both appear, so the LLM can use its pretrained semantics of the names/categories. No information loss, no forced ordinal encoding of categoricals.
- **Random feature-order permutation (Def. 2):** a fresh permutation `k` shuffles the per-feature clauses each time a row is seen. Text imposes a spurious positional order on order-free tabular features; shuffling removes it. This is the load-bearing trick — it makes every feature subset a legal sentence prefix, which is precisely what enables arbitrary conditioning at sampling time.
- **Fine-tuning:** standard causal LM, `p(t) = prod_k p(w_k | w_{<k})` (Eq. 3), over BPE subword tokens from the LLM's own tokenizer. Two backbones: DistilGPT-2 (82M, "Distill-GReaT") and GPT-2 (355M, "GReaT").
- **Sampling (Eq. 4):** temperature-`T` weighted next-token sampling. Precondition options: (a) feature name only -> sample full joint `p(V_1..V_n)`; (b) one name-value pair -> `p(V_{\i} | V_i=v_i)`; (c) multiple name-value pairs -> `p(V_rest | conditions)`. Generated text is regex-parsed back to a row; out-of-support outputs (e.g. `Adm clerical` without the dash) are rejected — invalid rate stays **<1%**, reducible by lowering `T`.

## 3. Why it matters for the topic's stated goals

The topic is tokenizing 70+ heterogeneous (numerical + high-cardinality categorical, static + temporal) features for deep tabular models. GReaT is the **generation-side anchor** of the LLM-serialization route and contributes two ideas that bear directly on unifying many heterogeneous features into one sequence:

1. **Column-name-as-semantics** — heterogeneous mixed-type features become one uniform token stream with zero learned tabular tokenizer and zero per-feature type declaration. (Shared with TabLLM, CARTE.)
2. **Feature-order permutation -> order-invariant, arbitrary-conditioning joint model.** This is the genuinely novel, architecture-agnostic nugget: it converts a position-sensitive sequence model into an order-free joint model over heterogeneous features, supporting conditioning on any subset. For a 70+-feature setting where there is no canonical feature order, an order-invariance training objective is exactly the right inductive bias.

It also empirically argues that text encoding **avoids the one-hot curse-of-dimensionality** that CTGAN suffers on high-cardinality categoricals, and that **pretrained world knowledge** (accessed via names) improves realism (ablation: removing pretraining collapses the discriminator metric).

## 4. What is reusable

- **The permutation-for-order-invariance objective** — reusable beyond GReaT; could be applied to any token-sequence tabular model to get arbitrary conditioning / robustness to feature ordering. **First thing to borrow.**
- **`name is value` serialization** as a uniform encoder for arbitrary mixed types without preprocessing — reusable for ingestion/augmentation, especially when feature names carry meaning.
- **Arbitrary conditioning for imputation / oversampling** — directly useful for the topic's "partly missing, partly time-varying" data: any missingness pattern is just a different precondition.
- **DCR + discriminator + ML-efficiency** as a practical evaluation triad for any tabular generator.

## 5. Key results & evidence

- **ML efficiency (Table 1):** train a discriminator (LR/DT/RF) on synthetic, test on real. GReaT/Distill-GReaT is best-or-second on essentially every cell, near the original-data ceiling (e.g. Adult RF 85.42 vs Original 85.93 vs CTGAN 83.53; HELOC LR 71.90 vs Original 71.80 vs CTGAN 57.72).
- **Discriminator measure (Table 2, lower=better, 50% ideal):** GReaT avg **69.57%** vs Distill-GReaT 78.82% vs CTGAN 89.88% / TVAE 90.73% / CopulaGAN 90.37% — ~16.2% reduction over the best baseline; best single Adult 62.84%.
- **DCR (Fig. 4):** synthetic-to-train distance distribution matches the original-test-to-train baseline -> generates new, non-copied samples.
- **Ablations (Table 3):** pretraining helps almost everywhere (Adult discr. 99.14% random-init -> 69.77% pretrained); permutation slightly hurts MLE but is what buys arbitrary conditioning; discriminator effect of permutation is mixed.
- **Datasets (Table 7):** Travel(954), Sick, HELOC, Adult(32k), Diabetes(101k), California(20k) + synthetic Alarm(37 cat), Asia, GMM. **Max features = 47** (Diabetes 8 num + 39 cat). Row counts vary widely; feature counts do NOT exceed 47.
- **Runtime (Table 6, 2 GPUs, 100 ep, 1000 samples):** fine-tune 9:10h (GReaT) vs 1:35h (CTGAN) vs 0:46min (TVAE); sample 17s (GReaT) vs 4s (CTGAN) vs 0.28s (TVAE).

## 6. Limitations, pitfalls & refutation

- **Feature-count extrapolation (topic-critical):** no dataset exceeds 47 features; "various sizes" means ROW counts, not columns. GReaT is **not validated at 70+ features**. Refute-check survived only as a SCOPED claim: the *permutation objective* transfers; "GReaT scales to 70+ features" does NOT — it is unevidenced and the cost trend is adverse.
- **It is a generator, not a discriminative tokenizer.** Strong numbers are generation quality (ML-efficiency/discriminator/DCR), not a tokenizer feeding a 70-feature predictor. Importing the literal mechanism as a "tokenization recipe" is a category error; the reusable asset is the permutation training principle.
- **Raw-digit numerics, no numeric embedding** — authors concede "smarter encodings for numerical values" as future work. Do not import as a numerical-tokenization method; pair with the `numerical-embeddings` route.
- **Serial autoregressive sampling cost** — 17s/1000 rows at 355M; scales poorly with feature count and dataset size vs one-shot VAE/GAN decoders.
- **Out-of-support generation** — masked by the <1% rejection rate; likely worsens as high-cardinality categoricals grow.
- **Privacy** — DCR is a weak, non-formal proxy; the ethics statement itself warns owners to verify non-re-identification before sharing.
- **Baselines** — only CTGAN/TVAE/CopulaGAN; no other LLM-serialization method (TabLLM/LIFT) and no GBDT generator.

## 7. Transfer assessment for the 70+-heterogeneous-feature setting

Borrow the **random feature-order permutation objective** (order invariance + arbitrary conditioning) and the **column-name-as-semantics** encoding. Treat the verbatim-text *generation* mechanism, the raw-digit numerics, and any "scales to many features" reading as **cautionary, not recipe** — the evidence tops out at ~47 features and the sampling cost is a throughput wall. For a 70+-feature predictor, the practical move is to graft the permutation/order-invariance idea onto a per-feature or numeric-aware tokenizer (FT-Transformer-style numerical embeddings) rather than serialize 70 columns to a long, slow-to-sample sentence.

---

### Key claims a skeptic should check
1. **(mechanism)** Arbitrary conditioning at inference is bought entirely by the train-time random feature-order permutation — no per-conditioning retraining (Def. 2; Sec. 3.2).
2. **(evidence)** GReaT cuts average discriminator accuracy to 69.57% vs ~90% for CTGAN/TVAE/CopulaGAN, a ~16.2% improvement (Table 2).
3. **(evidence)** Pretraining is causal to realism: removing it collapses the discriminator metric (e.g. Adult 99.14% -> 69.77%) (Table 3).
4. **(transfer)** No evaluated dataset exceeds 47 features (Table 7), so the 70+-feature claim is an extrapolation; only the permutation/name-semantics ideas transfer, not the literal serialization-generation pipeline.
5. **(mechanism)** Numerical values are raw digit-string text with no numeric-aware encoding; authors concede smarter numeric encodings as future work (Appendix A.1).
