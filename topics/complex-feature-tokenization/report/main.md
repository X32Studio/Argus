# Complex Feature Tokenization for Deep Tabular Models — Synthesis Brief

> Synthesis pass: cycle 21 (THIRD synthesis; REFRESH of the cycle-14 brief; synthesis_every_n_cycles = 7).
> Evidence base: **54 deep-read works** across all 12 execution routes (4 routes added at the cycle-14 SCOPE
> EXPANSION: timeseries-foundation-models, recsys-tokenization-transfer, industrial-feature-systems,
> libraries-and-implementations), 335-node / 571-edge knowledge graph (post technique-dedup), 20 research
> cycles. End goal (unchanged): **build/train a tokenizer for the user's own deep tabular model over 70+
> heterogeneous features** (mixed numerical + high-cardinality categorical, partly time-varying + partly
> static). Every nontrivial claim cites the JSON record that supports it.
>
> **What changed vs cycle 14 (36 → 54 works):** the default recommendation is **confirmed, not overturned** —
> 18 new works mostly *triangulate* the cycle-14 default (PLR + parameter-efficient MLP ensemble on time-based
> splits) from four new literatures rather than changing it. The substantive additions are: (1) a recurring
> **cross-domain convergence** — "one fixed-width token per field in a shared d-dim space" now appears
> independently in tabular DL, time-series foundation models, production recsys (DLRM), and the flagship
> library (pytorch-frame); (2) two **runnable** scaffolds to ground the build (pytorch-frame, rtdl); (3) the
> foundation-model feature ceiling moved decisively *past* 70 features (TabPFN-2.5 validated to 2,000;
> TabPFN-Wide to 30k–70k in HDLSS; LimiX open-weights to <10k); (4) the closest single work to the user's full
> setting (**TabFormer**, a temporal-static skeleton) and a concrete **temporal-static fusion mechanism at the
> token level** (FiLM modulation). The headline gap (70+ features + high-cardinality categorical INPUTS +
> genuine per-row temporal) is **further narrowed but still not closed by any single work.**

---

## executive-summary

The corpus has roughly doubled (36 → 54 works) by deliberately broadening into four adjacent literatures, and
the dominant finding of that expansion is **convergence, not contradiction**. Across tabular deep learning,
time-series foundation models, production recommender systems, and the reference libraries, the same primitive
recurs independently: **collapse each heterogeneous field to ONE fixed-width-`d` token in a shared embedding
space, then let the model interact those tokens.** DLRM gives each of 26 categorical fields one learned
`d`-token and MLP-projects the dense block into one more, all dot-product-compatible
[Ref: topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json];
pytorch-frame compiles any DataFrame into a `[B, num_cols, d]` sequence via a per-stype encoder registry, one
token per column
[Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json];
Moirai flattens an unbounded set of variates into one sequence with a parameter-free same/different-field
attention bias
[Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json];
TabFormer turns every field (numeric or categorical) into a per-field-vocabulary token
[Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json];
and rtdl is the maintained reference implementation of exactly this per-feature tokenizer
[Ref: topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json]. **Implication
for the user's design: the per-feature-token abstraction is not a tabular-DL fashion — it is the cross-field
consensus interface, so a build that emits one `d`-token per field and keeps numeric/categorical/temporal
encoders swappable behind it is on the safest possible footing.**

**The cycle-14 default survives the expansion unchanged.** The regime-matched verdict still stands: on
**TabReD** (eight real industrial tables, median **261 features**, **time-based splits**), the winning learned
tokenization is **per-numerical-feature PLR/periodic embeddings fed to a parameter-efficient MLP ensemble
(TabM)** — published ranks MLP-PLR-ensemble 2.4, GBDTs 2.9–3.4, MLP-PLR 3.8, **FT-Transformer only 4.8** (a
measured O(features²) cost), retrieval (TabR 6.0) and DCN-V2 (7.6) failing to transfer
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]. None of
the 18 new works dislodges this; several reinforce it. **RealMLP** independently shows a flat-concat MLP with a
per-feature embedding/preprocessing bag-of-tricks matching CatBoost and beating FT-Transformer/SAINT at linear
cost
[Ref: topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json], and
**Feature-aware Modulation** reports the first deep method to consistently beat GBDTs under temporal shift —
and its winning backbone is **TabM**, not a transformer
[Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].

**The new substance is on the two halves the user must still build.** (a) Temporal-static fusion gained two
concrete mechanisms: **TabFormer** (per-field quantization + a field-transformer that compresses a wide row to
one embedding BEFORE a sequence-transformer runs over rows) is the closest single work to the user's mixed
time-varying + static setting
[Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json];
**FiLM-style time-conditioned per-feature modulation** is a cheap drop-in that aligns each numeric feature's
distribution across time
[Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
(b) The high-cardinality leg gained three bounded-memory primitives from recsys/industrial practice —
quotient-remainder compositional embeddings (O(√|S|) memory), hash embeddings (collision-repair), and
RQ-Kmeans (training-free codebooks that fix RQ-VAE collapse) — plus the production target-encoding leakage
discipline
[Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json]
[Ref: topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json]
[Ref: topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json]
[Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json].

**The "buy, don't build" baseline got materially stronger.** Three new foundation models push the feature
ceiling decisively past 70: **TabPFN-2.5** is validated to 50k rows × 2,000 features (4× v2) via feature-cell
grouping
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json], **TabPFN-Wide**
reaches 30k–70k features via prior-engineering (but only in the HDLSS / few-rows regime)
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json], and
**LimiX** is an Apache-2.0 open-weights model validated to <10k features whose DFE low-rank column-identity
code is a directly reusable wide-table primitive
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]. **So
the foundation-model ceiling is no longer the gap it was at cycle 14 — but all three remain static-table,
small/medium-sample, no-temporal, no-true-high-cardinality models.**

**Bottom line for the implementer (unchanged default, sharpened recipe):** build a **pytorch-frame /
rtdl-grounded per-feature tokenizer — PLR numerical leg, OOV-robust high-cardinality categorical leg —
flat-concatenated into a TabM-style parameter-efficient MLP ensemble, validated on time-based splits**, and for
the temporal half use **FiLM modulation (cheap) or a TabFormer-style row-compression skeleton (structural)**.
First run a frozen TabPFN-2.5 / LimiX as the baseline to beat. The genuinely unsolved engineering work is the
**joint** composition of the high-cardinality leg and a true per-row-temporal leg at 70+ width — which no
single work in the now-54-strong corpus validates.

---

## problem-framing

The user's problem still sits in the regime the canonical "trees still beat deep learning" study explicitly
excludes — it removes (a) categorical features with >20 distinct values, (b) all missing data, and (c) all
temporal/stream data, i.e. exactly the three things the user's feature set is full of, and lists
high-cardinality handling, missing data, and the large-data regime as its own open questions
[Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]. So "GBDT
wins" remains *motivation*, not a verdict on the user's setting. Its three inductive-bias findings still
translate into tokenizer requirements, two now empirically confirmed at width:

- **Deep models over-smooth on irregular targets** → richer per-feature numerical embeddings (periodic /
  high-frequency capacity) help; TabReD confirms PLR keeps this benefit on wide drifting tables
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **MLP learners are super-linearly fragile to uninformative features** → at 70+ features many of which are
  noise, prefer explicit per-feature selection/gating over "attend to everything"
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json].
- **Data are not rotation-invariant, so learners should not be** → keep tokens **per-feature**; never collapse
  the feature set into one rotation-mixed vector before the model can isolate features. The cross-domain
  convergence below is the strongest evidence yet that the field agrees
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json].

The two costs that define the engineering problem at the user's scale, both still backed by direct evidence:

- **Per-feature parameter blow-up.** Non-shared per-feature embeddings multiply parameter count by feature
  count; the cure is to keep the embeddings but feed a **linear-cost backbone** (flat-concat MLP) rather than
  letting per-feature attention compound the cost
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]. The
  expansion adds three *parameter-decoupled* answers to the categorical half specifically: QR (O(√|S|)),
  hash embeddings (B·d + K·k), and the DFE / shared-cell-encoder family (no per-column table at all)
  [Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json].
- **O(features²) attention.** FT-Transformer's authors flagged it; TabReD measures it (runner-up at width)
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]. The new
  routes confirm the cure is feature-axis compression: TabFormer compresses a wide row to one token before the
  temporal model
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json];
  TabPFN-2.5 groups feature-cells (groups of 3) to take its validated ceiling 500→2,000
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json].

**Methodological requirement (TabReD, reaffirmed).** Any tokenizer claim for the user's setting MUST be
validated under **time-based (out-of-time) splits**: random splits inflate rankings (XGBoost partly exploits
time-leakage) and flip model ordering
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]. The expansion
adds a second leakage axis: **target-aware categorical encoding must be built strictly out-of-fold AND
time-respecting** — random OOF folds still leak future into past on transaction/session data
[Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json].

---

## numerical-feature-tokenization

**Still the strongest, most directly applicable, most empirically validated route at width — and now with a
runnable home.** The canonical recipe is per-feature scalar→vector embedding with two primitives that beat raw
scalars: **PLE** (Piecewise Linear Encoding) and **Periodic** embeddings, composed as **PLR = ReLU ∘ Linear ∘
Periodic**
[Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]. PLR
transfers to the user's regime (TabReD #1 = MLP-PLR ensemble)
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json], and
PLE-into-flat-MLP-ensemble is the current SOTA backbone (TabM)
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].

What the expansion adds:

- **A runnable numerical leg (rtdl).** `rtdl_num_embeddings` (MIT) ships drop-in PyTorch `LinearEmbeddings`,
  `PeriodicEmbeddings`, `PiecewiseLinearEncoding/Embeddings`, and the composite **PLR**, with `compute_bins`
  supporting both quantile (unsupervised) and target-aware tree bins; `rtdl_revisiting_models` (Apache-2.0)
  ships the FT-Transformer tokenizer. This is the cleanest runnable starting point for the continuous half —
  but the old monolithic `rtdl` PyPI package is **deprecated**; use the two split packages
  [Ref: topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json].
  pytorch-frame bundles the same encoders (`LinearEncoder`, `LinearBucketEncoder`, `LinearPeriodicEncoder`)
  behind its stype registry
  [Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json].
- **Three contrasting time-series numeric tokenizers (the temporal-half candidates).** The
  timeseries-foundation-models route maps three families for tokenizing a value/series: **Chronos**
  scale-then-uniform-quantize into a fixed ~4094-bin vocabulary + cross-entropy ("regression via
  classification"), zero architecture change but distance-unaware and fixed [-15,+15] range that overflows on
  spikes
  [Ref: topics/complex-feature-tokenization/records/works_json/chronos-time-series-tokenization.json];
  **TimesFM** continuous patch-as-token (RevIN-scale, MLP-embed a 32-point patch, MSE loss — ordinality
  preserved)
  [Ref: topics/complex-feature-tokenization/records/works_json/timesfm-patch-decoder-foundation.json]; and
  **TOTEM** a learned frozen VQ-VAE codebook (K=256/D=64) over RevIN-normalized windows, with a direct
  tokens-beat-patches ablation
  [Ref: topics/complex-feature-tokenization/records/works_json/totem-tokenized-time-series-embeddings.json].
  All three are **univariate-only** with no categorical/static fusion — reusable for the homogeneous numeric
  half only.
- **A magnitude-aware token alternative for LM/transformer pipelines (TP-BERTa RMT)** remains the cleanest way
  to give an LM a magnitude-aware numerical channel (+12.45% AUC over raw-digit), with label-guided bins
  (leakage risk, build out-of-fold) and ≤32-feature pretraining
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json]; **AutoDis**
  the parameter-bounded soft-codebook fallback
  [Ref: topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json].

**Pitfalls (reinforced and extended):**

- **Quantization discards numerical order.** TabFormer and Chronos both turn a continuous value into an
  unordered bin token, which is now known to be weaker than PLE/PLR; borrow the per-field-vocabulary *interface*
  but pair bins with order-aware embeddings
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/chronos-time-series-tokenization.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **FiLM modulation conflicts with PLR.** Time-conditioned Yeo-Johnson modulation and PLR both reshape the
  numeric input distribution; full-stage modulation is **incompatible** with PLR (PLR's sin/cos maps to an
  arcsine distribution that breaks the mean/std/skew assumption), so they do not stack
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Dense-block collapse loses per-numerical resolution (DLRM).** MLP-projecting all dense features into ONE
  token forbids per-numerical interaction — the opposite of per-feature numerical tokenization; do not copy it
  for a numerics-heavy table
  [Ref: topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json].
- **Target-aware bin leakage** (PLEt, AutoDis-τ-tuning, RMT/C4.5) and **affine-only weak legs** (FT-T, Trompt,
  ExcelFormer, TabFormer quantization) remain the two most common conflations; the obvious upgrade slot is PLR
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].

---

## categorical-and-high-cardinality

This is still **the user's hardest leg and the corpus's least-validated-at-width pillar** — TabReD does not
isolate high-cardinality categorical performance
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json] — but the
expansion turned a thin pillar into a rich menu of *bounded-memory, OOV-robust* primitives that fail in
complementary ways. There is still no single default; the choice depends on whether category strings are
human-readable and whether you can afford a target.

The pre-existing legs (entity embeddings — no OOV bucket, leakage if transferred
[Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json];
TabTransformer column-identifier-by-concatenation + per-column MISSING row
[Ref: topics/complex-feature-tokenization/records/works_json/tabtransformer-contextual-categorical-embeddings.json];
MinHash vocabulary-free string n-grams — **not a metric space, needs a learned projection before attention**
[Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json];
CARTE column-name-as-relation; sub-word value embedding) are now joined by **four production/recsys primitives**:

- **Quotient-remainder compositional embeddings (Meta DLRM).** Replace one |S|-row table with complementary-partition
  tables combined by elementwise-mult, guaranteeing a unique embedding per category at O(k·|S|^{1/k}·d) instead
  of O(|S|·d) (two partitions → O(√|S|)). Production-deployed; trains end-to-end; stores NO explicit codes.
  **Caveat: it is memory compression only — it never improves accuracy over a full table, ignores frequency,
  and the uniqueness theorem is proved only for concatenation (not mult/add)**
  [Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json].
- **Hash embeddings.** k independent hashes into a shared pool of B vectors + a learnable per-token importance
  vector that repairs the rare-but-important-collision failure of the plain hashing trick; +k params per new
  value vs +d. **Caveat: only pays off above a cardinality threshold (~10·B); below that it just adds collision
  risk**
  [Ref: topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json].
- **RQ-Kmeans hierarchical codes.** Build each residual-quantization layer's codebook by k-means on the previous
  layer's residuals (training-free) instead of gradient-learned RQ-VAE codebooks — empirically near-perfect
  codebook utilization, **directly fixing the codebook-collapse risk flagged in the TIGER/RQ-VAE record**. Maps
  an extreme-cardinality entity to a short ordered code tuple with graceful OOV. **Caveat: the quantizer sees
  one pre-fused embedding, never raw features; utilization ≠ downstream accuracy; recsys-only evidence;
  confidence medium**
  [Ref: topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json].
- **Production target / OOF / CatBoost-ordered encoding.** Collapse any-cardinality ID column to a fixed handful
  of target-aware scalar columns with empirical-Bayes smoothing toward a global prior; the durable lesson is the
  **leakage-control discipline** (compute every target-derived feature from data the row never saw; ordered TS
  for time data). **Caveat: scalars are tuned for GBDT inequality splits — the tree win does NOT automatically
  transfer to an attention/MLP tokenizer; supervised-only**
  [Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json].

**Cross-domain convergence on the high-cardinality answer.** Three independent communities converged on the
same move: *replace a per-value embedding TABLE with a bounded shared codebook/pool plus a unique composition
key.* QR uses fixed modular partitions, hash embeddings use random hashes + learned importance, RQ-Kmeans/TIGER
use learned hierarchical residual codes, and the foundation models (LimiX DFE, TabICL shared embedder) drop the
per-column table entirely. **Implication: for the user's few genuinely high-cardinality columns, the safe
default is "bounded shared codebook + unique key," not a giant lookup table — and pytorch-frame's documented
escape hatch (re-type a high-cardinality string as `text_embedded`/`embedding` and let an external encoder
produce a fixed vector) is the runnable version of this**
[Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json]
[Ref: topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json]
[Ref: topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json]
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json].

---

## temporal-static-fusion

The user's set is "partly time-varying + partly static." This was the **weakest topic-native ground** at cycle
14; the expansion materially strengthens it with two concrete token-level mechanisms — though neither is
validated at the user's full width.

**First, the disambiguation TabReD forces (unchanged).** Two distinct "temporal" problems: **snapshot-with-drift**
(rows are flat vectors ordered by timestamp; time is the *split axis*) — here the lesson is evaluation
discipline + drift robustness, and the embeddings+ensemble default already wins; vs **per-row time-varying
signals** (a feature is itself a series). If the user's time-varying features are point-in-time snapshots that
merely drift, the simpler snapshot+time-split treatment applies
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**For genuine per-row series, the mechanism menu is now:**

- **TabFormer — the closest single work to the user's full setting (NEW, structural).** Per-field quantization
  to a local vocabulary unifies numeric AND categorical fields under one token interface; a **field-transformer
  compresses a wide row's N field-tokens to ONE row embedding** (intra-row/cross-field attention), then a
  **sequence-transformer** runs over the row sequence. This **row-compression-before-temporal** pattern decouples
  the feature-count axis from the time axis (the temporal model sees rows, not cells) — exactly the
  temporal-static-fusion skeleton the topic needs. **Caveats: plain quantization discards numerical order
  (upgrade with PLR/AutoDis); validated only at 11–12 fields vs raw-feature baselines (no GBDT/FT-T bar); no
  high-cardinality bounding; no dedicated static pathway (static attributes must repeat per row)**
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json].
- **Feature-aware FiLM modulation — token-level temporal-static fusion (NEW, cheap).** A FiLM-style
  hypernetwork consumes a shared temporal embedding ψ(t) (Fourier priors over year/month/day/hour + trend) and
  emits **per-feature** γ/β/λ that drive a time-conditioned Yeo-Johnson power transform + affine on each numeric
  feature, aligning its mean/std/skew across time *before* tokenization. The temporal modality is **decoupled**
  from the input modality (ψ(t) drives the modulator but is not concatenated), which avoids the
  dimension-scaling degradation of concatenating temporal embeddings. On TabReD (15 seeds) TabM+modulation
  reaches best avg rank 3.50, the first deep method to consistently beat GBDTs under temporal shift. **Caveats:
  numeric-only (no categorical/high-cardinality benefit); incompatible with full PLR; thin absolute margins; the
  big +2.09% gain is on a weak MLP backbone and mostly vanishes on TabM/MLP-PLR**
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
- **TimeXer — linear-cost exogenous fusion (carried).** Role-asymmetric tokenization: fine patch tokens for the
  target, ONE coarse variate token per context feature, fused through a single global bridge token (1×C
  cross-attention) so cost is LINEAR in context-feature count; tolerates misaligned/missing/different-frequency
  features without timestamp alignment. **Caveats: the single global token bottlenecks on richly-interacting
  features (loses to iTransformer on 862-variate Traffic); no categorical/static pathway**
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].
- **TFT / PatchTST / iTransformer / Moirai (carried + extended).** TFT supplies the only real static-fusion
  scaffold (three-way split, VSN gating, static context vectors)
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]; PatchTST
  contributes patching (drop channel-independence)
  [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]; iTransformer
  the variate-as-token + joint attention blueprint for richly-interacting features
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json]; and
  **Moirai's Any-variate Attention** adds a parameter-free, *unbounded* same/different-field bias + RoPE — a
  reusable way to tell a transformer which of 70+ heterogeneous fields a token came from with **zero per-feature
  parameters** (but its cost is quadratic in variates×length, and variates are numeric-series only)
  [Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json].

**Pitfalls — read before trusting any "handles mixed types over time" claim here:**

- **Every TS mechanism here is numeric/series-only.** TimeXer, TabFormer's quantization, Chronos, TimesFM,
  TOTEM, iTransformer variates, Moirai variates — none has a genuine categorical/static-attribute pathway; that
  must be designed separately, and FiLM modulation only touches numerics
  [Ref: topics/complex-feature-tokenization/records/works_json/totem-tokenized-time-series-embeddings.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
- **TabFormer's hierarchy is validated only at ~12 fields / 10-row windows** — the scaling story is
  architectural, not empirical, and its high-cardinality story is absent
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json].
- **No fair benchmark validates a genuine per-row temporal-static tokenizer at width.** TabArena excludes
  temporal data; TabReD's "temporal" is split-axis-only; pytorch-frame's timestamp stype is calendar-feature
  encoding, NOT patch/forecast tokenization
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json].

---

## scaling-and-interaction

At 70+ features, how do you add interaction/selection capacity without paying O(features²) attention or
per-feature parameter blow-up? **The TabReD verdict still reframes this section: on wide drifting tables the
plain linear-cost backbone (MLP/MLP-PLR + ensembling) beats explicit-interaction operators** — DCN-V2 ranked 7.6
and Trompt 5.4, no better than plain MLP — so establish the embeddings+ensemble baseline FIRST and add
interaction only if it beats that baseline on a time-based split
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]. The expansion
adds a third, independent witness — **RealMLP**, a flat-concat MLP with a per-feature embedding/preprocessing
bag-of-tricks (robust-scale + smooth-clip, optional periodic embeddings, learnable per-feature diagonal scaling)
and a meta-tuned default recipe, matching CatBoost and beating FT-Transformer/SAINT at linear cost with no
per-dataset HPO. **Caveat: it models no explicit feature interaction (diagonal scaling is per-feature reweighting
only), uses a fixed 8-dim high-cardinality embedding, and its "many features" is mostly one-hot-expanded width —
treat it as a scalable backbone baseline like TabM, not an interaction method**
[Ref: topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json].

**Linear-cost backbone options (cost linear in feature count, no O(features²) attention):**

- **Flat-concat MLP ensemble (TabM)** — per-feature PLE embeddings into a k=32 BatchEnsemble-style ensemble,
  demonstrated to 986 features, current #1 tabular DL model
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
- **Parameter-efficient ensembling primitives (BatchEnsemble, MIMO)** — rank-one fast-weights / multi-input-output
  multiplexing, **tokenizer-agnostic**, near-free accuracy/calibration boost on any tokenizer; the FiLM record
  confirms ensembling-by-TabM is the strongest temporal-shift backbone
  [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
- **TabNet sparsemax selection gate** (O(features) front-end) and **TabR instance-axis retrieval**
  (feature-count-invariant but underperforms on TabReD, retrieval-leakage hazard) remain as before
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabr-retrieval-tabular.json].

**Zero-per-feature-param scaling primitives (the field-identity convergence).** The cleanest way to scale to
many features without a per-feature parameter table is a **shared cell/column embedder + a cheap field-identity
signal**, and four independent works now converge on it: **TabICL's** shared Set-Transformer column embedder +
column-collapse-to-row-token + RoPE
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]; **Moirai's**
parameter-free binary same/different-field attention bias for an unbounded variate count
[Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json];
**LimiX's** low-rank (rank p/4) additive Discriminative Feature Encoding column-identity code
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]; and
**TabPFN-2.5's** feature-cell grouping that compresses the feature axis ~1.5× to clear 2,000 features
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json]. **Implication:
if the user wants attention over 70+ features, inject column identity by a cheap additive/biased code (DFE /
any-variate bias / RoPE), NOT a per-feature positional table — the per-feature-table is the part that does not
scale.**

If you DO want explicit interaction or attention, the sub-quadratic / one-token-per-feature operators are
unchanged in verdict: AMFormer prompt-token queries (measured linear-in-N at 2000 features) + multiplicative
stream
[Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json];
TimeXer global bridge token / TP-BERTa IFA (one token per feature)
[Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json]; AutoInt
field-shared attention (O(M²) compute); DCN-V2 Hadamard cross (optional — failed to transfer on TabReD); T2G
learned sparse graph (a prior, not a FLOP saving)
[Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json]
[Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
[Ref: topics/complex-feature-tokenization/records/works_json/t2g-former-graph-tabular.json]. **DLRM's** explicit
pairwise dot-product interaction is the production analogue but is O(F²) in fields and collapses all dense
features into one token — "scales to large models" is about web-scale DATA + huge embedding TABLES (solved by
sharding), NOT many interacting feature TOKENS
[Ref: topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json].
**TabFlex's** non-causal linear attention scales the **sample axis** (millions of rows), orthogonal to the
70+-feature axis, but contributes the useful negative result that **causal sequence models (Mamba/SSM) are
systematically worse for tabular ICL** — keep attention non-causal/order-invariant
[Ref: topics/complex-feature-tokenization/records/works_json/tabflex-scaling-tabpfn-linear-attention.json].

---

## architectures-and-foundation-models

**Per-feature transformer scaffolds and the accuracy leader are unchanged in verdict.** FT-Transformer is the
minimal mixed-type scaffold; its *attention* is demoted to runner-up at width (TabReD); the current accuracy
leader is **not** an attention model but TabM (flat-concat PLE embeddings + MLP ensemble)
[Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]. RealMLP
independently reinforces that a linear-cost MLP matches attention tokenizers
[Ref: topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json].

**The "buy, don't build" baseline is materially stronger and the feature ceiling has moved past 70.** At cycle
14 the foundation-model objection was "pretrained ≤100 features, validated ≤500." The expansion changes that:

- **TabPFN-2.5 (NEW)** — per-cell two-way attention scaled up; **feature-cell grouping (groups of 3)** + deeper
  stack push the **validated** ceiling to **50k rows × 2,000 features** (4× v2). Best DEFAULT model on TabArena,
  matching/beating AutoGluon-1.4 in one forward pass; Real-TabPFN-2.5 (fine-tuned on 43 real datasets) widens
  the lead. **First foundation model comfortably covering 70+ features on small/medium tables.** Caveats: 100%
  win is vs DEFAULT XGBoost (the strong claim is 87% / AutoGluon match); proprietary distillation engine;
  non-commercial license; no temporal/high-cardinality path; confidence medium (vendor report)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json].
- **TabPFN-Wide (NEW)** — does NOT change the tokenizer; **continued pre-training on a synthetic feature-widening
  prior** pushes TabPFNv2's ceiling to **30k–70k features** while keeping a strict 1:1 token-to-feature map (it
  *disables* cell-grouping, the opposite of TabPFN-2.5 — a recorded design tension). **The directly transferable
  lever is prior-engineering to extend a feature ceiling cheaply, with no architecture change.** Caveats: validated
  ONLY in the HDLSS (high-dim, *low* sample) regime with high feature correlation (omics/SNP), classifier-only,
  high-cardinality deliberately bounded out — direct transfer to a many-row mixed temporal+static business table
  is unproven
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json].
- **LimiX (NEW)** — Apache-2.0 **open-weights** per-cell two-way model; **DFE low-rank additive column-identity
  code** + Context-Conditional Masked Modeling lets ONE model do prediction + imputation + generation with
  native missingness. Top-ranked across 11 benchmarks vs TabPFN-v2/TabICL/AutoGluon/XGBoost; validated envelope
  ≤50k rows, <10k features (70+ fits). **DFE is the single most reusable wide-table tokenizer primitive of the
  expansion.** Caveats: self-reported preprint, author-run baselines (~0.01–0.03 AUC gaps; mean-rank gaps more
  convincing), benchmarks overlap TabPFN's; the dispatch claim of beating TabPFN-2.5 is anachronistic (it
  benchmarks TabPFN-v2/TabICL only); confidence medium
  [Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json].
- **TabFlex (NEW)** — non-causal linear attention makes cost linear in **samples**, not features; feature handling
  inherited from TabPFN (random-projects d>1000). Reusable as an efficient-attention backbone + the
  causal-is-worse lesson, but contributes no feature tokenizer
  [Ref: topics/complex-feature-tokenization/records/works_json/tabflex-scaling-tabpfn-linear-attention.json].

The carried foundation/transfer models are unchanged: TabPFN v2 (small-data, secondhand numbers)
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]; TabICL v1/v2 (shared column
embedder, the most reusable scaling primitive)
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]; CARTE
(LM-on-column-names)
[Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json]; XTab
(transfers backbone, not tokenizer)
[Ref: topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json]; UniTabE (per-cell
key-value, tested at 80–85 columns, textualized numerics)
[Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json]; TP-BERTa
(category semantics transfer, ≤32 features)
[Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

**Fair-evaluation yardsticks unchanged:** TabArena (51 IID datasets, temporal excluded, foundation-model wins only
on ≤500-feature / ≤10k-sample subsets)
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json] and TabReD (8
industrial tables, median 261 features, time-based splits — the regime-matched harness)
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**Runnable scaffolds (NEW route — the build-goal anchors).** Two libraries ground the build: **pytorch-frame**
(stype → swappable per-stype encoder → concatenate into `[B, num_cols, d]`, the broadest first-class stype
coverage — numerical/categorical/multicategorical/text/embedding/timestamp, NaN as index-0; the recommended
high-cardinality path is to re-type a string column as `text_embedded`)
[Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json]; and **rtdl**
(the canonical maintained FT-Transformer + PLE/Periodic/PLR reference; Linformer kv-compression as its one
scaling knob)
[Ref: topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json]. **Both are
engineering infrastructure, not new methods** — their bundled tokenizers are prior work re-implemented — but they
are the cleanest runnable substrate for the recipes below.

---

## recommended-approaches

The user wants to **build/train a tokenizer for 70+ heterogeneous features.** The broadened evidence **does NOT
change the cycle-14 default** — it confirms it from four new literatures and grounds it in runnable libraries.
Each recipe component is now mapped to a runnable library where one exists. Every recipe is tied to recorded
pitfalls; none is validated end-to-end at the user's *full* (high-cardinality + true-temporal) regime — stated
explicitly.

### Recipe A — Default build: per-feature embeddings + parameter-efficient ensemble (highest readiness; unchanged default)

Strongest regime-matched evidence (TabReD #1 = MLP-PLR ensemble; TabM #1 overall; RealMLP and FiLM-on-TabM
corroborate).

- **Numerical leg → `rtdl_num_embeddings` (MIT).** Use **PLR** per feature (proven on wide drifting tables);
  switch to **PLE (quantile)** where compute/robustness matters; AutoDis soft-codebook as a parameter-bounded
  fallback. Build any target-aware bins **strictly out-of-fold**
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json].
- **Categorical leg → pytorch-frame stypes.** Entity embeddings for low/medium cardinality (add an explicit OOV
  bucket); for the few genuinely high-cardinality columns use a **bounded shared codebook + unique key** —
  **QR/compositional** (O(√|S|) memory) or **hash embeddings** (collision-repair) for ID-like fields, **MinHash
  + a learned projection** for dirty strings, **sub-word value embedding** where names are human-readable, or
  pytorch-frame's `text_embedded` escape hatch. If a target is available and folds are time-respecting,
  **OOF/ordered target encoding** is the cheapest production option
  [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json].
- **Backbone → TabM-style parameter-efficient MLP ensemble.** Flat-concatenate the per-feature embeddings into a
  k≈32 BatchEnsemble-adapter MLP ensemble (LINEAR in feature count, avoids O(features²) attention). Ensembling is
  a near-free accuracy/calibration boost on any tokenizer; RealMLP is the runnable single-model sibling
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json].
- **Feature selection (optional):** VSN-style instance-wise softmax gate or TabNet sparsemax mask (both
  O(features)) to allocate capacity away from uninformative features
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json].

### Recipe A′ — Add per-feature attention ONLY if it beats Recipe A

Keep the FT-Transformer scaffold (rtdl) but make attention sub-quadratic and inject column identity by a **cheap
additive/biased code** (LimiX DFE / Moirai any-variate bias / RoPE), NOT a per-feature positional table; adopt
only if it beats Recipe A on a time-based split. Linear-in-N attention via AMFormer prompt-token queries or a
TimeXer-style bridge token; optionally an AMFormer multiplicative stream or 1–2 DCN-V2 low-rank cross layers
(both optional — DCN-V2 *failed to transfer* on TabReD)
[Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json]
[Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json]
[Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

### Recipe B — Temporal-static fusion (for genuine per-row time-varying features) — NOW WITH AN EXPLICIT RECIPE

First decide which "temporal" the user has: if features are **snapshots that merely drift**, use Recipe A + time-based
splits, no temporal tokenizer needed. If features are **genuine series**, choose by budget/structure:

- **Cheapest (drift-alignment): FiLM modulation.** Add a single raw-input **time-conditioned per-feature
  Yeo-Johnson + affine modulation** driven by a shared temporal embedding ψ(t), on top of Recipe A's TabM
  backbone — the configuration with the strongest temporal-shift evidence (best TabReD avg rank 3.50). Use the
  **single raw-input** variant with PLR/TabM (full modulation conflicts with PLR); expect the gain to be modest
  on a strong backbone
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
- **Structural (true sequences): TabFormer-style row-compression skeleton.** Encode each field with a
  Recipe-A type-appropriate encoder (PLR numeric, bounded categorical) into one token; run a **field-transformer
  to compress the wide row to ONE row embedding**; run a **sequence-transformer over the row sequence**. This
  keeps the temporal model's sequence length = number of rows, not rows×fields — the cleanest sequence-length
  control for wide mixed tables. Replace TabFormer's plain quantization with PLR/AutoDis and add a
  high-cardinality leg before use
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Exogenous many-context fusion: TimeXer.** Fine patch tokens for the target, one coarse variate token per
  context feature, fused through a global bridge token (1×C cross-attention) — linear in context-feature count,
  tolerant of misaligned/missing/different-frequency features. Use iTransformer-style **joint** attention instead
  if many of the 70+ features mutually interact; borrow Moirai's any-variate bias for unbounded field identity;
  RevIN/per-token LayerNorm for heterogeneous scales
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json].
- **Numeric-series token choice:** patch-as-token (TimesFM/PatchTST, ordinality-preserving) for the time-varying
  numeric channels, or a learned VQ codebook (TOTEM) if a compact shared vocabulary is wanted; Chronos value-bins
  only if regression-via-classification + a flexible predictive distribution is desired (watch the fixed-range
  overflow)
  [Ref: topics/complex-feature-tokenization/records/works_json/timesfm-patch-decoder-foundation.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/totem-tokenized-time-series-embeddings.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/chronos-time-series-tokenization.json].

**Caveat:** Recipe B is still the most uncertified recipe — assembled from mechanisms validated only below the
user's width, numeric-only, with the categorical/static-over-time pathway being the part the user must build and
no benchmark validating the joint result
[Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json]
[Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].

### Recipe C — Shared zero-per-feature-param embedder (best scaling primitive; more research)

For the largest feature counts, lift a **shared cell/column embedder + a cheap field-identity code** into a
**supervised** tokenizer: TabICL's Set-Transformer column embedder + RoPE, OR **LimiX's DFE low-rank additive
column-identity code** (Apache-2.0, the most reusable new primitive), with masked joint-distribution
pretraining if imputation/generation are also wanted. UniTabE's per-cell key-value scheme (tested at 80–85
columns) is the schema-agnostic alternative. All attack param-blow-up and quadratic cost, but are demonstrated
in frozen/in-context or textualized-numeric settings; adapting to non-ICL supervised training with a
magnitude-aware numeric leg is open work
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].

### Recipe D — Buy, don't build (now a much stronger baseline to beat)

Before committing to a from-scratch tokenizer, **run a frozen foundation model as the baseline.** Unlike cycle
14, the feature ceiling now clears 70 comfortably: **TabPFN-2.5** (validated 2,000 features; best DEFAULT on
TabArena) or **LimiX** (Apache-2.0 open weights, <10k features, also does imputation/generation) — zero feature
engineering, may already win if data sits in the small/medium-sample regime. **TabPFN-Wide** is the option for
extreme-width HDLSS (omics-style) data. The from-scratch tokenizer is justified mainly where it beats this
baseline — the **genuine-temporal and many-rows regimes where foundation models have no validated evidence**, and
where embeddings + ensembling already win
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

### Evaluation discipline (applies to all recipes)

- **Validate on time-based (out-of-time) splits, not random splits**; use TabReD's 8 public feature-rich
  time-split datasets as a ready harness
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- Build every target-derived categorical feature **out-of-fold AND time-respecting** (random OOF still leaks the
  future on session data; CatBoost ordered TS is the principled fix)
  [Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json].
- Compare under tuned + post-hoc-ensembled, nested-CV conditions, stratified by feature-count and sample-count
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
- Prove the tokenizer genuinely uses feature names and fine-grained values with the **permuted-names /
  only-values ablation**
  [Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].

---

## open-problems-and-contradictions

**The central structural gap — FURTHER NARROWED, still NOT closed.** No single work jointly validates a genuine
**70+ heterogeneous-feature tokenizer with high-cardinality categorical INPUTS AND per-row temporal signals
together.** Re-evaluated against the gap-relevant additions:

- **TabPFN-Wide — covers width, NOT the user's regime.** It reaches 30k–70k features, but only in the **HDLSS**
  regime (tens-to-hundreds of rows, high feature correlation, omics/SNP), classifier-only, with high-cardinality
  **deliberately bounded out** of its widening prior. So it covers the *count* axis impressively but neither
  high-cardinality inputs nor per-row temporal nor the many-rows business-table setting — it does NOT cover the
  70+/wide regime *as the user means it*
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json].
- **TabFormer — covers the temporal-static *skeleton*, NOT width or high-cardinality.** It is the closest single
  work to the user's full setting (mixed numeric+categorical fields over time, row-compression-then-temporal),
  but validated at 11–12 fields against raw-feature baselines only, with no high-cardinality bounding and a weak
  (order-discarding) numeric encoder
  [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json].
- **FiLM modulation — covers token-level temporal-static fusion for NUMERICS only.** A concrete, TabReD-validated
  mechanism for aligning numeric features across time, but no categorical/high-cardinality pathway and incompatible
  with the PLR numeric leg the default rests on
  [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].

**Net: how much of the gap is now covered?** Width is solved on snapshots (TabReD verdict; TabPFN-2.5/LimiX
ceilings) and impressively on HDLSS (TabPFN-Wide); temporal-static fusion has two concrete mechanisms (FiLM,
TabFormer) and a fusion scaffold (TimeXer/TFT); high-cardinality has a rich bounded-memory primitive menu. **What
remains genuinely unaddressed by any single work:** the *joint* tokenization of (a) high-cardinality categorical
INPUTS, (b) genuine per-row temporal sequences, at (c) 70+ width, on (d) a many-row table under a time-based
split — the user's exact setting. Every work covers at most three of those four, and never (a)+(b)+(c) together
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json].

**Explicit contradictions (surfaced, not averaged; which the new evidence resolves):**

1. **Per-feature attention vs flat-concat MLP ensemble at width — RESOLVED, and reinforced by the expansion.**
   TabReD + TabM established the linear-cost ensemble wins; RealMLP and FiLM-on-TabM now independently confirm a
   flat MLP backbone is the right default at width and under drift
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
2. **Quantize-the-value vs embed-the-value for numerics — the expansion sharpens the verdict toward embeddings.**
   Chronos (uniform bins + CE) and TabFormer (per-field bins) are distance-unaware and discard order; TimesFM
   (continuous patch + MSE) and TOTEM (learned VQ, tokens-beat-patches) preserve more; PLE/PLR/RMT beat raw bins
   on tabular. For a built tokenizer, prefer order-aware embeddings; reserve value-binning for the
   regression-via-classification / flexible-distribution case
   [Ref: topics/complex-feature-tokenization/records/works_json/chronos-time-series-tokenization.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/timesfm-patch-decoder-foundation.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/totem-tokenized-time-series-embeddings.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
3. **Feature-axis grouping vs 1:1 token-per-feature — a NEW open tension.** TabPFN-2.5 GROUPS feature-cells (3
   per group) to scale; TabPFN-Wide DISABLES grouping to keep a strict 1:1 map (for interpretability + extreme
   width). The two scaling philosophies are not jointly tested — unresolved
   [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json].
4. **Explicit interaction help vs do-not-transfer — PARTIALLY RESOLVED** (DCN-V2/Trompt no better than plain MLP
   on TabReD; DLRM's pairwise dot product is O(F²) and its accuracy edge is a single untuned run)
   [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
5. **Retrieval beats GBDT vs fails under drift — LEFT OPEN** (TabReD authors' multicollinearity/temporal-shift
   hypothesis, not a proven mechanism)
   [Ref: topics/complex-feature-tokenization/records/works_json/tabr-retrieval-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**Other open problems specific to the user's build:**

- **High-cardinality at width is still unvalidated as INPUT.** The bounded-memory primitives (QR, hash, RQ-Kmeans,
  target encoding) are each validated in their home turf (CTR/recsys/GBDT), none in a deep 70+-feature tokenizer;
  RQ-Kmeans/QR never see raw features; target-encoded scalars are GBDT-tuned and may not transfer to a deep
  tokenizer
  [Ref: topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json].
- **The matched-compute scaling comparison the records keep pointing at remains unrun** (now with more contenders):
  on a genuine 70+-feature high-cardinality TabReD/TabArena task under a time-based split, disentangle (a)
  PLR+ensemble, (b) one-token-per-feature + linear attention, (c) shared-embedder + DFE/any-variate column code,
  (d) instance-axis retrieval — reporting AUC AND params/latency
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json].

**Lower-confidence records to treat with caution:** TabPFN v2 (auth-gated Nature, secondhand), TabPFN-2.5 / LimiX
(vendor / self-reported preprints, author-run baselines, medium confidence), TabICL v2 (unreleased pretraining
code), TIGER / RQ-Kmeans (recsys-only; RQ-Kmeans ablation cells not re-confirmed, medium confidence), AMFormer
("necessity" on synthetic monomials)
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json]
[Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json].

---

## reading-guide

Read in this order for the build; full annotated list in `reference_index.md`.

1. **Regime-matched evidence (start here — this is the default):** tabred-benchmark-in-the-wild.json, then
   tabm-parameter-efficient-ensembling.json, then realmlp-better-by-default-tabular-mlp.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
2. **Runnable scaffolds (ground the build):** pytorch-frame-stype-library.json, rtdl-research-tabular-dl-library.json
   [Ref: topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json].
3. **Numerical leg:** on-embeddings-numerical-features.json, ft-transformer-revisiting-tabular-dl.json,
   tp-berta-lm-tabular-prediction.json (RMT), autodis-numerical-discretization.json
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
4. **Categorical / high-cardinality:** encoding-high-cardinality-string-categoricals.json,
   high-cardinality-categorical-encoding-kaggle-writeup.json, compositional-embeddings-quotient-remainder.json,
   hash-embeddings-efficient-word-representations.json, rqkmeans-semantic-ids-generative-retrieval.json,
   entity-embeddings-categorical-variables.json
   [Ref: topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json].
5. **Temporal-static fusion:** tabformer-tabular-transformers-multivariate-time-series.json,
   feature-aware-modulation-temporal-tabular.json, timexer-exogenous-endogenous-fusion.json,
   temporal-fusion-transformer.json, then the TS-numeric tokenizers (timesfm/totem/chronos/moirai)
   [Ref: topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json].
6. **Scaling / interaction / ensembling:** batchensemble-efficient-ensembles.json,
   mimo-independent-subnetworks-robust-prediction.json, amformer-arithmetic-feature-interaction.json,
   moirai-unified-universal-forecasting.json (any-variate bias), dcn-v2-deep-cross-network.json,
   autoint-feature-interaction.json, tabnet-attentive-interpretable-tabular.json, tabr-retrieval-tabular.json
   [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json].
7. **Foundation-model baselines + yardsticks:** tabpfn-2-5-foundation-model.json, limix-large-tabular-foundation-model.json,
   tabpfn-wide-extreme-feature-counts.json, tabicl-in-context-large-data.json, tabflex-scaling-tabpfn-linear-attention.json,
   tabarena-living-benchmark.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json].
8. **Open problems / cautionary:** tree-models-outperform-deep-tabular.json, dlrm-criteo-ctr-feature-encoding.json,
   t2g-former-graph-tabular.json, trompt-prompt-tabular.json, excelformer-semi-permeable-attention.json,
   tabllm-few-shot-llm-serialization.json, lift-language-interfaced-finetuning.json, great-generative-tabular-llm.json,
   tiger-rqvae-semantic-ids.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json].
</content>
