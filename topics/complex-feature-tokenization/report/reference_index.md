# Reference Index — Complex Feature Tokenization for Deep Tabular Models

Which JSON records to open, and why. Paths are literal. Depth = our read depth; all 18 are `deep`.
Confidence shown only where below `high`.

## Must Read

These four define the backbone the user's tokenizer should be built on.

- **On Embeddings for Numerical Features in Tabular Deep Learning** (2022)
  `topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json`
  Depth deep · Route numerical-embeddings · The numerical leg: PLE/Periodic/PLR per-feature embeddings
  that close most of the DL-vs-GBDT gap; also the source of the param-blow-up and target-leakage pitfalls.

- **FT-Transformer (Revisiting Deep Learning Models for Tabular Data)** (2021)
  `topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json`
  Depth deep · Route tabular-transformers · The minimal per-feature mixed-type scaffold every later
  tokenizer extends; authors flag the O(k²)-attention scaling wall the user must defuse.

- **Encoding High-Cardinality String Categoricals (MinHash / Gamma-Poisson)** (2020)
  `topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json`
  Depth deep · Route categorical-high-cardinality · The vocabulary-free, OOV-robust high-cardinality
  primitive for the user's hardest leg; read the not-a-metric-space pitfall before feeding it to attention.

- **TabICL: A Tabular Foundation Model for In-Context Learning on Large Data** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json`
  Depth deep · Route tabular-foundation-models · The single most reusable scaling primitive: shared
  zero-per-feature-param column embedder + column-collapse-to-row-token; attacks both core scaling pitfalls.

## Important Supporting Reads

- **DCN-V2: Improved Deep & Cross Network** (2020)
  `topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json`
  Depth deep · Route feature-interaction-selection · The field-count-scalable explicit-interaction operator
  (cross cost in embedding-dim d, not field-count M); low-rank/MoE mandatory at width.

- **AutoInt: Automatic Feature Interaction Learning** (2019)
  `topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json`
  Depth deep · Route feature-interaction-selection · Field-shared attention with feature-count-independent
  params; the O(M²) compute counterpart to DCN-V2.

- **Temporal Fusion Transformer** (2021)
  `topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json`
  Depth deep · Route temporal-feature-tokenization · The only real static-fusion mechanism (three-way split,
  VSN gating, static context vectors); but its "many features" is entities, not features.

- **iTransformer** (2024)
  `topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json`
  Depth deep · Route temporal-feature-tokenization · Variate-as-token + joint attention = the unification
  blueprint; concrete many-feature evidence (N=862) but all-numeric variates.

- **PatchTST (A Time Series is Worth 64 Words)** (2023)
  `topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json`
  Depth deep · Route temporal-feature-tokenization · Patching = the time-varying tokenizer; borrow patching,
  drop channel-independence.

- **CARTE: Pretraining and Transfer for Tabular Learning** (2024)
  `topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json`
  Depth deep · Route tabular-foundation-models · Open-vocabulary LM-on-column-names tokenizer, strong on
  high-cardinality strings; validated only small-scale, weak numerical encoder.

- **SAINT: Row Attention and Contrastive Pre-Training** (2021)
  `topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json`
  Depth deep · Route tabular-transformers · Intersample (row) attention as learned soft-kNN + contrastive
  pretraining recipe; row attention is quadratic in feature count (does not solve scaling).

- **Entity Embeddings of Categorical Variables** (2016)
  `topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json`
  Depth deep · Route categorical-high-cardinality · Historical anchor; the per-field learned-embedding
  primitive (tunable D_i, no OOV bucket, leakage risk if transferred). Pre-recency-floor — read as anchor.

- **TabArena: A Living Benchmark** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json`
  Depth deep · Route tabular-transformers · Not a method — the fair-evaluation harness and the guardrail
  that bounds foundation-model claims to ≤500 features and excludes temporal data.

## Shallow But Strategic

(No shallow records exist — all 18 are deep. These are deep but lower-confidence or scope-limited; read
them for their idea, not their headline numbers.)

- **TabPFN v2** (2025) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json`
  Per-cell + two-way attention, native missing handling, zero feature engineering; small-data only (≤500
  features). Headline numbers are secondhand (auth-gated Nature source). Strong "buy, don't build" baseline.

- **TabICL v2** (2026) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json`
  Open SOTA; source of the transferable target-aware embedding (TAE) idea. Preprint; pretraining code
  unreleased; "no tuning" gains bake in 8-shuffle ensembling. Do not over-read.

- **TabLLM: Few-shot Classification with LLMs** (2023)
  `topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json`
  Cautionary anchor for the LLM-serialization route: ≤30-column token-budget ceiling. Keep the
  column-name-semantics nugget and the permuted-names/only-values ablation protocol.

## Lower Priority

- **TIGER / RQ-VAE Semantic IDs** (2023) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json`
  Recsys-native; only the RQ-VAE "discretize-an-embedding-into-hierarchical-codes" kernel transfers
  (high-cardinality vocabulary bounding with graceful cold-start). Evidence is recsys-only — never cite its
  numbers as tabular-prediction evidence.

- **Why do tree-based models still outperform deep learning on tabular data?** (2022)
  `topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json`
  Motivation and rules-of-the-game (rotation invariance, irregular targets, uninformative-feature
  fragility), NOT a verdict on the user's setting — it excludes high-cardinality, missing, and temporal data.
