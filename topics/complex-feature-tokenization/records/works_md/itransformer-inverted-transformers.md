# iTransformer: Inverted Transformers Are Effective for Time Series Forecasting

- **Authors:** Yong Liu, Tengge Hu, Haoran Zhang, Haixu Wu, Shiyu Wang, Lintao Ma, Mingsheng Long (Tsinghua University; Ant Group)
- **Year / Venue:** 2024 — ICLR 2024 (arXiv:2310.06625, Oct 2023)
- **URL:** https://arxiv.org/abs/2310.06625
- **Code:** https://github.com/thuml/iTransformer (maintained; in tslib)
- **Primary route:** `temporal-feature-tokenization` (also strongly touches `tabular-transformers`, `scaling-interaction`, `temporal-static-fusion`)
- **Analysis depth:** deep — **Confidence:** high
- **PDF:** `sources/papers/itransformer-inverted-transformers.pdf`

## 1. What this work actually does

It takes the standard Transformer-for-forecasting and **inverts the meaning of a token**. A vanilla
forecasting Transformer embeds one *timestamp* (the vector of all variates at time `t`) as one token,
runs attention over the time axis, and mixes heterogeneous variates inside every token. iTransformer
flips this: it embeds **one whole variate's lookback series** into **one token**, runs attention over
the **variate** axis (capturing multivariate correlations), and lets a per-token FFN learn each
series' own representation. No new block is invented — only the embedding and output projection are
inverted, so the trick can wrap any attention backbone ("iTransformers"). It reaches SOTA on standard
multivariate long-term forecasting, with its edge concentrated on **high-dimensional** datasets.

## 2. Technical mechanism

- **Token = variate.** For variate `i`, the T-length (post instance-normalization) lookback series
  `x^(i) ∈ R^T` is fed as a flat vector into a **shared MLP** → one D-dim token `h^(i)`. N variates ⇒
  N tokens. Sequence length = N, **independent of lookback T** (T only widens the MLP input).
- **Attention over variates.** Self-attention now models **inter-variate correlation**, not time.
- **LayerNorm per variate token.** Normalizes each series' representation; the paper argues this
  reconciles non-stationarity and inter-variate distribution gaps.
- **Shared FFN per token.** Learns nonlinear per-series temporal representation. Temporal dynamics
  live **inside** the MLP+FFN; attention does not see time at all.
- **Head.** Linear projection of each variate token → its S-step forecast.
- **Efficient training.** Because all tokens share weights, you can randomly **subsample variates per
  batch** and still generalize to unsampled ones — cuts the O(N²) attention memory on wide feature sets.

This is the **inverse** of PatchTST (attention over time, channel-independent, no cross-variate mixing).

## 3. Why it matters for the topic's stated goals

The topic needs to tokenize **70+ heterogeneous features, some time-varying**, feed one deep model, and
**model their interactions**. iTransformer is essentially **FT-Transformer's "one token per feature +
joint self-attention" applied to time-varying features**, and it provides direct evidence that:
1. Putting each feature in **one joint attention** (rather than processing features independently)
   **wins precisely when many correlated features coexist** — the topic's regime. The largest gains are
   on Traffic (862 variates), ECL (321), Solar, PEMS (≤883); on small ETT it is a near-tie with PatchTST.
2. The scheme **scales to hundreds of features** with concrete numbers, and offers a **variate
   subsampling** lever to keep O(N²) attention affordable at large feature counts.
3. **Per-token normalization** is a usable tool for reconciling features of different scales inside one
   token sequence.

It is the cleanest **unification template** for the time-varying half and a bridge to the tabular-transformer route.

## 4. What is reusable

- **Feature-as-token + one joint attention with shared per-token weights** — the core transfer: encode
  each time-varying feature's history into one token, put all feature tokens through one self-attention
  so cross-feature interaction is learned explicitly.
- **Type-appropriate per-feature encoder** — swap the flat whole-series MLP for **PatchTST-style patch
  tokens** (finer temporal structure) or **PLR/periodic** per-value embeddings where richness matters;
  use the iTransformer joint-attention to fuse them.
- **Per-token LayerNorm / RevIN** to reconcile heterogeneous-scale features in one sequence.
- **Random feature/variate subsampling per batch** to bound attention cost at 70+ tokens.

## 5. Key results (average MSE, lower is better)

| Dataset | iTransformer | PatchTST | TimesNet | DLinear | Crossformer | vanilla Transformer |
|---|---|---|---|---|---|---|
| ECL | **0.178** | 0.216 | 0.192 | 0.212 | 0.244 | 0.277 |
| Traffic | **0.428** | 0.555 | 0.620 | 0.625 | 0.550 | 0.665 |
| Solar-Energy | **0.233** | 0.270 | 0.301 | 0.330 | 0.641 | — |
| PEMS (avg) | **~0.119** | 0.217 | 0.148 | 0.320 | 0.220 | — |
| Weather | **0.258** | 0.259 | 0.259 | 0.265 | 0.259 | 0.657 |
| ETTh1/h2 (avg) | 0.383 | **0.381** | 0.391 | 0.442 | 0.685 | — |

- **Framework generality (inverting existing backbones):** avg MSE promotion Transformer **+38.9%**,
  Reformer +36.1%, Informer +28.5%, FlashAttention +32.2%, Flowformer +16.8%.
- **Unseen-variate generalization:** train on ~20% of variates, forecast **all** zero-shot, retaining
  strong accuracy (beats channel-independent baselines) — enabled by shared token weights.
- **Lookback:** accuracy **improves** with longer lookback (T ∈ {48,96,192,336,720}); vanilla
  Transformer forecasters often fail to benefit from more history.

## 6. Limitations and pitfalls (refute-before-write)

- **Edge is dataset-shaped.** Near-**tie with PatchTST on small ETT**; the win concentrates on
  many-correlated-variate datasets. Do **not** present iTransformer as universally beating patching.
- **"Heterogeneous variates" ≠ topic heterogeneity.** Variates are all **numeric** series differing in
  scale; LayerNorm reconciling scale is **not** fusing numeric + categorical + static. The transferable
  part is the *joint-attention-over-feature-tokens pattern*, not a literal mixed-type tokenizer — that
  fusion still needs its own validation.
- **Whole-series MLP is a coarse temporal encoder** (no local patches, no temporal position inside a
  token). For fine temporal structure, prefer patch tokens under the same joint-attention.
- **Unseen-variate transfer relies on homogeneous-role numeric variates** — it will **not** transfer to a
  held-out categorical feature whose encoder was never trained.
- **O(N²) in feature count.** Fine at 70+, but the 862-variate runs lean on subsampling / accept cost;
  "scales cheaply to hundreds" is an overstatement without the subsampling trick.
- Gains partly **confounded with RevIN normalization and longer lookback**, as common in this literature.

## 7. Transfer verdict for 70+ mixed features

Borrow the **architecture pattern** (each feature → one token via a type-appropriate encoder → one joint
self-attention → per-token FFN/norm), plus **variate subsampling** for scale. Do **not** borrow the flat
whole-series MLP token (too coarse) or assume the unseen-variate transfer covers categorical features.
iTransformer is a structural blueprint and a scaling-evidence anchor — a *component-and-pattern* source,
not a drop-in mixed-type tokenizer.
