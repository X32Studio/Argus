# TP-BERTa: Making Pre-trained Language Models Great on Tabular Prediction

- **Authors:** Jiahuan Yan, Bo Zheng, Hongxia Xu, Yiheng Zhu, Jian Wu (Zhejiang University); Danny Z. Chen (Notre Dame); Jimeng Sun, Jintai Chen (UIUC)
- **Year / Venue:** 2024 — ICLR 2024 (arXiv:2403.01841v2, 12 Mar 2024)
- **URL:** https://arxiv.org/abs/2403.01841
- **Code:** https://github.com/jyansir/tp-berta (official, PyTorch + HuggingFace Transformers)
- **Primary route:** llm-tabular-serialization
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

TP-BERTa adapts a frozen-architecture **RoBERTa-base** into a tabular predictor that beats other deep-tabular DNNs and is *competitive with* (not dominant over) tuned GBDTs in the medium-sized, low-dimensional tabular regime. It targets the two things that break naive "serialize the row to text and feed an LM" approaches (GReaT, TapTap, CT-BERT):

1. **Numerical insensitivity** — LMs treat numbers as opaque strings. Fixed by **Relative Magnitude Tokenization (RMT)**.
2. **Feature name–value confusion + long sequences** — a flat templated text makes the LM guess which value belongs to which column and blows up sequence length. Fixed by **Intra-Feature Attention (IFA)**.

It is pretrained *supervised* on 101 binary-classification + 101 regression datasets (~10M rows, each ≤32 features) and finetuned with fixed default hyperparameters on 80 + 65 downstream datasets.

## 2. Technical mechanism

**RMT (numerical channel).**
- Per numerical feature, run **C4.5 target-aware discretization** (a label-guided 1-feature decision tree) to split the value range into up to `nbin=256` bins. Each value → its bin index `k`.
- Add `nbin` brand-new tokens to the RoBERTa vocabulary, embeddings **shared across all numerical features/datasets** (a bin = a *relative* magnitude).
- Final numerical embedding = `E_extra[:,k] * x` — the bin token scaled by the **raw value**, so two values in the same bin still differ.
- A **magnitude-aware triplet loss** regularizes the bin embeddings so nearby bins sit closer than distant bins (margin scaled by `(|k1-k3|-|k1-k2|)/nbin`), applied only in pretraining. Appendix t-SNE shows the 256 tokens collapse onto a regular ordered manifold after pretraining.

**IFA (heterogeneity + length control).**
- One **shared** multi-head self-attention block fuses each feature's `[CLS] + name-tokens + value-token(s)` into a **single vector** `h_i` (read off the per-feature [CLS]).
- Position ids: name tokens 1..l1 (keeps word order), value/magnitude token = 0; position encoding added to **Q/K only, not V** — to avoid a constant-position signal corrupting the randomly-initialized magnitude embeddings.
- Result: the LM-encoder sequence is `[CLS] ⊕ h_1 ⊕ … ⊕ h_n`, length = **#features + 1**, fed with no further cross-feature position encoding (order-agnostic). Prediction from the encoder [CLS] via a task-specific head.

**Categoricals/strings:** codes mapped to meaningful strings (`gender=0 → "male"`), then normal sub-word embedding. Binary == categorical (no distinction). Multi-class excluded.

**Pretraining:** sample one dataset's batch per step, train shared TP-BERTa + that dataset's own head; loss = BCE/MSE + 0.1·triplet-reg. Three versions: cls-only, reg-only (= `Ours_s`), joint (`Ours_j`).

## 3. Why it matters for the topic's stated goals

The topic needs to tokenize 70+ heterogeneous features (numerical + high-cardinality categorical). TP-BERTa contributes **two independently reusable mechanisms** that directly address heterogeneity and sequence cost:
- RMT is a clean way to give an LM/transformer a **magnitude-aware, ordered numerical token** that *decouples* value magnitude from feature-name semantics — explicitly better than the value×name-embedding trick (FT-Transformer / TransTab / CT-BERT) and far better than raw-string numerics (GReaT).
- IFA fixes the sequence-length problem head-on: **1 token per feature** regardless of name/value text length, which is exactly the property you want when feature count is large.

## 4. What is reusable

- **RMT as a numerical tokenizer** on *any* backbone: target-aware bins → shared ordered token vocabulary → embedding × raw value, with a triplet loss to enforce ordinal geometry. Most reusable single idea here.
- **IFA fusion** to keep transformer sequence length linear in feature count and block cross-feature name–value contamination (ablation: -4.17% AUC and 1.32× train time without it).
- The **decoupling principle**: keep feature-name semantics in the language space, keep magnitude in a separate ordered token space, fuse late.
- **Semantic categorical transfer**: embedding category strings (not ids) lets `male/female` knowledge transfer to `boy/girl` across tables without overlapping columns (TransTab) or per-dataset featurizers (XTab).

## 5. What is NOT safely transferable (within this topic's scope)

- **70+-feature regime is unverified.** Pretraining used datasets with **≤32 features**; downstream is "not high dimensional." The "scales to many features" claim is *architectural* (1 token/feature), not *empirical* at 70+. Magnitude/feature representations were never trained at that width.
- **RMT binning is supervised (target-aware C4.5).** It needs labels and must be refit per feature per dataset — label-leakage risk if bins are fit on non-train splits; not an unsupervised/transferable tokenizer out of the box.
- **Win is categorical-driven.** Clear lead only as categoricals dominate (large α/β); on **all-numerical** tables it *loses* to GBDT/FTT. A numerical-heavy 70+-feature table may not inherit the gains.
- **Requires human-readable names + mappable categories.** Opaque names / non-semantic high-cardinality ids were *excluded* — exactly the kind of column common in real wide tables.
- **No temporal axis, no missing-value mechanism, multi-class excluded.**

## 6. Evidence quality

- Strong, broad evaluation (145 downstream datasets) but reported as **average ranks**, not absolute metrics — "competitive with GBDT" = comparable rank, not dominance; tuned XGBoost/CatBoost still match or beat it, especially on numerical data.
- Clean, isolating ablations: RMT vs Value2Str (-12.45%) vs VMFE (-3.44%); IFA on/off (-4.17%); nbin sweep (128→-2.06%, 32→-3.59%); value-position-encoding (-2.35%); pretraining lift (+3.16% vs random, +2.79% vs RoBERTa). These are the credible core.
- **Comparison asymmetry:** TP-BERTa uses fixed default HPs while baselines are Optuna-tuned "for time fairness." A tuned TP-BERTa is never reported, so the head-to-head is not fully isolated.

## 7. Concrete next experiments / hypotheses

1. **Stress-test IFA + RMT at 70–200 features** on a numerical+high-cardinality mix; measure rank/metric vs FT-Transformer-with-PLR and CatBoost. Hypothesis: IFA's length control holds, but RMT's untrained-at-width magnitude tokens degrade.
2. **Replace target-aware C4.5 with unsupervised quantile/PLR bins** to remove the leakage/refit dependency; check whether the triplet-loss ordinal manifold still forms and whether the numerical win survives.
3. **Port RMT alone onto FT-Transformer / a non-LM transformer** to test whether the gain is the magnitude-token idea or the LM prior.
4. **High-cardinality non-semantic ids:** evaluate on columns the paper excluded (opaque codes) to map where the LM advantage actually disappears.
5. **Add a temporal channel** (patch/channel-token fused into an IFA-style per-feature vector) to test the order-agnostic design's compatibility with time-varying features.

---

### Key claims a skeptic should check
- **(mechanism)** RMT = target-aware C4.5 bins → shared LM-vocab magnitude tokens scaled by raw value, ordered by a triplet loss; IFA fuses name+value to 1 token/feature. Both ablation-validated.
- **(transfer)** "Scales to many features" is architectural (seq len = #features+1), NOT tested beyond 32 (pretrain) / low-dim (downstream).
- **(evidence)** Lead over GBDTs is rank-level and categorical-dominated; on all-numerical tables it loses; baselines are tuned while TP-BERTa is default-HP.
