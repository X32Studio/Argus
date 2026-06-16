# TabICLv2: A better, faster, scalable, and open tabular foundation model

- **Authors:** Jingang Qu, David Holzmüller, Gaël Varoquaux, Marine Le Morvan (SODA / Inria)
- **Year / Venue:** 2026, arXiv:2602.11139 (cs.LG), submitted 2026-02-11
- **URL:** https://arxiv.org/abs/2602.11139
- **Code:** https://github.com/soda-inria/tabicl (inference + weights released; synthetic-data engine + pretraining code promised)
- **Primary route:** tabular-foundation-models
- **Analysis depth:** deep · **Confidence:** medium (read abstract + HTML full-text extraction of method/ablations/benchmarks; have not line-by-line verified every formula against the PDF math)

## 1. What this work actually does

TabICLv2 is an in-context-learning (ICL) tabular foundation model for classification and regression. Like the TabPFN / TabICL lineage, it is pretrained purely on synthetic tabular tasks and at inference time consumes a labeled "context" (training rows) plus unlabeled "query" (test rows) in a single forward pass — no per-dataset gradient training. The paper's claim is that it beats the prior SOTA (RealTabPFN-2.5) on TabArena and TALENT **without any tuning**, while being markedly faster and scaling to million-row / 500-feature tables under 50GB GPU.

It rests on three pillars: (1) a new DAG-based synthetic data engine maximizing prior diversity; (2) architectural changes — repeated feature grouping, target-aware embedding, and QASSMax (query-aware scalable softmax); (3) optimized training, notably swapping AdamW for the Muon optimizer.

## 2. Technical mechanism

**Tokenizer (three stages over an n x m table):**
1. **Repeated feature grouping.** Each token bundles 3 columns via circular shifts: `E1[i,j] = Lin(x_{i,j}, x_{i,(j+1) mod m}, x_{i,(j+3) mod m})`, giving `E1 ∈ R^{n×m×d}`. This is a deliberate departure from TabPFNv2's per-cell tokens (cell-quadratic) — TabICLv2 keeps a per-(row, column-group) token.
2. **Target-aware embedding (TAE).** The label is added into the embedding of context rows: `E2[i,j] = E1[i,j] + EmbedTAE(y_i)` for `i ∈ D_train`. `EmbedTAE` is a linear layer for regression and a learnable lookup table for classification. This contrasts with TabPFNv2, which appends the target as an extra column; the authors say additive injection mitigates representation collapse.
3. **Column-then-row-then-dataset attention.** `TF_col` (a set transformer applied per column) → `TF_row` (a [CLS] token collapses a row's feature embeddings into one vector) → `TF_icl` (test rows attend to train rows for the actual in-context prediction). By compressing features to a per-row vector before ICL, complexity is `O(n² + n·m²)` rather than cell-quadratic.

**QASSMax (query-aware scalable softmax).** Extends Scalable Softmax (`log n` scaling that counters "attention fading" as context grows) with a learnable, query-dependent modulation of the query vector:
`q̃_{hi} = q_{hi} · MLP_base(log n)_{hi} · (1 + tanh(MLP_gate(q_h)_i))`, where `MLP_base: R → R^{H×d_head}` gives base scaling and `MLP_gate: R^{d_head} → R^{d_head}` gives a gate bounded in (0,2). Both are two-layer GELU MLPs (64 hidden). It improves generalization to larger contexts without altering the softmax kernel.

**High-cardinality TARGETS (not features).** For `C>10` classes, pick balanced bases `[k_0..k_{D-1}]` with `k_i ≤ 10` and `∏ k_i ≥ C`, decompose each class into mixed-radix digits, run TF_col / hierarchical classification once per digit and average — enabling arbitrary class counts.

**Synthetic prior.** Random vectors propagate through a DAG; each node is a random function of its parents drawn from 8 types (MLP, Tree Ensemble [CatBoost-inspired], Discretization, Gaussian Process, Linear, Quadratic, EM/cluster, Product). "Random Cauchy graph" connectivity supports non-tree structure. Numerical features come from a single node dimension; categoricals from multiple dimensions discretized by nearest-neighbor or softmax. Prior filtering drops tasks an ExtraTrees model cannot beat a constant baseline on (~35% classification / ~25% regression removed).

**Optimizer.** Muon (matrix-aware LR scaling `0.2·√(max{n,m})` per weight `W ∈ R^{n×m}`), stage-1 max LR 8e-4 (vs 1e-4 AdamW), cautious weight decay (decay only when update and parameter share sign), grad clip 10. Total ~24.5 GPU-days.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing 70+ heterogeneous (numerical + high-cardinality categorical) features into a deep tabular model. TabICLv2 is the current best open foundation model in exactly that regime: it handles up to 100 features on TabArena and demonstrably scales to 500 features / 1M rows, and it does so with an explicit, simple tokenization scheme plus a label-conditioning trick (TAE). It is a concrete reference for how to get a transformer to ingest many mixed features cheaply.

## 4. What is reusable

- **Target-aware embedding (TAE):** additively inject `EmbedTAE(y)` into every context-row feature token instead of appending the label as a column. Cheap, generic, claimed to fight representation collapse — directly portable to any target-aware tokenizer over 70+ features.
- **Column-then-row compression (TF_col → TF_row CLS pooling):** collapse per-feature tokens to a single per-row vector before any cross-row attention, turning a cell-quadratic cost into `O(n² + n·m²)`. This is the key trick for keeping wide tables tractable.
- **QASSMax / scalable-softmax idea:** `log n` query scaling to keep attention sharp as context length grows; useful whenever feature/row count varies widely at inference.
- **Prior filtering by a cheap baseline (ExtraTrees beats constant):** a clean recipe to discard degenerate synthetic tasks — transferable to any synthetic-pretraining pipeline.

## 5. What is not safely transferable (within this topic's scope)

- **TAE requires labeled context at inference.** It is an ICL construct, not a supervised end-to-end feature embedding — do not assume it drops into a standard train-once/predict model unchanged.
- **Mixed-radix encoding is for high-cardinality TARGETS, not high-cardinality categorical FEATURES.** The topic's core pain (high-cardinality categorical *inputs*, e.g. user/SKU IDs) is NOT directly addressed; categorical inputs just go through the same linear grouping path as numericals.
- **No temporal modeling.** Rows are exchangeable; the topic's time-varying + static fusion need is unmet here.
- **Architecture–prior coupling.** Ablations show the v2 architecture on v1's prior (and vice versa) is substantially worse, so you cannot lift one component in isolation and expect the reported gains.
- **Cost is still quadratic in feature count** (`n·m²`): 70-500 features is fine, but thousands of columns remain expensive.

## 6. Evidence quality

Strong empirical story: beats tuned+ensembled RealTabPFN-2.5 on TabArena (51 datasets) and TALENT (300 datasets) without tuning; top rankings across 10^3–10^5 samples; wins on 600K-row datasets where TabPFN-2.5 OOMs; 10.6x faster on H100, 11.8x on CPU. Ablation attributes ~100 Elo (≈64% win rate) each to the synthetic prior, TAE, Muon, and QASSMax, with smaller gains from repeated feature grouping and prior filtering. Caveats: the no-tuning headline still uses 8-estimator shuffle ensembling (a test-time-augmentation cost); ablation deltas are non-additive due to architecture-prior interaction; pretraining + synthetic-engine code not yet released, so full reproducibility is pending; numbers here are from the HTML full text, not a line-by-line PDF math check (hence medium confidence).

## 7. Concrete next experiments or hypotheses

1. **Ablate TAE in a non-ICL setting:** add `EmbedTAE(y)` to feature tokens of a standard supervised FT-Transformer over 70+ features (with proper train/val target leakage controls) — does additive label conditioning still help vs target/CatBoost encoding?
2. **Stress high-cardinality categorical INPUTS:** TabICLv2 routes categoricals through the same linear path as numericals; test whether adding a learned per-category embedding (entity embeddings) or hashing before the grouping projection improves accuracy on tables with >10^4-cardinality fields.
3. **Probe the `n·m²` ceiling:** measure wall-clock/accuracy as feature count grows from 100 → 500 → 1000 to find where column-then-row attention stops being practical, informing whether feature selection/gating is needed upstream for the topic's 70+ setting.
4. **Decouple QASSMax:** drop QASSMax into another tabular transformer to test whether the `log n` scaling generalizes outside this architecture-prior pairing.
