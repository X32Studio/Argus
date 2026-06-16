# Temporal Fusion Transformer (TFT)

- **Title:** Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting
- **Authors:** Bryan Lim, Sercan O. Arik, Nicolas Loeff, Tomas Pfister (Google Cloud AI / Oxford)
- **Year / Venue:** 2021, International Journal of Forecasting 37(4) (arXiv:1912.09363, Dec 2019)
- **URL:** https://arxiv.org/abs/1912.09363
- **Primary route:** `temporal-feature-tokenization` (spans concept layers `temporal-static-fusion`, `feature-typing`, `scaling-interaction`)
- **Analysis depth:** deep — **confidence:** high
- **PDF:** `sources/papers/temporal-fusion-transformer.pdf`

## 1. What this work actually does

TFT is an attention-based architecture for **multi-horizon** forecasting that is explicitly engineered around **heterogeneous, mixed-type inputs**: time-invariant **static** covariates, **observed** (past-only) time series, and **known-future** inputs (e.g. calendar features). It produces **quantile** forecasts (P10/P50/P90) over the whole horizon in one shot, and exposes three interpretability artifacts: per-variable importance, persistent temporal patterns, and regime/event detection.

For this topic the interesting part is **not** the forecasting head — it is the **front-end tokenizer**: how 70-ish-style heterogeneous features (numeric + categorical, static + temporal) get embedded, selected, and fused into a single representation per timestep.

## 2. Technical mechanism

**Per-feature embedding into a shared space.** Every input variable is mapped independently to a common `d_model` vector: **entity embeddings** for categorical variables, a **single linear transform** for each continuous scalar. One token = one feature, all living in the same space so skip connections work.

**Three-way input split.** Static, observed-past, and known-future inputs each get their **own Variable Selection Network (VSN)** — the model never confuses what is known at forecast time with what is not.

**Variable Selection Network (the key idea).** For the flattened vector of all transformed variables `Xi_t` plus static context `c_s`:
- `v_chi,t = Softmax(GRN(Xi_t, c_s))`  — per-variable selection weights (Eq.6)
- each variable also passes through its **own** GRN (Eq.7, shared across time)
- output = `sum_j v^(j) * GRN_j(xi^(j))` (Eq.8) — a weighted fusion that **down-weights noisy/irrelevant features instance-by-instance**.

**Gated Residual Network (GRN).** `GRN(a,c) = LayerNorm(a + GLU(W1 eta1 + b1))`, `eta2 = ELU(W2 a + W3 c + b2)`. The GLU `= sigma(W4 g + b4) ⊙ (W5 g + b5)` lets the network **suppress** any component (output -> 0), so TFT can collapse toward a simpler model on small/noisy data. GRN+GLU are the universal building block, reused in VSN, static enrichment, and the FFN.

**Static covariate encoders.** Four separate GRN encoders turn static metadata into four context vectors: `c_s` (feeds VSNs), `c_c`/`c_h` (initialize the LSTM cell/hidden state), `c_e` (static enrichment of the temporal features). This is the concrete wiring by which static attributes condition temporal dynamics.

**Temporal processing.** After VSN, one fused `d_model` vector per timestep feeds an **LSTM seq2seq** (encoder over look-back, decoder over horizon, states seeded by `c_c`,`c_h`) for local processing, then a gated skip, static enrichment via `c_e`, then a **single masked interpretable multi-head attention** layer, then a position-wise GRN, then per-quantile linear heads.

**Interpretable attention.** Standard multi-head attention is modified so all heads **share the same value projection** and outputs are additively aggregated, so a single attention-weight matrix is interpretable.

**Objective.** Quantile loss summed over `Q = {0.1, 0.5, 0.9}` and over the whole horizon. Fully supervised; no pretraining.

## 3. Why it matters for the topic's stated goals

The topic's distinctive requirement — **partly time-varying + partly static, numeric + high-cardinality categorical, dozens of features** — is exactly TFT's design target. PatchTST/iTransformer have **no** static or categorical pathway; TFT is the canonical template for the **temporal-static-fusion** concept layer. Its VSN is a clean answer to "how do I tokenize and then *select among* many heterogeneous features in one model," and it gives per-feature importance for free.

## 4. What is reusable

- **VSN as a learned instance-wise soft feature selector** over many heterogeneous tokens: embed-all (entity emb for categorical, linear for continuous) -> per-feature softmax gate conditioned on static context -> per-feature GRN -> weighted sum. This is the single most transferable mechanism for a 70+ mixed-feature tokenizer.
- **Three-way input split + four static context vectors** as a fusion template for time-varying + static attributes.
- **GRN/GLU gating** as a drop-in block that lets a wide-feature model prune capacity per dataset.

## 5. What is NOT safely transferable (within scope)

- **No empirical 70+-feature evidence.** Electricity/Traffic are quasi-univariate; Retail (Favorita) is the only rich-feature dataset and still ~a dozen inputs. The 370/440 figures are **entities, not features.** VSN is a plausible *mechanism* for many features, **untested at that width.**
- **Weak per-value numeric encoder** (raw linear) — should be paired with PLR/periodic embeddings.
- **No high-cardinality story** beyond plain entity-embedding tables.
- **Point-wise temporal tokens** (no patching) -> O(T^2) in timesteps; do not borrow TFT for long-history efficiency — borrow PatchTST's patching for that.

## 6. Evidence quality

Solid, peer-reviewed (IJF 2021), official + widely-reused code, fair `q-Risk` comparison vs DeepAR/MQRNN/Seq2Seq/ConvTrans/DSSM/ARIMA. Headline ~7% P50 / ~9% P90 improvement over next-best. **Caveat:** gains concentrate on rich-static, skewed-target datasets (Volatility, Retail) and are entangled with the quantile objective + static fusion — the ablation does **not** isolate the tokenization/embedding scheme, and attention-as-importance is contested (Jain & Wallace 2019). Confidence high on the *mechanism*, lower on any scaling-to-70+ extrapolation.

## 7. Concrete next experiments / hypotheses

1. **Stress-test VSN width:** run TFT-style VSN on a genuine 70+-heterogeneous-feature tabular-temporal set; measure whether per-feature GRN bank (linear in feature count) dominates params/compute and whether softmax selection stays stable at high feature counts.
2. **Swap the numeric encoder:** replace raw-linear continuous embedding with PLR/periodic ("On Embeddings for Numerical Features") inside the VSN and ablate — test the hypothesis that VSN + rich numeric tokens compounds.
3. **VSN as a front-end for FT-Transformer / PatchTST:** graft VSN's static-context gating onto a per-feature transformer to add the missing static-fusion + feature-selection that those models lack.
4. **High-cardinality regularization:** add hashing / frequency-thresholded entity tables to test whether TFT's plain embeddings break on high-cardinality fields.

## Key claims a skeptic should check

- **(mechanism)** VSN = per-feature embed + softmax gate (cond. on static context) + per-feature GRN + weighted sum (Eqs.6-8) — a uniform tokenizer over numeric+categorical+static+temporal with built-in feature selection.
- **(transfer)** VSN is the most reusable idea for tokenizing 70+ heterogeneous features, but it is an untested *mechanism* at that width, not evidence.
- **(evidence)** "Handles 370/440" refers to **entities/series**, not features; no experiment exceeds ~a dozen distinct input features.
- **(mechanism)** Static metadata conditions temporal dynamics via four GRN context vectors wired into VSN, LSTM init, and attention enrichment.
- **(evidence)** ~7% P50 / ~9% P90 q-Risk gain concentrates on rich-static, skewed-target data and is entangled with the quantile objective; the ablation does not isolate the embedding scheme, and attention-as-importance is contested.
