# Moirai: Unified Training of Universal Time Series Forecasting Transformers

- **Authors:** Gerald Woo, Chenghao Liu, Akshat Kumar, Caiming Xiong, Silvio Savarese, Doyen Sahoo (Salesforce AI Research; SMU)
- **Year / Venue:** 2024, ICML 2024 (PMLR 235). arXiv:2402.02592v2.
- **URL:** https://arxiv.org/abs/2402.02592
- **Code:** https://github.com/SalesforceAIResearch/uni2ts (Apache-2.0, maintained; weights + LOTSA on HuggingFace)
- **Primary route:** `timeseries-foundation-models`
- **Also spans concept layers:** `token-granularity` (patch tokens), `scaling-interaction` (any-variate flatten + binary bias), `temporal-static-fusion` (covariates-as-variates), `learning-signal` (mixture-NLL pretraining).
- **Analysis depth:** deep — **Confidence:** high

## 1. What this work actually does

Moirai is a single pretrained "Large Time Series Model" meant to forecast *any* time series zero-shot, replacing the one-model-per-dataset paradigm. It targets three heterogeneity problems that a universal forecaster faces: (i) **cross-frequency** patterns, (ii) **arbitrary number of variates** in multivariate data, and (iii) **varying distributions** across datasets. It is a masked-encoder Transformer trained by maximizing the log-likelihood of a mixture distribution on LOTSA, a newly assembled archive of **27,646,462,733 observations across 9 domains**. Trained in three sizes (Small 14M, Base 91M, Large 311M), it matches or beats *full-shot* deep baselines that were trained on each target dataset, while being a single zero-shot model.

## 2. Technical mechanism

Four components, each tied to one heterogeneity challenge:

1. **Multi-patch-size projection (cross-frequency).** Series are split into non-overlapping patches; a token is a linear projection of one length-`p` patch. Instead of a single patch size, Moirai learns a *bank* of input/output projection layers, one per patch size in **{8, 16, 32, 64, 128}**. A frequency->patch-size lookup picks the size: **large patches for high-frequency data** (fewer tokens, cheaper quadratic attention, long context) and **small patches for low-frequency data** (push work into the Transformer). One weight set per patch size, shared across frequencies that map to it.

2. **Any-variate Attention (arbitrary variates).** All variates are **flattened into one sequence** (variate `m`, time `i`). Attention score adds two signals to the QK term: **RoPE** `R_{i-j}` for the *time* axis, and a **binary attention bias** `u^(1)·1{m=n} + u^(2)·1{m≠n}` (two learnable scalars per head/layer) for the *variate* axis — i.e. "is this the same column or a different column?" This gives permutation equivariance over variate ordering, permutation invariance over variate indices, and an **unbounded variate count with zero per-variate parameters** (no embedding table to size).

3. **Mixture distribution head (varying distributions).** Output is a mixture of 4 parametric families: Student's-t, negative binomial, log-normal, low-variance normal. NLL loss. Optimizing MLE of a flexible distribution is competitive with target-metric optimization and lets any metric be evaluated afterward.

4. **Masked-encoder backbone.** Encoder-only Transformer, full self-attention, forecast-horizon patches replaced by a learnable `[mask]` and decoded **in parallel** (not autoregressive — contrast Chronos). LLM-style internals: pre-norm, RMSNorm, QK-norm, SwiGLU, no biases. Reversible instance norm on in/out.

**Training:** task distribution samples context/prediction lengths (total seq ≤ 512 patches, horizon 15-50% of window) and variate count from beta-binomial(n=128,a=2,b=5), mean ≈37, **max 128 variates**; univariate sub-datasets are randomly concatenated into synthetic multivariates. Sub-dataset sampling capped at eps=0.001 to fight imbalance; sequence packing raises effective batch.

## 3. Why it matters for the topic's stated goals

The topic's hard problem is feeding **70+ heterogeneous features** (numeric + high-cardinality categorical + time-varying + static) into one transformer. Moirai contributes the cleanest published answer to one sub-problem: **how to represent an unbounded, permutation-invariant set of fields without a fixed embedding table**. Its any-variate flatten + binary field-ID bias is exactly the machinery you would want if you treat each tabular feature as a "variate". It also demonstrates a **multi-projection bank keyed on a feature property** (frequency) so one model serves heterogeneous inputs — an idea that transposes to keying on feature *type*.

## 4. What is reusable

- **Binary field-ID attention bias** (`same-feature` vs `different-feature` learnable scalars) as a parameter-free substitute for per-field embedding tables — handles arbitrary/uncapped feature counts and stays permutation-invariant. This is the single most transferable idea.
- **Flatten-all-fields-into-one-sequence + full attention** to model explicit cross-feature interaction (vs channel-independent baselines).
- **Multi-projection bank selected by a feature property** (frequency here; feature-type/numeric-vs-categorical for tabular) — one model, many input shapes.
- **Mixture-of-parametric-distributions NLL head** for heterogeneous targets/columns with different support (counts, skewed, symmetric).
- **Masked-encoder parallel decode** (faster than autoregressive value-token models for the time-varying half).

## 5. Hidden assumptions / what would break in the 70+-feature setting

- **Quadratic cost in (fields × length).** Flattening makes attention O((d_y·L)²). The paper itself flags "limited support for high-dimensional time series". 70+ features × any reasonable context length explodes the sequence — the assumption that variate count stays in the low dozens (mean ≈37, cap 128) is the one most likely to break here. Needs efficient/sparse attention to survive.
- **No categorical or static path.** Every input is a real-valued patch; there is no learned category token, no high-cardinality handling, no static-attribute fusion. The topic's categorical/static half is simply absent.
- **Field identity is only "same vs different".** Two different categorical columns are indistinguishable beyond "not the same column" — no semantic feature meaning is carried. For 70+ *named, semantically distinct* features this is a coarse signal.
- **Cross-variate behavior partly learned from synthetic concatenations** of unrelated univariate series, which may not reflect real feature-correlation structure.
- **Not turnkey zero-shot:** results require per-dataset inference-time selection of context length {1000..5000} and patch size on a validation set.

## 6. Evidence (ablations, results)

Ablation on Monash aggregate **normalized MAE (lower = better)**, from `MOIRAI_Small = 0.655`:

| Variant | Norm. MAE |
|---|---|
| MOIRAI_Small (full) | **0.655** |
| w/o patch-size constraints | 0.720 |
| **w/o multi patch size (fixed 32)** | **1.156** |
| **w/o Any-variate Attention** | **0.904** |
| w/o mixture distribution (Student-t only) | 0.740 |
| w/o LOTSA diversity (GluonTS+Monash only) | 0.809 |
| w/o sequence packing | 0.785 |

Takeaway: the **multi-patch-size bank is the dominant component** (biggest degradation), then any-variate attention, then data diversity. The mixture head and packing are smaller but real gains.

Headline results: single Moirai beats all per-dataset Monash baselines (in-distribution); Moirai-Base/Large get best-or-2nd-best CRPS/MSIS zero-shot on 6 held-out datasets vs full-shot PatchTST/TiDE/TFT/DeepAR (all but Walmart, Istanbul Traffic); competitive on long-sequence ETT/Electricity/Weather vs iTransformer/PatchTST/TimesNet. Performance keeps improving with context length 100->5000.

## 7. Pitfalls / refutations to check

- "Flexible distribution" = a **fixed 4-mixture**, not learned/nonparametric. Don't overclaim.
- The dominant ablation gain is **multi-patch-size + data diversity**, NOT the any-variate attention — so the most-transferable-for-this-topic component (the binary bias) is *not* the empirically dominant one. Treat its reusability as plausible-but-unproven for tabular.
- "Zero-shot beats full-shot" still requires per-dataset inference-time tuning of context length and patch size — it is not metric-free zero-shot.
- Large ≮ Base consistently on long-sequence: scaling story is tenuous.
- Quadratic-in-(variates×length) cost directly contradicts the topic's "scale to 70+ features" requirement without an efficiency fix.

## Proposed graph edges

- `moirai-unified-universal-forecasting` --belongs_to_route--> `route:timeseries-foundation-models`
- `moirai-unified-universal-forecasting` --introduces_technique--> `technique:any-variate-attention` (binary field-ID bias + flatten)
- `moirai-unified-universal-forecasting` --introduces_technique--> `technique:multi-patch-size-projection`
- `moirai-unified-universal-forecasting` --uses_technique--> `technique:patch-tokenization`
- `moirai-unified-universal-forecasting` --uses_technique--> `technique:mixture-distribution-head`
- `technique:any-variate-attention` --transferable_to--> `route:feature-interaction-selection`
- `technique:any-variate-attention` --enables_scaling--> `route:feature-interaction-selection`
- `technique:any-variate-attention` --alternative_to--> `technique:channel-as-token` (iTransformer)
- `moirai-unified-universal-forecasting` --compared_against--> `patchtst-time-series-64-words`
- `moirai-unified-universal-forecasting` --compared_against--> `itransformer-inverted-transformers`
- `moirai-unified-universal-forecasting` --improves_on--> `temporal-fusion-transformer`
- `moirai-unified-universal-forecasting` --has_pitfall--> `pitfall:quadratic-variates-times-length`
- `moirai-unified-universal-forecasting` --has_pitfall--> `pitfall:no-categorical-or-static-path`
- `chronos-time-series-tokenization` --alternative_to--> `moirai-unified-universal-forecasting` (discrete value-bins vs continuous patch + mixture head)
