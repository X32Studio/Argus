# TimeXer: Empowering Transformers for Time Series Forecasting with Exogenous Variables

- **Slug:** `timexer-exogenous-endogenous-fusion`
- **Authors:** Yuxuan Wang*, Haixu Wu*, Jiaxiang Dong, Guo Qin, Haoran Zhang, Yong Liu, Yunzhong Qiu, Jianmin Wang, Mingsheng Long (Tsinghua University, School of Software / BNRist). *Equal contribution.
- **Year / Venue:** 2024 — NeurIPS 2024 (arXiv:2402.19072v4)
- **URL:** https://arxiv.org/abs/2402.19072
- **Code:** https://github.com/thuml/TimeXer (official, in tslib)
- **Primary route:** `temporal-feature-tokenization`
- **Concept layers touched:** temporal-static-fusion (role split), token-granularity (mixed patch/variate/global), scaling-interaction (linear-in-C cross-attention), feature-typing (endogenous vs exogenous role, numeric only)
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

TimeXer tackles a setting between univariate and full-multivariate forecasting: predict ONE
**endogenous** target series using its own history PLUS `C` **exogenous** covariate series that
help but never need to be predicted (e.g. predict electricity price using market supply/demand
indicators). The key claim is that you should NOT treat all variables equally (iTransformer) nor
ignore the covariates (PatchTST channel-independence) — you should tokenize the target and the
covariates **at different granularities** and connect them through a learnable bridge. It does
this on a **canonical Transformer encoder with zero block modifications**, only changing the
embedding/attention wiring. Result: SOTA on 12 benchmarks, with the strongest evidence on the
EPF exogenous-variable electricity-price task and a 3,850-station / 36-exogenous large-scale test.

## 2. Technical mechanism

Three token types in one encoder:

- **Endogenous PATCH tokens** — target series `x ∈ R^T` cut into `N = ⌊T/P⌋` non-overlapping
  length-`P` patches, each linearly projected (+ position embedding) to a `D`-dim token. This is
  PatchTST-style fine temporal tokenization for the thing being predicted.
- **Endogenous GLOBAL token** — ONE extra learnable `D`-dim token per target series (ViT/[CLS]
  style). It is the macroscopic series summary AND the only conduit for external information.
- **Exogenous VARIATE tokens** — each whole covariate series `z^(i) ∈ R^{Tex}` collapsed by a
  linear `VariateEmbed: R^{Tex}→R^D` into ONE token (iTransformer-style). Coarse on purpose.

Two attentions per block:

1. **Endogenous self-attention** over the concatenated `[N patch tokens, 1 global token]`
   (size `(N+1)×(N+1)`): captures intra-target temporal dependencies and, asymmetrically,
   Patch→Global (global aggregates the patches) and Global→Patch (each patch reads the global
   summary back).
2. **Exogenous→Endogenous cross-attention** (size `1×C`): the **global token is the query**, the
   `C` exogenous variate tokens are key/value. External info enters ONLY through the global token,
   then propagates to patches via the next self-attention. Output = linear projection over final
   `[patch, global]` endogenous embeddings; L2 loss on the horizon only.

**Parallel multivariate mode:** treat each of `M` variates as endogenous in turn, the rest as
exogenous, run TimeXer with shared weights → `M` channel-independent passes. This is how the
multivariate-benchmark numbers are produced.

## 3. Why it matters for the topic's stated goals

The topic targets 70+ heterogeneous features feeding a deep tabular/transformer model, where naive
"one scheme for all features + one big joint attention" chokes on cost and ignores feature roles.
TimeXer is the cleanest published demonstration that **role-asymmetric tokenization + a learnable
global hub token** lets you ingest MANY context features at **cost linear in their count** (the
`1×C` cross-attention), instead of paying `O((1+C)^2)` joint variate self-attention (iTransformer).
On ECL with 320 exogenous variables its memory footprint is below iTransformer's; on a 3,850-station
/ 36-exogenous test it wins. For the time-varying half of a mixed feature set, this is a directly
usable scaling lever.

## 4. What is reusable

- **Mixed-granularity tokenization by role:** fine (patch / per-value) tokens for the feature(s)
  you predict, ONE coarse token per context feature, connected by cross-attention rather than one
  giant joint self-attention. Keeps attention cost LINEAR in the number of context features.
- **Learnable GLOBAL / [CLS]-style hub token** as an aggregation point: many heterogeneous feature
  tokens (numeric variate tokens here; by extension categorical/static tokens from type-appropriate
  encoders) can all feed a small set of global tokens via cross-attention — decoupling per-feature
  representation from quadratic interaction cost.
- **Whole-series variate token for irregular support:** because a context feature collapses to one
  token with no time-aligned op, you can ingest features that are misaligned / missing / sampled at
  a different frequency / of different length WITHOUT timestamp alignment. Useful when 70+ features
  arrive at different cadences.

## 5. What would fail / break in the topic's setting (refute-tested)

- **The scaling win is role-specific.** "Lower memory than iTransformer / handles many variables"
  holds because exogenous features get ONE shared variate token and a `1×C` cross-attention — they
  do **not** interact with each other. It is NOT cheap joint attention over 70+ *co-equal* features;
  that regime falls back to `M` channel-independent passes (parallel multivariate mode).
- **No mixed-type pathway.** All "variables" are numeric time series. There is NO categorical /
  high-cardinality / static-attribute tokenizer. The role-asymmetry + global-bridge pattern
  transfers; the categorical/static encoders must be designed and validated separately.
- **Single global token is a bottleneck.** When all features mutually matter (Traffic, 862 variates)
  TimeXer LOSES to iTransformer's full variate self-attention — funneling everything through one
  hub underfits rich cross-feature interaction.
- **Missing-value robustness is asymmetric and easy to over-read.** Robustness to garbage exogenous
  series (zeros/random barely hurt) is because endogenous patches dominate predictions, not proof
  that the cross-attention deeply exploits noisy covariates; corrupting the endogenous series is
  catastrophic.

## 6. Evidence (key results)

- **EPF short-term exogenous (5 markets, input 168 / horizon 24, 2 exo each):** best on all five;
  avg MSE 0.307 / MAE 0.265 vs PatchTST 0.330, iTransformer 0.335, Crossformer 0.354, TiDE
  (exogenous-specialized) 0.412.
- **Long-term multivariate (look-back 96, horizons avg):** ECL 0.171 (it. 0.178), Weather 0.241,
  ETTh1 0.437, ETTh2 0.367, ETTm1 0.382 (~tie PatchTST 0.387), ETTm2 0.274 — **Traffic 0.466 LOSES**
  to iTransformer 0.428.
- **Large-scale:** 3,850 stations × 36 mismatched-frequency exogenous vars → 0.200, beats
  iTransformer 0.207 / PatchTST 0.216.
- **Ablation (Table 4, EPF avg MSE):** Ours (P+G / V + cross-attn) 0.307; remove global token 0.316;
  add instead of cross-attn 0.329; concatenate 0.312 — the global-token + cross-attention design is
  what carries the gain.
- **Efficiency:** lower memory than iTransformer at C=320 (ECL).

## 7. Pitfalls / caveats noticed during deep-read

1. Cite the scaling/efficiency claim as **linear in the number of EXOGENOUS features**, not as
   joint many-feature attention.
2. "Heterogeneous / irregular variables" = numeric time series with misalignment/missingness/
   frequency mismatch — NOT numeric+categorical+static.
3. Several multivariate wins are narrow and ride the same RevIN + patching backbone as PatchTST /
   iTransformer; the role-asymmetry contribution is isolated mainly in the EPF task + ablation.
4. One global token per target is a representational bottleneck (Traffic loss is the symptom).

## Proposed graph edges

- `(work:timexer-exogenous-endogenous-fusion) -[belongs_to_route]-> (route:temporal-feature-tokenization)`
- `(work:timexer-exogenous-endogenous-fusion) -[introduces_technique]-> (technique:endogenous-global-bridge-token)`
- `(work:timexer-exogenous-endogenous-fusion) -[introduces_technique]-> (technique:role-asymmetric-patch-variate-tokenization)`
- `(work:timexer-exogenous-endogenous-fusion) -[uses_technique]-> (technique:patch-tokenization)`
- `(work:timexer-exogenous-endogenous-fusion) -[uses_technique]-> (technique:variate-as-token)`
- `(work:timexer-exogenous-endogenous-fusion) -[improves_on]-> (work:itransformer-inverted-transformers)`
- `(work:timexer-exogenous-endogenous-fusion) -[improves_on]-> (work:patchtst-time-series-64-words)`
- `(work:timexer-exogenous-endogenous-fusion) -[compared_against]-> (work:temporal-fusion-transformer)`
- `(technique:endogenous-global-bridge-token) -[enables_scaling]-> (route:temporal-feature-tokenization)`
- `(technique:role-asymmetric-patch-variate-tokenization) -[transferable_to]-> (route:temporal-feature-tokenization)`
- `(work:timexer-exogenous-endogenous-fusion) -[has_pitfall]-> (pitfall:single-global-token-bottleneck-on-many-interacting-features)`
