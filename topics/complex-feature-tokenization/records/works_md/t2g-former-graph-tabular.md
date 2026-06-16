# T2G-Former: Organizing Tabular Features into Relation Graphs Promotes Heterogeneous Feature Interaction

- **Authors:** Jiahuan Yan, Jintai Chen, Yixuan Wu, Danny Z. Chen, Jian Wu (Zhejiang University; University of Notre Dame)
- **Venue / Year:** AAAI 2023 (Oral) — arXiv:2211.16887
- **URL:** https://arxiv.org/abs/2211.16887
- **Code:** https://github.com/jyansir/t2g-former (official PyTorch)
- **Primary route:** tabular-transformers
- **Analysis depth:** deep — **Confidence:** high
- **Concept layers touched:** scaling-interaction (primary), feature-typing, token-granularity. NOT temporal-static-fusion, NOT learning-signal (no pretraining).

---

## 1. What this work actually does

T2G-Former is a tabular Transformer whose contribution is **not a new tokenizer** but a new **feature-interaction mechanism**. It keeps the standard FT-Transformer feature tokenizer (one learned token per column — linear scaling for numerical, embedding lookup for categorical, plus bias) and replaces vanilla dense self-attention with a learned **sparse Feature Relation Graph (FR-Graph)** produced by a **Graph Estimator (GE)**. The graph decides which feature tokens are allowed to interact, layer by layer, so heterogeneous numerical/categorical features interact "in an orderly fashion" instead of all N² pairs interacting uniformly. A **Cross-level Readout** node collects salient features from every layer for the final prediction.

## 2. Technical mechanism

**Tokenizer (inherited).** Input row → one token per column via the FT-Transformer tokenizer. This is the only place numerical vs categorical typing is handled, and it is borrowed wholesale.

**Graph Estimator (the novel core).** For feature tokens x_i, x_j, GE builds an FR-Graph `G` from two parts:
- **Adaptive edge weights** `Gw[i,j] = (W_h x_i)ᵀ diag(r) (W_t x_j)` — a knowledge-graph-completion-style bilinear score with a learnable relation vector `r`. Symmetric (W_h≡W_t) or asymmetric. This is a *fully connected* weighted graph (O(N²) pairwise).
- **Static knowledge topology** `Gt[i,j] = cos(e_h_i, e_j)` from learnable, instance-independent **column embeddings** `E ∈ R^{d×N}`, with `d = 2·⌈log₂N⌉`. Thresholded into a binary adjacency `A = 1[σ1(Gt+b) > T]`, T=0.5, σ1=sigmoid. This encodes dataset-global "underlying knowledge" of which feature pairs should ever connect.

**Assembly:** `G = σ2( f_nsi(A) ⊙ Gw )` where `σ2` is a *competitive* activation (softmax / entmax / sparsemax) that restricts each feature node's **indegree** (→ sparsity), and `f_nsi` removes self-loops. Straight-through trick handles the non-differentiable indicator; `A` is frozen after convergence for stability.

**T2G block:** `H = G·(Wv X) + g(X)`, then `X' = FFN(H) + g(H)`, where `g` is a dropout shortcut preserving intra-feature info (since self-loops are excluded). Default 8-head GE per block, blocks stacked.

**Cross-level Readout:** a global readout node `z_l` reweights each layer's features by `α_i = gw(h_l, f_i)·f_top(gt(e_l, e_i))`, fuses via `softmax(α)ᵀV + z`, carries forward through layers, and the final `z_L` feeds an FC head.

## 3. Why it matters for the topic's stated goals

The topic targets **70+ heterogeneous features** feeding deep tabular models. T2G-Former sits exactly at the scaling-interaction layer: it accepts that per-feature tokenization (à la FT-Transformer) is fine, and asks the harder question — *with that many feature tokens, which interactions should actually happen?* Its answer (a learned sparse relation graph combining data-adaptive + dataset-global static topology, with competitive indegree restriction) is a concrete **interaction prior** that is plausibly more sample-efficient than dense attention when many features are present and most pairs are irrelevant. It is one of the route's anchor examples and a strong, code-available baseline.

## 4. What is reusable

- **The decoupling principle:** tokenizer and interaction mechanism are orthogonal — you can keep any feature tokenizer (PLR numerical embeddings, target-aware, etc.) and bolt on a learned sparse interaction graph.
- **Learned sparse indegree via competitive activation** (entmax/sparsemax) to prune which feature pairs interact — directly transferable to a 70+-feature attention block.
- **Two-component edge model:** instance-adaptive weights ⊙ a dataset-global static topology. The ablation shows the *shared static* topology (O(N log N) params) beats both a per-instance "adaptive" topology and a fully "free" learned N×N adjacency — a useful regularization recipe.
- **No-self-interaction + shortcut** as a clean way to separate inter-feature mixing from intra-feature preservation.

## 5. What is NOT safely transferable (within this topic's scope)

- **No temporal handling at all.** Static single-row tables only. For the topic's mixed time-varying + static setting, GE provides nothing on the temporal side — it would need to be composed with a temporal tokenizer (PatchTST/TFT-style) externally.
- **No compute saving.** `Gw` is computed densely over all N² pairs *before* sparsification. The "graph" is an inductive bias, **not** a sparse-attention speedup — quadratic cost in N remains. Do not adopt it expecting efficiency at 100s of features.
- **Scale ceiling:** largest table tested = 93 features, ~515k rows. Hundreds-of-features regime is unvalidated.
- **No high-cardinality categorical treatment** beyond plain embedding tables.
- **Training fragility:** static topology must be frozen post-convergence to avoid instability on small/binary tasks; GE in a high-only layer can underperform plain attention on regression.

## 6. Evidence quality

Solid for static-tabular: 12 RTDL-benchmark datasets, **15-seed averages**, all baselines Optuna-tuned, fixed splits from the FT-Transformer/RTDL pipeline (fair comparison). Beats compared DNNs on **8/12** datasets and is comparable to XGBoost. Headline gain on California Housing (78.18 vs FT-Transformer 70.84, XGBoost 72.51). Multiple ablations: FR-Graph type (SwAt best), GE placement (all-layers best, first-layer most important), self-loop removal, topology-learning strategy (column-embedding > adaptive > free), and a direct comparison beating DANet group-based interaction. Caveats: gains are dataset-dependent (XGBoost still wins several tasks), and the interpretability story is suggestive — authors themselves flag some learned edges as "probably dataset bias."

## 7. Concrete next experiments / hypotheses

1. **Stress-test scaling:** run GE on a 70-300 feature heterogeneous table; measure whether the O(N²) `Gw` precompute is the bottleneck and whether sparsemax indegree restriction still yields a useful prior at that width.
2. **Swap the tokenizer:** replace the FT-Transformer tokenizer with PLR / periodic numerical embeddings (Gorishniy 2022) under a fixed GE — test the decoupling claim that interaction gains are additive to better numerical tokenization.
3. **Temporal composition:** feed static features through GE and time-varying features through a patch/channel tokenizer, then fuse — does the learned static topology help select which static covariates gate the temporal stream?
4. **Sparse-compute variant:** approximate `Gw` with low-rank/top-k pairing to turn the inductive-bias graph into an actual compute saving, then re-check accuracy vs the dense original.
5. **Robustness of static topology:** quantify how often freezing `A` is required and whether an entmax-only (no hard threshold) variant removes the training-stability hack.

---

### Key claims a skeptic should check
- **(mechanism)** The FR-Graph combines instance-adaptive bilinear edge weights with a dataset-global static topology and restricts each node's indegree via a competitive (sparsemax/entmax) activation — this is the entire differentiator vs FT-Transformer's dense attention.
- **(transfer)** The tokenizer and interaction mechanism are decoupled, so the learned sparse interaction prior is reusable on top of any per-feature tokenizer for 70+-feature tables.
- **(evidence)** Beats compared DNNs on 8/12 RTDL datasets (15-seed, tuned), with a large California-Housing margin, but only comparable to XGBoost.
- **(mechanism)** GE adds NO compute saving — `Gw` is dense O(N²) before sparsification; the graph is an inductive bias, not sparse attention.
- **(transfer-limit)** Zero temporal handling and a 93-feature test ceiling — temporal-static fusion and the hundreds-of-features regime are unvalidated.
