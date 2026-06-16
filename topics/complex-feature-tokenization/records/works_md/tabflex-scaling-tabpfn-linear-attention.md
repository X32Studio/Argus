# TabFlex: Scaling Tabular Learning to Millions with Linear Attention

- **Authors:** Yuchen Zeng, Tuan Dinh, Wonjun Kang, Andreas C. Mueller (Microsoft Gray Systems Lab; UW-Madison; UCSF; Furiosa AI; SNU)
- **Venue / year:** ICML 2025 (PMLR 267), arXiv:2506.05584, 2025
- **URL:** https://arxiv.org/abs/2506.05584
- **Code:** https://github.com/microsoft/ticl
- **Primary route:** `tabular-foundation-models`
- **Analysis depth:** deep | **Confidence:** high
- **Local copy:** `sources/papers/tabflex-scaling-tabpfn-linear-attention.pdf`

## 1. What this work actually does

TabFlex makes the TabPFN in-context-learning (ICL) tabular classifier scale to large datasets by swapping its attention mechanism. TabPFN treats a whole labeled training set + test set as one prompt, embeds **each sample as a single token**, and classifies all test rows in one forward pass; this is fast on small data but its softmax self-attention is **O(n^2)** in the number of in-context examples, capping it at ~3000 training samples and ~100 features / ~10 classes.

TabFlex replaces softmax self-attention with **non-causal linear attention** (kernel feature map `phi = elu(.)+1`), making attention cost **linear in sequence length (number of samples)** while keeping the encoder permutation-invariant over training tokens. It ships **three separately-trained sub-models** — TabFlex-S100, TabFlex-L100 (50K-length prompts), TabFlex-H1K (1K features, 100 classes) — chosen at inference by a hand-coded rule on dataset (n, d). Result: it classifies the 1.025M-row poker-hand dataset in 4.88s.

Crucially, **TabFlex contributes nothing new to feature tokenization** — feature encoding is inherited verbatim from TabPFN. Its single contribution is the attention substitution plus an analysis showing the naive PyTorch linear-attention implementation is already HBM-optimal (Theorem 1), so FlashLinearAttention is unnecessary.

## 2. Technical mechanism

- **Token granularity:** one token per *sample* (row). A shared input-projection MLP maps the entire feature vector x (plus label y for training rows) to one embedding. Features are **not** individually tokenized.
- **In-context inference:** training tokens attend to all other training tokens (non-causal -> order-invariant); each test token attends only to training tokens (independent predictions); a per-test-token MLP outputs class probabilities. Functionally equivalent to standard ICL but one pass instead of m passes.
- **Linear attention:** softmax similarity `exp(q_i^T k_j)` is replaced by `phi(q_i)^T phi(k_j)`. The shared terms `sum_j phi(k_j) v_j` and `sum_j phi(k_j)` are computed once, so each position is O(1) instead of O(n); overall O(N D^2) FLOPs, O(N D) HBM access (Theorem 1). Non-causal form drops the causal prefix-sum, so it is *not* an RNN and stays order-invariant.
- **Architecture-selection ablation (the interesting science):**
  - *Finding 1 — causal hurts ICL:* SSMs/Mamba and causal attention are inherently causal; their accuracy plateaus then *declines* as more context examples are added, because example order shouldn't matter. Non-causal keeps improving (Fig. 2a). Mamba-II also shows higher train loss and lower test AUC across 150 datasets (Fig. 2b).
  - *Finding 2 — linear attention is free:* on the 57-dataset suite where TabPFN was top-1, replacing softmax with linear attention preserves accuracy and cuts runtime (Fig. 2c). It also beats sliding-window attention.
- **Feature/scale handling:** high-dimensional inputs (d>1000) are **random-linear-projected to 1000 features** before encoding (Alg. 1). Regression is shoehorned in by discretizing the target into 10/100 uniform bins.
- **Pretraining:** unchanged from TabPFN — a prior-fitted network trained offline on synthetic datasets from a structural-causal-model prior; no per-dataset fine-tuning at deploy time.

## 3. Why it matters for the topic's stated goals

The topic wants to tokenize **70+ heterogeneous features** (numerical + high-cardinality categorical + mixed temporal/static) for a deep tabular model. TabFlex is a foundation-model-route entry, so it sits in `tabular-foundation-models`. Its relevance is **the sample-axis scaling lever, not the feature axis**: linear attention is the mechanism that would let a TabPFN-style backbone ingest 50K+ in-context examples and millions of test rows cheaply. The negative result (causal sequence models are bad for tabular ICL) is a useful guardrail if we ever consider Mamba/SSM tokenizers.

## 4. What is reusable

- **Non-causal linear attention (`phi=elu(.)+1`) as a drop-in for softmax** in any set-of-rows tabular transformer — linear in sequence length, permutation-invariant, no measured accuracy loss on the suite where the base model was already strong. The "naive PyTorch impl is HBM-optimal" result means you don't need a custom kernel.
- **The empirical principle:** for tabular ICL, keep the context encoder **non-causal**; do not reach for SSMs/causal linear attention to save compute — they degrade with more examples.
- **Conditional model selection by (n, d)** as a cheap engineering pattern (route long-context vs high-dim inputs to differently-trained heads) — borrowable, though clunky.
- **Data-efficient add-ons:** PCA/SVD/random-projection dimensionality reduction and ~20% training-data sampling preserve most accuracy while cutting latency — relevant if our 70+-feature setting is also sample-heavy.

## 5. What is NOT safely transferable (within this topic's scope)

- **No feature tokenizer.** TabFlex collapses the whole feature vector into one token via one MLP; it offers zero machinery for per-feature, field-value, bin, or learned-code tokenization — the core of this topic.
- **"Thousands of features" is a random-projection ceiling, not faithful representation.** d>1000 is lossily projected down; above ~800 features XGBoost overtakes it. So it does **not** demonstrate good handling of many heterogeneous features.
- **"Millions" = rows, not features.** Sample-axis scaling is orthogonal to the feature-tokenization goal.
- **Categorical / high-cardinality handling is just TabPFN's preprocessing** — no entity embeddings, hashing, or target encoding contributed.
- **No temporal / mixed time-varying support**; classification-only (regression is a target-binning hack that loses to XGBoost on most datasets).

## 6. Evidence quality

Strong and broad: 115 OpenML datasets, TabZilla hard (36, incl. 11 high-dim/large), 25 baselines, multiple controlled ablations (causal vs non-causal, Mamba vs Transformer, softmax vs linear, sliding-window). Speed claims are concrete (poker-hand 4.88s vs 504s 5th-best). **Caveats:** (1) the "no accuracy loss from linear attention" result is on a suite hand-picked because TabPFN already won there; (2) the big wins on hard/large datasets are **confounded** — TabFlex uses *all* training data while TabPFN is capped at 3000, so it's not a pure attention-mechanism comparison; (3) regression results are weak and acknowledged as a hack; (4) three sub-models + tuned thresholds complicate "single model" reading (authors note insensitivity to thresholds in App. C.4).

## 7. Concrete next experiments / hypotheses

- **Pair non-causal linear attention with a real per-feature tokenizer** (FT-Transformer-style value tokens, or PLR numerical embeddings) on the SAMPLE axis vs FEATURE axis: test whether linear attention over *feature* tokens (not sample tokens) preserves accuracy when feature count hits 70-200.
- **Stress-test the random-projection crutch:** measure accuracy degradation of TabFlex-H1K on genuinely high-cardinality categorical-heavy data (where random projection of one-hots is destructive) vs a learned categorical tokenizer.
- **Validate the causal-is-bad finding for feature-axis attention:** the order-invariance argument is about *examples*; check whether it also holds when tokens are *features* (order there is also arbitrary) — this would justify non-causal linear attention as the efficient backbone for a 70+-feature tokenizer.
- **Compare against TabPFNv2 / TabICL** on the same hard benchmark to separate "more training data" from "better attention."

## Key claims a skeptic should check
1. (mechanism) Non-causal linear attention with `phi=elu(.)+1` replaces softmax in TabPFN with no accuracy loss and linear-in-samples cost — but only validated where TabPFN was already top-1.
2. (evidence) Causal models (Mamba/SSM, causal linear attention) are systematically worse for tabular ICL because example order shouldn't matter (Fig. 2a/2b).
3. (transfer) The "thousands of features / millions of samples" headline is sample-axis scaling + random feature projection, NOT a contribution to heterogeneous-feature tokenization.
4. (evidence) Large-dataset wins over TabPFN are confounded by TabFlex using all training data vs TabPFN's 3000-sample cap.
5. (transfer) The only durable transfer to this topic is "use non-causal linear attention as the efficient attention backbone"; feature encoding must come from elsewhere.
