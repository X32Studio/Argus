# rtdl — Research on Tabular Deep Learning (reference library)

- **Slug:** `rtdl-research-tabular-dl-library`
- **Primary route:** `libraries-and-implementations`
- **URL:** https://github.com/yandex-research/rtdl
- **Type:** library (reference implementation hub) · **Year:** 2025 · **Analysis depth:** deep · **Confidence:** high
- **Authors:** Yury Gorishniy, Ivan Rubachev, Artem Babenko et al. (Yandex Research)
- **Packages:** `rtdl_revisiting_models` (Apache-2.0), `rtdl_num_embeddings` (MIT, v0.0.12, Apr 2025). The old monolithic `rtdl` PyPI package is **deprecated**.

## 1. What this work actually does

`rtdl` is the Yandex Research umbrella for "papers and packages on deep learning for tabular data." It is not a new method — it is the **canonical, maintained reference implementation** of the two works this topic centers on:

- *Revisiting Deep Learning Models for Tabular Data* (NeurIPS 2021) → `rtdl_revisiting_models` exporting **MLP**, **ResNet**, and **FTTransformer**.
- *On Embeddings for Numerical Features in Tabular Deep Learning* (NeurIPS 2022) → `rtdl_num_embeddings` exporting **LinearEmbeddings**, **LinearReLUEmbeddings**, **PeriodicEmbeddings**, **PiecewiseLinearEncoding / PiecewiseLinearEmbeddings**, and **compute_bins**.

The original monolithic `rtdl` package (which exposed `rtdl.FeatureTokenizer`) is deprecated and split into these two focused, separately-licensed packages.

## 2. Technical mechanism

**Base feature tokenizer (FT-Transformer).** Every feature becomes exactly one *d*-dimensional token:

- **Numerical token:** per-feature affine `T_j = b_j + x_j · W_j`, where `W_j, b_j ∈ R^d` are distinct learned parameters per feature (a per-feature `Linear(1, d)`).
- **Categorical token:** per-feature embedding-table lookup (sized by `cat_cardinalities`) plus a per-feature bias.
- A learned **[CLS]** token is appended; the transformer attends over `1 + n_features` tokens and the CLS output feeds the head.

Token granularity is therefore **one token per feature**; sequence length `= n_features + 1`. `FTTransformer` takes `n_cont_features`, `cat_cardinalities`, `d_block`, `n_blocks`, `attention_n_heads`, the dropouts, and crucially `linformer_kv_compression_ratio`. Continuous and categorical features are passed **separately** (`x_cont`, `x_cat`); `make_parameter_groups()` keeps embedding/CLS params out of weight decay.

**Numerical-embedding upgrade.** `rtdl_num_embeddings` replaces the scalar→vector step with richer per-feature modules:
- **Periodic:** `concat[sin, cos]` of learnable-frequency projections (`c ~ N(0, σ)`).
- **PLE (PiecewiseLinearEncoding):** continuous ordinal one-hot over bins; the active bin holds a linear ramp in `[0,1]`, lower bins are 1. Bins come from `compute_bins` — quantile (unsupervised) or **target-aware tree** bins (pass `y` + tree kwargs → the PLEt variant).
- **PLR** = `Periodic → Linear → ReLU`, the recommended composite. A `lite` periodic mode shares the linear across features for efficiency.

Parameters are **never shared across features**. The modules are backbone-agnostic — MLP-PLR is the headline efficient recipe.

## 3. Why it matters for the topic's stated goals

This is the build-goal anchor: the two tokenizers the topic is organized around (FT-Transformer per-feature affine token; PLE/Periodic/PLR numerical embeddings) live here as runnable, tested PyTorch. For a 70+-heterogeneous-feature tokenizer it provides the **numerical + categorical core** out of the box, plus the only **native scaling lever** in the corpus — `linformer_kv_compression_ratio`, a low-rank kv compression that makes the otherwise `O(n_features²)` attention sub-quadratic in sequence length.

## 4. What is reusable

- The **per-feature tokenizer pattern**: `numerical scalar → embedding module` + `categorical → embedding table` → stack into `[B, n_features, d]` + `[CLS]`.
- The **PLR / quantile-PLE modules** for the continuous half (drop-in; default PLR, switch to quantile-PLE for interpretability/cheaper compute).
- The **Linformer kv-compression knob** as the first thing to try when `n_features` makes attention expensive.
- `compute_bins` with quantile vs tree options as a clean bin-fitting utility.

## 5. Hidden assumptions / what breaks at 70+ heterogeneous features

- **Numerical + categorical only.** No temporal/time-series tokenizer, no multicategorical/text/image stype, no learned-missingness signal — narrower than `pytorch-frame`. The time-varying half of the target feature set needs an external tokenizer.
- **High-cardinality categoricals unaddressed:** each gets a full embedding table (linear blowup); no hashing/QR/compositional codes. The caller must pre-compress.
- **Per-feature non-shared embeddings** multiply parameter count by feature count (~10×–1000× in the source paper) and impose `O(n_features²)` attention; Linformer is the only mitigation and is **not benchmarked at 70+ features in-library**.
- Same embedding functional form for every numerical feature — no per-feature distribution adaptation, exactly the heterogeneity the topic cares about.

## 6. Evidence

Reproduces its two source papers: FT-Transformer as a strong universal DL baseline (2021); MLP-PLR average rank ~3.0 vs vanilla MLP ~8.5, beating XGBoost and rivalling CatBoost on 11 mid/large datasets (2022). The library's own contribution is reproducibility, not a new SOTA number — it is the de-facto baseline imported/compared-against by TabR, TabM, ExcelFormer, and pytorch-frame.

## 7. Pitfalls / skeptic checks

1. **Deprecated `rtdl`** — old `rtdl.FeatureTokenizer` import path is stale; use `rtdl_revisiting_models` + `rtdl_num_embeddings` (two different licenses, Apache-2.0 vs MIT).
2. It **packages prior work** — cite as reference implementation, not a tokenization advance.
3. **Target-aware PLE bins** (`compute_bins(..., y=...)`) are fit on labels → leakage if refit on full set or per-fold.
4. **Periodic/PLR gains are DL-specific** — they do not transfer to GBDTs.
5. `x_cont`/`x_cat` must be passed **separately**, and CLS/embedding params excluded from weight decay via `make_parameter_groups()` — silent quality loss if mishandled.
6. **No in-library 70+-feature scaling benchmark**; the Linformer knob exists but its accuracy cost on wide heterogeneous tables is untested here.

## Proposed graph edges
- `(work:rtdl-research-tabular-dl-library) belongs_to_route (route:libraries-and-implementations)`
- `(work:rtdl-research-tabular-dl-library) uses_technique (technique:ft-transformer-feature-tokenizer)`
- `(work:rtdl-research-tabular-dl-library) uses_technique (technique:plr-periodic-linear-relu-embedding)`
- `(work:rtdl-research-tabular-dl-library) uses_technique (technique:piecewise-linear-encoding-ple)`
- `(work:rtdl-research-tabular-dl-library) enables_scaling (technique:linformer-kv-compression)`
- `(work:rtdl-research-tabular-dl-library) transferable_to (route:numerical-embeddings)`
- `(work:rtdl-research-tabular-dl-library) alternative_to (work:pytorch-frame-stype-library)`
- `(work:rtdl-research-tabular-dl-library) compared_against (work:ft-transformer-revisiting-tabular-dl)`
