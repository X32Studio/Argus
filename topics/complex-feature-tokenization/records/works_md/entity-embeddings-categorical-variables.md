# Entity Embeddings of Categorical Variables

- **Authors:** Cheng Guo, Felix Berkhahn (Neokami Inc.)
- **Year:** 2016 (arXiv:1604.06737, cs.LG)
- **URL:** https://arxiv.org/abs/1604.06737
- **Code:** https://github.com/entron/entity-embedding-rossmann (author, Keras, HTTP 200)
- **Work type:** paper
- **Primary route:** categorical-high-cardinality
- **Analysis depth:** deep — **Confidence:** high
- **Concept layers touched:** primarily *token-granularity* (one learned vector per categorical field) and *learning-signal* (supervised end-to-end). Marginal touch on *feature-typing* (continuous concatenated raw; calendar fields demoted to categorical). Does NOT address *scaling-interaction* or *temporal-static-fusion* despite the temporal task.

## 1. What this work actually does

Maps each categorical variable's discrete values into a learned dense Euclidean vector ("entity embedding"), trained jointly with a neural network on the supervised task. The motivation: structured/tabular data lacks the smooth continuity that NNs exploit in vision/NLP; one-hot encoding both explodes compute for high-cardinality fields and treats values as mutually independent. A learned embedding instead places values with similar effect on the target close together, "revealing the intrinsic continuity" so the NN (and downstream models fed the embeddings) generalize better, especially under sparse, high-cardinality conditions. Demonstrated on the Kaggle Rossmann Store Sales competition (the method behind the authors' 3rd-place finish), using a deliberately minimal 7-feature subset with no feature engineering.

## 2. Technical mechanism

- Embedding as a linear layer on one-hot. One-hot encode value x_i as a Kronecker-delta vector of length m_i (the cardinality). The embedding output is `x_i_embedded = sum_alpha w_{alpha,beta} * delta_{x_i,alpha} = w_{x_i, beta}` (Eq. 16–18). So the embedding table IS the weight matrix of a no-bias, no-activation linear layer sitting on top of the one-hot input; the embedding vectors are just rows of that matrix and learn via ordinary backprop. Figure 1 makes the equivalence explicit.
- Concat-then-deep. After every categorical is embedded, all embedding vectors plus any raw continuous inputs are concatenated into one merged input layer; standard dense layers (here 1000 → 500 ReLU → sigmoid) sit on top. The embedding layer learns per-category properties; deeper layers form combinations (feature interaction is **implicit**, handled entirely by the MLP).
- Per-field dimension D_i. D_i is a hyperparameter per feature, bounded 1..m_i−1, chosen empirically (heuristic: more complex field → more dims; otherwise start at m_i−1). Examples: store 1115→10, day-of-week 7→6, day 31→10, month 12→6, state 12→6, year 3→2, promotion 2→1. This decouples token width from cardinality.
- Finite-metric-space framing. The authors define a metric d_i(x^p, x^q) = average over other features of |f(x^p, .) − f(x^q, .)| (Eq. 19) that satisfies metric axioms, and ask whether the learned embedding isometrically embeds it. Numerically they show the store metric's Schoenberg matrix is **not** positive definite, so it is NOT isometrically Euclidean-embeddable; the learned embedding shows a roughly linear (bounded) but non-isometric relation to this metric (Fig. 2). The "continuity" story is therefore an intuition, not a proved property.

## 3. Why it matters for the topic's stated goals

This is the seminal primitive for the categorical leg of any 70+-heterogeneous-feature tokenizer. Every modern deep-tabular tokenizer (TabTransformer, FT-Transformer, SAINT, AutoInt) inherits "learn one embedding table per categorical field, train end-to-end." The per-field dimension knob and the concat-then-process pattern are exactly the design decisions a heterogeneous tokenizer must make for its categorical columns. It is the historical anchor explaining why high-cardinality categoricals are embedded rather than one-hot-ed in deep tabular models.

## 4. What is reusable

- The core primitive: a learned per-field embedding table trained against the task target, producing a fixed-width dense token of tunable dimension for a high-cardinality column. Drop-in for the categorical path of a mixed-feature tokenizer.
- Per-field dimension budget: set D_i by expected field complexity, not by cardinality — lets a 70-feature sequence keep a bounded total embedding width.
- Embedding extraction / transfer: trained embeddings can be exported and reused as features by other models (their tables show large gains for KNN/RF/GBT). Conceptually this is a learned, supervised category encoding — a precursor to using a pretrained tabular model's categorical tokens elsewhere.
- Discretize-then-embed (future-work idea): the paper proposes turning continuous non-monotone variables into categoricals and embedding them — a direct conceptual bridge to this topic's discretization-vq and numerical-embeddings routes.

## 5. What is NOT safely transferable (within this topic's scope)

- "Scales to lots of high-cardinality features" is asserted but tested on only 7 features. The architecture scales linearly by construction, but there is zero empirical evidence at dozens-to-hundreds of features. The concat-then-MLP design pushes ALL feature interaction into dense layers, which is precisely the bottleneck that attention-based tabular transformers were later introduced to fix. Do not treat this as a validated many-feature recipe.
- The sparse-data advantage was produced by synthetic sparsification (subsampling 1M rows to 200k) on essentially ONE high-cardinality field (store). Not the same as a naturally wide, many-high-cardinality-field regime.
- No temporal modeling: a temporal task is handled by demoting time to categorical calendar fields. Useless for temporal-static fusion as a tokenizer; only the train/test temporal split is informative.
- No missing-value handling and no OOV / cold-start bucket — both mandatory in a real 70+-feature pipeline.
- The isometric-Euclidean-embedding intuition is explicitly falsified for the store feature; do not rely on "distances are meaningful" as a guarantee.

## 6. Evidence quality

Medium. Single dataset (Rossmann), single domain (retail sales regression), minimal 7-feature setup, MAPE not the competition metric (chosen for outlier stability). Results are internally consistent and the temporal-split comparison is a genuine generalization probe (NN 0.101 vs GBT 0.152 on unshuffled). The "embeddings boost all ML methods" result (KNN 0.290→0.116 etc.) is real but partly circular: the embeddings were trained supervised on the same label, so feeding them to a downstream model is close to a learned target encoding and risks optimistic bias — not a clean feature-encoding comparison. Reproducible reference code exists. Pre-2018 work, so per recency_floor it is a historical anchor, not frontier evidence.

## 7. Concrete next experiments or hypotheses

- Stress-test the primitive at scale: build a 70+-feature synthetic/real table with many high-cardinality fields and measure whether concat-then-MLP entity embeddings degrade vs an attention-based tokenizer (FT-Transformer) as feature count grows — quantify where implicit MLP interaction breaks.
- Per-field dimension policy: compare hand-set D_i vs a principled rule (e.g. min(cardinality-1, k·log m_i) or learned/pruned dims) under a fixed total token budget.
- Leakage-controlled transfer: re-run the "embeddings boost GBT/KNN" experiment with strict out-of-fold embedding generation to separate genuine representation gain from target leakage; compare against plain CatBoost/target encoding.
- Discretize-then-embed for numerics: implement the paper's future-work idea (bin continuous features, entity-embed the bins) and benchmark against PLR/periodic numerical embeddings — bridges to numerical-embeddings and discretization-vq routes.
- OOV/cold-start: add a learned unknown-category bucket and measure robustness when test-time categories are unseen.

## Key claims a skeptic should check

1. (mechanism) An entity embedding is mathematically identical to a no-activation linear layer on one-hot input, so the embedding table is learned by ordinary backprop — nothing exotic. (Eq. 16–18, Fig. 1.)
2. (evidence) On the temporal (non-shuffled) Rossmann split, NN with entity embeddings beats GBT/RF/KNN (MAPE 0.101 vs 0.152/0.158/0.290) and clearly beats one-hot — but on shuffled data one-hot NN slightly edges EE, so the win is generalization-under-distribution-shift, not raw fit.
3. (transfer) The per-field learned embedding with a tunable per-feature dimension is the directly reusable primitive for the categorical leg of a 70+-feature tokenizer.
4. (transfer/pitfall) "Scales to lots of high-cardinality features" is unvalidated — only 7 features tested; concat-then-MLP leaves all feature interaction implicit, the exact limitation later tabular transformers target.
5. (pitfall) The "embeddings boost all downstream ML methods" result is partly a learned target-encoding effect (embeddings trained on the same label), risking optimistic bias if reused without out-of-fold discipline.
