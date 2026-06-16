# Feature-aware Modulation for Learning from Temporal Tabular Data

- **Authors:** Hao-Run Cai, Han-Jia Ye (Nanjing University, LAMDA)
- **Venue / Year:** NeurIPS 2025 — arXiv:2512.03678 (submitted 3 Dec 2025)
- **URL:** https://arxiv.org/abs/2512.03678
- **Code:** https://github.com/LAMDA-Tabular/Tabular-Temporal-Modulation
- **Primary route:** `temporal-feature-tokenization`
- **Spans concept layers:** Temporal-Static Fusion (primary), Feature Typing & Heterogeneity, Numerical Feature Embeddings, Learning Signal & Supervision
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

Tackles *temporal distribution shift* in tabular ML: the feature→label mapping drifts over time, so static models (GBDTs, FT-T, TabM) generalize but cannot adapt, while naive adaptive models overfit transient patterns. The core conceptual claim is that **feature semantics evolve** — a feature can carry "objective" meaning (raw value) and "subjective" meaning (value relative to the current distribution, e.g. "high income", "prime location"), and the subjective meaning drifts even when raw values do not. The proposed fix is a **feature-aware temporal modulation** layer: a lightweight hypernetwork conditioned on a temporal embedding that emits per-feature transform parameters to re-align each numerical feature's distributional statistics (mean / std / skewness) across time. It is a drop-in input-stage transform, not a new architecture.

## 2. Technical mechanism

- A shared **temporal embedding** `psi(t)` (Fourier periodic priors over year/month/day/hour + a trend term, fixed dim 128; reused from Cai & Ye ICML 2025) encodes the timestamp of a row.
- A small **modulator** (Linear→ReLU→Linear heads) maps `psi(t)` to three per-feature-dimension vectors `gamma, beta, lambda ∈ R^m` (scale, bias, Yeo-Johnson power coefficient).
- Each feature is reparameterized:
  `x_tilde_i = gamma_i(psi(t)) · YJ(x_i; lambda_i(psi(t))) + beta_i(psi(t))`
  where `YJ` is the **Yeo-Johnson power transform** (signed, handles skew/heavy tails). This is FiLM (Perez et al. 2018) generalized from linear scale+shift to **affine + nonlinear power reshaping**, with the modulation conditioned on *time* rather than on another input modality.
- Modulation can be placed at three sites: raw **In**put, intermediate **Rep**resentation, **Out**put logits. The MLP backbone uses all three (full modulation); MLP-PLR and TabM use **only** raw-input modulation (see limitation below).
- Key design property: the temporal modality is **decoupled** from the input modality (psi(t) drives the modulator but is never concatenated to features), which the authors argue avoids the dimension-scaling degradation seen when temporal embeddings are concatenated to inputs.

## 3. Why it matters for the topic's stated goals

The topic targets 70+ heterogeneous features, partly time-varying and partly static. The benchmark used here, **TabReD**, is exactly that regime: 8 large industrial tables (Homesite, Ecom Offers, Homecredit Default, Sberbank Housing, Cooking Time, Delivery ETA, Maps Routing, Weather) with dozens-to-hundreds of mixed numerical+categorical columns under genuine temporal drift. This work gives a *concrete, cheap, backbone-agnostic* mechanism for the **temporal-static-fusion** layer: instead of inventing a new token vocabulary, you keep the existing tokenizer and add a time-conditioned modulation that holds each numerical feature's semantics steady across time. The decoupling-of-temporal-modality pattern is itself reusable when fusing the time-varying and static halves of a feature set.

## 4. What is reusable

- **FiLM-for-tables-over-time**: a per-feature affine+power transform whose parameters are emitted by a tiny hypernetwork over a temporal (or any context) embedding. Output cost is O(3·m), trivially cheap vs. weight-generating hypernetworks; the temporal embedding is shared across all instances/modulators.
- **Yeo-Johnson as a learnable, conditioned reshaper** of numerical feature distributions (beyond fixed scaling / binning) — directly relevant to the `numerical-embeddings` route.
- **Decoupling temporal modality from input modality** (condition, don't concatenate) as a fusion pattern.
- **Insert-at-input is enough**: the ablation shows raw-input modulation alone yields 87.4% of the full gain, so the cheapest integration (one extra layer, no backbone changes) captures most of the benefit.

## 5. What is NOT safely transferable (within this topic's scope)

- **It is not a tokenizer.** It produces no discrete codes and no per-value/field-value tokens; it is a continuous feature-modulation/preprocessing layer. Do not file it as a tokenization scheme.
- **No categorical or high-cardinality handling.** The modulation acts on numerical distributional statistics (mean/std/skew); categoricals ride the backbone's default embeddings. For a feature set dominated by high-cardinality categoricals, this method offers little.
- **PLR incompatibility (stated limitation).** PLR embeddings map numericals to sine/cosine → an arcsine distribution that breaks the semantic mean/std/skew assumption; so full-stage modulation cannot be combined with PLR, and PLR/TabM are forced to the weaker single-site variant. Since PLR-style numerical embeddings are exactly what this topic favors, the two ideas partially conflict.
- **Needs a meaningful per-row timestamp**; nothing here helps the purely-static portion of a feature set, and no missing-value mechanism is described.

## 6. Evidence quality

- TabReD, refined Cai & Ye 2025 protocol, 15 random seeds, Optuna 100 trials (25 for FT-T/TabR), AUC/RMSE reported with std and average rank. Solid, standard, reproducible (code + config released).
- **But the headline is thin.** "First deep method to consistently beat GBDTs under temporal shift" rests on *average rank over 8 datasets* (TabM-mod 3.50 vs CatBoost 4.375) with small absolute deltas and overlapping 15-seed std on several columns. The dramatic +2.09% is on a **weak MLP** backbone; on strong backbones the gains are modest (TabM +0.56%, MLP-PLR +0.18%) — and on those the PLR incompatibility forces the weaker single-site modulation. Net: the mechanism is real and cheap, but the "beats GBDT" framing is benchmark- and backbone-specific.
- No feature-count scaling curve or per-feature compute ablation; "lightweight" is argued by parameter count, not measured wall-clock at high feature counts.

## 7. Concrete next experiments / hypotheses

1. **Modulate then tokenize:** apply raw-input Yeo-Johnson temporal modulation *before* a real tokenizer (FT-Transformer feature tokenizer or PLR) on a 70+-feature temporal table; test whether the PLR conflict is avoidable by modulating raw values pre-embedding (the paper hints single raw-input modulation "partially mitigates" this).
2. **Per-feature gating at scale:** check whether emitting O(3·m) modulation params stays stable when m is in the hundreds, or whether the modulator needs feature-group sharing / low-rank factorization.
3. **Categorical analogue:** can an analogous time-conditioned modulation be defined for categorical embeddings (e.g. temporally modulating embedding-table lookups or target-encoding statistics) to cover the high-cardinality half this work ignores?
4. **Ablate the embedding:** swap the Fourier temporal embedding for a learned/continuous time encoding to see how much of the gain is the *modulation idea* vs. the *specific psi(t)*.

## Key claims a skeptic should check

1. *(mechanism)* The whole adaptation is a per-feature affine + Yeo-Johnson power transform whose 3·m parameters are produced by a tiny hypernetwork over a shared temporal embedding — i.e. FiLM generalized to nonlinear, time-conditioned feature reshaping; backbone is otherwise unchanged.
2. *(evidence)* TabM + modulation attains best average rank 3.50 on TabReD (8 datasets, 15 seeds), beating CatBoost/XGBoost and all temporal-embedding baselines — claimed first deep method to consistently outperform GBDTs under temporal shift. **Check:** absolute deltas are tiny and rank-based; the big +2.09% is on a weak MLP, not on SOTA backbones.
3. *(evidence)* Ablation: raw-input modulation alone = 87.4% of full gain; dropping it = only 56.8% — early-stage modulation dominates.
4. *(transfer)* Decoupling temporal modality (condition the modulator on psi(t), never concatenate to features) is claimed to avoid the dimension-scaling degradation of concatenated temporal embeddings — a reusable temporal-static-fusion pattern.
5. *(transfer / pitfall)* Full-stage modulation is **incompatible with PLR numerical embeddings** (arcsine distribution breaks the mean/std/skew semantics), so it conflicts with this topic's preferred numerical-embedding route and degrades to a single raw-input transform on strong backbones.
