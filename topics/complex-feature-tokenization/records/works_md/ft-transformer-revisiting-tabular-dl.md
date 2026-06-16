# Revisiting Deep Learning Models for Tabular Data (FT-Transformer)

- Authors: Yury Gorishniy, Ivan Rubachev, Valentin Khrulkov, Artem Babenko (Yandex; MIPT; HSE)
- Venue / Year: NeurIPS 2021 — arXiv:2106.11959
- URL: https://arxiv.org/abs/2106.11959
- Code: https://github.com/yandex-research/tabular-dl-revisiting-models (official PyTorch) + `rtdl` pip package
- Primary route: `tabular-transformers`
- Concept layers touched: token-granularity (per-feature value-aware token), feature-typing (unified num+cat), scaling-interaction (Transformer self-attention as implicit feature interaction; O(k^2) wall), learning-signal (supervised end-to-end only)
- Analysis depth: deep | Confidence: high

## 1. What this work actually does

A benchmarking / "raise-the-baselines" paper that does two things: (a) shows a properly-tuned ResNet-style
MLP is a surprisingly strong, often-missing tabular DL baseline, and (b) introduces **FT-Transformer**
(Feature Tokenizer + Transformer) — a deliberately minimal adaptation of the vanilla Transformer to tabular
data. It compares both against MLP, SNN, NODE, TabNet, GrowNet, DCN-V2, AutoInt, and against GBDT (XGBoost,
CatBoost) on 11 public datasets under one shared training + Optuna tuning protocol with fixed splits. The
headline: FT-Transformer is the most consistently strong DL model (best mean rank), but there is still no
universally superior solution versus GBDT.

## 2. Technical mechanism

**Feature Tokenizer** turns each of the k input features into one d-dimensional token:

    T_j = b_j + f_j(x_j) ∈ R^d
    numerical:   T_j^(num) = b_j^(num) + x_j^(num) · W_j^(num)          (W_j^(num) ∈ R^d)
    categorical: T_j^(cat) = b_j^(cat) + e_j^T W_j^(cat)                (W_j^(cat) ∈ R^{S_j × d}, e_j one-hot)
    T = stack[T_1, …, T_k] ∈ R^{k×d}

Key design points:
- **Per-feature learned weight + per-feature learned bias** for every feature, numerical and categorical alike.
  The bias is added in both branches and is shown (ablation) to be necessary.
- Numerical embedding is just **scalar × learned-vector** (an affine, single-piece embedding). No binning,
  no piecewise-linear, no periodic features.
- Categorical embedding is a standard per-feature lookup table (entity-embedding style) projected into the
  same dimension d as numerical tokens, so all feature types live in one homogeneous token space.

**Transformer + prediction:** a learnable `[CLS]` token is prepended, then L **pre-norm** Transformer layers
(MHSA + FFN) run over the (k+1)-length sequence; the first layer's first normalization is removed for stable
optimization. Prediction reads only the final `[CLS]` token: ŷ = Linear(ReLU(LayerNorm(T_L^[CLS]))). Default
config ≈ 930K params. Self-attention is permutation-invariant over features and provides **implicit** all-pairs
feature interaction — there is no explicit interaction layer.

## 3. Why it matters for the topic's stated goals

The topic is tokenizing 70+ heterogeneous (numerical + high-cardinality categorical, partly temporal) features
for deep tabular models. FT-Transformer is the **reference design** for the "per-feature token" school: it is
the cleanest statement of "embed every feature into one shared token space and let attention mix them." Almost
every later tabular tokenizer in the `tabular-transformers`, `numerical-embeddings`, and
`tabular-foundation-models` routes is described as an extension or contrast to this scaffold. Understanding its
exact mechanism (and its two weak spots — naive numerical embedding and quadratic attention) defines what must
be upgraded for the wide, mixed, partly-temporal target setting.

## 4. What is reusable

- **The unified affine per-feature tokenizer** `T_j = b_j + f_j(x_j)` with a separate learned weight and bias
  per feature — directly reusable as the embedding front-end for dozens-to-hundreds of mixed features.
- **The per-feature bias term** — cheap, empirically necessary; keep it.
- **`[CLS]`-token readout over a vanilla pre-norm Transformer** — a known-good, low-surprise backbone; the
  ablation shows it beats AutoInt's bespoke attention backbone.
- **The "swap the numerical branch" pattern** — because `f_j^(num)` is an isolated module, it is the natural
  insertion point for PLR / periodic / binned numerical embeddings (the 2022 follow-up does exactly this).

## 5. What is NOT safely transferable (within this topic's scope)

- **The naive scalar×vector numerical embedding** is weak; for 70+ features with varied scales/distributions it
  should be replaced by richer numerical embeddings. Treat this paper as the scaffold, not the numerical recipe.
- **Vanilla O(k²) self-attention** does not scale gracefully to very wide tables — the authors say so. For 70+
  (and certainly for the 699/2000-feature outliers) you need efficient attention, feature selection, or grouping.
- **No high-cardinality handling**: per-feature lookup tables grow linearly in cardinality; high-card fields
  blow up parameters/memory. Needs hashing / compositional codes / target encoding bolted on.
- **No temporal or missing-value handling** at all — the topic's temporal-static fusion requirement is entirely
  out of scope for this architecture as published.
- **No pretraining/transfer** — tokens are shaped only by the supervised loss.

## 6. Evidence quality

Strong internal evidence: 11 datasets, fixed single splits shared across all models, one Optuna tuning budget,
results averaged over runs (15 for the ablation). The ablation cleanly isolates two claims: (i) feature biases
matter, (ii) the vanilla-Transformer backbone beats AutoInt's. The synthetic GBDT-vs-DL-target interpolation is
a thoughtful mechanism-level probe of *why* FT-Transformer is more "universal." Caveats: single train/val/test
split per dataset (no cross-validation), the 11-dataset suite skews to moderate feature counts, and the
"universality" / "no universally superior solution" framing was later contested by broader tabular benchmarks
(e.g. Grinsztajn et al. 2022) arguing GBDT still leads on many tasks. Take the DL-favorable conclusion as
best-case, not settled.

## 7. Concrete next experiments / hypotheses

1. Replace `f_j^(num)` with PLR/periodic numerical embeddings and re-measure on wide tables — quantify how much
   of FT-Transformer's gap to GBDT is the numerical branch vs the backbone. (Bridges to `numerical-embeddings`.)
2. Stress-test the O(k²) wall: profile FT-Transformer at 70 / 200 / 700 features and compare against a
   linear/efficient-attention variant and against a feature-grouping tokenizer for the same accuracy.
3. Add a high-cardinality strategy (hashing or shared compositional codes) to the categorical branch and measure
   the parameter/memory savings vs accuracy on a high-card dataset.
4. Probe whether attention maps actually give usable feature importances at 70+ features, or degrade (the paper
   already hints they are weaker than Integrated Gradients).
5. Bolt a temporal branch (patch tokens for time-varying features) onto the same token space to test the
   temporal-static fusion hypothesis with FT-Transformer as the static backbone.

## Key claims a skeptic should check

- **(mechanism)** FT-Transformer's numerical embedding is only `b_j + x_j·W_j` (scalar × learned vector); the
  strong PLR/periodic numerical embeddings often attributed to "FT-Transformer" are a *separate* 2022 follow-up.
- **(evidence)** The per-feature **bias term is necessary**: removing it measurably hurts accuracy (Table 5,
  15-run average); and the vanilla pre-norm Transformer backbone beats AutoInt's custom attention backbone.
- **(transfer)** The author-stated limitation — vanilla MHSA is **O(k²) in feature count** and "may not be
  easily scaled" to large feature counts — directly threatens the topic's 70+-feature goal; mitigation
  (efficient attention / selection) is suggested but not implemented here.
- **(evidence)** The "more universal than ResNet" claim is supported by both the real-data pattern (gains
  concentrate where GBDT beats ResNet) and a synthetic GBDT↔DL target-interpolation experiment.
- **(transfer)** Categorical handling uses plain per-feature lookup tables with **no high-cardinality
  compression**, so embedding-table size grows linearly with cardinality — a real cost for high-card fields.
