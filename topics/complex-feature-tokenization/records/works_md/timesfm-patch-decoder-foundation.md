# TimesFM: A Decoder-Only Foundation Model for Time-Series Forecasting

- **Authors:** Abhimanyu Das, Weihao Kong, Rajat Sen, Yichen Zhou (Google Research)
- **Year / Venue:** 2024 — ICML 2024; arXiv:2310.10688 (preprint 2024-04-19)
- **URL:** https://arxiv.org/abs/2310.10688
- **Code:** https://github.com/google-research/timesfm (Apache-2.0; checkpoints `google/timesfm-1.0-200m` and 2.x on HuggingFace)
- **Primary route:** `timeseries-foundation-models`
- **Analysis depth:** deep — **Confidence:** high
- **PDF:** `sources/papers/timesfm-patch-decoder-foundation.pdf`

## 1. What this work actually does

TimesFM is a single pretrained model that produces accurate **zero-shot** point forecasts for arbitrary univariate
time series, across unseen domains, horizons, and granularities, getting close to dataset-specific *supervised*
SOTA without any per-dataset training. It is the GPT-analogue for forecasting: pretrain one decoder-only attention
model on a large, diverse time-series corpus, then forecast new series out of the box. Headline model = **200M
parameters**, corpus = **O(100B) timepoints**.

## 2. Technical mechanism

**Patch tokenizer (continuous, not quantized).** The context `y_1:L` is RevIN-scaled — subtract mean and divide by
std **computed on the first input patch only** — then cut into contiguous non-overlapping patches of length
`input_patch_len p = 32`. Each patch, after zeroing masked/padded points, is embedded to `model_dim` by an
**InputResidualBlock** (1-hidden-layer MLP + skip connection), and a learned positional encoding is added:

```
t_j = InputResidualBlock(  y_tilde_j ⊙ (1 - m_tilde_j)  ) + PE_j
```

A token is therefore a **learned continuous embedding of a 32-point window** — there is no codebook, no binning. A
binary padding/missing mask travels alongside the values; a patch is marked masked only if *all* its points are
masked.

**Decoder-only stacked transformer.** `num_layers` standard blocks (causal multi-head self-attention + FFN, FFN
hidden = `model_dim`). Trained in **decoder-only** mode: given the input-patch sequence, predict the next chunk as a
function of all past patches — done in parallel over the whole window like an LLM, so the model learns to forecast
after seeing *any* number of input patches.

**Longer output patches (h > p).** Output is decoded by an **OutputResidualBlock** mapping each output token to a
window of `output_patch_len h = 128` (longer than the 32-point input patch). This is the key departure from LLMs:
emitting long chunks cuts the number of autoregressive steps at inference (horizon 256 → 2 steps, not 8), recovering
much of the accuracy benefit of one-shot full-horizon decoding while still supporting unknown/long horizons.

**Patch masking for any context length.** Per series, sample `r ∈ [0, p-1]` and mask the first `r` points of patch 1.
Across all `r`, the model is trained on *every* context length from 1 to 512, not only multiples of 32. This single
trick is what makes arbitrary context lengths work.

**Loss.** Point forecast, **MSE** in the (rescaled) value space, averaged over all patch positions. Probabilistic
forecasting is noted as an easy extension (multiple quantile/pinball heads or a parametric-likelihood head) but the
pretraining uses MSE.

## 3. Why it matters for the topic's stated goals

The topic must tokenize the **time-varying half** of a 70+-feature set. TimesFM is the leading *continuous* patch
tokenizer and the natural foil to value-binning (Chronos) and inverted/channel tokens (iTransformer). It demonstrates
that a tiny MLP-per-patch embedding + causal transformer is enough to forecast unseen series zero-shot — a cheap,
ordinality-preserving way to turn a numeric/temporal channel's recent window into transformer tokens.

## 4. What is reusable

- **Patch-as-token** for each numeric/temporal channel: RevIN-scale (mean/std of an anchor window) → fixed-length
  patches (`p ~ 16-32`, the ablation sweet spot) → MLP residual-block embedding to `model_dim`. Token count drops
  ~`p`× vs per-point, cutting attention cost.
- **Continuous, MSE-in-value-space** tokenization preserves ordinality natively (no distance-unaware cross-entropy
  over bins as in Chronos).
- **Output patch longer than input patch** (`h > p`) as a decoding-efficiency lever when horizons are long/unknown.
- **First-patch random masking** as the recipe for arbitrary context lengths.

## 5. What is NOT safely transferable (within this topic's scope)

- **Univariate by construction.** No dynamic covariates, no static attributes, no categorical/ID inputs, no
  multivariate cross-channel fusion — the authors explicitly forgo covariates so one model fits all datasets. The
  topic's hard part (fusing 70+ heterogeneous features) is entirely out of scope; TimesFM gives a *per-channel*
  encoder at most.
- The zero-shot framing is about generalizing to new *series/domains*, not about feature heterogeneity.
- The longer-output-patch and first-patch-mask tricks are tied to the single-channel autoregressive-over-time
  setting; they do not directly inform how to interleave static/categorical tokens.

## 6. Evidence quality

Strong and out-of-corpus for the headline claim: a single 200M model is top on **Monash** (Scaled-MAE GM), within
significance of best per-dataset baselines on **Darts**, and best on **Informer/ETT** long-horizon (h=96,192, context
512), with supervised PatchTST within significance. Ablations are clean and supportive: monotone Scaled-MAE↓ vs FLOPS
(17M/70M/200M); output_patch_len 8→128 monotonically improves MAE; input_patch_len sweet spot p=16-32 (p=32 chosen
for ~2× faster training); removing synthetic data hurts underrepresented granularities (Monash, ETTm 15-min) while
barely affecting well-represented ones (ETTh hourly).

## 7. Concrete next experiments / hypotheses

- **Per-channel TimesFM patch-encoder + static/categorical token concatenation:** embed each time-varying feature's
  window with the TimesFM-style MLP-per-patch tokenizer, prepend learned static/categorical tokens, and let one
  transformer attend over the joint sequence. Test whether the continuous patch tokens fuse cleanly with discrete
  feature tokens or whether scale mismatch (RevIN per channel vs raw categorical embeddings) needs reconciliation.
- **Continuous (MSE) vs quantized (Chronos cross-entropy) numeric tokenization head-to-head** on the time-varying
  half, holding the fusion layer fixed — does ordinality-preservation matter once features are mixed?
- **RevIN anchor choice:** TimesFM scales by the first patch; in a 70+-feature pipeline where each feature has its
  own scale, evaluate per-feature anchor windows vs a shared scaler.

## Key claims a skeptic should check

1. **(mechanism)** Tokens are *continuous* MLP embeddings of 32-point patches with **MSE** loss — NOT value
   quantization into a vocabulary (that is Chronos). Verify in §"Input Layers" / "Loss Function".
2. **(mechanism)** `output_patch_len = 128 > input_patch_len = 32` is a deliberate asymmetry to cut autoregressive
   steps; ablation shows MAE decreases monotonically as output_patch_len grows 8→128.
3. **(transfer)** It is strictly **univariate with no covariates** — the per-channel patch tokenizer transfers, but
   it offers zero mechanism for fusing categorical/static/multi-channel features.
4. **(evidence)** Zero-shot wins are on held-out families (Monash/Darts/Informer); but Electricity/Traffic/Weather/M4
   ARE in the pretraining mix, so those are not zero-shot.
5. **(evidence)** Synthetic data (3M series × 2048 points, 20% of the loader) is load-bearing specifically for
   under-represented granularities; removing it drops Monash and ETTm-15min accuracy.
