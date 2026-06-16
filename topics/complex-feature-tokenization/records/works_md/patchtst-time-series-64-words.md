# PatchTST — A Time Series is Worth 64 Words

- **Slug:** `patchtst-time-series-64-words`
- **Primary route:** `temporal-feature-tokenization`
- **Link:** https://arxiv.org/abs/2211.14730 (ICLR 2023; arXiv:2211.14730v2)
- **Authors:** Yuqi Nie (Princeton); Nam H. Nguyen, Phanwadee Sinthong, Jayant Kalagnanam (IBM Research)
- **PDF:** `sources/papers/patchtst-time-series-64-words.pdf`
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

PatchTST is a Transformer for **long-term multivariate time-series forecasting** (and self-supervised representation learning) built on two ideas:

1. **Patching** — segment each univariate series into subseries-level patches and treat each patch as one input token (the "64 words" = 64 patches from a look-back of 512 with patch 16 / stride 8).
2. **Channel-independence** — each channel (variable) is a separate univariate series fed *independently* through one **shared** embedding + Transformer; there is **no cross-channel attention**. Multivariate output = concatenation of per-channel forecasts.

It was motivated as a rebuttal to DLinear (Zeng et al. 2022), which showed a simple linear model beating prior Transformers (Informer/Autoformer/FEDformer). PatchTST restores the Transformer's lead.

## 2. Technical mechanism

- **Instance norm (RevIN-style):** each series instance is normalized to zero-mean/unit-std *before* patching; mean/std are added back at the output. Mitigates train/test distribution shift.
- **Patching:** patch length `P`, stride `S` → `N = floor((L−P)/S) + 2` patches (the `+2` from padding `S` copies of the last value). Token count drops from `L` to `~L/S`, so attention's `O(N²)` memory/compute shrinks by `~S²`. Defaults: `P=16, S=8`. PatchTST/64 = look-back 512 → 64 tokens; PatchTST/42 = look-back 336 → 42 tokens.
- **Token embedding:** one shared linear projection `W_p ∈ R^{D×P}` maps a P-length patch to a D-dim token; learnable additive position encoding `W_pos ∈ R^{D×N}`. So `x_d = W_p · x_p + W_pos`.
- **Backbone:** vanilla Transformer encoder (MHSA + FFN + residual), but **BatchNorm1d** instead of LayerNorm (Zerveas et al. 2021 found BN better for TS). Flatten + linear head → T-step forecast.
- **Self-supervised:** non-overlapping patches; **40%** masked to zero uniformly at random; reconstruct masked patches under MSE. Fine-tune with linear-probe-then-finetune. Shared weights let pretrain/downstream sets differ in channel count, enabling cross-dataset transfer.

## 3. Why it matters for the topic's stated goals

The topic's feature set is *partly time-varying*. PatchTST is the canonical recipe for tokenizing the **time-varying half**: instead of a meaningless per-timestep token, a patch carries **local temporal semantics**, and patching keeps sequence length bounded even when many features each bring a history. The masked-patch objective is a ready-made, domain-appropriate **pretraining** signal for temporal tokens before they are fused with static/categorical tokens.

## 4. What is reusable

- **Patch tokenization** (the core transfer): aggregate consecutive timesteps of a time-varying feature → linear-project to one token. Architecture-agnostic; the authors stress patching transfers to other models.
- **Masked-patch self-supervised pretraining** as a pretext for temporal tokens.
- **Instance normalization (RevIN)** as cheap distribution-shift handling for numeric/temporal inputs.

## 5. What is NOT reusable / scope mismatch (refute-before-write)

- **Channel-independence is the wrong default for this topic.** It deliberately *removes* cross-feature attention. PatchTST shows mixing hurts for **homogeneous** numeric channels with shared dynamics — that does **not** license dropping interactions among **70+ heterogeneous** numerical+categorical+static features, where interactions are the point. Borrow **patching**, not channel-independence.
- **"Scales to 862 channels (Traffic)" is linear-in-M sequential univariate processing**, not a wide mixed-type token sequence. Do **not** cite it as evidence for scaling to 70+ *heterogeneous* features.
- **No categorical / high-cardinality / static / missing pathway at all** — PatchTST is one component, not a complete tokenizer for the topic.
- **A single linear patch projection is a weak per-value encoder**; pair with PLR/periodic numerical embeddings if per-scalar richness matters.

## 6. Evidence

- 8 benchmarks (Weather, Traffic, Electricity, ILI, ETTh1/h2/m1/m2), horizons {96,192,336,720}. **PatchTST/64: −21.0% MSE / −16.7% MAE** vs best Transformer (FEDformer); PatchTST/42: −20.2% / −16.4%. Beats DLinear on most settings (margin smaller than vs Transformers).
- Case study (Traffic, T=96): L 96→336 cuts MSE 0.518→0.397; patching gives **22×/19×/4×** speedup (Traffic/Electricity/Weather) at L=336.
- **Ablation:** P+CI > CI-only > P-only > Original TST (point-wise channel-mixing, which OOMs on A40-48GB at batch 1 for large data). Both ingredients help; patching also makes the model trainable at all on wide data.
- Self-supervised pretrain+finetune ≥ supervised; masked representations transfer across datasets at SOTA.

**Caveat:** gains are confounded with long look-back and RevIN; the ablation isolates patching+CI but not RevIN's separate share.

## 7. Transfer recipe for 70+ mixed features

For each time-varying feature: instance-normalize → patch (`P`,`S` tuned to its sampling rate) → linear-project to a shared D-dim temporal-token space. Optionally masked-patch pretrain. Then — **unlike PatchTST** — feed these temporal tokens *together with* per-feature numeric tokens (FT-Transformer-style, ideally PLR-embedded) and categorical/static tokens into a **joint** Transformer so cross-feature interactions are modeled. PatchTST supplies the temporal-token front-end; the fusion + interaction layer must come from elsewhere (FT-Transformer / TFT / interaction routes).

## Key claims a skeptic should check

1. **(mechanism)** Patching = aggregate consecutive timesteps into one linearly-projected token; `N≈L/S` cuts attention cost by `~S²` and adds local semantics. (Transferable to the topic's temporal half.)
2. **(mechanism/transfer)** Channel-independence (shared weights, no cross-channel attention) is a feature for homogeneous numeric channels but a *liability* for 70+ heterogeneous mixed-type features — borrow patching, drop CI.
3. **(evidence)** −21.0% MSE vs FEDformer is vs *Transformer* baselines; the margin over the linear DLinear is much smaller and setting-dependent.
4. **(evidence)** "Scales to 862 channels" is linear-in-M univariate processing, not joint wide-feature tokenization — not evidence for the topic's scaling claim.
5. **(evidence)** Headline gains are confounded with long look-back (L=336/512) and RevIN instance norm; the ablation does not isolate RevIN's contribution.
