# Complex Feature Tokenization for Deep Tabular Models — Synthesis Brief

> Synthesis pass: cycle 14 (REFRESH of the cycle-7 brief; synthesis_every_n_cycles = 7). Evidence base:
> **36 deep-read works** across all 8 execution routes, 227-node / 373-edge knowledge graph, 13 research
> cycles. End goal (confirmed): **build/train a tokenizer for the user's own deep tabular model over
> 70+ heterogeneous features** (mixed numerical + high-cardinality categorical, partly time-varying +
> partly static). Every nontrivial claim cites the JSON record that supports it.
>
> **What changed vs cycle 7 (18 → 36 works):** the headline default *shifted*. Cycle 7 recommended a
> per-feature **attention** scaffold (FT-Transformer + PLR) as the default. The new regime-matched
> evidence — **TabReD**, the only public benchmark with wide (median-261-feature) industrial tables on
> **time-based splits** — demotes per-feature attention to runner-up (it pays an *empirically confirmed*
> O(features²) cost) and elevates **per-numerical-feature PLR embeddings fed to a parameter-efficient
> MLP ensemble (TabM)** to the proven default at the user's width and drift. Ensembling (TabM / MIMO /
> BatchEnsemble) is now a first-class lever, not a footnote. TimeXer adds a concrete linear-cost
> temporal-static fusion recipe. TP-BERTa adds a magnitude-aware numerical channel and name+value
> fusion. The cycle-7 structural gap is **narrowed but not closed** (see open-problems).

---

## executive-summary

The corpus now contains regime-matched evidence for the user's exact setting, and it **changes the
default recommendation**. The single most important new finding: on **TabReD** — eight real industrial
tables, median **261 features** (up to 1026), evaluated under **time-based train/val/test splits** that
reflect gradual drift — the winning learned-tokenization regime is **per-numerical-feature PLR/periodic
embeddings fed to a scalable backbone, with ensembling**, not a per-feature-attention transformer. The
published average ranks (lower=better) are MLP-PLR-ensemble 2.4, then the GBDTs (XGBoost 2.9 / LightGBM
3.1 / CatBoost 3.4), then MLP-PLR 3.8, with **FT-Transformer only 4.8 (runner-up, and slower because its
self-attention is quadratic in feature count)**, and retrieval (TabR 6.0) and DCN-V2 (7.6) failing to
transfer
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

This converts two cycle-7 claims from *asserted* to *evidenced*: (1) per-feature self-attention's
O(features²) cost is a real liability at the user's width, not a theoretical worry; (2) per-numerical-feature
embeddings are the one learned-tokenization idea that demonstrably keeps its benefit on wide, drifting
tables. The companion **ensembling line** supplies the concrete linear-cost backbone: **TabM** (flat-concat
of per-feature PLE embeddings into a k=32 parameter-efficient MLP ensemble) is the current #1-ranked tabular
DL model on a 46-dataset shared-protocol benchmark, scales linearly in feature count (demonstrated to 986
features), and beats attention models (FT-T, SAINT, T2G, ExcelFormer) — its accuracy gain decomposes into PLE
embeddings (Gorishniy 2022) + BatchEnsemble-style ensembling (MIMO/BatchEnsemble lineage)
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
[Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
[Ref: topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json].

The defensible default for the user is therefore now: **per-feature PLR/periodic numerical embeddings +
OOV-robust high-cardinality categorical encoding, flat-concatenated into a parameter-efficient MLP ensemble
(TabM-style), validated on time-based splits** — with per-feature *attention* (FT-Transformer scaffold +
a sub-quadratic interaction operator) kept as a strong alternative *only if* interaction modeling proves to
matter after the embeddings+ensemble baseline is in place. Three independent works converge on the lever that
makes attention affordable at width when you do want it — **collapse each feature to one token and keep
attention linear in feature count**: TimeXer's role-asymmetric global-bridge token (linear in context-feature
count), AMFormer's prompt-token queries (measured linear-in-N at 2000 features), and TP-BERTa's
Intra-Feature-Attention (name+value → one token, sequence length = feature count)
[Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
[Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

The two competing paradigms are unchanged in verdict but better bounded. **Tabular foundation models**
(TabPFN v2, TabICL v1/v2) remain the strongest "buy, don't build" baseline but are pretrained ≤100 features
and validated ≤500 features / small-to-medium samples — above which they extrapolate
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
**LLM text-serialization** is now triangulated by three records (TabLLM ≤30 columns, LIFT regression-collapse
at p≥50, GReaT ≤47-feature evidence) and is a cautionary anchor, not a recipe — though TP-BERTa shows an LM
*can* be given a magnitude-aware numerical channel
[Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json]
[Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json]
[Ref: topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json].

Bottom line for the implementer: the **default is now embeddings+ensembling, validated under time-based
splits** — and the remaining unsolved engineering work is composing a high-cardinality-categorical leg and a
genuine temporal-per-row-sequence leg at 70+-feature width (TabReD proves the wide *snapshot-with-drift*
regime but tests neither high-cardinality categoricals nor per-row temporal sequences).

---

## problem-framing

The user's problem still sits in a regime that the canonical "trees still beat deep learning" study
explicitly excludes — it removes (a) categorical features with >20 distinct values, (b) all missing data,
and (c) all temporal/stream data, i.e. exactly the three things the user's feature set is full of, and lists
high-cardinality handling, missing data, and the large-data regime as its own open questions
[Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json].
So "GBDT wins" remains *motivation*, not a verdict on the user's setting.

Its three inductive-bias findings translate directly into tokenizer requirements, and the new evidence now
*confirms* two of them empirically:

- **Deep models over-smooth on irregular targets** → richer per-feature numerical embeddings (periodic /
  high-frequency capacity) help; TabReD confirms PLR embeddings keep this benefit on wide drifting tables
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **MLP-style learners are super-linearly fragile to uninformative features.** At 70+ features many of which
  are noise, this argues for explicit per-feature selection/gating, not "attend to everything"
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].
- **Data are not rotation-invariant, so learners should not be.** Keep tokens **per-feature** — never collapse
  the feature set into one rotation-mixed vector before the model can isolate features. (ExcelFormer's
  "interaction-attenuated initialization" starts the model near a rotationally-variant MLP precisely to respect
  this.)
  [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].

The two costs that define the engineering problem at the user's scale — both now backed by direct evidence:

- **Per-feature parameter blow-up.** Non-shared per-feature embeddings multiply parameter count by feature
  count (~250×–2000× for the embedding modules); the cure used in practice is to keep the embeddings but feed
  a **linear-cost backbone** (flat-concat MLP) rather than letting per-feature attention compound the cost
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
- **O(features²) attention.** FT-Transformer's authors flagged it as "may not be easily scaled"; **TabReD now
  measures it** — FT-Transformer is slower on its wide (median-261) tables and ranks only runner-up
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**New methodological requirement (TabReD).** Any tokenizer claim for the user's setting MUST be validated under
**time-based (out-of-time) splits**, not random splits: random splits give optimistic, sometimes
time-leakage-inflated rankings, and the model ordering genuinely flips (XGBoost's margin over MLPs shrinks
under time-based splits, suggesting it exploited leakage on random splits)
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

---

## numerical-feature-tokenization

**Still the strongest, most directly applicable route — and now the most empirically validated at width.**
The canonical recipe is per-feature scalar→vector embedding with two primitives that beat raw scalars: **PLE**
(Piecewise Linear Encoding, from quantiles or a per-feature target-fit tree) and **Periodic** embeddings
(`concat[sin(2πcx), cos(2πcx)]`, learnable frequencies). The best single recipe is **PLR = ReLU ∘ Linear ∘
Periodic**
[Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].

What the new evidence adds:

- **PLR transfers to the user's regime (TabReD).** Per-numerical-feature PLR embeddings are the one learned
  tokenization that demonstrably keeps its benefit on wide (median-261), temporally-drifting industrial tables —
  MLP-PLR (and especially MLP-PLR ensemble) rank at/above the GBDTs. If the user picks ONE tokenization upgrade,
  this is it
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **PLE-into-flat-MLP-ensemble is the current SOTA backbone (TabM).** TabM's flagship variant (TabM-mini-dagger)
  flat-concatenates per-feature PLE embeddings into a k=32 parameter-efficient MLP ensemble and ranks #1 on a
  46-dataset shared protocol, ahead of all attention tabular transformers. Its gain decomposes: PLE embeddings
  (+~0.77% rel. over plain TabM) on top of ensembling (+~2.15%). You do NOT need a Transformer to cash in the
  embeddings
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
- **A learned-soft-discretization alternative (AutoDis).** Turn a scalar into a soft-weighted mixture over a tiny
  per-field codebook (H=20–40 meta-embeddings) via a differentiable scorer + temperature-softmax — a continuous,
  end-to-end, **parameter-bounded** numerical tokenizer (constant per field, regardless of distinct values) that
  avoids hard-binning artifacts. Cheaper-per-field than per-value tables; beaten by PLE/PLR on general tabular
  benchmarks, strong in its CTR home turf. The temperature τ is load-bearing (collapses to uniform or to argmax
  if mis-set; the paper needs an adaptive-τ network)
  [Ref: topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json].
- **A magnitude-aware token alternative for LM/transformer pipelines (TP-BERTa RMT).** Relative Magnitude
  Tokenization: C4.5 target-aware per-feature bins become SHARED magnitude-token vocabulary entries, embedding
  scaled by the raw value, regularized by a triplet loss so bins lie on an ordered manifold. Ablations: RMT beats
  raw-digit-string numerics by +12.45% AUC and value×name-vector affine tokens by +3.44%. This is the cleanest way
  to give an LM a magnitude-aware numerical channel — but the bins are LABEL-guided (leakage risk, build
  out-of-fold) and it was only trained ≤32 features
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

**Pitfalls for the user's setting (unchanged, reinforced):**

- **Target-aware bin leakage (PLEt, AutoDis-τ-tuning, RMT/C4.5).** All three target-aware schemes (PLEt's
  per-feature tree, RMT's C4.5 bins) fit on labels; build bins strictly out-of-fold
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].
- **One shared functional form across heterogeneous features may be suboptimal** — precisely the user's regime
  (70+ features, very different distributions)
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Periodic gains are DL-specific** and σ is a sensitive hyperparameter — budget for tuning
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json].
- **Affine-only branches are NOT PLR-strength.** FT-Transformer (`xj·Wj+bj`), Trompt (scalar→Dense), AMFormer,
  ExcelFormer (GLU over a single scalar), TabTransformer (numerics bypass the transformer entirely), and most LM
  serializers all ship a weak numerical leg; this is the single most common conflation in the area, and the
  obvious slot to upgrade with PLR
  [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/trompt-prompt-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].

---

## categorical-and-high-cardinality

This remains the **user's hardest leg and the corpus's least-validated-at-width pillar.** The encoding families
fail in *complementary* ways; there is still no single default, and — critically — **TabReD does not isolate
categorical performance**, so the new wide-table evidence says nothing about high-cardinality encoders
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

- **Learned per-field entity embeddings** (the 2016 anchor): one lookup table per column, tunable per-field `D_i`,
  trained end-to-end. Canonical primitive every later tabular transformer inherits. But table size grows linearly
  with cardinality, **no OOV/cold-start bucket**, and feeding supervised-trained embeddings into a second model is
  near learned target encoding (leakage-prone); tested on only 7 features
  [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json].
- **TabTransformer's contextualized categorical tokens** (the lineage anchor): a per-column embedding carrying a
  learned **column identifier concatenated** (not added) to the value embedding — the tabular substitute for
  positional encoding — plus a dedicated per-column MISSING embedding row and generator-free ELECTRA-style
  per-column replaced-token-detection pretraining. The reusable nuggets are the column-identifier-by-concatenation
  trick and per-column self-supervised heads. **Caveat:** numerics bypass the transformer entirely, so it only
  helps the categorical slice; later benchmarks find it uncompetitive once numerics matter
  [Ref: topics/complex-feature-tokenization/records/works_json/tabtransformer-contextual-categorical-embeddings.json].
- **MinHash n-gram encoding** (the vocabulary-free primitive): a string → its set of character n-grams →
  fixed-width (d≈30) signature whose collision rate ≈ Jaccard similarity. **Stateless, no fitted vocabulary, native
  OOV, label-free** — degrades gracefully on dirty/typo'd categories. Productionized in skrub/dirty_cat
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].
- **Target / CatBoost encoding** is recorded as baseline-and-hazard: it leaks without strict out-of-fold
  construction. ExcelFormer's whole "tokenizer" is CatBoost-target-encoding every categorical to a scalar before
  the network — convenient (zero cardinality growth) but lossy, cold-starts on rare/unseen categories, and a leakage
  risk; do NOT treat ExcelFormer as a categorical tokenizer
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].

**Three open-vocabulary / compositional paradigms** sidestep per-field tables entirely:

- **Column-name-as-relation (CARTE):** LM-embed each column NAME (FastText) and fuse it with the cell value, so a
  token is a `(colname-vector, value)` pair — cardinality never inflates parameters, unseen categories still get a
  vector. Strongest on string-heavy/high-cardinality tables; validated only ≤2048 rows / ~15 columns, weak numerical
  encoder
  [Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json].
- **Sub-word value embedding (UniTabE, TP-BERTa, GReaT, LIFT):** tokenize the category STRING with a sub-word
  tokenizer so a rare/unseen category composes a meaningful embedding from its pieces (graceful OOV that integer-id
  lookups lack). UniTabE makes this explicit per cell; TP-BERTa maps codes to meaningful strings. **Cost:** longer
  sequences, and TP-BERTa/GReaT manually exclude non-semantic / unmappable category codes — common in real wide
  tables — so the demonstrated strength is conditioned on human-readable categories
  [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json].
- **RQ-VAE hierarchical codes (TIGER, scope-stripped):** turn an extreme-cardinality entity into a short ordered
  tuple of discrete codes from a small shared codebook (3 levels × 256), so similar entities share prefixes and rare
  entities inherit a content-derived code rather than an OOV bucket — bounds vocabulary with graceful cold-start.
  Only the RQ-VAE kernel transfers; the recsys machinery is out of scope, and its evidence is recsys-only
  [Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json].

**Critical pitfall for a Transformer tokenizer (unchanged):** MinHash output is **not a metric space** — only
collision-rate ≈ Jaccard is meaningful, so it **needs a learned projection before attention/distance use**. It
works fed to trees (inequality splits); do not assume the tree result transfers to a deep tokenizer unchanged
[Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json].

---

## temporal-static-fusion

The user's feature set is "partly time-varying + partly static." This route is still the **weakest topic-native
ground**, but the new evidence sharpens it in two ways: TimeXer gives a concrete linear-cost fusion recipe, and
TabReD clarifies what "temporal" the user actually faces.

**First, a crucial disambiguation TabReD forces.** There are two distinct "temporal" problems, and the corpus
treats them differently:
- **Snapshot-with-drift** (TabReD's regime): rows are flat feature vectors ordered by timestamp; time is the
  **split axis**, not a per-row sequence. Here the lesson is *evaluation discipline* (time-based splits) and
  *drift robustness* — and the embeddings+ensembling default already wins
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **Per-row time-varying signals** (TFT / PatchTST / iTransformer / TimeXer regime): a feature is itself a series
  that must be tokenized (patches, variate tokens). If the user's "time-varying" features are genuine series, this
  is the relevant machinery; if they are point-in-time snapshots that merely drift, TabReD's snapshot+time-split
  treatment applies and is simpler.

For genuine per-row series, the mechanisms:

- **TFT supplies the only real static-fusion mechanism.** Three-way input split (static / observed-past /
  known-future), separate encoders, every feature → one `d_model` token (entity embeddings for categorical, linear
  for continuous), and a **Variable Selection Network** (instance-wise softmax gating + per-feature GRN) that
  down-weights noisy features and yields free per-feature importance; static context vectors initialize the LSTM.
  Canonical template for unifying time-varying + static heterogeneous features
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
- **PatchTST contributes patching** — aggregate consecutive timesteps of a feature into a window, project to one
  token. Borrow patching; **do NOT borrow channel-independence** (it removes the cross-feature interaction the mixed
  setting needs)
  [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json].
- **iTransformer contributes the unification blueprint** — variate-as-token + ONE joint self-attention over all
  feature tokens (explicit cross-feature interaction), per-token LayerNorm for heterogeneous scales, random
  variate-subsampling to tame O(N²). SOTA when many correlated features coexist (Traffic N=862)
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
- **TimeXer (new) is the cleanest linear-cost fusion recipe.** Role-asymmetric tokenization: the feature(s) you
  predict get fine **patch** tokens (PatchTST-style); each context feature collapses to ONE coarse **variate** token
  (iTransformer-style); a single learnable **global bridge token** is the sole query into the context tokens via a
  **1×C cross-attention**, so cost is **linear in the number of context features**. Measured lower memory than
  iTransformer at C=320; ingests context features with **misaligned / missing / different-frequency support without
  timestamp alignment** (the whole-series variate token does not touch the time axis). This is the concrete lever
  the topic needs at 70+ width — route many context features through a small set of hub tokens instead of one
  quadratic joint attention
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].

**Pitfalls — read before trusting any "handles many features" claim here:**

- **TimeXer's linear-cost is role-specific.** It is cheap because exogenous features do NOT interact with each
  other — they only feed the target's global token via 1×C cross-attention. For a symmetric setting where all 70+
  features mutually matter, TimeXer falls back to channel-independent parallel mode (M passes), and it **loses to
  iTransformer's full joint attention on Traffic (862 mutually-interacting variates)**. The single global token is a
  representational bottleneck for richly-interacting context. TimeXer also has **no categorical/static pathway** —
  that must be designed separately
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].
- **Entities ≠ features (TFT).** TFT's 370/440 are entity/series counts; its rich-feature dataset (Retail) has ~a
  dozen inputs, not 70+. VSN is a mechanism, untested at the user's width; per-feature GRNs + embeddings grow params
  linearly in feature count
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
- **iTransformer's "variates" are all numeric.** Per-token LayerNorm reconciling scale is NOT mixed-type fusion;
  the unseen-variate trick relies on shared weights across homogeneous numeric features and will not transfer to a
  held-out categorical feature
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].
- **Every temporal anchor uses a weak per-value numerical encoder** (raw-linear TFT, single-linear PatchTST/TimeXer
  patch projection, flat-MLP-over-T iTransformer) — pair them with PLR/periodic if numeric richness matters
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].
- **TabArena excludes temporal data by design**, and TabReD's "temporal" is split-axis-only — so neither fair
  benchmark validates a genuine per-row temporal-static-fusion tokenizer at width
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

---

## scaling-and-interaction

At 70+ features, how do you add interaction/selection capacity without paying O(features²) attention or
per-feature parameter blow-up? The new evidence both broadens the menu and supplies the first head-to-head
verdict.

**The TabReD verdict reframes this whole section:** on wide drifting tables, the *plain linear-cost backbone*
(MLP/MLP-PLR + ensembling) beats the explicit-interaction operators. **DCN-V2 ranked 7.6 (worse than plain MLP
5.0)** and Trompt 5.4 on TabReD — i.e. the fancier interaction machinery did **not** transfer to the user's
regime, while the simple embeddings+ensemble won
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
So the first recommendation is: **establish the embeddings+ensemble baseline before adding any interaction
operator**; only add interaction if it beats that baseline on a time-based split.

The linear-cost backbone options (cost LINEAR in feature count, no O(features²) attention):

- **Flat-concat MLP ensemble (TabM)** — per-feature PLE embeddings flat-concatenated into a k=32 BatchEnsemble-style
  MLP ensemble. Linear in feature count, demonstrated to 986 features where FT-Transformer is far slower and TabR
  goes OOM. The current #1-ranked tabular DL model
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
- **Parameter-efficient ensembling primitives (BatchEnsemble, MIMO)** — the cheap wrapper TabM rides on.
  BatchEnsemble: rank-one multiplicative fast-weights `W ⊙ (rsᵀ)` give k members at ~O(width) extra params and ~1×
  compute, **independent of feature count**. MIMO: multiplex M members through one backbone via multi-input/output
  heads, near-zero extra prediction cost. Both are **tokenizer-agnostic** — wrap any future heterogeneous-feature
  tokenizer for a near-free accuracy/calibration boost. Caveats: BatchEnsemble needs ~50% more training iterations
  (data split across members); MIMO needs backbone excess capacity and its "free" refers to *prediction* compute only
  [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json].
- **TabNet sparsemax selection gate** — instance-wise sparse feature mask, **O(features) per step**, with a built-in
  per-feature importance map; a linear-cost SELECTION front-end to bolt before a richer tokenizer. Its own input
  encoding is impoverished (raw scalars, 1-D categorical embeddings) — replace it, don't borrow it. Its headline wins
  are widely viewed as under-tuned-baseline artifacts
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json].
- **TabR instance-axis retrieval** — moves attention to the SAMPLE axis (kNN-like over retrieved rows), so cost is
  **feature-count-invariant** by construction. But it **underperforms on TabReD (-2.78% vs MLP)** under drift, and
  carries a real train/deploy retrieval-leakage hazard (must retrieve only from the windowed past for temporal data)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabr-retrieval-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

If you DO want explicit interaction or attention, the sub-quadratic / one-token-per-feature operators:

- **AutoInt field-shared self-attention** — Q/K/V reused across all field tokens, so attention PARAMS are
  independent of feature count, but COMPUTE is O(M²); efficient/sparse attention needed at width
  [Ref: topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json].
- **DCN-V2 Hadamard cross** — all crosses up to order L+1, cost in embedding-dim d not field-count M; low-rank/MoE
  mandatory at width. But the headline AUC win is small and **it failed to transfer on TabReD** — treat as
  optional, not default
  [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **AMFormer (new) — prompt-token queries + multiplicative attention.** Replaces the data-dependent query with Np
  learned prompt tokens, making attention **O(Np·N) = linear in N** — with *measured* efficiency at **2000 features**
  (~7× faster, ~52% memory). Adds an explicit MULTIPLICATIVE attention stream (attention in log space + exp) that
  synthesizes ratio/product features additive attention cannot. Bolts onto AutoInt/FT-Transformer. Caveats: the
  multiplicative stream is fragile (log(ReLU(X)+ε) is sign-blind; multiplicative-only collapsed to chance), and the
  "necessity" claim leans on synthetic monomial data + 4 real datasets, single run
  [Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json].
- **Trompt (new) — prompt-based importance gate.** Swaps O(C²) self-attention for an O(P·C) learned
  column-embedding + soft-prompt importance matmul; interpretable per-column importances. But the P×C×d feature
  expansion materializes a large activation tensor (the O(P·C) framing hides a big constant), its numerical leg is
  naive scalar→Dense, and it **ranked only 5.4 on TabReD** (no better than plain MLP)
  [Ref: topics/complex-feature-tokenization/records/works_json/trompt-prompt-tabular.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- **T2G-Former learned sparse interaction graph** — a learned FR-Graph imposes a sparse interaction PRIOR (only
  relevant feature pairs interact), but the graph is scored fully-connected first, so it is **a prior, not a FLOP
  saving** (compute stays O(M²)); capped at 93 features
  [Ref: topics/complex-feature-tokenization/records/works_json/t2g-former-graph-tabular.json].
- **TimeXer/TP-BERTa one-token-per-feature bridges** — TimeXer's global bridge token (1×C cross-attention) and
  TP-BERTa's Intra-Feature-Attention (name+value → one token, sequence length = feature count) are two more instances
  of the "collapse to one token per feature, keep attention linear" lever
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

**The most reusable zero-per-feature-param scaling primitive** is still TabICL's **shared distribution-aware column
embedder + column-collapse-to-row-token**: a single Set-Transformer hypernetwork emits per-cell affine `(W,B)` (zero
per-feature params), a row collapses to one token via [CLS], and the expensive sample-axis attention is paid once.
RoPE over the feature axis de-collapses identically-distributed features. It attacks BOTH the param-blow-up and the
quadratic-attention pitfalls — but is demonstrated only in the frozen in-context setting
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json].

**SAINT's intersample (row) attention** is a distinct second axis (learned soft-kNN over the batch) but does **not**
solve feature-count scaling — its projection matrices are (n·d)×(n·d), quadratic in feature count, and predictions
are batch-composition-dependent (a serving hazard)
[Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json].

---

## architectures-and-foundation-models

**Per-feature transformer scaffolds.** FT-Transformer is still the minimal mixed-type scaffold every later tokenizer
extends (per-feature affine token, [CLS] readout, per-feature bias empirically necessary); but TabReD demotes its
*attention* to runner-up at width
[Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
SAINT adds two-axis attention + CutMix/mixup contrastive pretraining; TabTransformer is the categorical-contextualization
ancestor (numerics bypass it); Trompt/T2G-Former/ExcelFormer/AMFormer are all FT-Transformer descendants whose
contribution is the *interaction/regularization* mechanism, NOT the tokenizer (each ships a weak numerical leg)
[Ref: topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabtransformer-contextual-categorical-embeddings.json]
[Ref: topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json].

**The current accuracy leader is NOT an attention model.** TabM (flat-concat PLE embeddings + parameter-efficient MLP
ensemble) ranks #1 on its 46-dataset protocol and #1-of-ensembling-regime on TabReD, ahead of FT-T/SAINT/T2G/ExcelFormer
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**Foundation / pretrained / transfer models** — the most active route, now with a clearer transfer verdict:

- **TabPFN v2** — per-cell tokens + two-way attention, pretrained on ~130M synthetic SCM datasets; ingests raw
  mixed/missing cells, matches tuned GBDTs in one forward pass. **Small-data only (≤~10k samples / ≤~500 features)**;
  predictions depend on which test rows are batched (serving gotcha). Confidence medium (Nature source auth-gated)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json].
- **TabICL v1** — shared column embedder + column-collapse-to-row-token + RoPE; O(m²n + n²); surpasses TabPFN v2 and
  CatBoost on the 53 >10k-sample datasets; code + weights released. The most reusable 70+-feature scaling primitive
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json].
- **TabICL v2** (2026, confidence medium) — repeated-feature-grouping + target-aware embedding + column-then-row
  attention; surpasses tuned RealTabPFN-2.5 without tuning; 1M samples / 500 features in ~450s. Cost still quadratic
  in feature count
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json].
- **CARTE** — open-vocabulary LM-on-column-names; best on string-heavy tables, transfers across renamed schemas with
  no matching; validated ≤2048 rows / ~15 columns, weak numerical encoder
  [Ref: topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json].
- **XTab (new) — cross-table pretraining transfers the BACKBONE, not the tokenizer.** Per-table featurizer is
  re-initialized from scratch on every new table; only the column-agnostic transformer blocks are pretrained and
  transferred (warm-start a feature-interaction prior without schema/vocabulary alignment). Reconstruction SSL beats
  contrastive/supervised. **Still loses to CatBoost**; numeric leg is plain affine (no PLR); a hard 16GB memory wall
  dropped 20/104 datasets. So circa-2023 cross-table transfer left the heterogeneous-feature *tokenizer* firmly
  data-specific
  [Ref: topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json].
- **UniTabE (new) — schema-agnostic per-cell key-value tokenizer.** Each cell = (column-name embedding, explicit
  data-type embedding, value sub-word tokens) fused by two cheap gates (Fuse + Linking, ablated as the dominant
  contributors). True heterogeneity (num/cat/text/missing in one scheme), any column count, incremental columns at
  +3.5% AUC drop — and **actually evaluated on 80–85-column tables (GPP 81, IO 85)**, rare direct evidence near the
  user's width. **Caveats:** numerics are textualized (not magnitude-aware), and one cell = (1+q) tokens, so sequence
  length (and O(L²) attention) blows up well beyond column count; pretraining-data overlap risk
  [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].
- **TP-BERTa (new) — RoBERTa adapted with RMT + IFA.** The reusable transfer story: category SEMANTICS transfer
  across tables for free via the shared language embedding space ('male/female' → 'boy/girl'), unlike XTab
  (data-specific featurizers) or TransTab (needs overlapping names). But it was pretrained ≤32 features, wins mainly
  on **categorical-dominated** tables (loses on all-numerical), and needs human-readable names
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

**Fair-evaluation context.** Two complementary yardsticks now anchor the brief:
- **TabArena** (51 curated IID datasets, leakage-audited): under tuning + ensembling, best deep nets equal best
  GBDTs; foundation-model wins exist ONLY on ≤500-feature / ≤10k-sample subsets; temporal excluded
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
- **TabReD** (8 industrial tables, median 261 features, time-based splits): the regime-matched harness for the
  user's setting; verdict = PLR embeddings + ensembling win, per-feature attention pays a quadratic cost
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

**LLM serialization** (TabLLM, LIFT, GReaT) remains demoted for this topic: TabLLM caps at ≤30 columns (1024-token
budget), LIFT collapses on high-dimensional regression (p≥50) and tops out on image/digit pixels not rich columns,
GReaT's evidence tops out at 47 features with serial-sampling cost. Reusable nuggets only: column-name-as-semantics;
GReaT's **random feature-order-permutation** training (order-invariant, arbitrary-conditioning); LIFT's
**shuffled-names ablation** protocol; TP-BERTa's RMT/IFA as the LM route's magnitude-aware-numerics + one-token-per-feature
answer
[Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json]
[Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json]
[Ref: topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

---

## recommended-approaches

The user wants to **build/train a tokenizer for 70+ heterogeneous features**. The recipes below are re-ranked by the
new regime-matched evidence. The biggest change vs cycle 7: **the default is now embeddings + ensembling on a
linear-cost backbone, with per-feature attention demoted to an alternative** — because that is what wins on TabReD,
the only benchmark matching the user's width + drift. Every recipe is tied to recorded pitfalls and the 70+-feature
scale; none has been validated end-to-end at the user's *full* (high-cardinality + true-temporal) regime — that gap
is stated explicitly.

### Recipe A — Default build: per-feature embeddings + parameter-efficient ensemble (highest readiness, NEW default)

The configuration with the strongest regime-matched evidence (TabReD #1 = MLP-PLR ensemble; TabM #1 overall).

- **Numerical leg:** **PLR (Periodic+Linear+ReLU) per feature**, the one tokenization proven to keep its benefit on
  wide drifting tables. Switch to **PLE (quantile)** where compute/width or preprocessing-robustness matters; AutoDis
  soft-codebook is a parameter-bounded fallback. Build any target-aware bins **strictly out-of-fold**
  [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json].
- **Categorical leg:** entity embeddings for low/medium-cardinality columns (tunable `D_i`, add an explicit OOV
  bucket — the 2016 primitive has none); for dirty / high-cardinality string columns use **MinHash + a small learned
  linear projection** (MinHash coords are not metric — projection mandatory). Where category names are
  human-readable, **sub-word value embedding** (UniTabE/TP-BERTa style) gives graceful OOV
  [Ref: topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].
- **Backbone:** **flat-concatenate the per-feature embeddings into a TabM-style parameter-efficient MLP ensemble**
  (k≈32 BatchEnsemble adapters), which is LINEAR in feature count and avoids the O(features²) attention that TabReD
  shows is a liability at width. Ensembling is a near-free accuracy/calibration boost on top of any tokenizer
  [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json].
- **Feature selection (optional):** a **VSN-style instance-wise softmax gate** or **TabNet sparsemax mask** (both
  O(features)) to allocate capacity away from uninformative features and get per-feature importance free
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json].

Why this displaces cycle-7's attention default: TabReD ranks MLP-PLR-ensemble (2.4) above FT-Transformer (4.8), and
TabM beats every attention tabular transformer on a separate 46-dataset protocol — the embeddings, not the attention,
carry the load, and the ensemble is what closes the gap to GBDTs
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].

### Recipe A′ — Add per-feature attention ONLY if it beats Recipe A (was the cycle-7 default)

Keep the FT-Transformer per-feature scaffold but make attention sub-quadratic, and adopt it only if it beats Recipe A
on a time-based split (TabReD shows fancier interaction operators frequently do NOT transfer):

- one-token-per-feature + a **linear-in-N attention**: AMFormer **prompt-token queries** (measured to 2000 features)
  or a **global bridge token** (TimeXer-style), instead of full O(features²) self-attention
  [Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json];
- optionally an **AMFormer multiplicative stream** if ratio/product features are expected (watch the log-ReLU
  instability), or **1–2 DCN-V2 low-rank cross layers** (cost in d, not field-count) — but treat both as optional, as
  DCN-V2 *failed to transfer* on TabReD
  [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].

### Recipe B — Temporal-static fusion (for genuine per-row time-varying features)

First decide which "temporal" the user has (see temporal-static-fusion): if features are **snapshots that merely
drift**, use Recipe A and just adopt time-based splits — no temporal tokenizer needed. If features are **genuine
series**, layer onto Recipe A:

- encode each static/categorical feature with its Recipe-A leg; encode each time-varying feature with a **PatchTST
  patch token** (borrow patching, drop channel-independence);
- use a **TimeXer-style role-asymmetric scheme**: fine patch tokens for the prediction target, one coarse variate
  token per context feature, fused through a **global bridge token (1×C cross-attention)** so cost is LINEAR in
  context-feature count — and it tolerates misaligned/missing/different-frequency features without timestamp alignment;
- use the **TFT three-way split + static context vectors + VSN gating** as the fusion scaffold, per-token LayerNorm/RevIN
  for heterogeneous scales
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json].

**Caveat:** assembled from mechanisms validated only below the user's width or on all-numeric variates, with no
categorical/static pathway in TimeXer and a single-global-token bottleneck on richly-interacting features — still the
most uncertified recipe. If many of the 70+ features mutually interact, prefer iTransformer-style joint attention over
TimeXer's single bridge token
[Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].

### Recipe C — Shared zero-per-feature-param embedder (best scaling primitive, more research)

For the largest feature counts, lift TabICL's **shared distribution-aware column embedder** (one Set-Transformer
hypernetwork emitting per-cell `(W,B)`, zero per-feature params) into a **supervised** tokenizer, add RoPE over the
feature axis, optionally TabICL v2's **target-aware embedding**. UniTabE's **per-cell (column-name, data-type, value)
key-value scheme with Fuse + Linking gates** is a concrete, schema-agnostic alternative actually tested at 80–85
columns. Both attack param-blow-up and quadratic cost — but are demonstrated only in frozen/in-context or
textualized-numeric settings; adapting to non-ICL supervised training with a magnitude-aware numeric leg is open work
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].

### Recipe D — Buy, don't build (strong baseline to beat)

Before committing to a from-scratch tokenizer, **run a frozen foundation model (TabPFN v2 or TabICL v2) as a baseline**
— zero feature engineering, may already win if data sits in its regime (≤~500 features, small-to-medium samples). The
from-scratch tokenizer is justified mainly where it beats this baseline — which per TabArena/TabReD is the **wide-table
(>500 feature) and genuine-temporal regimes where foundation models have NO validated evidence and where embeddings +
ensembling already win**. XTab/TP-BERTa show cross-table *pretraining* warm-starts a backbone or transfers category
semantics, but neither yields a drop-in reusable wide-feature tokenizer that beats GBDTs
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
[Ref: topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json].

### Evaluation discipline (applies to all recipes) — sharpened by TabReD

- **Validate on time-based (out-of-time) splits, not random splits.** Random splits on temporally-ordered data inflate
  rankings (XGBoost partly exploits time-leakage) and flip model ordering. Use TabReD's 8 public feature-rich
  time-split datasets as a ready harness
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
- Compare under **tuned + post-hoc-ensembled, nested-CV** conditions; report stratified by feature-count and
  sample-count; treat validation-set overfitting as a first-class failure
  [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
- Prove the tokenizer genuinely uses feature names and fine-grained values with the **permuted-names / only-values
  ablation** (LIFT/TabLLM protocol)
  [Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json].

---

## open-problems-and-contradictions

**The central structural gap — NARROWED but NOT closed.** Cycle 7's headline gap was "no single work demonstrates a
genuine 70+-heterogeneous-feature tokenizer with high-cardinality categorical INPUTS AND time-varying signals
together." The new evidence narrows it in three places but leaves the triple unsolved:
- **NARROWED (width):** TabReD proves the wide (median-261) + temporal-**drift** regime, and gives a verdict (PLR
  embeddings + ensembling win); UniTabE is actually evaluated at 80–85 columns
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].
- **NARROWED (temporal fusion):** TimeXer gives a concrete linear-cost recipe for fusing many context features into a
  target
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].
- **STILL OPEN (the triple):** TabReD's features are mostly engineered NUMERICAL and it does NOT isolate
  high-cardinality categoricals; its "temporal" is the **split axis, not per-row sequences**. TimeXer has no
  categorical/static pathway. UniTabE textualizes numerics. So **no single work jointly validates 70+ features +
  high-cardinality categorical INPUTS + genuine per-row temporal sequences**
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].

**Explicit contradictions (surfaced, not averaged away):**

1. **Per-feature attention vs flat-concat MLP ensemble at width.** Cycle 7 leaned toward an attention scaffold;
   TabReD + TabM now show the linear-cost MLP ensemble *wins* at the user's width while attention pays a quadratic
   cost. **RESOLVED by new evidence in favor of embeddings + ensembling as the default** — attention is an
   alternative to adopt only if it beats that baseline on a time-based split
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json].
2. **Explicit interaction operators help vs do-not-transfer.** DCN-V2/AutoInt/T2G/Trompt report gains on their own
   benchmarks; on TabReD DCN-V2 (7.6) and Trompt (5.4) are no better than plain MLP (5.0). **PARTIALLY RESOLVED:**
   under wide-table drift the simple baseline wins; explicit interaction is regime-specific and must be earned
   [Ref: topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/trompt-prompt-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
3. **Retrieval beats GBDT (TabR/Grinsztajn) vs retrieval fails under drift (TabReD).** TabR beats GBDTs on
   small-to-middle IID benchmarks but underperforms (-2.78% vs MLP) on TabReD's wide drifting tables. **The cause is
   the TabReD authors' HYPOTHESIS (multicollinearity/temporal-shift breaking the retrieval assumption), not a proven
   mechanism — do not propagate it as established.** Net: feature-count-invariant retrieval is attractive in theory but
   unproven for the user's regime, with a train/deploy leakage hazard
   [Ref: topics/complex-feature-tokenization/records/works_json/tabr-retrieval-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json].
4. **Learned numeric embeddings vs LLM raw-digit numerics.** PLR/periodic embeddings close the DL-vs-GBDT gap; raw-digit
   LLM serialization (GReaT/LIFT) concedes this is its weak point; TP-BERTa's RMT ablation *quantifies* it (+12.45% AUC
   over raw-digit). For a built tokenizer the evidence strongly favors learned magnitude-aware embeddings; raw-digit
   serialization is viable only in the very-few-shot LLM regime
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json].
5. **Joint cross-feature attention vs channel-independence / single-bridge-token.** iTransformer wins with joint
   attention exactly when many correlated features coexist; PatchTST wins by removing cross-channel mixing for
   homogeneous channels; TimeXer's single bridge token loses to iTransformer on the 862-variate Traffic set. For mixed
   heterogeneous features that mutually interact, joint attention is the right default; the single-bridge-token
   shortcut is for the asymmetric (one-target-many-context) case — regime-specific, not universal
   [Ref: topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json].

**Other open problems specific to the user's build:**

- **High-cardinality categoricals at width are still unvalidated.** TabReD does not isolate them; MinHash-into-transformer
  projection is unsolved (not a metric space); TP-BERTa/GReaT exclude non-semantic category codes (common in real wide
  tables)
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].
- **Cross-table transfer does not yield a reusable tokenizer (yet).** XTab transfers only the backbone; TP-BERTa
  transfers category semantics but only ≤32 features and categorical-dominated; both still trail GBDTs
  [Ref: topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].
- **Foundation-model feature ceilings** remain inference-time extrapolations above a ≤100-feature pretraining regime
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json].
- **The matched-compute scaling comparison the records keep pointing at is now MORE specified but STILL unrun:** on a
  genuine 70+-feature high-cardinality TabReD/TabArena task, disentangle (a) PLR+ensemble (Recipe A), (b) one-token-per-feature
  + linear attention (AMFormer/TimeXer/IFA), (c) TabICL shared embedder, (d) instance-axis retrieval — reporting AUC AND
  params/latency under a time-based split. The three new one-token-per-feature contenders make this sharper but it
  remains the topic's central unevidenced engineering question
  [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json]
  [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].

**Lower-confidence records to treat with caution:** TabPFN v2 (Nature source auth-gated, headline numbers secondhand),
TabICL v2 (2026 preprint, pretraining code unreleased, gains bake in 8-shuffle ensembling), TIGER (recsys-only
evidence). AMFormer's "arithmetic interaction is necessary" leans on synthetic monomial data + 4 real datasets single
run; TabM/ExcelFormer/Trompt single-split or rank-only headlines should not be read as significance at the user's exact
regime
[Ref: topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json]
[Ref: topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json]
[Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json].

---

## reading-guide

Read in this order for the build; full annotated list in `reference_index.md`.

1. **Regime-matched evidence (start here — this is what changed the default):**
   tabred-benchmark-in-the-wild.json, then tabm-parameter-efficient-ensembling.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json].
2. **Numerical leg:** on-embeddings-numerical-features.json, then ft-transformer-revisiting-tabular-dl.json,
   then tp-berta-lm-tabular-prediction.json (RMT) and autodis-numerical-discretization.json
   [Ref: topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json].
3. **Categorical / high-cardinality:** encoding-high-cardinality-string-categoricals.json,
   entity-embeddings-categorical-variables.json, tabtransformer-contextual-categorical-embeddings.json,
   unitabe-universal-tabular-encoder.json, carte-pretraining-transfer-tabular.json
   [Ref: topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json].
4. **Temporal-static fusion:** timexer-exogenous-endogenous-fusion.json, temporal-fusion-transformer.json,
   patchtst-time-series-64-words.json, itransformer-inverted-transformers.json
   [Ref: topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json].
5. **Scaling / interaction / ensembling:** batchensemble-efficient-ensembles.json, mimo-independent-subnetworks-robust-prediction.json,
   amformer-arithmetic-feature-interaction.json, dcn-v2-deep-cross-network.json, autoint-feature-interaction.json,
   tabnet-attentive-interpretable-tabular.json, tabr-retrieval-tabular.json
   [Ref: topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json].
6. **Foundation-model alternatives + yardsticks:** tabicl-in-context-large-data.json, tabpfn-v2.json,
   tabicl-v2-scalable-foundation-model.json, xtab-cross-table-pretraining.json, tabarena-living-benchmark.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json].
7. **Open problems / cautionary:** tree-models-outperform-deep-tabular.json, t2g-former-graph-tabular.json,
   trompt-prompt-tabular.json, excelformer-semi-permeable-attention.json, tabllm-few-shot-llm-serialization.json,
   lift-language-interfaced-finetuning.json, great-generative-tabular-llm.json, tiger-rqvae-semantic-ids.json
   [Ref: topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json]
   [Ref: topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json].
</content>
</invoke>
