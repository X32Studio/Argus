# TOTEM: TOkenized Time series EMbeddings for General Time Series Analysis

- **Authors:** Sabera Talukder, Yisong Yue, Georgia Gkioxari (Caltech)
- **Year / Venue:** 2024 — TMLR (12/2024); arXiv:2402.16412 (v2 Jan 2025)
- **URL:** https://arxiv.org/abs/2402.16412
- **Code:** https://github.com/SaberaTalukder/TOTEM (371 stars; last push 2025-02; no SPDX license declared)
- **Primary route:** timeseries-foundation-models
- **Analysis depth:** deep — confidence high (full text extracted from PDF: methods Eq. 1, forecaster design, all AvgWins tables, codebook ablation)

## 1. What this work actually does

TOTEM proposes a single, simple, self-supervised tokenizer for time series and argues that one *generalist* discrete codebook trained jointly across many domains can match or beat *specialist* models trained per-domain. It tokenizes raw waveforms with a VQVAE into a short sequence of discrete codes, then shows that this representation alone solves imputation and anomaly detection (by reconstruction), and that a tiny transformer/MLP head on the codes does forecasting competitively — in specialist, generalist in-domain, and zero-shot regimes, across ~500 experiments.

The central empirical thesis: **discrete VQ tokens beat continuous patches** (the PatchTST-style default in the field) once you hold the architecture fixed.

## 2. Technical mechanism

VQVAE over univariate waveforms (Eq. 1 in the paper):

- **Encoder** `E`: stack of strided, non-causal, dilation-1 1D convolutions (2 residual layers), temporally compressing `x ∈ R^T` to a latent `z = E(x) ∈ R^(T/F × D)`. Compression factor **F = 4**, code dim **D = 64**.
- **Quantizer + codebook** `C = {c_i}_{i=1}^K`, **K = 256** codewords. Each latent vector maps to its nearest codeword: `z_hat = c_l, l = argmin_i ||z − c_i||₂²`. This is a *distance-aware learned discretization* (Euclidean NN in latent space) — unlike fixed uniform bins (Chronos) or quantile bins.
- **Decoder** `D`: mirror transpose-conv, `x_hat = D(z_hat) ∈ R^T`.
- **RevIN** (reversible instance normalization) on each window so the codebook only models *normalized* waveform morphology; per-series mean `μ`/std `σ` are kept aside and re-applied later. This is what lets one small codebook cover many domains/scales.
- **Loss:** `||x − x_hat||₂²` (reconstruction) + `||sg[z] − z_hat||₂²` (codebook) + `β·||z − sg[z_hat]||₂²` (commitment), **β = 0.25**, Adam, lr 1e-3.

After VQVAE training the **codebook is frozen** and reused unchanged for all three tasks.

Multivariate handling: **channel-independent** — every sensor channel is flattened into an independent univariate series; their token sequences are stacked and *share the one codebook*. Adding channels is linear; the codebook does not grow.

Downstream:
- **Imputation / anomaly detection:** no extra model — masked reconstruction / reconstruction-error through the frozen VQVAE.
- **Forecasting:** a transformer-encoder over the `T_in/F = 96/4 = 24` tokens with learned temporal positional embeddings, attending along time, predicting a normalized horizon `y_bar` plus per-series `μ, σ` heads (`y = σ·y_bar + μ`). Trained with three smooth-L1 losses. An MLP forecaster variant also works.

## 3. Why it matters for the topic's stated goals

The topic needs to tokenize 70+ heterogeneous features including a time-varying half. TOTEM is the route's cleanest example of a **learned vector-quantized tokenizer** for continuous signals, and it contributes three ideas directly relevant to the time-varying numeric half:

1. **RevIN-then-quantize** decouples scale/level from shape, so the codebook only has to model normalized morphology and `μ/σ` ride along as side channels — a clean recipe for heterogeneous numeric ranges.
2. A **learned, distance-aware VQ codebook** empirically beats both fixed binning and raw patches on these tasks (tokens-vs-patches ablation), which is evidence for preferring VQ over Chronos-style uniform bins when a learned representation is affordable.
3. **Channel-independent + shared codebook** gives a vocabulary that scales linearly in the number of numeric channels with no per-feature parameters.

## 4. What is reusable

- The **RevIN + small frozen VQ codebook (K≈256, D≈64, F≈4)** as a domain-agnostic numeric-window tokenizer; carry `μ/σ` separately.
- The finding that **discrete codes beat continuous patches for both transformer and MLP heads** (transformer 67.9 vs 39.3; MLP 66.1 vs 37.5 AvgWins) — suggests the gain is the representation, not the model, so the codebook is the portable asset.
- The **generalist codebook** result: one codebook trained across domains generalizes zero-shot, and *diversity matters more than raw size* (electricity specialist > traffic specialist despite ~half the data) — useful prior for building a shared tokenizer over many heterogeneous numeric features.

## 5. Key results (AvgWins = fraction of best cells; ↓ MSE/MAE, ↑ adj-F1)

| Task | Specialist in-domain | Generalist in-domain | Generalist zero-shot |
|---|---|---|---|
| Forecasting | **28.6%** (next iTrans 26.8%) | **67.9%** vs GPT2 33.9% | **90.0%** vs GPT2 12.5% |
| Imputation | **52.1%** (GPT2 35.4%, TimesNet 18.8%) | **58.3%** vs 43.8% | **80.0%** vs 20.0% |
| Anomaly det. | **33.3%** (5-way tie 13.3%) | **80.0%** vs 20.0% | **73.3%** vs 26.7% |

Ablations: tokens > patches in all regimes; codebook K∈{32,256,512} — K=512 reconstructs best (100% AvgWins) but K=256 chosen for downstream parsimony; F=4 fixed. Permutation test p≤0.05 vs GPT2 and vs PatchTOTEM.

## 6. Limitations, pitfalls, and transfer risks (refute-before-write)

- **Univariate-only / no fusion.** The tokenizer has *zero* cross-channel or feature-interaction modeling and *no* categorical/static/missing handling. The topic's hard part — fusing 70+ *mixed* features — is entirely outside TOTEM's scope. Stacking univariate token streams is not the same as jointly modeling heterogeneous features. **This is the dominant transfer risk and is why the "scales to many features" claim is scoped to homogeneous numeric channels only.**
- **AvgWins is a count metric, not mean error.** 28.6% vs 26.8% specialist forecasting is a narrow lead; the metric rewards most-first-places, not domination.
- **Curated comparison set.** Authors exclude classification and short-term forecasting and label standard anomaly/classification benchmarks "leaky/flawed." The strong zero-shot numbers are vs a single author-trained GPT2 generalist, not the full specialist panel.
- **K=256 is a parsimony choice, not reconstruction-optimal** (K=512 reconstructs better). Frozen codebook = no downstream vocabulary adaptation.
- **Tokens are ~4-timestep micro-patterns**, not semantic events; the "BPE for time series" analogy is loose.

## 7. Key claims a skeptic should check

1. *(mechanism)* A frozen K=256/D=64/F=4 VQVAE codebook over RevIN-normalized windows is sufficient to solve imputation and anomaly detection by reconstruction alone — no task-specific downstream model.
2. *(evidence)* Discrete VQ tokens beat continuous patches with the architecture held fixed, for both transformer and MLP forecasters (67.9 vs 39.3; 66.1 vs 37.5 AvgWins) — isolating the gain to the representation.
3. *(transfer)* RevIN + shared learned VQ codebook is a better numeric tokenizer than fixed uniform binning (Chronos) for the time-varying half — but only for homogeneous numeric channels; it offers no mechanism for categorical/static fusion.
