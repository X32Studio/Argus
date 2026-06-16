# On Embeddings for Numerical Features in Tabular Deep Learning

- **Authors:** Yury Gorishniy, Ivan Rubachev, Artem Babenko (Yandex; HSE)
- **Venue / Year:** NeurIPS 2022 — arXiv:2203.05556 (v4, Oct 2023)
- **URL:** https://arxiv.org/abs/2203.05556
- **Code:** https://github.com/yandex-research/tabular-dl-num-embeddings (official; modules later packaged as `rtdl-num-embeddings`)
- **Primary route:** numerical-embeddings
- **Concept layers touched:** token-granularity (per-feature value embedding), learning-signal (target-aware bins), feature-typing (numerical only). Does NOT touch temporal-static-fusion or high-cardinality categorical.
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

It argues that the scalar→vector embedding of *numerical* features is an underexplored degree of freedom in tabular deep learning. Prior Transformer-style tabular models (FT-Transformer, TabTransformer, SAINT) map each numerical scalar to an embedding with a single linear layer; this paper shows that richer, well-chosen per-feature embedding modules give large gains and let plain MLP/ResNet/Transformer backbones close most of the gap to GBDT on GBDT-friendly benchmarks. It is explicitly **not** a new backbone — it is a drop-in input module.

## 2. Technical mechanism

General framework: for the i-th numerical feature, `z_i = f_i(x_i) ∈ R^{d_i}`. Every feature is embedded **independently**, with the **same functional form** but **no parameter sharing** across features. For MLP/ResNet the `z_i` are concatenated into one flat vector; for Transformers each `z_i` is a token.

Two new primitives:

**Piecewise Linear Encoding (PLE).** Split a feature's range into T bins `B_t = [b_{t-1}, b_t)`. Then
```
PLE(x) = [e_1, …, e_T],   e_t = 0           if x < b_{t-1} and t>1
                                 1           if x >= b_t   and t<T
                                 (x-b_{t-1})/(b_t-b_{t-1})  otherwise
```
This is a continuous, **ordinal** analogue of one-hot: every bin below the value is saturated to 1, the active bin carries a linear ramp in [0,1], bins above are 0. It is computed once as preprocessing, is shift/scale-invariant, and is non-differentiable. Bins come from either:
- **Quantiles (PLEq):** `b_t = Q(t/T)` of the train-split feature distribution — unsupervised baseline.
- **Target-aware (PLEt):** grow a decision tree on that single feature vs. the target (C4.5-style discretization) and use leaf regions as bins — supervised. Fit on the **train split only** (`j ∈ J_train`).

For attention backbones a per-feature (unshared) `Linear` is added after PLE to inject feature identity; equivalently each bin gets a trainable vector `v_t` and `f(x) = v_0 + Σ_t e_t·v_t`.

**Periodic embeddings.** `f(x) = concat[sin(v), cos(v)]`, `v = [2π c_1 x, …, 2π c_k x]`, with frequencies `c_i ~ N(0, σ)` **trainable**; `σ` and `k` are tuned (shared across features). σ is reported as an important, sensitive hyperparameter.

**Module taxonomy (compose with conventional layers):** `L`, `LR=ReLU∘Linear`, `Q/T = PLEq/PLEt`, `Q-LR`, `T-LR`, `P=Periodic`, `PL=Linear∘Periodic`, **`PLR=ReLU∘Linear∘Periodic`** (best overall). AutoDis (Guo et al.) is included as a prior CTR baseline and found suboptimal.

## 3. Why it matters for the topic's stated goals

The topic needs a tokenizer for 70+ heterogeneous features, and the **numerical half** is exactly what this paper solves. PLR/PLE is the canonical, benchmark-validated answer for "what should one numerical token be" and is backbone-agnostic, so it slots under FT-Transformer or under a plain MLP. It is the reading-order entry point named in the proposal. It also directly surfaces the topic's central scaling tension: because every feature is embedded independently with its own parameters and becomes its own token, going from a handful to 70+ features multiplies embedding parameters and lengthens the token sequence (quadratic attention).

## 4. What is reusable

- **PLR as the default numerical embedding** (periodic frequencies + Linear + ReLU). Single most reusable recipe.
- **PLE (quantile or tree-based)** when you want interpretability, cheaper compute (no transcendental functions), or robustness to input preprocessing (PLE outputs live in [0,1], invariant to shift/scale — Table 9 shows PLE models are far less sensitive to standardization vs. quantile-transform choice).
- **The framework itself**: embed each numerical feature separately before mixing — directly compatible with a per-feature-token tokenizer for many features.
- Official, maintained code with the modules ready to import.

## 5. Hidden assumptions / what would break at 70+ mixed features

- **Per-feature, unshared parameters → blowup.** Table 7: embedding modules inflate MLP parameter counts by up to ~250x (CA) and ~2000x (CH, small data). At 70+ numerical features this is the dominant, unsolved cost. The paper deliberately reports "only the best metric values without taking efficiency into account."
- **One token per feature → O(F²) attention** on the Transformer backbone for 70+ tokens; the paper offers no efficient-attention or feature-selection remedy (that is a different route).
- **Same functional form for all features** is flagged by the authors as likely suboptimal; with heterogeneous distributions a single shared σ / single bin scheme may underperform.
- **No categorical innovation, no temporal handling, no missing-value story** — only the numerical pillar; the other halves of the topic must come from other works.
- **Target-aware bins can leak**: PLEt fits a tree on train labels; refitting on full data or skipping out-of-fold control reintroduces leakage (proposal anti-pattern).
- **DL-specific, not feature engineering.** Table 10: bolting Periodic onto XGBoost gives no benefit. The gains are tied to DL optimization, so do not assume they transfer to tree models.

## 6. Evidence quality

11 mid/large public datasets, biased toward GBDT-friendly tasks (the hard case for DL), 15 seeds, ensembles compared to ensembles. Headline: **MLP-PLR avg rank 3.0** vs MLP 8.5, XGBoost 4.6, CatBoost 3.6; first DL parity with GBDT on California-Housing and Adult. Clean ablations isolate the tokenizer: PLE vs. binary/thermometer vs. one-blob (Table 8, piecewise-linear wins as default); preprocessing robustness (Table 9); GBDT non-transfer (Table 10). Tree-vs-quantile-bin superiority is explicitly **not** generalized beyond GBDT-friendly data. Strong, well-isolated evidence for the mechanism; weak/absent evidence for efficient scaling.

## 7. Key claims a skeptic should check

1. **(mechanism)** PLR = ReLU∘Linear∘Periodic with learnable frequencies `c~N(0,σ)`, embedding each feature independently, is the best-on-average numerical embedding; PLE (quantile/tree bins) is the cheaper interpretable alternative.
2. **(transfer)** The numerical embedding is backbone-agnostic — it lets plain MLP/ResNet rival attention models — so it is a drop-in numerical tokenizer for a 70+-feature pipeline regardless of the chosen backbone.
3. **(evidence)** Proper numerical embeddings close most of the DL↔GBDT gap on GBDT-friendly benchmarks (MLP-PLR avg rank 3.0 beats XGBoost; first DL parity on California-Housing/Adult).
4. **(transfer/pitfall)** Per-feature, non-shared embeddings cause large parameter blowup (up to ~2000x) and one-token-per-feature sequence length; the paper does NOT demonstrate efficient scaling to many features and explicitly ignores efficiency — the 70+-feature cost is unsolved here.
5. **(pitfall)** The embedding benefit is DL-specific (Periodic gives no gain on XGBoost, Table 10) and target-aware PLE bins require strict out-of-fold/train-only fitting to avoid leakage.
