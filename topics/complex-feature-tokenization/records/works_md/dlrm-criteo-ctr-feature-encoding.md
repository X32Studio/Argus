# Deep Learning Recommendation Model (DLRM)

- **Slug:** `dlrm-criteo-ctr-feature-encoding`
- **Primary route:** `industrial-feature-systems`
- **URL:** https://arxiv.org/abs/1906.00091 — code: https://github.com/facebookresearch/dlrm
- **Year / venue:** 2019, arXiv:1906.00091 [cs.IR] (Facebook AI); later the MLPerf recommendation benchmark
- **Analysis depth:** deep — **Confidence:** high
- **PDF:** `sources/papers/dlrm-criteo-ctr-feature-encoding.pdf` (text: `sources/papers/dlrm.txt`)

## 1. What this work actually does

DLRM is Facebook's open-source, production-grade CTR / personalization model. Its contribution is
two-fold and deliberately un-fancy: (a) a *clean architectural recipe* for turning a mix of dense
numerical and sparse high-cardinality categorical fields into one model, and (b) a *systems recipe*
(combined model + data parallelism) for training it when the embedding tables reach multiple GBs.
The paper's own framing is "a benchmark for algorithmic experimentation and hardware/system
co-design," not a SOTA-accuracy paper. It evaluates on the public **Criteo Ad Kaggle** (13 dense +
26 categorical features, ~45M samples, 7 days) and **Criteo Terabyte** datasets.

## 2. Technical mechanism

The tokenization + interaction pipeline:

1. **Categorical (sparse) fields → per-field embedding token.** Each of the 26 categorical fields
   `i` owns an embedding table `W_i ∈ R^{m_i×d}`. A lookup is the one-hot product `e_i^T W_i = w_i`.
   Multi-valued fields use a weighted/pooled sum `A^T W` (PyTorch `nn.EmbeddingBag`, Caffe2
   `SparseLengthsSum`) — i.e. an embedding-bag, so a field with several active ids still yields one
   `d`-dim token. This is the entity-embeddings primitive at industrial scale.
2. **Dense (continuous) features → one MLP token.** The 13 continuous features (after `log(1+x)`)
   go through a **bottom MLP** that projects them to a *single* vector of the *same* width `d` as the
   embeddings. So the entire dense block becomes one extra token, dot-product-compatible with the
   categorical tokens.
3. **Explicit second-order interaction.** Take the **dot product of every pair** of the `F` field
   tokens (26 embeddings + 1 dense token), keeping the strictly-upper-triangular set — this mimics a
   **factorization machine** (Rendle 2010). The interaction scalars are **concatenated with the raw
   dense-MLP vector** and passed to a **top MLP** + sigmoid → click probability.
4. **Why dot product, not let-the-MLP-figure-it-out.** DLRM treats each *field vector as one unit*
   and only forms cross-terms *between* fields. This is the explicit contrast with **Deep & Cross**,
   which crosses *individual elements within* feature vectors and so produces far higher
   dimensionality. DLRM argues higher-than-second-order interactions "may not be worth the
   additional computational/memory cost."
5. **Parallelism (the systems half).** Embedding tables dominate parameters (GBs each → ~540M params
   for the Criteo-sized model) and cannot be replicated, so they are **model-parallel** (sharded
   across devices) while the MLPs are **data-parallel**. The embedding outputs are exchanged with a
   **personalized all-to-all "butterfly shuffle"** since each device holds only some tables but the
   interaction needs all of them. This combined model+data parallelism is the paper's claimed unique
   requirement and is custom-implemented (not native to PyTorch/Caffe2 at the time).

## 3. Why it matters for the topic's stated goals

The user's target is tokenizing **70+ heterogeneous (numerical + high-cardinality categorical, mixed
static/temporal)** features for a deep model. DLRM is the closest *production-validated* analogue:
it actually ships a recipe — "one learned token per field, project dense features into the same token
space, interact explicitly by dot product, shard the big embedding tables model-parallel." That is a
concrete, runnable kernel (the repo is the MLPerf reference), unlike most academic tabular papers
that stop at ~30 features on benchmark tables. It also crisply localizes where the recipe breaks for
the user's setting (see §5).

## 4. What is reusable

- **Common-`d` field-token space + explicit pairwise dot-product interaction.** The single most
  reusable idea: force every heterogeneous field (categorical embedding *or* MLP-projected dense
  block) into a shared `d`-dim space, then model interaction explicitly rather than hoping a deep MLP
  discovers it. Directly portable as a tokenizer + interaction layer.
- **Embedding-bag pooling for multi-valued categorical fields** (`nn.EmbeddingBag` / CSR-style
  lengths+indices) — handles "a field that holds a *set* of ids" cleanly; relevant whenever a
  feature is multi-hot.
- **Model-parallel embedding sharding + all-to-all** — the engineering pattern for when the union of
  high-cardinality embedding tables won't fit on one device. Reusable at production scale.
- **`log(1+x)` dense pre-transform** — trivial but a sane default for skewed numeric features.
- **Reference implementation + Criteo pipeline** — runnable, maintained, the MLPerf rec benchmark.

## 5. What is NOT safely transferable (within this topic's scope)

- **Dense features collapsed into ONE token.** All 13 numerical features are pre-mixed by the bottom
  MLP, so individual numerical features cannot interact pairwise and get **no per-feature numerical
  embedding** (no piecewise-linear/periodic/quantile encoding). For a numerics-heavy 70+-feature
  table this discards resolution the numerical-embeddings route (On-Embeddings, AutoDis, PLR) shows
  to matter. Copying DLRM's dense path wholesale is an anti-pattern here.
- **O(F²) interaction in #fields.** Cheap at 39 fields; quadratic at 70+ — and *much* worse if you
  tokenize each numerical feature individually (which §4 of the topic actually wants). DLRM's
  "scales" claim is about **web-scale data + GB-sized embedding tables**, NOT about scaling the number
  of *interacting tokens*. Do not cite it as evidence for the latter.
- **No temporal tokenizer.** Criteo is temporal but DLRM treats rows i.i.d. (only a chronological
  split). The user's time-varying half needs PatchTST/TFT/iTransformer-style machinery DLRM lacks.
- **High-cardinality is solved by infrastructure, not representation.** Criteo categoricals arrive
  pre-hashed/anonymized as integer ids; DLRM just allocates a big table per field. It never solves raw
  high-cardinality *string* encoding, hashing collisions, frequency bucketing, or compositional/
  semantic-ID codebooks (contrast TIGER RQ-VAE). No OOV/cold-start handling beyond index 0.

## 6. Evidence quality

Weak on accuracy, strong on engineering. The **only** quantitative accuracy comparison is DLRM vs a
DCN, both ~540M params, **one epoch, no regularization, "without extensive tuning,"** reported as an
accuracy *curve* (~0.78–0.79) with **no AUC/logloss table**. DLRM is "slightly higher" — suggestive,
not established; later literature does not consistently rank DLRM above DCN-style models. The systems
profiling (≈256 s CPU / 62 s GPU single-socket; embeddings + FC dominate) is solid and reproducible.
Net: trust the *architecture/systems recipe* and the *open-source benchmark*; treat the *accuracy
win* as a soft claim.

## 7. Concrete next experiments / hypotheses

- **H1 (numerical resolution):** Replace DLRM's single dense-MLP token with **per-numerical-feature
  embeddings** (PLR/AutoDis) feeding the same dot-product interaction. Hypothesis: large accuracy
  gain on numerics-heavy tables at the cost of more interaction tokens — quantify the F² blowup.
- **H2 (interaction cost at scale):** Benchmark the pairwise-dot-product interaction at F = 40, 70,
  120 fields; find where it stops being negligible and whether a low-rank / DCN-V2-style cross or
  attention is cheaper at the user's field count.
- **H3 (high-cardinality without giant tables):** Swap dedicated per-id tables for **hashing /
  RQ-VAE semantic-ID codebooks** (TIGER) on the categorical fields and measure accuracy vs memory —
  test whether the production memory story can be cut without losing the field-token recipe.
- **H4 (temporal fusion):** Add a temporal channel (TFT/PatchTST token) as one more field token into
  the dot-product interaction, testing DLRM's "everything is a field token" framing for static+temporal
  fusion.

## Key claims a skeptic should check

1. **(mechanism)** DLRM tokenizes at *field* granularity — one `d`-dim token per categorical field
   and one MLP-projected token for the *entire* dense block — then interacts pairs by dot product
   (FM-style), not by an MLP over concatenations.
2. **(transfer)** The reusable kernel is "shared-`d` field-token space + explicit pairwise dot-product
   interaction + model-parallel embedding sharding"; the dense-collapse and O(F²) interaction are the
   parts that do *not* transfer cleanly to 70+ individually-tokenized features.
3. **(evidence)** The accuracy advantage over DCN rests on a single one-epoch, untuned,
   no-regularization run reported only as a curve with no AUC/logloss — a soft claim.
4. **(mechanism)** "Scales" in DLRM = web-scale data + GB embedding tables (handled by model+data
   parallelism and all-to-all), NOT scaling the count of interacting feature tokens.
5. **(transfer)** DLRM never solves raw high-cardinality encoding: Criteo ids are pre-integerized, so
   its high-cardinality story is "big table per field," with no hashing/codebook/OOV mechanism.
