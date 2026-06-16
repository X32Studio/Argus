# Reference Index — Complex Feature Tokenization for Deep Tabular Models

Which JSON records to open, and why. Paths are literal. Depth = our read depth; all 54 are `deep`.
Confidence shown only where below `high`. Refreshed cycle 21 (54 works; was 36 at cycle 14, 18 at cycle 7).

## Must Read

These define the backbone the user's tokenizer should be built on, the regime-matched verdict, and the runnable
substrate.

- **TabReD: Pitfalls and Gaps in Tabular DL Benchmarks** (2024 / ICLR 2025) — THE DEFAULT-SETTER
  `topics/complex-feature-tokenization/records/works_json/tabred-benchmark-in-the-wild.json`
  Depth deep · Route tabular-transformers · The only public benchmark matching the user's regime (median 261
  features, time-based splits): PLR embeddings + ensembling win; per-feature attention pays a measured O(features²)
  cost; retrieval/DCN-V2/Trompt do NOT transfer. Read first.

- **TabM: Parameter-Efficient Ensembling** (2025, ICLR) — DEFAULT BACKBONE
  `topics/complex-feature-tokenization/records/works_json/tabm-parameter-efficient-ensembling.json`
  Depth deep · Route feature-interaction-selection · Flat-concat per-feature PLE embeddings + k=32 MLP ensemble;
  #1-ranked tabular DL model, linear in feature count to 986 features. The concrete Recipe-A backbone.

- **PyTorch Frame (stype encoder registry)** (2025, PyG) — RUNNABLE BUILD SCAFFOLD
  `topics/complex-feature-tokenization/records/works_json/pytorch-frame-stype-library.json`
  Depth deep · Route libraries-and-implementations · stype → swappable per-stype encoder → concatenate into
  `[B, num_cols, d]`; broadest first-class stype coverage, NaN as index-0, high-cardinality escape hatch via
  `text_embedded`. The cleanest runnable scaffold for the build goal.

- **rtdl (FT-Transformer + PLE/Periodic/PLR reference impl)** (2025, Yandex) — RUNNABLE NUMERICAL LEG
  `topics/complex-feature-tokenization/records/works_json/rtdl-research-tabular-dl-library.json`
  Depth deep · Route libraries-and-implementations · `rtdl_num_embeddings` (MIT) drop-in PLR/PLE/Periodic;
  `rtdl_revisiting_models` (Apache-2.0) FT-Transformer. The old monolithic `rtdl` package is deprecated — use the
  split packages.

- **On Embeddings for Numerical Features** (2022)
  `topics/complex-feature-tokenization/records/works_json/on-embeddings-numerical-features.json`
  Depth deep · Route numerical-embeddings · The numerical leg: PLE/Periodic/PLR; source of the param-blow-up and
  target-leakage pitfalls.

- **FT-Transformer (Revisiting Deep Learning Models for Tabular Data)** (2021)
  `topics/complex-feature-tokenization/records/works_json/ft-transformer-revisiting-tabular-dl.json`
  Depth deep · Route tabular-transformers · The minimal per-feature mixed-type scaffold every later tokenizer
  extends; its O(features²) attention is the measured (TabReD) scaling wall.

- **TabFormer / TabBERT (Tabular Transformers for Time Series)** (2021, ICASSP) — CLOSEST TO THE FULL SETTING
  `topics/complex-feature-tokenization/records/works_json/tabformer-tabular-transformers-multivariate-time-series.json`
  Depth deep · Route temporal-feature-tokenization · Per-field quantization + a field-transformer that compresses a
  wide row to one embedding BEFORE a sequence-transformer over rows — the temporal-static skeleton for the user's
  mixed time-varying + static setting. Caveats: 11–12 fields, order-discarding bins, no high-cardinality path.

- **Encoding High-Cardinality String Categoricals (MinHash / Gamma-Poisson)** (2020)
  `topics/complex-feature-tokenization/records/works_json/encoding-high-cardinality-string-categoricals.json`
  Depth deep · Route categorical-high-cardinality · The vocabulary-free, OOV-robust high-cardinality primitive; read
  the not-a-metric-space pitfall before feeding it to attention.

- **TabPFN-2.5** (2025, Prior Labs) — STRONGEST BUY-DONT-BUILD BASELINE · confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabpfn-2-5-foundation-model.json`
  Depth deep · Route tabular-foundation-models · Feature-cell grouping + deeper stack push the validated ceiling to
  50k rows × 2,000 features; best DEFAULT on TabArena. First foundation model comfortably covering 70+ features.
  Caveats: vendor report, default-XGBoost headline, proprietary distillation, non-commercial license, no temporal/
  high-cardinality.

## Important Supporting Reads

- **Feature-aware Modulation (temporal tabular)** (2025, NeurIPS) — NEW · token-level temporal-static fusion
  `topics/complex-feature-tokenization/records/works_json/feature-aware-modulation-temporal-tabular.json`
  Depth deep · Route temporal-feature-tokenization · FiLM-style time-conditioned per-feature Yeo-Johnson + affine on
  TabReD; first deep method to consistently beat GBDTs under temporal shift (on TabM). Numeric-only; conflicts with
  full PLR; thin margins.

- **LimiX (open-weights tabular foundation model)** (2025) — NEW · confidence medium
  `topics/complex-feature-tokenization/records/works_json/limix-large-tabular-foundation-model.json`
  Depth deep · Route tabular-foundation-models · Apache-2.0; DFE low-rank additive column-identity code + masked
  joint-distribution → prediction+imputation+generation; <10k-feature envelope. DFE is the most reusable new
  wide-table primitive.

- **TabPFN-Wide (extreme feature counts)** (2025) — NEW
  `topics/complex-feature-tokenization/records/works_json/tabpfn-wide-extreme-feature-counts.json`
  Depth deep · Route tabular-foundation-models · Continued pre-training on a feature-widening prior → 30k–70k
  features with NO tokenizer change. The transferable lever is prior-engineering to extend a feature ceiling.
  Caveat: HDLSS-only (few rows, high correlation, omics), classifier-only, high-cardinality bounded out.

- **TimeXer: Exogenous/Endogenous Fusion** (2024, NeurIPS)
  `topics/complex-feature-tokenization/records/works_json/timexer-exogenous-endogenous-fusion.json`
  Depth deep · Route temporal-feature-tokenization · Role-asymmetric tokenization + global bridge token →
  LINEAR-in-context-feature-count fusion; tolerates misaligned/missing/different-frequency features. The Recipe-B
  exogenous lever.

- **Moirai (Unified Universal Forecasting)** (2024, ICML) — NEW
  `topics/complex-feature-tokenization/records/works_json/moirai-unified-universal-forecasting.json`
  Depth deep · Route timeseries-foundation-models · Any-variate Attention = parameter-free, UNBOUNDED
  same/different-field bias + RoPE — a zero-per-feature-param field-identity signal. Caveat: numeric-series only,
  quadratic in variates×length.

- **TimesFM (decoder-only patch foundation model)** (2024, ICML) — NEW
  `topics/complex-feature-tokenization/records/works_json/timesfm-patch-decoder-foundation.json`
  Depth deep · Route timeseries-foundation-models · Continuous patch-as-token (RevIN-scale, MLP-embed, MSE) —
  ordinality-preserving, the foil to Chronos value-bins. Univariate-only.

- **TOTEM (Tokenized Time-series Embeddings)** (2024, TMLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/totem-tokenized-time-series-embeddings.json`
  Depth deep · Route timeseries-foundation-models · Learned frozen VQ-VAE codebook + RevIN; direct tokens-beat-patches
  ablation. Reusable learned-VQ option for the numeric/time-varying half; univariate.

- **Chronos (value-tokenization)** (2024, TMLR) — NEW
  `topics/complex-feature-tokenization/records/works_json/chronos-time-series-tokenization.json`
  Depth deep · Route timeseries-foundation-models · Scale + uniform-quantize into a fixed ~4094-bin vocab +
  cross-entropy. Zero-architecture-change numeric tokenizer; distance-unaware, fixed-range overflow on spikes.

- **BatchEnsemble** (2020, ICLR)
  `topics/complex-feature-tokenization/records/works_json/batchensemble-efficient-ensembles.json`
  Depth deep · Route feature-interaction-selection · Rank-one fast-weight adapters give k members at ~O(width) extra
  params, feature-count-independent — the tokenizer-agnostic ensembling wrapper TabM rides on.

- **MIMO: Independent Subnetworks for Robust Prediction** (2021, ICLR)
  `topics/complex-feature-tokenization/records/works_json/mimo-independent-subnetworks-robust-prediction.json`
  Depth deep · Route feature-interaction-selection · Multiplex M members through one backbone; near-zero-cost
  robustness wrapper around any tokenizer.

- **RealMLP (Better by Default)** (2024, NeurIPS) — NEW
  `topics/complex-feature-tokenization/records/works_json/realmlp-better-by-default-tabular-mlp.json`
  Depth deep · Route feature-interaction-selection · Flat-concat MLP + per-feature embedding/preprocessing bag-of-tricks
  + meta-tuned default, matches CatBoost / beats FT-T/SAINT at linear cost. The runnable single-model sibling of TabM.
  Caveat: no explicit interaction; fixed 8-dim high-cardinality embedding.

- **High-Cardinality Categorical Encoding (target/OOF/CatBoost-ordered)** (2024 synthesis) — NEW
  `topics/complex-feature-tokenization/records/works_json/high-cardinality-categorical-encoding-kaggle-writeup.json`
  Depth deep · Route industrial-feature-systems · Production recipe: collapse any-cardinality ID column to a few
  target-aware scalars; the durable lesson is the leakage-control discipline (OOF + time-respecting / ordered TS).

- **Compositional / Quotient-Remainder Embeddings** (2020, KDD) — NEW
  `topics/complex-feature-tokenization/records/works_json/compositional-embeddings-quotient-remainder.json`
  Depth deep · Route recsys-tokenization-transfer · O(√|S|) memory categorical-embedding compression via
  complementary-partition tables; production-deployed in DLRM. Memory only — never improves accuracy.

- **Hash Embeddings** (2017, NeurIPS) — NEW
  `topics/complex-feature-tokenization/records/works_json/hash-embeddings-efficient-word-representations.json`
  Depth deep · Route recsys-tokenization-transfer · Multi-hash into a shared pool + learnable importance weights =
  collision-repair high-cardinality primitive (+k params per value). Pays off only above a cardinality threshold.
  Pre-recency-floor historical anchor.

- **TP-BERTa: PLMs Great on Tabular Prediction** (2024, ICLR)
  `topics/complex-feature-tokenization/records/works_json/tp-berta-lm-tabular-prediction.json`
  Depth deep · Route llm-tabular-serialization · RMT (magnitude-aware numeric tokens, +12.45% AUC over raw-digit) +
  IFA (name+value → one token); category semantics transfer. Caveats: ≤32-feature pretraining, categorical-dominated.

- **DCN-V2: Improved Deep & Cross Network** (2020)
  `topics/complex-feature-tokenization/records/works_json/dcn-v2-deep-cross-network.json`
  Depth deep · Route feature-interaction-selection · Field-count-scalable Hadamard cross; demoted — failed to transfer
  on TabReD (rank 7.6).

- **AMFormer: Arithmetic Feature Interaction** (2024, AAAI)
  `topics/complex-feature-tokenization/records/works_json/amformer-arithmetic-feature-interaction.json`
  Depth deep · Route feature-interaction-selection · Prompt-token queries (measured linear-in-N at 2000 features) +
  multiplicative attention. Caveat: log-ReLU instability, synthetic-favorable necessity claim.

- **AutoInt: Automatic Feature Interaction Learning** (2019)
  `topics/complex-feature-tokenization/records/works_json/autoint-feature-interaction.json`
  Depth deep · Route feature-interaction-selection · Field-shared attention (params feature-count-independent), O(M²)
  compute.

- **TabNet: Attentive Interpretable Tabular Learning** (2019)
  `topics/complex-feature-tokenization/records/works_json/tabnet-attentive-interpretable-tabular.json`
  Depth deep · Route feature-interaction-selection · O(features) sparsemax SELECTION gate; borrow the gate, replace
  the impoverished encoding.

- **TabR: Retrieval-Augmented Tabular DL** (2024)
  `topics/complex-feature-tokenization/records/works_json/tabr-retrieval-tabular.json`
  Depth deep · Route feature-interaction-selection · Instance-axis (sample) retrieval is feature-count-invariant by
  construction, but underperforms on TabReD (-2.78% vs MLP) under drift and carries a train/deploy retrieval-leakage
  hazard. The unresolved retrieval contradiction.

- **Temporal Fusion Transformer** (2021)
  `topics/complex-feature-tokenization/records/works_json/temporal-fusion-transformer.json`
  Depth deep · Route temporal-feature-tokenization · The only real static-fusion mechanism (three-way split, VSN
  gating, static context vectors); its "many features" is entities, not features.

- **iTransformer** (2024)
  `topics/complex-feature-tokenization/records/works_json/itransformer-inverted-transformers.json`
  Depth deep · Route temporal-feature-tokenization · Variate-as-token + joint attention (N=862); the joint-attention
  counterpoint to TimeXer's single bridge token. All-numeric variates.

- **PatchTST (A Time Series is Worth 64 Words)** (2023)
  `topics/complex-feature-tokenization/records/works_json/patchtst-time-series-64-words.json`
  Depth deep · Route temporal-feature-tokenization · Patching = the time-varying tokenizer; borrow patching, drop
  channel-independence.

- **TabICL: Foundation Model for In-Context Learning on Large Data** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabicl-in-context-large-data.json`
  Depth deep · Route tabular-foundation-models · Shared zero-per-feature-param column embedder + column-collapse-to-row
  + RoPE; the most reusable scaling primitive (Recipe C).

- **CARTE: Pretraining and Transfer for Tabular Learning** (2024)
  `topics/complex-feature-tokenization/records/works_json/carte-pretraining-transfer-tabular.json`
  Depth deep · Route tabular-foundation-models · Open-vocabulary LM-on-column-names; strong on high-cardinality
  strings; validated small-scale, weak numerical encoder.

- **TabTransformer: Contextual Categorical Embeddings** (2020)
  `topics/complex-feature-tokenization/records/works_json/tabtransformer-contextual-categorical-embeddings.json`
  Depth deep · Route tabular-transformers · Column-identifier-by-concatenation + per-column MISSING row + ELECTRA-style
  pretraining. Numerics bypass the transformer.

- **Entity Embeddings of Categorical Variables** (2016)
  `topics/complex-feature-tokenization/records/works_json/entity-embeddings-categorical-variables.json`
  Depth deep · Route categorical-high-cardinality · Historical anchor; per-field learned embedding (no OOV bucket,
  leakage risk). Pre-recency-floor.

- **TabArena: A Living Benchmark** (2025)
  `topics/complex-feature-tokenization/records/works_json/tabarena-living-benchmark.json`
  Depth deep · Route tabular-transformers · The IID fair-evaluation harness; bounds foundation-model claims to ≤500
  features, excludes temporal. Complement to TabReD's time-split harness.

## Shallow But Strategic

(No shallow records exist — all 54 are deep. These are deep but lower-confidence, scope-limited, or cautionary;
read for the idea, not the headline numbers.)

- **RQ-Kmeans Semantic IDs (OneRec)** (2025) — NEW · confidence medium
  `topics/complex-feature-tokenization/records/works_json/rqkmeans-semantic-ids-generative-retrieval.json`
  Route recsys-tokenization-transfer · k-means-on-residuals codebooks (training-free) fix RQ-VAE codebook collapse —
  the actionable upgrade for bounding high-cardinality vocabulary. Caveats: quantizer sees one pre-fused embedding,
  ablation cells unconfirmed, utilization ≠ accuracy, recsys-only.

- **DLRM (Criteo CTR feature encoding)** (2019) — NEW
  `topics/complex-feature-tokenization/records/works_json/dlrm-criteo-ctr-feature-encoding.json`
  Route industrial-feature-systems · The production "one d-token per field + explicit pairwise dot product +
  embedding sharding" recipe; closest production analogue to the user's setting. Pitfalls: dense-block collapse,
  O(F²) interaction, "scales" = tables not tokens.

- **TabFlex (linear attention)** (2025, ICML) — NEW
  `topics/complex-feature-tokenization/records/works_json/tabflex-scaling-tabpfn-linear-attention.json`
  Route tabular-foundation-models · Scales the SAMPLE axis (millions of rows), not features; contributes the
  causal-is-worse-for-tabular-ICL negative result. No feature tokenizer of its own.

- **TabPFN v2** (2025) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabpfn-v2.json`
  Per-cell + two-way attention, native missing handling; small-data only. Headline numbers secondhand (Nature).
  Superseded by TabPFN-2.5 for the feature ceiling.

- **TabICL v2** (2026) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tabicl-v2-scalable-foundation-model.json`
  Source of the transferable target-aware embedding (TAE). Preprint; pretraining code unreleased; gains bake in
  8-shuffle ensembling.

- **XTab: Cross-table Pretraining** (2023, ICML)
  `topics/complex-feature-tokenization/records/works_json/xtab-cross-table-pretraining.json`
  Cross-table pretraining transfers the interaction BACKBONE, NOT the tokenizer. Read for the tokenizer/backbone
  decoupling lesson.

- **UniTabE: Universal Tabular Encoder** (2024, ICLR)
  `topics/complex-feature-tokenization/records/works_json/unitabe-universal-tabular-encoder.json`
  Per-cell (column-name, data-type, value) key-value tokenizer with Fuse + Linking gates; tested at 80–85 columns.
  Caveat: textualized numerics, sequence-length blowup.

- **ExcelFormer: Semi-Permeable Attention** (2024, KDD)
  `topics/complex-feature-tokenization/records/works_json/excelformer-semi-permeable-attention.json`
  Two bolt-on regularizers worth borrowing; its "tokenizer" CatBoost-scalarizes categoricals (lossy, leakage-prone).
  NOT a categorical/temporal tokenizer.

- **Trompt: Prompt-Based Tabular** (2023, ICML)
  `topics/complex-feature-tokenization/records/works_json/trompt-prompt-tabular.json`
  O(P·C) column-embedding + soft-prompt importance gate; large activation constant, naive numeric leg, TabReD rank
  5.4 (= plain MLP). Borrow the column-embedding-as-intrinsic-property idea.

- **SAINT: Row Attention and Contrastive Pre-Training** (2021)
  `topics/complex-feature-tokenization/records/works_json/saint-row-attention-contrastive.json`
  Intersample (row) attention + contrastive pretraining; row attention is quadratic in feature count (does NOT solve
  scaling) and batch-composition-dependent.

- **T2G-Former: Feature Relation Graphs** (2023, AAAI)
  `topics/complex-feature-tokenization/records/works_json/t2g-former-graph-tabular.json`
  Learned sparse interaction PRIOR; a prior, not a FLOP saving (stays O(M²)); capped at 93 features.

- **AutoDis: Numerical Discretization for CTR** (2021, KDD)
  `topics/complex-feature-tokenization/records/works_json/autodis-numerical-discretization.json`
  Soft, parameter-bounded per-field discretization; cheaper-per-field numeric alternative, beaten by PLE/PLR. τ is
  load-bearing.

- **TabLLM: Few-shot Classification with LLMs** (2023)
  `topics/complex-feature-tokenization/records/works_json/tabllm-few-shot-llm-serialization.json`
  Cautionary: ≤30-column token-budget ceiling. Keep the column-name nugget and the permuted-names ablation protocol.

- **LIFT: Language-Interfaced Fine-Tuning** (2022, NeurIPS)
  `topics/complex-feature-tokenization/records/works_json/lift-language-interfaced-finetuning.json`
  Cautionary: regression collapse at p≥50, raw-digit numerics. Reusable: shuffled-names validation protocol.

- **GReaT: LLMs are Realistic Tabular Generators** (2023, ICLR)
  `topics/complex-feature-tokenization/records/works_json/great-generative-tabular-llm.json`
  Generation-side anchor; the reusable nugget is the random feature-order-permutation training. Evidence ≤47 features.

## Lower Priority

- **TIGER / RQ-VAE Semantic IDs** (2023) — confidence medium
  `topics/complex-feature-tokenization/records/works_json/tiger-rqvae-semantic-ids.json`
  Recsys-native; only the RQ-VAE discretize-into-hierarchical-codes kernel transfers (now superseded by RQ-Kmeans
  for codebook robustness). Never cite its numbers as tabular-prediction evidence.

- **Why do tree-based models still outperform deep learning on tabular data?** (2022)
  `topics/complex-feature-tokenization/records/works_json/tree-models-outperform-deep-tabular.json`
  Motivation and rules-of-the-game (rotation invariance, irregular targets, uninformative-feature fragility), NOT a
  verdict on the user's setting — it excludes high-cardinality, missing, and temporal data.
</content>
