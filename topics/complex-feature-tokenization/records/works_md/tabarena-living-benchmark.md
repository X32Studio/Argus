# TabArena: A Living Benchmark for Machine Learning on Tabular Data

- **Authors:** Nick Erickson (AWS), Lennart Purucker (U. Freiburg), Andrej Tschalzev (U. Mannheim), David Holzmüller (INRIA/ENS/PSL), Prateek Mutalik Desai (AWS), David Salinas (ELLIS Tübingen/Freiburg), Frank Hutter (Prior Labs/ELLIS/Freiburg)
- **Year:** 2025
- **Venue:** arXiv:2506.16791 (v4, Nov 2025); NeurIPS 2025 Datasets & Benchmarks Track (spotlight)
- **URL:** https://arxiv.org/abs/2506.16791
- **Type:** benchmark | **Primary route:** tabular-transformers
- **Analysis depth:** deep | **Confidence:** high
- **PDF:** `sources/papers/tabarena-living-benchmark.pdf` (66 pages incl. appendices)

## 1. What this work actually does

TabArena is a *continuously maintained living benchmarking system* for predictive ML on tabular
data — versioned and maintained like open-source software rather than a frozen one-off paper.
Version 0.1 initializes it through four contributions:

1. **Curation of 51 datasets** out of 1053 investigated, screened by hand against ~10 criteria
   (unique; IID; genuinely tabular domain; real predictive task; not synthetic; 500–250,000 train
   samples; no irreversible preprocessing leaks; permissive license; API-downloadable; no obvious
   ethical concerns). Published as OpenML suite `tabarena-v0.1` (suite ID 457).
2. **16 models in a unified, well-tested pipeline** (AutoGluon `AbstractModel`, sklearn-compatible),
   including 3 tabular foundation models, run with curated HPO search spaces (often co-designed with
   the original authors).
3. **A public leaderboard + precomputed result artifacts + reproducible code** at tabarena.ai.
4. **A maintainer team** across institutions to keep it alive.

Scale: ~25,000,000 model instances trained; ~15 wall-clock-years of compute. Ranking metric is
**Elo** (ROC AUC for binary, log-loss for multiclass, RMSE for regression; 1000 Elo calibrated to a
default RandomForest), with bootstrapped 95% CIs.

It is **not** a tokenization method. Its value to this topic is as the fair-evaluation arena that
bounds when the deep-tabular and foundation-model tokenizers studied here actually beat GBDTs.

## 2. Technical mechanism (of the benchmark, not a model)

- **Models ranked (Table 1):** GBDTs — XGBoost, LightGBM, CatBoost; tree baselines —
  RandomForest, ExtraTrees; EBM; neural nets — FastaiMLP, TorchMLP, RealMLP, TabM-mini, ModernNCA;
  foundation models — TabPFNv2, TabICL, TabDPT; baselines — Linear/Logistic, KNN. Reference
  pipeline: AutoGluon 1.3 (`best_quality`, 4h).
- **Evaluation design:** nested CV. Outer: 10×-repeated 3-fold for datasets <2500 samples, 3
  repeats otherwise (class-stratified for classification). Inner: 8-fold CV used both to select the
  best of 1 default + 200 random HPO configs and to build **cross-validation ensembles**. Foundation
  models instead **refit on train+val** (per TabPFN/TabICL author guidance), not CV-ensembled.
- **Three reporting regimes per tunable model:** Default, Tuned (best single config), and
  **Tuned + Ensembled** (weighted post-hoc ensemble of HPO configs).
- **Model applicability constraints (key for this topic):** TabICL and TabDPT have no HPO protocol →
  default-only. TabPFNv2 restricted to **≤10,000 samples, ≤500 features, ≤10 classes**; TabICL to
  **classification, ≤100,000 samples, ≤500 features**. So foundation models are scored only on the
  subsets they fit: **33 datasets** (TabPFNv2) and **36 classification datasets** (TabICL).
- **Dataset characteristics (Fig. 3):** features span ~10→~1000 (log axis); samples 500→250,000;
  per-dataset categorical-feature fraction ranges across the full 0–100%. **Temporal/time-series
  and any non-IID (group/temporal-split) data are explicitly excluded** and deferred to future
  versions.

## 3. Why it matters for the topic's stated goals

This topic is about tokenizing 70+ heterogeneous (numerical + high-cardinality categorical, partly
temporal) features for deep tabular models. TabArena is the most rigorous current answer to *"does
my fancy tokenizer actually beat a GBDT, and where?"* — and it sharpens that question in three ways
that matter directly:

- It proves the **deep-tabular embedding lineage** (RealMLP's numerical embeddings/scaling, TabM's
  multi-head MLP) can match or beat tuned GBDTs **only after tuning + post-hoc ensembling**, on
  small-to-medium IID tables. Under tight compute or single-config tuning, CatBoost/GBDTs still lead.
- It shows the **per-cell, prior-fitted foundation tokenizers** (TabPFNv2 especially) dominate — but
  *only on the ≤500-feature, small-sample subset*. For this topic's 70+-feature-at-scale target,
  TabArena supplies **no** foundation-model evidence above 500 columns.
- It gives a **ready 51-dataset testbed + precomputed baselines** so a new tokenizer can be evaluated
  cheaply and fairly on the static numerical+categorical part of the problem.

## 4. What is reusable

The reusable asset is the **evaluation methodology**, transferable verbatim to validating a new
feature tokenizer:

1. **Compare under Tuned + post-hoc-ensembled, nested-CV conditions.** TabArena's strongest empirical
   point: the top-3 single models (TabM, LightGBM, RealMLP) all fall *below* CatBoost without
   post-hoc ensembling. Single-config or holdout comparisons systematically understate strong models
   and overstate models that ensemble internally — a trap for tokenizer papers.
2. **Stratify results by feature-count and sample-count buckets**, because tokenizer advantage is
   regime-specific.
3. **Treat validation-set overfitting as a first-class failure mode** (see §6).
4. **Reuse the OpenML suite (ID 457) + result artifacts** as a drop-in static testbed.

## 5. What would fail when moved to this topic's target setting

- **No temporal axis.** v0.1 filters out all temporal/time-series/non-IID data, so it says nothing
  about the temporal-static-fusion layer that is central to this topic. A tokenizer for time-varying
  + static features cannot be validated on TabArena-v0.1 as-is.
- **Feature ceiling for the foundation-model verdict.** The "foundation models win" result is capped
  at ≤500 features and small samples. At 70+ features *with many rows* (this topic's regime), use
  TabArena's deep-net/GBDT lane, not its foundation-model lane, for evidence.
- **Sample ceiling 250k** — large-table behavior is out of scope.
- **51 datasets, subjectively curated.** Small absolute count; exclusion criteria applied lazily
  (first reason wins, not exhaustive), so coverage of high-cardinality-categorical stress cases is
  incidental, not guaranteed.

## 6. Key claims a skeptic should check

- **(mechanism)** Peak per-model performance requires post-hoc ensembling of tuned HPO configs:
  the leaderboard's top-3 (TabM, LightGBM, RealMLP) would each rank below CatBoost without it, and
  CatBoost is #1 in the conventional single-config tuned regime. Reordering driven by ensembling, not
  by the base learners.
- **(evidence)** Foundation-model dominance is subset-bounded: TabPFNv2 beats all others by a large
  margin **only** on the 33-dataset ≤500-feature/≤10k-sample subset (TabICL on 36 classification
  datasets ≤500 features/≤100k). No claim above 500 features.
- **(transfer)** The fair-comparison protocol (tuned + ensembled + nested CV, stratified by
  feature/sample count) is the reusable contribution for validating a 70+-feature tokenizer — the
  models themselves are off-the-shelf.
- **(evidence)** Some deep-learning models are *overrepresented in cross-model ensembles due to
  validation-set overfitting* — their inner-CV scores are optimistically biased, inflating their
  ensemble weight. A reproducibility warning: verify a tokenizer on outer folds, not inner-CV.
- **(mechanism)** Holdout validation (vs nested CV) systematically underestimates all models and
  biases toward models that already ensemble internally — so benchmark choices, not just the model,
  move the ranking.

## 7. Pitfalls / honesty notes

- It is a **benchmark, not a technique** — cite as evaluation context, never as a tokenizer.
- "Deep learning has caught up" is conditional on tuning + ensembling + the small-to-medium IID
  regime. Do not over-read.
- Temporal exclusion means **zero** coverage of this topic's temporal-static-fusion layer.
- Elo is calibrated to default RandomForest = 1000 and ignores effect-size magnitude; small but
  practically meaningful gaps can be invisible.

## Proposed graph edges

- `tabarena-living-benchmark` --belongs_to_route--> `route:tabular-transformers`
- `tabarena-living-benchmark` --compared_against--> `ft-transformer-revisiting-tabular-dl`
- `tabarena-living-benchmark` --compared_against--> `tabpfn-v2`
- `tabarena-living-benchmark` --compared_against--> `tree-models-outperform-deep-tabular`
- `tabarena-living-benchmark` --contradicts--> `tree-models-outperform-deep-tabular` (under tuned+ensembled nested-CV, best deep nets equal/beat GBDTs on IID small-to-medium tables, qualifying the "trees always win" claim)
- `tabarena-living-benchmark` --has_pitfall--> validation-set-overfitting-inflates-deep-models-in-ensembles
