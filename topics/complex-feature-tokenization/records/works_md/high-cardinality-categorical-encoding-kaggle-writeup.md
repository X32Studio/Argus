# High-Cardinality Categorical & Feature-Encoding Practice in Winning Tabular / Production Pipelines

- **Slug:** `high-cardinality-categorical-encoding-kaggle-writeup`
- **Primary route:** `industrial-feature-systems`
- **Work type:** blog / practitioner knowledge writeup (grounded in canonical papers + library docs)
- **Year:** 2024 (living practice; canonical anchors 2001 / 2018 / 2021)
- **URL:** https://www.kaggle.com/competitions
- **Analysis depth:** deep · **Confidence:** high

Canonical sources synthesized:
- Micci-Barreca, *A preprocessing scheme for high-cardinality categorical attributes*, SIGKDD Explorations 3(1), 2001 — the empirical-Bayes smoothing scheme.
- Prokhorenkova, Gusev, Vorobev, Dorogush, Gulin, *CatBoost: unbiased boosting with categorical features*, NeurIPS 2018, arXiv:1706.09516 — ordered target statistics + ordered boosting (PDF saved to `sources/papers/catboost-1706.09516.pdf`).
- Pargent, Pfisterer, Thomas, Bischl, *Regularized target encoding outperforms traditional methods…*, arXiv:2104.00629 (Computational Statistics 2022) — the head-to-head benchmark.
- `sklearn.preprocessing.TargetEncoder`, `category_encoders` library, CatBoost docs — runnable implementations.

## 1. What this work actually does

It is the practitioner playbook for turning **high-cardinality categorical columns** (IDs, geo/ZIP codes, SKUs, app/site/user IDs — thousands to millions of unique values) into a **fixed, small number of target-aware scalar columns**, so they can feed a GBDT (or any tabular learner) cheaply and without exploding dimensionality. Three encoding families dominate winning Kaggle solutions and production CTR/fraud pipelines:

1. **Target / mean encoding with smoothing** — replace a category by the mean target conditioned on it, shrunk toward a global prior.
2. **Out-of-fold (K-fold) / leave-one-out target encoding** — compute a row's encoding only from *other* rows so its own label can't leak.
3. **CatBoost ordered target statistics (ordered TS)** — fix a random permutation and encode each example using only the targets of examples *preceding* it.

**Count / frequency encoding** (replace category by its occurrence count or relative frequency) is the label-free companion that adds popularity signal with zero target leakage.

## 2. Technical mechanism

**Empirical-Bayes smoothing (Micci-Barreca 2001).** Encoded value =
`λ(n_i) · (category target mean) + (1 − λ(n_i)) · (global target mean)`,
with `λ(n_i) ∈ [0,1]` increasing in the category count `n_i`. Rare categories are shrunk to the global prior; frequent ones trust their own mean. The common additive form is
`(Σ y_for_category + m · global_mean) / (count + m)`, prior strength `m`.

**Leakage control.** Naive (greedy) target encoding computes the mean on the *full* training set, so a row's own label enters its own feature — classic target leakage. Fixes, in increasing principledness:
- **Holdout TS** — encode from a separate split (wastes data, high variance).
- **Leave-one-out TS** — exclude the current row (CatBoost paper flags it as *still biased*; the removal itself creates a target-correlated artifact a tree can exploit).
- **Out-of-fold / K-fold TS** — encode each fold from the others; the standard Kaggle default.
- **CatBoost ordered TS** — the principled fix:
  `x̂_i = (Σ_{j precedes i, same category} y_j + a·p) / (count_preceding_i + a)`,
  where `a` is the prior strength and `p` the prior (global target mean). Each example is encoded only from its random-permutation *prefix*, mimicking "only past data" and producing an (approximately) unbiased statistic.

**Ordered boosting** applies the *same* permutation principle to the boosting loop: a fresh permutation per iteration, residuals for each example computed only from trees fit on its predecessors — removing the "prediction shift" that biases standard GBDT when the encoding and the gradient both see the same data.

**Feature combinations.** CatBoost greedily builds combined categorical features during tree growth (e.g. `city × device`) and encodes the combination with the same ordered-TS machinery, recovering categorical interactions that scalar per-column encoding alone would miss. Manual pipelines emulate this with hand-crafted crossed categoricals encoded before the model.

## 3. Why it matters for the topic's stated goals

The topic's end goal is a tokenizer for **70+ heterogeneous features including high-cardinality categoricals**. One-hot on a 100k-cardinality column is intractable; learned embedding tables overfit the long tail and have no OOV story. Target/OOF/ordered encoding collapses *any* cardinality to ~1–3 scalar columns — the cheapest known admission of ID-like fields — and the smoothing prior gives graceful rare/unseen-category behaviour (shrink to global prior). This is exactly how winning ad-tech/CTR and fraud pipelines fit dozens of high-cardinality fields into a tractable feature matrix.

## 4. What is reusable

- **Leakage-control discipline (the durable lesson):** compute *every* target-derived feature from data the row never saw — OOF, LOO, or ordered prefix. This is a hard requirement for any target-aware token the user builds, independent of model family.
- **Fixed-width scalar output decoupled from cardinality:** dozens of high-cardinality fields add only dozens of columns.
- **Count/frequency encoding as a complement** to capture popularity that target encoding discards.
- **Ordered statistics as a strictly-causal encoder** — the cleanest analogue when rows have a time order (transactions/sessions), where random-fold OOF still leaks future into past.
- **Greedy categorical combinations** as a recipe for recovering interactions cheaply.

## 5. Evidence

- **CatBoost (NeurIPS 2018):** ordered TS + ordered boosting beat XGBoost, LightGBM, H2O on Adult, Amazon, Click-prediction, Epsilon, Higgs; gains largest on categorical-heavy data (Amazon, Click).
- **Pargent et al. (2021/2022):** regularized target/GLMM encoding "consistently provided the best results" vs integer, one-hot/dummy, and frequency encoding across **5 algorithms** (lasso, random forest, gradient boosting, kNN, SVM) on regression + binary + multiclass datasets; regularization is what drives the advantage.
- **Micci-Barreca (2001):** establishes the smoothing scheme underlying all of the above.
- **Practitioner consensus:** target encoding is a "secret sauce" of Kaggle tabular wins — *but only when leakage is controlled and smoothing is applied.*

## 6. Limitations & pitfalls

- **Leakage is the dominant failure mode** (and the proposal's named anti-pattern). Greedy full-data target encoding leaks the row's own label, inflates CV, and collapses on the leaderboard / in production. OOF/LOO/ordered is mandatory.
- **LOO is still subtly biased** (CatBoost flags it); ordered TS is the principled fix.
- **Time-ordered data:** random-fold OOF leaks future→past; use time-respecting folds or ordered TS.
- **Count/frequency encoding** leaks no target but conflates "popular" with "predictive" and is unstable under train/test frequency shift — a complement, not a substitute.
- **Tree→deep transfer trap** (proposal anti-pattern): scalar codes are tuned for GBDT inequality splits; fed to an attention/MLP tokenizer they need projection and *compete with* a learned embedding rather than beating it. The benchmark wins do **not** transfer unchanged to a deep tokenizer.
- **Supervised-only / per-target:** target encoding needs the label, must be refit per target, and is unavailable for self-supervised tokenization.
- **Scalar output discards within-category structure** — cannot say two IDs are "similar" (unlike entity embeddings or MinHash string codes); multiclass/regression multiplies columns.

## 7. Transfer assessment for the 70+-mixed-feature setting

**Borrow first:** the leakage-control discipline + fixed-width target/count scalars for ID-like fields. **Scope down:** the scalar is a weak fit for a transformer tokenizer — pair target encoding (for signal magnitude) with a learned entity embedding or vocabulary-free string code (for similarity structure) rather than replacing them. **Reject for deep tokenization:** the assumption that GBDT target-encoding wins carry over to attention/MLP unchanged. The cleanest deep-tokenizer adaptation is to use ordered/OOF target statistics as one *channel* of a multi-view categorical token (target-scalar ⊕ count-scalar ⊕ learned-embedding), keeping the strictly-causal computation so end-to-end training does not silently leak.
