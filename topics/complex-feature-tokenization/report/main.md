# Complex Feature Tokenization for Deep Tabular Models — Synthesis Brief

> Synthesis pass: cycle 7 (synthesis_every_n_cycles = 7). Evidence base: 18 deep-read works
> across all 8 execution routes, 124-node / 172-edge knowledge graph, 6 research cycles.
> End goal (confirmed): **build/train a tokenizer for the user's own deep tabular model over
> 70+ heterogeneous features** (mixed numerical + high-cardinality categorical, partly
> time-varying + partly static). Every nontrivial claim cites the JSON record that supports it.

---

## executive-summary

The literature converges on a clear backbone for the user's setting, but **no single recorded
work demonstrates a genuine 70+-heterogeneous-feature tokenizer with high-cardinality categorical
INPUTS AND time-varying signals together** — this structural gap has persisted across all six
research cycles and is the single most important finding for an implementer. What the corpus does
give is a set of well-validated, composable *components*, each strong in its own regime, that can
be assembled into a recipe.

The defensible default is a **per-feature token scaffold** (FT-Transformer's `Tj = bj + fj(xj)`)
[Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
with three upgrades the scaffold itself lacks:

1. **Numerical leg → PLR / periodic embeddings**, not raw scalars. Proper per-feature numerical
   embeddings close most of the deep-learning-vs-GBDT gap and help any backbone (MLP/ResNet/Transformer)
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
2. **High-cardinality categorical leg → vocabulary-free, OOV-robust encoding** (MinHash n-gram
   signatures / entity embeddings), because plain lookup tables, target encoding, and one-hot each
   fail in a distinct way
   [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json].
3. **Interaction / scaling leg → an attention or cross operator that does NOT cost O(k²) in feature
   count**, plus per-feature gating to discard noise — because the two costs that bite at 70+ features
   (per-feature parameter blow-up and quadratic attention) are exactly what the canonical scaffolds
   do not solve
   [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].

Two paradigms compete with the build-it-yourself path. **Tabular foundation models** (TabPFN v2,
TabICL v1/v2) can ingest raw mixed features with zero feature engineering and now win on real
benchmarks — but only on the ≤500-feature, small-to-medium regime, and only as an *inference-time
extrapolation* above their ≤100-feature pretraining ceiling
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
**LLM text-serialization** (TabLLM) is a cautionary anchor: a hard ~1024-token budget caps it at
≤30 readable columns, so it does not scale to the user's feature count
[Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].

Bottom line for the implementer: the components exist and are individually validated; **the
unsolved engineering work is composing them at 70+-feature width and proving it under a fair,
tuned, ensembled benchmark** — none of which has been done in the recorded corpus.

---

## problem-framing

The user's problem sits in a regime that the strongest tabular benchmarks explicitly exclude. The
canonical "trees still beat deep learning" study removes (a) categorical features with >20 distinct
values, (b) all missing data, and (c) all temporal/stream data — i.e. exactly the three things the
user's feature set is full of — and itself lists high-cardinality handling, missing data, and the
large-data regime as open questions it does not answer
[Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json].
So "GBDT wins" is the *motivation*, not a verdict on the user's setting.

That study is still the best evidence base for **why tokenization design matters at all**. Its three
inductive-bias findings translate directly into tokenizer requirements:

- **Deep models over-smooth and fail on irregular target functions.** This is why a richer numerical
  embedding (periodic / high-frequency capacity) helps
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **MLP-style learners are fragile to uninformative features** (sample complexity grows at least
  linearly in the number of irrelevant features). At 70+ features many of which are noise, this argues
  for explicit per-feature selection/gating, not "attend to everything"
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
- **Data are not rotation-invariant, so learners should not be.** Random feature-space rotations
  *reverse* the tree-vs-NN ranking. This is the deep argument for keeping tokens **per-feature** —
  never collapse the feature set into one rotation-mixed vector before the model can isolate features
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json].

The two costs that define the engineering problem at the user's scale, flagged from cycle 1 onward:

- **Per-feature parameter blow-up.** Non-shared per-feature embeddings multiply parameter count by
  feature count (up to ~250×–2000× for the embedding modules in the numerical-embeddings paper); at
  70+ features this is a real budget concern
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **O(k²) attention in feature count.** One token per feature plus vanilla self-attention is quadratic
  in feature count; FT-Transformer's authors explicitly state the model "may not be easily scaled" to
  large feature counts
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].

---

## numerical-feature-tokenization

**Strongest, most directly applicable route.** The canonical recipe is per-feature scalar→vector
embedding modules, with two primitives that beat raw scalars: **PLE** (Piecewise Linear Encoding —
a continuous, ordinal generalization of one-hot over feature bins, from quantiles or a per-feature
target-fit decision tree) and **Periodic** embeddings (`concat[sin(2πcx), cos(2πcx)]` with learnable
frequencies c). The best single recipe overall is **PLR = ReLU ∘ Linear ∘ Periodic**
[Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].

Key findings an implementer should rely on:

- Proper numerical embeddings **close most of the DL-vs-GBDT gap** and are **backbone-agnostic** —
  MLP-PLR beats XGBoost and rivals CatBoost in the recorded benchmark, so you do not need a Transformer
  to benefit
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- The FT-Transformer numerical branch (`xj · Wj + bj`) is **just a single affine map** — do NOT credit
  it with PLR-strength encoding; this is the single most common conflation in the area. Upgrade the
  numerical branch
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].
- SAINT's "enhanced" continuous embedding is just a per-feature single-ReLU layer — richer than affine,
  much cheaper than PLR, but not piecewise-linear/periodic; a reasonable cheap fallback
  [Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json].

**Pitfalls for the user's setting:**

- **Target-aware bin leakage.** PLEt fits bins on a decision tree over the TRAIN labels; if bins are
  refit on the full set or per-fold leakage is not controlled, you leak the target. Build tree/quantile
  bins strictly out-of-fold
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **One shared functional form across heterogeneous features may be suboptimal** (a single shared σ /
  bin scheme) — the paper flags this, and it is precisely the user's regime (70+ features with very
  different distributions)
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Periodic gains are DL-specific** (they do not transfer to GBDT) and **σ is a sensitive
  hyperparameter** — budget for tuning
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- Per-feature embeddings are the dominant source of the parameter blow-up above; PLE (quantile/tree
  bins) is the cheaper, interpretable alternative when compute or width matters
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].

---

## categorical-and-high-cardinality

This is the **second pillar and the user's hardest leg**. Three encoding families are recorded, and
the critical insight is that they fail in *complementary* ways — there is no single default.

- **Learned per-field entity embeddings** (the 2016 historical anchor): one lookup table per column,
  tunable per-field dimension `D_i << cardinality`, trained end-to-end. Canonical primitive that every
  later tabular transformer inherits. But: table size grows linearly with cardinality, **no OOV/cold-start
  bucket**, and feeding *supervised-trained* embeddings into a second model is close to **learned target
  encoding (leakage-prone)**. Tested on only 7 features — "scales to many high-cardinality features" is
  asserted, never demonstrated
  [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json].
- **MinHash n-gram encoding** (the vocabulary-free primitive, added cycle 6): represent a string as its
  set of character n-grams, hash with d independent functions, keep per-function minima → a fixed-width
  (d≈30) signature whose collision rate equals the Jaccard similarity of the n-gram sets. **Stateless,
  no fitted vocabulary, native OOV, label-free** — degrades gracefully on dirty/typo'd categories. The
  companion **Gamma-Poisson** factorization gives interpretable latent substring-topics (but it *does*
  fit, online). Productionized in skrub/dirty_cat
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].
- **Target encoding** is recorded only as a baseline and a hazard — it leaks the label without strict
  out-of-fold construction (proposal anti-pattern), and CARTE/MinHash beat it on dirty high-cardinality
  columns
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].

**Two alternative paradigms** sidestep per-field tables entirely:

- **Open-vocabulary column-name-as-relation** (CARTE): LM-embed each column NAME (FastText) and fuse it
  with the cell value; a token is a `(colname-vector, value)` pair, so cardinality never inflates
  parameters and unseen categories still get a meaningful vector. Strongest on string-heavy/high-cardinality
  tables, robust to missing values, no entity matching needed
  [Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json].
- **RQ-VAE hierarchical codes** (TIGER, scope-stripped): turn an extreme-cardinality entity into a short
  ordered tuple of discrete codes from a small shared codebook (e.g. 3 levels × 256), so similar entities
  share prefixes and rare entities inherit a code from content rather than an OOV bucket — bounds vocabulary
  with graceful cold-start. Only the RQ-VAE kernel transfers; the recsys machinery is out of scope
  [Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json].

**Critical pitfall for a Transformer tokenizer:** MinHash output is **not a metric space** — coordinate
magnitudes are arbitrary hash minima, only collision-rate ≈ Jaccard is meaningful. It works well fed to
trees (which split on inequalities) but **needs a learned projection before attention/distance use**. Do
not assume the tree result transfers to a deep tokenizer unchanged
[Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].

---

## temporal-static-fusion

The user's feature set is "partly time-varying + partly static," and this is the route with the
**weakest topic-native grounding**: every temporal anchor either ignores static/categorical fusion or
operates on all-numeric "variates," not genuine mixed-type heterogeneity.

- **TFT supplies the only real static-fusion mechanism.** It splits inputs three ways
  (static / observed-past / known-future) with separate encoders, embeds every feature to one `d_model`
  token (entity embeddings for categorical, linear for continuous), and applies a **Variable Selection
  Network** — instance-wise softmax gating + per-feature GRN — that down-weights noisy features and yields
  per-feature importance for free; four static context vectors initialize the LSTM and enrich attention.
  This is the canonical template for unifying time-varying + static heterogeneous features
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
- **PatchTST contributes patching** — aggregate consecutive timesteps of a feature into a fixed window,
  project to one token; gives local temporal semantics and collapses a long time axis to ~L/S tokens.
  Plus a masked-patch self-supervised pretext. **Borrow patching; do NOT borrow channel-independence** —
  it deliberately removes the cross-feature interaction the mixed setting needs
  [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json].
- **iTransformer contributes the unification blueprint**: variate-as-token + ONE joint self-attention over
  all feature tokens (explicit cross-feature interaction, the opposite of PatchTST), with per-token LayerNorm
  to reconcile heterogeneous scales and random variate-subsampling to tame O(N²). SOTA precisely when many
  correlated features coexist (Traffic N=862, PEMS 883) — concrete many-feature evidence
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].

**Pitfalls — read these before trusting any "handles many features" claim here:**

- **Entities ≠ features.** TFT's 370/440 are entity/series counts, not feature counts; its rich-feature
  dataset (Retail) has ~a dozen inputs, not 70+. The VSN is a *mechanism*, untested at the user's width;
  per-feature GRNs + per-feature embeddings make params grow linearly in feature count
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
- **iTransformer's "variates" are all numeric.** Per-token LayerNorm reconciling scale is NOT mixed-type
  fusion; the "generalizes to unseen variates" trick relies on shared weights across homogeneous-role
  numeric features and will not transfer to a held-out categorical feature
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
- Every temporal anchor uses a **weak per-value numerical encoder** (raw-linear TFT, single-linear PatchTST
  patch projection, flat-MLP-over-T iTransformer) — pair them with PLR/periodic if numeric richness matters
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
- **TabArena excludes temporal data by design**, so the project's best fair benchmark cannot validate the
  temporal-static-fusion layer at all
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].

---

## scaling-and-interaction

This is where the topic's central engineering question lives: at 70+ features, how do you add interaction
capacity without paying O(k²) attention or per-feature parameter blow-up? Three operators are recorded.

- **AutoInt field-shared self-attention.** One set of Q/K/V/Res matrices is reused across all field
  tokens, so **attention parameters are independent of feature count** — widening to 70+ fields adds zero
  attention params. Interaction order grows with depth; a residual path guarantees first-order features
  survive. **But compute is O(M²)** in feature count (full M×M attention); the efficiency story rests on
  M≤39 in the paper. This is the binding compute constraint at the user's width
  [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json].
- **DCN-V2 Hadamard cross.** `x_{l+1} = x0 ⊙ (W_l x_l + b_l) + x_l` produces all crosses up to order L+1;
  cost scales with the **flattened embedding dimension d, not with field count M** — no O(M²) attention.
  This is the most field-count-scalable explicit-interaction primitive in the corpus. Catch: d = #fields ×
  embedding_dim can itself be large (70 fields × 32-dim ⇒ d≈2240 ⇒ ~5M-param dense cross per layer), so
  **low-rank / Mixture-of-low-rank-Experts (DCN-Mix) is effectively mandatory at width** — do not read
  "O(d²)" as cheap. The headline AUC win is only ~+0.0015 and a tuned plain DNN nearly matches it, so the
  explicit-cross benefit is modest once a strong MLP is present
  [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json].
- **VSN soft gating** (from TFT) is the selection counterpart: explicitly allocate capacity away from the
  many uninformative features the framing section warns about, with free per-feature importance
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].

**The most reusable scaling primitive found to date** comes from the foundation-model route: TabICL's
**shared distribution-aware column embedder + column-collapse-to-row-token**. A single Set-Transformer
acts as a hypernetwork emitting per-cell affine `(W,B)` — **zero per-feature parameters** — and a row is
collapsed to one token via [CLS], so the expensive sample-axis attention is paid once (O(m²n + n²)) instead
of on the full cell grid. This directly attacks BOTH the per-feature-param-blow-up AND the quadratic-attention
pitfalls. RoPE over the feature axis de-collapses identically-distributed features
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json].

**SAINT's intersample (row) attention** is a genuinely distinct second axis — a learned soft-kNN over the
batch, strong on wide + label-scarce + noisy/missing tables — but it does **not** solve feature-count
scaling: it reshapes a row to (n·d) dims so its projection matrices are (n·d)×(n·d), **quadratic in feature
count**; the paper cut embedding dim to 4–12 on wide datasets to fit one GPU, masking the cost. It also makes
predictions **batch-composition-dependent** (a serving hazard). Borrow the idea only with an efficient/low-rank
row-attention variant
[Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json].

---

## architectures-and-foundation-models

**Per-feature transformer scaffolds.** FT-Transformer is the minimal mixed-type scaffold every later
tokenizer extends: unified per-feature affine token, [CLS] readout, vanilla pre-norm Transformer; the
per-feature additive bias is empirically necessary
[Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].
SAINT adds two-axis attention (feature + intersample) and a CutMix+mixup contrastive pretraining recipe
[Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json].

**Foundation / pretrained models** are the most active route (4 paradigms) and the strongest alternative
to building from scratch — with a hard scope caveat:

- **TabPFN v2** — per-cell tokens + two-way (feature-axis + sample-axis) alternating attention, pretrained
  on ~130M synthetic structural-causal-model datasets; ingests raw mixed numerical/categorical/**missing**
  cells with zero feature engineering and matches tuned GBDTs in one forward pass. **But it is a small-data
  model: recommended ≤~10k samples / ≤~500 features**, and the edge erodes as data grows. Predictions depend
  on which test rows are batched together (serving gotcha)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json].
- **TabICL v1** — shared distribution-aware column embedder + column-collapse-to-row-token + RoPE; O(m²n + n²)
  (drops a factor of m vs TabPFN v2), surpasses both TabPFN v2 and CatBoost on the 53 >10k-sample datasets,
  code + weights released. The shared-embedder recipe is the most reusable 70+-feature primitive in the corpus
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json].
- **TabICL v2** (2026, open SOTA, confidence medium) — repeated-feature-grouping (token = 3 columns) +
  **target-aware embedding** (inject the label additively into context-row feature embeddings) + column-then-row
  attention; surpasses tuned RealTabPFN-2.5 without tuning; 1M samples / 500 features in ~450s. Cost still
  quadratic in feature count (n·m²)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json].
- **CARTE** — open-vocabulary LM-on-column-names graphlet, real-knowledge (YAGO) contrastive prior; best on
  string-heavy tables, transfers across renamed schemas with no matching. Validated only ≤2048 rows / ~15
  columns, weak numerical encoder
  [Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json].

**Fair-evaluation context.** TabArena (51 curated IID datasets, 16 models, leakage-audited, ~15 wall-clock-years
of compute) is the project's yardstick. Its verdicts: under tuning + post-hoc ensembling the best deep nets equal
the best GBDTs; **foundation-model wins exist ONLY on the ≤500-feature, ≤10k-sample subsets** (no evidence above
500 features); and validation-set overfitting is a first-class failure mode. Temporal data is excluded
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].

**LLM serialization** (TabLLM) is recorded but demoted for this topic: serialize a row to text, tokenize with
the LLM's subword tokenizer, classify via verbalizer probability. Strong in the very-few-shot regime, but the
**~1024-token budget caps it at ≤30 readable columns** (the 106-feature case needed lossy concept-selection),
numerics are raw digit strings, and its strongest baseline is TabPFN, not a tree. Reusable nugget only:
column-name-as-semantics + the permuted-names/only-values ablation protocol
[Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].

---

## recommended-approaches

The user wants to **build/train a tokenizer for 70+ heterogeneous features**. Below are concrete,
implementable recipes ranked by readiness, each tied to the recorded pitfalls. None has been validated
end-to-end at the user's full regime in the corpus — that gap is stated explicitly.

### Recipe A — Default build (highest readiness, recommended starting point)

A per-feature token scaffold with type-appropriate legs and a field-count-scalable interaction operator.

- **Scaffold:** FT-Transformer `Tj = bj + fj(xj)`, one token per feature, [CLS] readout, per-feature bias kept
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].
- **Numerical leg:** PLR (Periodic+Linear+ReLU) per feature; switch to quantile-PLE where compute/width or
  preprocessing-robustness matters. Build any target-aware bins **strictly out-of-fold** to avoid leakage
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Categorical leg:** entity embeddings for low/medium-cardinality columns (tunable `D_i`, add an explicit OOV
  bucket — the 2016 primitive has none); for dirty / high-cardinality string columns use **MinHash followed by
  a small learned linear projection into the token space** (MinHash coords are not metric — the projection is
  mandatory before attention)
  [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].
- **Interaction / scaling:** because vanilla O(k²) attention is the binding constraint at 70+ features
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json],
  prefer **1–2 DCN-V2 low-rank/Mixture cross layers** between the tokenizer and an MLP head (cost in embedding
  dim d, not field count M; low-rank is mandatory at width)
  [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json];
  OR keep **AutoInt field-shared attention** (zero added attention params with feature count) but add efficient/
  sparse attention to defuse O(M²)
  [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json].
- **Feature selection:** add a **VSN-style instance-wise softmax gate** to allocate capacity away from
  uninformative features (deep models are super-linearly hurt by noise features) and get per-feature importance free
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json].

Cost levers: PLE instead of PLR for the numerical leg; low-rank cross instead of full; variate/feature subsampling
per batch for the attention term
[Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].

### Recipe B — Temporal-static fusion (for the time-varying half)

Layer onto Recipe A using the variate-as-token blueprint: encode each **static/categorical feature** with its
Recipe-A leg, encode each **time-varying feature** with a **PatchTST patch token** (borrow patching, drop
channel-independence), then run **ONE joint self-attention over the mixed token set** (iTransformer-style explicit
cross-feature interaction). Use the **TFT three-way split (static / observed-past / known-future) + static context
vectors + VSN gating** as the fusion scaffold, and per-token LayerNorm/RevIN to reconcile heterogeneous scales
[Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
[Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]
[Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
Caveat: this fusion is assembled from mechanisms each validated only below the user's width or on all-numeric
variates — it is the most uncertified recipe and the corpus's biggest gap.

### Recipe C — Shared zero-per-feature-param embedder (best scaling primitive, more research)

For the largest feature counts, lift TabICL's **shared distribution-aware column embedder** (one Set-Transformer
hypernetwork emitting per-cell `(W,B)`, zero per-feature params) into a **supervised** tokenizer, add RoPE over the
feature axis, and optionally TabICL v2's **target-aware embedding** for label conditioning. This is the cleanest
attack on both per-feature-param-blow-up and quadratic cost — but it is currently demonstrated only in the
in-context (frozen, labeled-context-at-inference) setting; adapting TAE and the shared embedder to non-ICL
supervised training is open work
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json].

### Recipe D — Buy, don't build (strong baseline to beat)

Before committing to a from-scratch tokenizer, **run a frozen foundation model (TabPFN v2 or TabICL v2) as a
baseline** — it ingests raw mixed/missing features with zero engineering and may already win if the user's data
sits in its regime (≤~500 features, small-to-medium samples). Treat the from-scratch tokenizer as justified only
where it beats this baseline — which, per TabArena, is the **wide-table (>500 feature) and temporal regimes where
foundation models have NO validated evidence**
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].

### Evaluation discipline (applies to all recipes)

- Compare under **tuned + post-hoc-ensembled, nested-CV** conditions — single-config or holdout comparisons
  systematically understate strong tokenizers and overstate models that ensemble internally; report stratified by
  feature-count and sample-count; treat validation-set overfitting as a first-class failure
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
- Prove the tokenizer genuinely uses feature names and fine-grained values with the **permuted-names / only-values
  ablation** protocol
  [Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].

---

## open-problems-and-contradictions

**The central structural gap (unresolved across 6 cycles).** No recorded work demonstrates a genuine
70+-heterogeneous-feature tokenizer with high-cardinality categorical INPUTS AND time-varying signals together.
SAINT's row attention does not scale in feature count; MinHash solves only the high-cardinality string leg (and only
up to a learned projection); TabICL/TabPFN are pretrained ≤100 features; TabLLM tops out ≤30 columns; TabArena
excludes temporal data and caps foundation-model validation at ≤500 features
[Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json]
[Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].

**Explicit contradictions surfaced (not averaged away):**

1. **Learned numeric embeddings vs. TabLLM raw-digit numerics.** The numerical-embeddings work shows rich
   per-feature embeddings (PLR/periodic) are what closes the DL-vs-GBDT gap; TabLLM serializes numerics as raw digit
   strings and its authors concede this is the weak point (a recorded `contradicts` edge). For a *built* tokenizer,
   the evidence favors learned embeddings; raw-digit serialization is viable only in the very-few-shot LLM regime
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].
2. **Deep tabular vs. GBDT-still-wins.** The "trees still win" verdict holds at medium (~10k) data and *excludes*
   high-cardinality/missing/temporal features; FT-Transformer and SAINT report DL beating GBDT on their own
   benchmarks; TabArena shows DL *catches up* only under tuning + ensembling. The honest reading: benchmark-dependent,
   and the user's high-cardinality/temporal regime was never tested by the "trees win" study
   [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
3. **Joint cross-feature attention vs. channel-independence.** iTransformer wins with joint attention exactly when
   many correlated features coexist; PatchTST wins by *removing* cross-channel mixing for homogeneous numeric
   channels. For mixed heterogeneous features, joint attention is the right default — but the win is regime-specific,
   not universal (they tie on low-dimensional ETT)
   [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json].

**Other open problems specific to the user's build:**

- **MinHash-into-transformer projection** is unsolved (codes are not a metric space)
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].
- **Foundation-model feature-count ceilings**: every "scales to 500 features" number is an inference-time
  extrapolation above a ≤100-feature pretraining regime, leaning on RoPE/grouping
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json].
- **Target-aware tricks (TAE, PLEt)** require either labeled context at inference or strict out-of-fold bin
  construction — neither is a drop-in for a plain supervised tokenizer without leakage care
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **The matched-compute scaling comparison** the records keep pointing at — DCN-V2 cross vs AutoInt attention vs
  TabPFN feature-axis attention vs VSN vs variate-as-token, all on the SAME per-feature(+PLR) tokenizer at 70+
  fields measuring accuracy AND wall-clock — has not been run and is the topic's central unresolved engineering
  question
  [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json].

**Lower-confidence records to treat with caution:** TabPFN v2 (Nature source auth-gated, headline numbers secondhand),
TabICL v2 (2026 preprint, pretraining code unreleased, gains bake in 8-shuffle ensembling), TIGER (recsys-only
evidence, silent on tabular prediction)
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json].

---

## reading-guide

Read in this order for the build; full annotated list in `reference_index.md`.

1. **Numerical leg (start here):**
   on-embeddings-numerical-features.json, then ft-transformer-revisiting-tabular-dl.json
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].
2. **Categorical / high-cardinality:**
   encoding-high-cardinality-string-categoricals.json, entity-embeddings-categorical-variables.json,
   carte-pretraining-transfer-tabular.json
   [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json].
3. **Temporal-static fusion:**
   temporal-fusion-transformer.json, patchtst-time-series-64-words.json, itransformer-inverted-transformers.json
   [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
4. **Scaling / interaction:**
   dcn-v2-deep-cross-network.json, autoint-feature-interaction.json, saint-row-attention-contrastive.json
   [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json].
5. **Foundation-model alternatives + the yardstick:**
   tabicl-in-context-large-data.json, tabpfn-v2.json, tabicl-v2-scalable-foundation-model.json,
   tabarena-living-benchmark.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
6. **Open problems / cautionary:**
   tree-models-outperform-deep-tabular.json, tabllm-few-shot-llm-serialization.json, tiger-rqvae-semantic-ids.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json].
