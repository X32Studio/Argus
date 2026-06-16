# Reference Index — Complex Feature Tokenization for Deep Tabular Models

Which JSON records to open, and why. Paths are literal. Depth = our read depth; all 36 are `deep`.
Confidence shown only where below `high`. Refreshed cycle 14 (36 works; was 18 at cycle 7).

## Must Read

These six define the backbone the user's tokenizer should be built on and the regime-matched verdict.

- **TabReD: Pitfalls and Gaps in Tabular DL Benchmarks** (2024 / ICLR 2025) — NEW DEFAULT-SETTER
  `topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json`
  Depth deep · Route tabular-transformers · The only public benchmark matching the user's regime (median 261
  features, time-based splits): per-numerical-feature PLR embeddings + ensembling win; per-feature attention pays a
  measured O(features²) cost; retrieval / DCN-V2 / Trompt do NOT transfer. Read first — it changed the default.

- **TabM: Parameter-Efficient Ensembling** (2025, ICLR) — NEW DEFAULT BACKBONE
  `topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json`
  Depth deep · Route feature-interaction-selection · Flat-concat per-feature PLE embeddings + k=32 MLP ensemble;
  #1-ranked tabular DL model, linear in feature count to 986 features, beats all attention transformers. The concrete
  Recipe-A backbone.

- **On Embeddings for Numerical Features** (2022)
  `topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json`
  Depth deep · Route numerical-embeddings · The numerical leg: PLE/Periodic/PLR per-feature embeddings; source of the
  param-blow-up and target-leakage pitfalls.

- **FT-Transformer (Revisiting Deep Learning Models for Tabular Data)** (2021)
  `topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json`
  Depth deep · Route tabular-transformers · The minimal per-feature mixed-type scaffold every later tokenizer extends;
  its O(features²) attention is now the *measured* (TabReD) scaling wall, demoting it to runner-up at width.

- **Encoding High-Cardinality String Categoricals (MinHash / Gamma-Poisson)** (2020)
  `topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json`
  Depth deep · Route categorical-high-cardinality · The vocabulary-free, OOV-robust high-cardinality primitive for the
  user's hardest leg; read the not-a-metric-space pitfall before feeding it to attention.

- **TabICL: Tabular Foundation Model for In-Context Learning on Large Data** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json`
  Depth deep · Route tabular-foundation-models · The most reusable scaling primitive: shared zero-per-feature-param
  column embedder + column-collapse-to-row-token; attacks both core scaling pitfalls.

## Important Supporting Reads

- **TimeXer: Exogenous/Endogenous Fusion** (2024, NeurIPS) — NEW
  `topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json`
  Depth deep · Route temporal-feature-tokenization · Role-asymmetric tokenization + single global bridge token →
  LINEAR-in-context-feature-count fusion; tolerates misaligned/missing/different-frequency features. The Recipe-B lever.

- **BatchEnsemble** (2020, ICLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json`
  Depth deep · Route feature-interaction-selection · Rank-one fast-weight adapters give k ensemble members at ~O(width)
  extra params, feature-count-independent — the tokenizer-agnostic ensembling wrapper TabM rides on.

- **MIMO: Independent Subnetworks for Robust Prediction** (2021, ICLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json`
  Depth deep · Route feature-interaction-selection · Multiplex M members through one backbone; the conceptual ancestor of
  TabM-style ensembling, a near-zero-cost robustness wrapper around any tokenizer.

- **TP-BERTa: PLMs Great on Tabular Prediction** (2024, ICLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json`
  Depth deep · Route llm-tabular-serialization · Two reusable modules: Relative Magnitude Tokenization (magnitude-aware
  target-aware numeric tokens, +12.45% AUC over raw-digit) and Intra-Feature Attention (name+value → one token). Categorical
  semantics transfer across tables. Caveats: ≤32-feature pretraining, categorical-dominated win.

- **UniTabE: Universal Tabular Encoder** (2024, ICLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json`
  Depth deep · Route tabular-foundation-models · Per-cell (column-name, data-type, value) key-value tokenizer with Fuse +
  Linking gates; true num/cat/text/missing heterogeneity, actually tested at 80–85 columns. Caveat: textualized numerics,
  sequence-length blowup.

- **DCN-V2: Improved Deep & Cross Network** (2020)
  `topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json`
  Depth deep · Route feature-interaction-selection · Field-count-scalable Hadamard cross (cost in d, not M); low-rank/MoE
  mandatory. Now demoted: failed to transfer on TabReD (rank 7.6).

- **AMFormer: Arithmetic Feature Interaction** (2024, AAAI) — NEW
  `topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json`
  Depth deep · Route feature-interaction-selection · Prompt-token queries (measured linear-in-N at 2000 features) +
  explicit multiplicative attention stream. Bolts onto FT-Transformer/AutoInt. Caveat: log-ReLU instability, synthetic-favorable
  necessity claim.

- **AutoInt: Automatic Feature Interaction Learning** (2019)
  `topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json`
  Depth deep · Route feature-interaction-selection · Field-shared attention (params feature-count-independent), O(M²) compute.

- **TabNet: Attentive Interpretable Tabular Learning** (2019)
  `topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json`
  Depth deep · Route feature-interaction-selection · O(features) instance-wise sparsemax SELECTION gate + masked-feature SSL;
  borrow the gate, replace the impoverished input encoding. Headline wins likely under-tuned-baseline artifacts.

- **Temporal Fusion Transformer** (2021)
  `topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json`
  Depth deep · Route temporal-feature-tokenization · The only real static-fusion mechanism (three-way split, VSN gating,
  static context vectors); its "many features" is entities, not features.

- **iTransformer** (2024)
  `topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json`
  Depth deep · Route temporal-feature-tokenization · Variate-as-token + joint attention; many-feature evidence (N=862) but
  all-numeric variates — the joint-attention counterpoint to TimeXer's single bridge token.

- **PatchTST (A Time Series is Worth 64 Words)** (2023)
  `topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json`
  Depth deep · Route temporal-feature-tokenization · Patching = the time-varying tokenizer; borrow patching, drop
  channel-independence.

- **CARTE: Pretraining and Transfer for Tabular Learning** (2024)
  `topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json`
  Depth deep · Route tabular-foundation-models · Open-vocabulary LM-on-column-names tokenizer, strong on high-cardinality
  strings; validated small-scale, weak numerical encoder.

- **SAINT: Row Attention and Contrastive Pre-Training** (2021)
  `topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json`
  Depth deep · Route tabular-transformers · Intersample (row) attention as soft-kNN + contrastive pretraining; row attention
  is quadratic in feature count (does not solve scaling) and batch-composition-dependent.

- **TabTransformer: Contextual Categorical Embeddings** (2020) — NEW
  `topics/complex-feature-tokenization/records/works_json/tabtransformer-contextual-categorical-embeddings.json`
  Depth deep · Route tabular-transformers · The categorical-contextualization ancestor: column-identifier-by-concatenation +
  per-column MISSING row + ELECTRA-style per-column pretraining. Numerics bypass the transformer (the gap FT-Transformer closes).

- **Entity Embeddings of Categorical Variables** (2016)
  `topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json`
  Depth deep · Route categorical-high-cardinality · Historical anchor; per-field learned embedding (no OOV bucket, leakage risk
  if transferred). Pre-recency-floor.

- **TabArena: A Living Benchmark** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json`
  Depth deep · Route tabular-transformers · The IID fair-evaluation harness; bounds foundation-model claims to ≤500 features and
  excludes temporal data. Complement to TabReD's time-split harness.

## Shallow But Strategic

(No shallow records exist — all 36 are deep. These are deep but lower-confidence, scope-limited, or cautionary;
read for the idea, not the headline numbers.)

- **TabPFN v2** (2025) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json`
  Per-cell + two-way attention, native missing handling, zero feature engineering; small-data only (≤500 features).
  Headline numbers secondhand (auth-gated Nature). Strong "buy, don't build" baseline.

- **TabICL v2** (2026) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json`
  Open SOTA; source of the transferable target-aware embedding (TAE). Preprint; pretraining code unreleased; "no tuning"
  gains bake in 8-shuffle ensembling.

- **XTab: Cross-table Pretraining** (2023, ICML) — NEW
  `topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json`
  The decisive transfer result: cross-table pretraining transfers the interaction BACKBONE, NOT the tokenizer (re-initialized
  per table). Still loses to CatBoost; 16GB memory wall. Read for the tokenizer/backbone decoupling lesson, not as a recipe.

- **ExcelFormer: Semi-Permeable Attention** (2024, KDD) — NEW
  `topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json`
  Two bolt-on regularizers (importance-masked SPA; Feat-Mix/Hid-Mix Mixup) worth borrowing; but the "tokenizer" CatBoost-scalarizes
  all categoricals (lossy, leakage-prone), attention stays O(features²), max 54 features tested. NOT a categorical/temporal tokenizer.

- **Trompt: Prompt-Based Tabular** (2023, ICML) — NEW
  `topics/complex-feature-tokenization/records/works_json/trompt-prompt-tabular.json`
  O(P·C) learned column-embedding + soft-prompt importance gate (interpretable), but a large P×C×d activation constant, naive
  numerical leg, and TabReD rank 5.4 (= plain MLP). Borrow the column-embedding-as-intrinsic-property idea.

- **T2G-Former: Feature Relation Graphs** (2023, AAAI) — NEW
  `topics/complex-feature-tokenization/records/works_json/t2g-former-graph-tabular.json`
  Learned sparse interaction PRIOR on FT-Transformer tokens; a prior, not a FLOP saving (stays O(M²)); capped at 93 features.

- **AutoDis: Numerical Discretization for CTR** (2021, KDD) — NEW
  `topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json`
  Soft, parameter-bounded per-field discretization over a tiny codebook; cheaper-per-field numerical alternative, beaten by
  PLE/PLR on general tabular. τ is load-bearing. Bridges numerical-embeddings ↔ discretization-vq.

- **TabLLM: Few-shot Classification with LLMs** (2023)
  `topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json`
  Cautionary anchor: ≤30-column token-budget ceiling. Keep the column-name-semantics nugget and the permuted-names ablation protocol.

- **LIFT: Language-Interfaced Fine-Tuning** (2022, NeurIPS) — NEW
  `topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json`
  Cautionary: explicit "low-dimensional" scope, regression collapse at p≥50, raw-digit numerics, no temporal. Reusable: the
  shuffled-names validation protocol, column-name semantics, two-stage pretext warm-up.

- **GReaT: LLMs are Realistic Tabular Generators** (2023, ICLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json`
  Generation-side anchor; the reusable nugget is the random feature-order-permutation training (order-invariant,
  arbitrary-conditioning). Evidence ≤47 features, serial-sampling cost, raw-digit numerics.

## Lower Priority

- **TIGER / RQ-VAE Semantic IDs** (2023) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json`
  Recsys-native; only the RQ-VAE "discretize-an-embedding-into-hierarchical-codes" kernel transfers (vocabulary bounding +
  graceful cold-start). Never cite its numbers as tabular-prediction evidence.

- **Why do tree-based models still outperform deep learning on tabular data?** (2022)
  `topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json`
  Motivation and rules-of-the-game (rotation invariance, irregular targets, uninformative-feature fragility), NOT a verdict on
  the user's setting — it excludes high-cardinality, missing, and temporal data.
</content>
</invoke>
