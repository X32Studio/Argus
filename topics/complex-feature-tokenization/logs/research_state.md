## orchestrator_directive 

USER DIRECTIVE (cycle 14): EXPAND SCOPE + find broader data sources. Four new execution_routes were added and are currently UNEXPLORED (0 works each): timeseries-foundation-models, recsys-tokenization-transfer, industrial-feature-systems, libraries-and-implementations. For the next several cycles the planner SHOULD:
- Prioritize candidates in these 4 new routes (treat as the "new" slot of iteration_mix).
- Broaden source TYPES beyond arXiv papers: include OSS repos/libraries (work_type=repo/library), engineering/industrial blog writeups (work_type=blog), benchmarks, and Kaggle/competition writeups.
- Pull transferable machinery from adjacent fields (time-series foundation models: Chronos/MOMENT/Moirai/TimesFM/Lag-Llama; recsys: TIGER/RQ-VAE/semantic-IDs/DLRM; production feature systems).
- Keep tying everything to the build goal (a tokenizer for 70+ mixed numerical+high-cardinality-categorical, temporal+static features) and to time-based-split evaluation.

---

# Research state

## technique_dedup cycle 21 — 2026-06-16T21:00:00Z (synthesis pass)

Light, conservative technique-node merge run during the cycle-21 (third) synthesis, executing the deferred
dedup flagged in the Cycle 16 batch-B note ("Graph dedup note (deferred, not blocking)"). Only CLEAR
semantic duplicates were merged; merely-related techniques were left intact. For each pair the canonical
node was kept, all edges from the duplicate were rewired onto the canonical, the resulting triples were
deduped on `(src, rel, dst)`, any self-loop the merge would create was dropped, and the duplicate node was
deleted.

Four pairs merged (duplicate → canonical):
- `technique:vqvae-codebook-tokenization` (TOTEM's learned-codebook tokenizer, 5 edges) →
  `technique:vq-vae-quantization` (the foundational VQ-VAE codebook+commitment node that RQ-VAE `extends`).
- `technique:revin-instance-normalization` (TOTEM, 1 edge) → `technique:instance-normalization-revin`
  (the existing PatchTST-introduced canonical; both works now `uses_technique` the one node).
- `technique:patch-tokenization-time-series` (1 edge) → `technique:temporal-patch-tokenization`
  (PatchTST-introduced canonical, used also by TimeXer and Moirai).
- `technique:rqvae-semantic-ids` (1 edge) → `technique:rq-vae-semantic-id` (TIGER-introduced canonical,
  the hub of the RQ-VAE/RQ-Kmeans/semantic-ID lineage with 9 pre-existing edges).

Result: 339 → 335 nodes (technique 144 → 140; route 12 / work 54 / transferable_idea 39 / pitfall 90
unchanged), 571 edges preserved (no triples collided, no self-loops created — the only candidate self-loop,
`vqvae-codebook-tokenization alternative_to rqvae-semantic-ids`, did not arise because the two endpoints
merged onto DIFFERENT canonical nodes). `bash .claude/skills/argus/scripts/validate-contract.sh --fix
complex-feature-tokenization` → **exit 0**, "All topics PASS the contract", no auto-fixes, 54
belongs_to_route (= 54 work nodes = 54 master_index lines). NOT merged (kept as distinct, related-not-duplicate):
`scale-and-uniform-quantize-value-tokenization` (Chronos fixed-uniform value bins) vs
`vq-vae-quantization` (learned codebook) vs `per-field-quantization-local-vocabulary` (TabFormer per-field
bins) — three genuinely different discretizers; and `rq-kmeans-residual-quantization` vs `rq-vae-semantic-id`
(k-means-on-residuals vs gradient-learned codebooks — a real `alternative_to`, not a duplicate).

## Cycle 19 — 2026-06-16T12:21:00Z (collation, fanout=3, verify=off)

Three deep records collated this cycle (all `flagged: 0`, all `analysis_depth: deep`). Two land in `tabular-foundation-models`, one in `recsys-tokenization-transfer`.

### New directions explored
- **tabular-foundation-models** — the *efficiency/scaling* sub-axis (TabFlex) and a current open-weights foundation model (LimiX), pushing past the existing TabPFN-v2 / TabICL / CARTE / XTab anchors.
- **recsys-tokenization-transfer** — first *learned-codebook* anchor (RQ-Kmeans), complementing the prior fixed-codebook / hashing anchors (Q-R, hash embeddings) and connecting to the existing TIGER/RQ-VAE record.

### Works deeply analyzed (not just collected)
- **TabFlex** (ICML 2025, arXiv:2506.05584) — replaces TabPFN's quadratic softmax self-attention with **non-causal linear attention** (kernel feature map phi=elu+1), making attention O(N) in the number of SAMPLES while preserving permutation-invariance over context. Per-SAMPLE token granularity (one row = one token); contributes NO new feature tokenizer. Strong negative result worth keeping: CAUSAL sequence models (Mamba/SSM, causal linear attention) are systematically worse for tabular ICL because example order should not matter. Route: tabular-foundation-models.
- **RQ-Kmeans** (OneRec 2502.18965 / Technical Report 2506.13695) — builds each residual-quantization layer's codebook by running **k-means on the previous layer's residuals** (Lloyd centroids = codebook; nearest-centroid = assignment), training-free, instead of gradient-learned RQ-VAE codebooks. Reported near-perfect codebook utilization, attacking RQ-VAE's codebook-collapse failure mode. The quantizer sees ONE pre-fused multimodal+collaborative embedding, never raw heterogeneous features. Route: recsys-tokenization-transfer.
- **LimiX** (arXiv:2509.03505, Apache-2.0 open weights) — per-cell tokens + **Discriminative Feature Encoding (DFE)**, a low-rank (rank p/4) additive column-identity code, + **Context-Conditional Masked Modeling (CCMM)**, a masked joint-distribution objective over synthetic SCM/DAG priors, so one model does prediction + imputation + generation. Top-ranked across 11 benchmarks vs TabPFN-v2 / TabICL / AutoGluon / XGBoost; validated envelope <=50k rows, <10k features, <=10 classes (70+ features fits comfortably). Route: tabular-foundation-models.

### Strongest actionable technical ideas added
- **DFE low-rank additive column-identity code (LimiX)** — the single most reusable mechanism this cycle: gives a permutation-equivariant per-cell tokenizer a cheap way to tell 70+ columns apart with no per-feature positional table and no per-column embedding matrix (parameter count independent of cardinality). Pairs with CCMM to serve prediction + imputation + generation from one tokenizer.
- **RQ-Kmeans (k-means-on-residuals codebook)** — a cheap, training-free drop-in replacement for RQ-VAE codebooks that empirically avoids codebook collapse; directly attacks the dead-code risk flagged in the TIGER/RQ-VAE record. Transferable hook recorded as `transferable_idea:kmeans-on-residuals-codebook-for-high-cardinality` (bound a high-cardinality field, or a whole 70-feature row embedding, to a short hierarchical code tuple).
- **Non-causal linear attention backbone (TabFlex)** — the efficient-attention substrate you would pair with a real feature tokenizer for very long contexts; plus the empirical lesson to keep attention non-causal (order-invariant) for tabular ICL.

### Records still shallow / needing deeper reading
- None new. All three are deep with mechanism + ablations + transfer assessment extracted (honesty gate satisfied). Two carry `confidence: medium` (RQ-Kmeans: ablation cells not re-confirmed; LimiX: self-reported preprint, author-run baselines) — flagged in their pitfalls and route notes.

### Weakest / most misleading directions (pitfalls flagged into the graph)
- **random-projection-not-feature-tokenization (TabFlex)** — the abstract's "thousands of features" is a random-projection capacity ceiling (d>1000 lossily projected to 1000), NOT faithful per-feature tokenization; "scales to millions" refers to SAMPLES, orthogonal to the 70+-FEATURE goal.
- **utilization-is-not-downstream-accuracy (RQ-Kmeans)** — better codebook utilization/entropy is a tokenizer-internal metric, not evidence of better downstream tabular accuracy; reported online watch-time gains are whole-system, not tokenizer-isolated.
- **quantizer-sees-one-prefused-embedding (RQ-Kmeans)** — RQ-Kmeans never touches raw heterogeneous features; the heavy multimodal encoder upstream (miniCPM-V-8B + QFormer + contrastive alignment) does the hard 90%. K-means on residuals is the easy 10%.
- **dispatch-title-claims-tabpfn25-headtohead-but-benchmarks-tabpfn-v2 (LimiX)** — the dispatch framing "vs TabPFN-2.5 / TabICLv2 at scale" is anachronistic; LimiX (Sep 2025) benchmarks TabPFN-v2 and TabICL(v1) only. Do not cite it as beating TabPFN-2.5 (Nov 2025).

### Graph changes and newly connected concepts
- Added 3 work nodes (each with a `belongs_to_route` edge): `work:tabflex-scaling-tabpfn-linear-attention` → tabular-foundation-models; `work:rqkmeans-semantic-ids-generative-retrieval` → recsys-tokenization-transfer; `work:limix-large-tabular-foundation-model` → tabular-foundation-models.
- Added 8 technique nodes (non-causal-linear-attention, sample-as-token-icl, softmax-self-attention, mamba-ssm, rq-kmeans-residual-quantization, discriminative-feature-encoding, context-conditional-masked-modeling, two-way-feature-sample-attention), 1 transferable_idea (kmeans-on-residuals-codebook-for-high-cardinality), 4 pitfall nodes. 16 nodes / 26 edges added total (339 nodes, 571 edges now).
- Cross-work links: TabFlex `compared_against` TabPFN-v2; RQ-Kmeans `improves_on` TIGER and its technique `alternative_to` the existing `technique:rq-vae-semantic-id` (ties the learned-codebook lineage RQ-VAE → RQ-Kmeans into the discretization-vq/recsys cluster); LimiX `improves_on`/`compared_against` TabPFN-v2 and `compared_against` TabICL + TabArena, tying the new foundation model into the existing foundation-model cluster.
- **Node-id normalizations during collation** (single-writer remap/drop of subagent-proposed edges that would dangle):
  - TabFlex `improves_on work:tabpfn` — DROPPED. No `work:tabpfn` node exists (only `work:tabpfn-v2`), and the record explicitly states TabFlex does NOT improve on v2 (v2 is concurrent), so there is no faithful target.
  - TabFlex `compared_against work:tabpfn` — REMAPPED to `work:tabpfn-v2` (TabPFNv2 is in the paper's baselines; the closest existing lineage node).
  - RQ-Kmeans `alternative_to technique:rq-vae-semantic-ids` — REMAPPED to the existing `technique:rq-vae-semantic-id` (singular) introduced by the TIGER record, to avoid forking a duplicate technique node.
  - LimiX DFE `transferable_to topic` — DROPPED. `topic` is not a `<kind>:<slug>` node; the transfer relevance is already carried by the work's `belongs_to_route` edge.
  - LimiX DFE `enables_scaling feature:high-feature-count` — REMAPPED to `enables_scaling route:feature-interaction-selection` (`feature:` is not an allowed node kind; feature-interaction-selection is the scaling-to-many-features execution route).

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: MMQ multimodal mixture-of-quantization tokenization (arXiv:2508.15281) or EAGER/RPG/LIGER industrial semantic-ID variants for the recsys-transfer route; OR a real high-cardinality/temporal candidate (TabReD/TabArena-native) since both new foundation models still lack true high-cardinality and temporal paths.
- **deepen**: isolate LimiX's **DFE low-rank column-identity code** as a drop-in column tokenizer for a *supervised* (non-ICL) wide-table model — the cleanest 70+-feature primitive this cycle; verify against TabICL's shared Set-Transformer column embedder.
- **challenge**: both new foundation models claim wide-table coverage but TabFlex's win is **confounded** (hard-dataset gains also use more training data) and LimiX's gaps are ~0.01-0.03 AUC with author-run baselines and TabPFN-overlapping benchmark sets. Next cycle should either find topic-native (70+ high-cardinality, temporal-split) evidence or scope these recommendations down. Also: cell-by-cell verify the RQ-Kmeans>RQ-VAE utilization/entropy table (PDF Sec 2.1.2) before citing it as fact.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis change this cycle (synthesis_every_n_cycles = 7). This cycle adds the DFE column-identity primitive, the RQ-Kmeans codebook-collapse fix, and the non-causal-linear-attention scaling lesson to the evidence base for the eventual scaling-and-interaction / categorical-and-high-cardinality / architectures-and-foundation-models sections.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write challenges were absorbed into the `pitfalls` fields and the route notes above (claims scoped/confounding-noted, not overturned). Two records carry `confidence: medium` and an explicit "verify before citing" follow-up (RQ-Kmeans ablation cells; LimiX baseline tuning + imputation/generation tables).

## contract_violations  2026-06-16T12:21:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 339 nodes (12 route / 54 work / 144 technique / 39 transferable_idea / 90 pitfall), 571 edges, 54 belongs_to_route (one per work node). No auto-fixes required; no residual violations. 2 subagent-proposed edges were intentionally dropped during collation (TabFlex `improves_on work:tabpfn` — no faithful node; LimiX DFE `transferable_to topic` — invalid node id) and 3 were remapped to existing/valid nodes (see Cycle 19 graph-changes notes); these were single-writer normalizations, not validator violations.

## Cycle 18 — 2026-06-16T12:15:00Z (collation, fanout=3, verify=off)

Fanout-3 deep-read batch (per-work isolation respected; single-parent collation). All three records
landed `analysis_depth: deep`, all returned `flagged: 0` — **0 flagged claims this cycle**. Theme:
all three close the still-thin **temporal-static fusion** gap plus the **wide-feature ceiling** problem —
a data-side scaling lever for a frozen foundation model (TabPFN-Wide), a FiLM-style time-conditioned
input transform (Feature-aware Modulation), and the canonical first transformer treatment of tabular
TIME SERIES that supplies a reusable temporal-static skeleton (TabFormer/TabBERT).

### New / deepened directions explored this cycle
- **tabpfn-wide-extreme-feature-counts** (arXiv:2510.06162, 2025 → route `tabular-foundation-models`, **new**):
  continued pre-training + a synthetic **feature-widening prior** (continuous widening + redundant-copy
  augmentation of the SCM prior) pushes TabPFNv2's ~500-feature ceiling to **30k–70k features WITHOUT any
  tokenizer/architecture change** — it disables v2's cell-grouping to keep a strict 1:1 token-to-feature
  map, then only ADAPTS THE WEIGHTS. This is the first work in the memory demonstrating a **data-side
  (prior-engineering) scaling lever** as opposed to an architecture-side one. Surfaces a direct design
  tension with TabPFN-2.5's feature-grouping (group-of-3) stance, hence the `contradicts` edge.
- **feature-aware-modulation-temporal-tabular** (arXiv:2512.03678, 2025 → route `temporal-feature-tokenization`,
  **new/deepen**): a lightweight FiLM-style hypernetwork ("modulator") consumes a shared temporal embedding
  ψ(t) (Fourier periodic priors over year/month/day/hour + a trend term) and emits **per-feature**
  γ/β/λ vectors that drive a time-conditioned **Yeo-Johnson power transform + affine** at the RAW INPUT
  level, before any tokenizer. Evaluated on TabReD (15-seed, code released). High actionability for the
  time-varying NUMERICAL half; explicitly flags a conflict with PLR/periodic numerical embeddings (both
  reshape the numeric input distribution, so gains do not stack).
- **tabformer-tabular-transformers-multivariate-time-series** (arXiv:2011.01843, 2021 → route
  `temporal-feature-tokenization`, **deepen** of the temporal skeleton): IBM's TabBERT/TabGPT — the first
  transformer treatment of tabular TIME SERIES. Per-field **quantization to a local vocabulary** (every
  column, numeric or categorical, discretized into its own finite vocab + learned per-bin embedding) feeding
  a **hierarchical field-then-sequence transformer** (a field-transformer compresses a row's N field-tokens
  to ONE row embedding; a sequence-transformer then runs over rows). This row-compression-before-temporal
  pattern is the directly reusable temporal-static-fusion skeleton for the 70+-mixed goal.

### Works deeply analyzed (not just collected)
- All three: mechanism + ablations + transfer assessment extracted (honesty gate satisfied). Each carries
  scoped transfer claims and a pitfalls block (refute-before-write applied — claims scoped, not overturned).

### Strongest actionable technical ideas added
- **Prior-engineering to extend a feature ceiling (TabPFN-Wide)**: widen the synthetic pretraining prior +
  continued pre-training to push a per-feature tokenizer past its feature-count ceiling, with no tokenizer
  or architecture change. The cheapest known lever to move a frozen foundation model into a new feature
  regime — but HDLSS-scoped (see pitfalls).
- **Time-conditioned per-feature modulation (Feature-aware Modulation)**: a cheap, drop-in input-level
  Yeo-Johnson + affine reparameterization driven by a shared temporal-embedding hypernetwork (FiLM-for-tables)
  that aligns each numeric feature to a shared temporal basis before tokenization.
- **Uniform quantized-token interface + row-compression (TabFormer)**: discretize numeric AND categorical
  fields into per-field vocabularies so one transformer ingests heterogeneous types uniformly, then collapse
  each row's N field-tokens to one row embedding so the temporal model sees rows, not cells — a clean
  sequence-length control for wide tables.

### Records still shallow / needing deeper reading
- None new. All three are deep. Their next-experiments are recorded as route next_angles (compose Yeo-Johnson
  temporal modulation before a real FT-T/PLR tokenizer; replace TabFormer quantization bins with PLR/AutoDis;
  widen a TabPFNv2 regressor / TabICL the same way).

### Weakest / most misleading directions (pitfalls flagged into the graph)
- **hdlss-prior-assumes-low-sample-high-correlation (TabPFN-Wide)**: the feature-widening prior assumes a
  high-dimension / low-sample-size regime with high feature correlation; transfer to many-row, low-correlation,
  mixed temporal+static wide tables is unproven. Evidence is strong-for-HDLSS-relative-gains,
  weak-for-interpretability.
- **incompatible-with-plr-embeddings (Feature-aware Modulation)**: the time-conditioned input modulation and
  PLR/periodic numerical embeddings both reshape the numeric input distribution; gains do not stack and may
  cancel. Absolute margins are thin and the large gains appear only over weak backbones.
- **quantization-discards-numerical-order / weak-baselines-raw-features-only / scaling-untested-beyond-12-fields
  (TabFormer)**: per-field quantization loses magnitude/monotonicity (the weakness PLR/AutoDis fix); frozen-feature
  gains are shown only vs raw features (no GBDT/FT-Transformer/numerical-embedding bar); validated only at 11–12
  fields on synthetic fraud data — the field-then-sequence hierarchy is untested at 70+ heterogeneous fields.

### Graph changes and newly connected concepts
- Added **3 work nodes**, each with a `belongs_to_route` edge: `work:tabpfn-wide-extreme-feature-counts` →
  tabular-foundation-models; `work:feature-aware-modulation-temporal-tabular` and
  `work:tabformer-tabular-transformers-multivariate-time-series` → temporal-feature-tokenization.
- Added **9 technique nodes** (feature-widening-synthetic-prior, continued-pretraining-foundation-adaptation,
  film-feature-wise-linear-modulation, yeo-johnson-power-transform, time-conditioned-feature-modulation,
  per-field-quantization-local-vocabulary, hierarchical-field-then-sequence-transformer, masked-field-modeling-mlm,
  per-feature-token-stream), **4 transferable_idea nodes**, and **5 pitfall nodes**. Total 21 new nodes
  (302 → 323); 33 edges added (512 → 545).
- Cross-work links: TabPFN-Wide `improves_on`/`uses_technique` TabPFN-v2, `compared_against` TabICL / RealMLP /
  Grinsztajn (tree-models-outperform-deep-tabular), `uses_technique` TabArena (benchmark), and `contradicts`
  TabPFN-2.5 — wiring it into the foundation-model + benchmark clusters. Feature-aware Modulation
  `compared_against` TabM and FT-Transformer. TabFormer `compared_against` TabNet, with PatchTST `alternative_to`
  TabFormer; its per-field-quantization technique is `alternative_to` PLE.
- **Dedup / cleanup applied during collation (single-writer):**
  - `work:tabm` → retargeted to existing `work:tabm-parameter-efficient-ensembling` (slug fragmentation fix).
  - `work:ft-transformer` → retargeted to existing `work:ft-transformer-revisiting-tabular-dl`.
  - `technique:piecewise-linear-numerical-embedding` → retargeted to existing `technique:piecewise-linear-encoding`
    (TabFormer's `alternative_to` edge) to avoid a duplicate PLE node.
  - **Dropped 1 malformed edge**: `(technique:feature-widening-synthetic-prior, enables_scaling, enables_scaling)`
    — `dst` was the rel-type token `enables_scaling`, not a node id; it would have created a dangling node.
    The intended scaling relationship is captured by the work's `belongs_to_route` + the HDLSS pitfall and
    the prior-engineering transferable_idea.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: a temporal-static fusion candidate that actually carries a numeric magnitude-aware encoder (the
  TabFormer + PLR/AutoDis composition), OR Real-TabPFN / TabFlex / TuneTables as TabPFN-Wide siblings.
- **deepen**: read the TabReD temporal-embedding origin (Cai & Ye 2025) and the Rubachev TabReD benchmark for
  per-dataset feature counts/cardinality — needed to ground every "70+ mixed" transfer claim in topic-native data.
- **challenge**: the implicit recommendation that prior-engineering (TabPFN-Wide) and time-conditioned modulation
  scale to the 70+-MIXED (temporal+static, high-cardinality, many-row) regime is UNVERIFIED — TabPFN-Wide is
  HDLSS-only and Feature-aware Modulation is numeric-only. Next cycle should either find topic-native evidence
  (TabReD/TabArena at 70+ high-card) or scope these recommendations down.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis pass this cycle (synthesis is periodic). This cycle strengthens the
  temporal-static-fusion evidence base (now: PatchTST / TFT / iTransformer / TimeXer + Feature-aware Modulation +
  TabFormer) and adds the first data-side feature-ceiling-extension lever (TabPFN-Wide) to the
  foundation-model cluster.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write
  challenges were absorbed into the `pitfalls` fields (above), which scope the transfer claims rather than
  overturn them.

## contract_violations  2026-06-16T12:15:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 323 nodes (12 route / 51 work / 136 technique / 38 transferable_idea / 86 pitfall), 545 edges, 51 belongs_to_route (one per work node). No auto-fixes required; no residual violations. One malformed proposed edge (`technique:feature-widening-synthetic-prior → enables_scaling`, dst was a rel-token not a node) was dropped during collation BEFORE the validator ran, so it never reached the graph.

## Cycle 17 — 2026-06-16T20:00:00Z (collation, fanout=3, verify=off)

Third fanout-3 deep-read batch this session (per-work isolation respected; single-parent collation).
All three records landed `analysis_depth: deep`, all returned `flagged: 0` — **0 flagged claims this
cycle**. Theme: three orthogonal pieces of the 70+-mixed-feature build goal — a **continuous
time-series tokenizer** (TimesFM, the foil to Chronos value-bins), the **runnable numerical-embedding
reference hub** (rtdl), and the **current SOTA tabular foundation model that finally covers the
feature-count target** (TabPFN-2.5).

### New / deepened directions explored this cycle
- **timesfm-patch-decoder-foundation** (Das/Kong/Sen/Zhou, Google Research, ICML 2024, arXiv:2310.10688 →
  route `timeseries-foundation-models`, **deepen**): a *continuous* patch-as-token tokenizer — RevIN-scale
  by the FIRST input patch only, cut the context into length-32 patches, embed each with a small MLP
  residual block (no codebook, no quantization), then a decoder-only causal transformer with the
  deliberate output_patch_len(128) > input_patch_len(32) asymmetry to cut AR steps. Loss is MSE in value
  space (ordinality preserved), the exact opposite of Chronos's bin-vocabulary cross-entropy. It is the
  third contrasting numeric tokenizer in this route (Chronos value-bins / Moirai multi-patch+any-variate /
  TimesFM continuous-patch), plus TOTEM's learned-VQ option.
- **rtdl-research-tabular-dl-library** (Gorishniy/Rubachev/Babenko, Yandex Research, 2025 → route
  `libraries-and-implementations`, **new** for this route's 2nd anchor): the canonical maintained
  reference impl of the two tokenizers the topic centers on — FT-Transformer's per-feature affine token
  (rtdl_revisiting_models, Apache-2.0) and PLE/Periodic/**PLR** numerical embeddings
  (rtdl_num_embeddings, MIT v0.0.12). The cleanest runnable scaffold for the numerical+categorical core;
  its sole native scaling lever is Linformer kv-compression.
- **tabpfn-2-5-foundation-model** (Prior Labs, arXiv:2511.08667, 2025 → route
  `tabular-foundation-models`, **challenge/deepen**): direct successor to TabPFN v2; **feature-cell
  grouping (group size 3, up from 2)** + a deeper dual-attention stack push the VALIDATED ceiling to
  50,000 rows x 2,000 features (5x rows, 4x features over v2). This is the first tabular foundation model
  comfortably covering the topic's 70+-feature target on small/medium tables — it sharpens the
  foundation-models route's prior caveat that TabPFN-v2/TabICL all sat at/below their <=100-feature
  pretraining regime.

### Strongest actionable technical ideas added
- **Continuous patch-as-token (TimesFM)**: RevIN-scale a recent window of a numeric/temporal channel, cut
  into fixed-length patches (~16–32), embed each with a small MLP residual block → a continuous,
  ordinality-preserving token at ~1/p the token count of per-point. The h>p long-output-patch trick is a
  reusable decoding-efficiency lever for long unknown horizons. (transferable_idea:continuous-patch-token-mlp-embed)
- **Feature-cell grouping (TabPFN-2.5)**: bundling adjacent feature-cells into groups of 3 compresses the
  feature-axis sequence ~1.5x and is the lever that took the validated feature ceiling 500 → 2,000 at
  roughly fixed attention cost — a cheap way to extend a permutation-invariant feature tokenizer to many
  more columns. Plus thinking-rows (attention sinks), TTA-over-feature-transforms+SVD pseudo-features, and
  a distill-to-MLP/tree deployment path. (transferable_idea:feature-grouping-for-many-columns)
- **rtdl_num_embeddings as the runnable numerical leg**: drop-in PyTorch PLR/PLE/Periodic modules + a
  built-in Linformer kv-compression knob — the cleanest starting point for the continuous half of a
  heterogeneous tokenizer, composable with pytorch-frame's categorical/multicategorical stypes.

### Records still shallow / needing deeper reading
- None new — all three are `deep`. Their own next-experiments (covariate-aware TimesFM-2.x;
  rtdl PLR+Linformer at 70+ features under a time split; TabPFN-Wide / distill-to-MLP reproduction) are
  recorded as route next_angles.

### Weakest / most misleading directions (pitfalls flagged into the graph)
- **timesfm-univariate-no-covariates-and-in-corpus-not-zero-shot**: TimesFM is strictly univariate — zero
  machinery for categorical/static/multi-channel fusion (the topic's hard part). Its "zero-shot" headline
  holds for held-out benchmark families (Monash/Darts/Informer) but Electricity/Traffic/Weather/M4 ARE in
  the training mix, so those are not zero-shot.
- **vendor-report-default-xgboost-baseline (TabPFN-2.5)**: a Prior Labs technical report (not
  peer-reviewed); the 100% win rate is vs DEFAULT (untuned) XGBoost — the genuinely strong claims are the
  87% rate and the AutoGluon-1.4 match. Confidence on this record kept at **medium** for that reason.
- **proprietary-distillation-engine-noncommercial-license (TabPFN-2.5)**: the most production-relevant
  contribution (low-latency distill-to-MLP/tree path) is proprietary and unreleased; weights are under a
  non-commercial license — blocks production use without a paid enterprise license.

### Graph changes and newly connected concepts
- Added **12 nodes** (3 work + 4 technique + 2 transferable_idea + 3 pitfall) and **27 edges**.
- Work nodes each carry a `belongs_to_route` edge: timesfm → timeseries-foundation-models; rtdl →
  libraries-and-implementations; tabpfn-2-5 → tabular-foundation-models.
- **Dedup remaps to avoid graph fragmentation** (loop.md dedup gate): three rtdl-proposed technique slugs
  were retargeted to the existing canonical nodes —
  `ft-transformer-feature-tokenizer`→`technique:feature-tokenizer`,
  `plr-periodic-linear-relu-embedding`→`technique:plr-embedding`,
  `piecewise-linear-encoding-ple`→`technique:piecewise-linear-encoding`. This re-uses, rather than
  duplicates, the FT-Transformer / PLR / PLE technique nodes already introduced by
  ft-transformer-revisiting-tabular-dl and on-embeddings-numerical-features.
- New technique nodes: `linformer-kv-compression` (rtdl's scaling lever), `feature-cell-grouping`,
  `thinking-rows-attention-sinks`, `tta-feature-transform-svd-augmentation` (TabPFN-2.5).
- **Bridge edge added during collation**: `technique:feature-cell-grouping --extends-->
  technique:repeated-feature-grouping` (TabICL-v2's prior grouping idea) so the two grouping techniques
  cluster instead of fragmenting.
- Cross-work links now tie the new works into existing clusters: timesfm `improves_on` patchtst,
  `alternative_to` chronos + moirai; tabpfn-2-5 `improves_on`/`extends` tabpfn-v2, `compared_against`
  tabarena + tabicl-v2; rtdl `alternative_to` pytorch-frame, `compared_against` ft-transformer,
  `transferable_to` route:numerical-embeddings.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis written yet (synthesis_every_n_cycles = 7; next synthesis due per
  orchestrator scheduling). This cycle (a) strengthens the timeseries-foundation-models route's
  "continuous-patch vs value-bin vs VQ" tokenizer-family map, (b) adds the second runnable
  libraries-and-implementations anchor, and (c) redirects the foundation-models conclusion: TabPFN-2.5 is
  the first foundation model whose VALIDATED feature ceiling (2,000) comfortably clears the 70+-feature
  target — but only on small/medium tables, with temporal + high-cardinality + many-rows still open.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: TabPFN-Wide (arXiv:2510.06162) for extreme feature counts via continued pretraining, OR a
  genuine temporal-static fusion candidate (still the thinnest part of the corpus).
- **deepen**: benchmark the rtdl PLR/PLE + Linformer kv-compression stack at 70+ features under a
  time-based split — turn the "Linformer is the one scaling knob, unbenchmarked in-library" caveat into
  topic-native evidence.
- **challenge**: TabPFN-2.5's 70+-feature coverage is on small/medium tables and the headline win is vs
  default XGBoost; next cycle should pressure it on a wide high-cardinality TabReD/TabArena task vs tuned
  GBDTs, and test whether feature-cell grouping helps a supervised (non-in-context) tokenizer.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write
  challenges were absorbed into each record's `pitfalls` field (above), scoping the transfer claims
  rather than overturning them.

## contract_violations  2026-06-16T20:00:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 302 nodes (12 route / 48 work / 127 technique / 34 transferable_idea / 81 pitfall), 512 edges, 48 belongs_to_route (one per work node). No auto-fixes required; no residual violations. master_index.jsonl (48 lines) == works_json/*.json (48) == work nodes (48).

## Cycle 16 (batch B) — 2026-06-16T11:46:00Z (collation, fanout=3, verify=off)

Second fanout-3 deep-read batch of cycle 16 (collated separately from batch A above). Three works
deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`,
all `confidence: high`, all `flagged: 0` — **0 flagged claims this batch**. Theme: filling the two
half-specific tokenizer legs of the 70+-mixed-feature goal — the **time-varying numeric half** (a learned
VQ time-series tokenizer) and the **high-cardinality categorical half** (production target-encoding
discipline) — plus a **challenge** to the "attention is required for wide tables" line via a strong
linear-cost MLP.

**New directions explored / works deeply analyzed:**
- **totem-tokenized-time-series-embeddings** (Talukder/Yue/Gkioxari, TMLR 12/2024, arXiv 2402.16412 →
  route `timeseries-foundation-models`): first *learned vector-quantized* TS tokenizer in the corpus. A
  self-supervised VQVAE (strided 1D-conv encoder, F=4 temporal compression, frozen K=256 / D=64 codebook,
  RevIN normalization) turns a continuous waveform into a short sequence of distance-aware discrete codes;
  the same frozen codebook serves imputation/anomaly/forecasting. Direct **tokens-vs-patches ablation**
  (PatchTOTEM) isolates the gain to the discrete representation for BOTH transformer and MLP heads.
- **realmlp-better-by-default-tabular-mlp** (Holzmüller/Grinsztajn/Steinwart, NeurIPS 2024, arXiv
  2407.04491 → route `feature-interaction-selection`): the **challenge** record — a flat-concat MLP with a
  per-feature embedding/preprocessing "bag of tricks" (robust-scale + smooth-clip, optional PBLD periodic
  numerical embeddings, a learnable per-feature diagonal scaling layer) plus a meta-tuned-default (TD)
  training recipe, competitive with CatBoost-TD and beating FT-Transformer/SAINT at *linear* cost and with
  *no per-dataset HPO*. Strengthens the "attention may be unnecessary for 70+ features" line alongside TabM.
- **high-cardinality-categorical-encoding-kaggle-writeup** (synthesis of Micci-Barreca 2001 + CatBoost
  NeurIPS 2018 arXiv 1706.09516 + Pargent et al. arXiv 2104.00629 + Kaggle winners → route
  `industrial-feature-systems`, cross-linked to `categorical-high-cardinality`): the production recipe for
  collapsing any-cardinality ID columns to a fixed handful of *target-aware scalar* columns, with
  mandatory leakage control (out-of-fold / leave-one-out / CatBoost ordered TS) and empirical-Bayes
  smoothing toward a global prior. Distinct from the existing vocabulary-free string-n-gram encoder
  (`encoding-high-cardinality-string-categoricals`): this is *supervised* scalar encoding.

**Strongest actionable ideas from this batch:**
- **Frozen VQ codebook + RevIN as a domain-agnostic numeric tokenizer** (TOTEM): RevIN decouples
  scale/level from shape (mu/sigma carried as side channels), so one small frozen codebook models only
  NORMALIZED morphology and is shared across channels — adding numeric features is linear. Learned VQ
  beats both Chronos fixed bins (`alternative_to`) and PatchTST raw patches (`improves_on`) on these tasks.
- **Meta-tuned-default (TD) methodology** (RealMLP): tune ONE config on a meta-train suite, freeze it,
  ship strong out-of-the-box per-feature embeddings + preprocessing so a downstream pipeline needs no
  per-dataset HPO. The most portable artifact of the paper; the PBLD embedding and learnable diagonal
  scaling layer are secondary, smaller-magnitude contributions.
- **Leakage-control discipline** (Kaggle/CatBoost): the durable, model-agnostic lesson is "compute every
  target-derived feature from data the row never saw" (OOF / LOO / ordered-permutation prefix), shrunk to a
  global prior by count-dependent smoothing — the cheapest, OOV-robust way to admit ID-like fields into a
  70+-feature tokenizer.

**Assumptions / risks that limit transfer (refute-before-write held; all recorded as pitfalls):**
- TOTEM is univariate/channel-independent with **no heterogeneous-feature fusion**
  (`pitfall:no-heterogeneous-feature-fusion`): no categorical, no static covariates, no native
  missing-token — exactly the topic's hard part is unaddressed. Its headline AvgWins is a *count-of-best-cells*
  metric, NOT mean error, and the strong zero-shot numbers are vs a single self-trained GPT2 generalist
  (`pitfall:avgwins-count-metric-not-mean-error`); K=256 is chosen for downstream parsimony, not
  reconstruction optimality.
- RealMLP is filed under `feature-interaction-selection` but models **no explicit feature interaction** —
  the diagonal scaling layer is per-feature reweighting only (`pitfall:route-mismatch-no-explicit-feature-interaction`);
  its only tie to the route is linear-cost handling of many features. High-cardinality is a constant 8-dim
  embedding with no frequency awareness, untested on thousands of categories
  (`pitfall:high-cardinality-fixed-8dim-embedding`); no missing-numeric and no temporal support — both
  required by the topic. "Many features" on meta-test is mostly one-hot-expanded width, not a controlled
  70+-native-field sweep.
- Target encoding's dominant failure mode is **label leakage** (`pitfall:target-encoding-label-leakage`):
  naive greedy full-data encoding leaks the row's own label and collapses out-of-sample; OOF/LOO/ordered is
  mandatory. The scalars are tuned for GBDT inequality splits — the tree-benchmark win does NOT
  automatically transfer to an attention/MLP tokenizer (it competes with, rather than beats, a learned
  embedding). Supervised-only, per-target, so unavailable for self-supervised tokenization.

**Graph changes (single-writer collation):** +24 nodes (3 work, 16 technique, 5 pitfall), +41 edges
(deduped by `(src,dst,rel)`; zero collisions with the 444 pre-existing). All three new `work:` nodes carry
a `belongs_to_route` edge (TOTEM→timeseries-foundation-models, RealMLP→feature-interaction-selection,
Kaggle-writeup→industrial-feature-systems). Cross-work links added: TOTEM `compared_against`
PatchTST/iTransformer and `alternative_to` Chronos; RealMLP `compared_against`
FT-Transformer/SAINT/Tree-models and `alternative_to` TabM and `uses_technique`→
work:on-embeddings-numerical-features; Kaggle-writeup `alternative_to`
encoding-high-cardinality-string-categoricals/entity-embeddings and `compared_against` DLRM. New
technique→technique lineage: VQVAE-codebook `improves_on` patch-tokenization and `alternative_to`
fixed-uniform-binning + rqvae-semantic-ids; out-of-fold and ordered target-statistics both `improves_on`
leave-one-out; target-encoding `alternative_to` one-hot/entity-embeddings.

**Route-index changes:** TOTEM added to `timeseries-foundation-models` (now 3 anchors: Chronos
value-tokenization vs Moirai patch+any-variate vs TOTEM learned-VQ); evidence_quality=high,
actionability=medium (reusable for the homogeneous numeric half only). RealMLP added to
`feature-interaction-selection` with a note flagging the route mismatch (no explicit interaction; scalable
backbone baseline like TabM). Kaggle-writeup added to `industrial-feature-systems` (now 2 anchors: DLRM
field-tokens + this target-encoding recipe) and cross-linked under `categorical-high-cardinality`.

**Records still shallow / needing deeper reading:** none from this batch (all deep). Standing gap
unchanged and now sharper: every tokenizer in the corpus still solves ONE leg (numeric-temporal OR
high-cardinality-categorical) in isolation — no work yet proves *joint* tokenization + fusion of mixed
time-varying + static + high-cardinality features at genuine 70+ width.

**Report conclusions touched:** strengthens `temporal-static-fusion` / `numerical-feature-tokenization`
with a learned-VQ option (TOTEM) distinct from fixed-bin (Chronos) and patch (PatchTST/Moirai);
strengthens `categorical-and-high-cardinality` with the production target-encoding leg + leakage
discipline to complement entity embeddings, QR/hash compression, and MinHash string codes; strengthens
`scaling-and-interaction` / `architectures-and-foundation-models` with RealMLP as evidence that a
linear-cost MLP can match attention tokenizers at 70+ features. No conclusion overturned. Synthesis still
pending (synthesis_every_n_cycles=7).

**Best next directions:** (1) head-to-head **TOTEM learned-VQ vs Chronos fixed-bins vs MOMENT patches** as
the numeric tokenizer for the time-varying half, and probe whether RevIN + shared-codebook transfers to
per-feature numeric *columns* in a wide tabular setting; (2) test a **target-encoded scalar fed into an
attention/MLP tokenizer** to settle whether the GBDT target-encoding win transfers to a deep tokenizer
(time-respecting OOF folds vs CatBoost ordered TS on transaction data); (3) compose RealMLP's
**PBLD/diagonal-scaling front-end with a high-cardinality target/hash leg and a temporal VQ leg** — the
first genuine attempt at jointly tokenizing all three feature halves the three records each cover singly.

**Graph dedup note (deferred, not blocking):** four newly-created technique IDs are near-duplicates of
existing canonical nodes and SHOULD be merged in a future deliberate dedup pass (kept as-proposed this
cycle to keep the per-work records' edges resolvable under single-writer collation):
`technique:vqvae-codebook-tokenization` ≈ existing `technique:vq-vae-quantization`;
`technique:revin-instance-normalization` ≈ existing `technique:instance-normalization-revin`;
`technique:patch-tokenization-time-series` ≈ existing `technique:temporal-patch-tokenization`;
`technique:rqvae-semantic-ids` ≈ existing `technique:rq-vae-semantic-id`. The validator does not flag
semantic technique duplicates (it checks only node-id prefix, `kind`, edge `rel`, and dangling edges), so
this is a candidate cleanup for a later cycle, not a contract violation.

## contract_violations  2026-06-16T11:46:00Z

`bash .claude/skills/argus/scripts/validate-contract.sh --fix complex-feature-tokenization` → exit 0,
**no residual violations**. 290 nodes ({route:12, work:45, technique:123, transferable_idea:32,
pitfall:78}), 485 edges, 45 `belongs_to_route` (= 45 work nodes = 45 master_index lines). No auto-fixes
required.

## Cycle 16 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Sixteenth cycle, continuing the cycle-14 USER DIRECTIVE (expand into the new routes / broaden source
types). Three works deep-read in parallel (per-work isolation respected; single-parent collation). All
three landed `deep`, all `confidence: high`, all `flagged: 0` — **0 flagged claims this batch**.

**New directions explored / works deeply analyzed:**
- **compositional-embeddings-quotient-remainder** (Shi et al. 2020, arXiv 1909.02107 → route `recsys-tokenization-transfer`): the quotient-remainder trick — two complementary index maps share an O(sqrt(|S|)) embedding budget; multiple complementary partitions compose into one embedding. First record covering high-cardinality categorical embedding-table *compression* (fixed-codebook complementary partitions), as opposed to learned semantic-ID codebooks (TIGER) or per-id entity-embedding tables. Production-deployed in Meta DLRM.
- **moirai-unified-universal-forecasting** (Woo et al., ICML 2024 Salesforce, arXiv 2402.02592 → route `timeseries-foundation-models`): any-variate attention (parameter-free binary field-ID bias + RoPE, unbounded variates), a multi-patch-size projection bank {8,16,32,64,128}, and a 4-component mixture output head; pretrained on LOTSA (27.6B obs), sizes 14M/91M/311M, ablations Table 7. Second TS-foundation anchor, contrasting Chronos value-tokenization.
- **hash-embeddings-efficient-word-representations** (Tito Svenstrup et al., NeurIPS 2017, arXiv 1709.03933 → route `recsys-tokenization-transfer`, cross-linked to `categorical-high-cardinality`): importance-weighted multi-hash into a shared component-vector pool — the canonical *learnable collision-repair* alternative to entity-embedding tables.

**Strongest actionable ideas from this batch:**
- **Any-variate attention** (Moirai) is a parameter-free, *unbounded* field-provenance encoding (binary field-ID bias + RoPE) — directly reusable to tell a transformer which of 70+ heterogeneous features a token came from, with zero per-feature parameters. Edges: `transferable_to` and `enables_scaling` → `route:feature-interaction-selection`.
- **Quotient-remainder / complementary-partition embeddings** bound categorical embedding memory to O(sqrt(|S|)) — a tiny standalone reusable layer for million-cardinality ID columns. New `transferable_idea:bound-high-cardinality-categorical-memory`.
- **Hash embedding** = multi-hash + learned importance weights over a shared pool; the collision-tolerant high-cardinality primitive that `extends`/`improves_on` the plain hashing trick and is an `alternative_to` entity embeddings.

**Assumptions / risks that limit transfer (refute-before-write held; all recorded as pitfalls):**
- QR/compositional embeddings are a *memory-compression* trick only: they save memory, do NOT improve accuracy, and give no help for numerical features (`pitfall:cqr-categorical-only-no-accuracy-gain`). Evidence is single-dataset (Criteo), non-transformer MLP/cross-net, vs a hashing baseline only.
- Moirai any-variate attention is quadratic in (variates × sequence length) (`pitfall:quadratic-variates-times-length`) and has no categorical/static pathway — variates are numeric series only (`pitfall:no-categorical-or-static-path`).
- Hash embeddings degenerate to the plain hashing trick at k=1 (`pitfall:first-layer-d1-collision-indistinguishable`) and only pay off above a cardinality threshold (`pitfall:hashing-only-helps-above-cardinality-threshold`). 2017 is below the 2018 recency_floor — kept `deep` as a foundational anchor alongside entity-embeddings (2016); noted as a historical-anchor exception, not new SOTA.

**Graph changes (single-writer collation):** +17 nodes (3 work, 8 technique, 1 transferable_idea, 5 pitfall), +35 edges. Three node-id normalizations applied during collation to avoid graph fragmentation (see contract_violations note below): proposed `technique:rqvae-semantic-ids` → existing canonical `technique:rq-vae-semantic-id`; proposed `technique:entity-embedding` → existing canonical `technique:entity-embedding-categorical`; proposed `technique:patch-tokenization` → existing canonical `technique:temporal-patch-tokenization`. Moirai subagent returned several bare-slug node ids (`moirai-…`, `patchtst-…`, `itransformer-…`, `temporal-fusion-transformer`, `chronos-…`) which were prefixed with `work:` before merge. All three new `work:` nodes carry a `belongs_to_route` edge. No edge `rel` outside `graph_edge_types` (none dropped).

**Route-index changes:** **opened `recsys-tokenization-transfer` in the route index for the first time** (it was a declared execution_route with a graph node but had no route_index entry) — now seeded with both QR and hash-embeddings as representative works. Added Moirai to `timeseries-foundation-models` (now 2 anchors: Chronos value-tokenization vs Moirai patch+any-variate). Added hash-embeddings as a cross-link representative work under `categorical-high-cardinality`.

**Records still shallow / needing deeper reading:** none from this batch (all deep). Standing gaps unchanged: no work yet proves high-cardinality categorical INPUTS or temporal/static fusion at genuine 70+ heterogeneous width; `industrial-feature-systems` and `libraries-and-implementations` still single-anchor.

**Report conclusions touched:** strengthens the `categorical-and-high-cardinality` section with two concrete bounded-memory primitives (QR compression + hash-embedding collision repair) to complement entity embeddings (closed-vocab) and MinHash (vocabulary-free); strengthens `temporal-static-fusion` / `scaling-and-interaction` with any-variate attention as a parameter-free field-provenance lever. No conclusion overturned.

**Best next directions:** (1) head-to-head QR/compositional vs RQ-VAE semantic IDs vs hashing as high-cardinality compression on a 70+-feature tokenizer; (2) wire any-variate attention's field-ID bias into the FT-Transformer/pytorch-frame tokenizer and stress-test the (variates×length) quadratic cost via variate subsampling; (3) add a categorical/static pathway to Moirai's numeric-only any-variate scheme.

## contract_violations  2026-06-16T11:34:00Z

`bash .claude/skills/argus/scripts/validate-contract.sh --fix complex-feature-tokenization` → exit 0, **no residual violations**. 266 nodes ({route:12, work:42, technique:107, transferable_idea:32, pitfall:73}), 444 edges, 42 `belongs_to_route` (= 42 work nodes = 42 master_index lines). Three node-id normalizations were applied in-collation BEFORE the validator ran (proposed near-duplicate techniques remapped onto existing canonical nodes: `rqvae-semantic-ids`→`rq-vae-semantic-id`, `entity-embedding`→`entity-embedding-categorical`, `patch-tokenization`→`temporal-patch-tokenization`) and bare-slug node ids returned by the Moirai subagent were `work:`-prefixed; the validator therefore needed no auto-fix.

## Cycle 15 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Fifteenth cycle, and the first to execute the cycle-14 USER DIRECTIVE (expand scope into the four new
routes / broaden source types). Three works deep-read in parallel (per-work isolation respected;
single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0` — **0 flagged
claims this batch**. This batch opens **three of the four new execution_routes in a single cycle** and
broadens source TYPES beyond arXiv papers (a `library` work_type for the first time): a *new*
time-series-foundation-model anchor (Chronos, `timeseries-foundation-models`), a *new*
production/industrial anchor (DLRM, `industrial-feature-systems`), and a *new* runnable build-goal
reference library (PyTorch Frame, `libraries-and-implementations`). The batch's coherent theme: *the same
"one fixed-width token per field, in a shared d-dim space" primitive recurs across three very different
ecosystems — TS foundation models bin a scalar into a fixed codebook; production recsys gives each field
one learned embedding; the flagship tabular library wraps both behind a swappable per-stype encoder
registry.*

### New directions explored
- **new — value-tokenization via scale + uniform-quantize (timeseries-foundation-models):** Chronos
  (TMLR 2024) mean-scales each scalar by the mean ABSOLUTE value of the context (zeros preserved), then
  UNIFORMLY quantizes into a fixed ~4094-bin vocabulary over a normalized [-15,+15] range, then trains an
  off-the-shelf T5-class LM with plain cross-entropy ("regression via classification"). Zero architecture
  change; the tokenizer IS the contribution. First time-series foundation model in the corpus; anchors the
  value-tokenization family (vs the patch-based TimesFM/Moirai/MOMENT and VQ-based TOTEM families, still
  unexplored).
- **new — production CTR field-token + explicit dot-product interaction (industrial-feature-systems):**
  DLRM (Facebook AI, 2019; the MLPerf rec benchmark) gives each of 26 categorical fields its own embedding
  table (one token per field), MLP-projects the entire 13-dim dense block into ONE token, then models
  second-order interaction by explicit PAIRWISE DOT PRODUCT, with model-parallel embedding-table sharding
  for web-scale tables. The closest *production* analogue to the 70+-mixed-feature build goal.
- **new — stype/encoder registry as a runnable tokenizer scaffold (libraries-and-implementations):**
  PyTorch Frame (PyG team / Kumo.AI, arXiv 2404.00776, lib v0.3.0 Nov 2025, MIT) compiles a DataFrame +
  per-column semantic-type (stype) map into a TensorFrame + col_stats, then dispatches each column to a
  swappable per-stype StypeEncoder (numerical / categorical / multicategorical / text+embedding /
  timestamp) and concatenates into one `[B, num_cols, d]` sequence, with NaN as a first-class index-0
  token. First `library` work_type and first runnable build-goal reference.

### Works deeply analyzed (not just collected)
1. **chronos-time-series-tokenization** (2024, TMLR) — mean-abs-scale + uniform 4094-bin quantization +
   cross-entropy LM training; flexible (multimodal) predictive distribution from the softmax. Strong
   zero-shot benchmark, but univariate-only and a fixed range that overflows on spikes.
2. **dlrm-criteo-ctr-feature-encoding** (2019, Facebook AI) — per-field embedding tables + MLP-projected
   dense token + explicit pairwise dot-product interaction + model-parallel embedding sharding; runnable
   MLPerf reference. Accuracy comparison is weak (single untuned one-epoch DLRM-vs-DCN run).
3. **pytorch-frame-stype-library** (2025, PyG) — stype -> StypeEncoder -> concatenate registry,
   col_stats-driven encoder init, NaN-as-index-0. Engineering infrastructure, not a new tokenization
   algorithm (bundled encoders — FT affine, PLR periodic, quantile bucket — are prior work re-implemented).

### Strongest actionable technical ideas so far (this cycle's additions)
- **Scale-then-uniformly-quantize a continuous value into a small fixed codebook + train any transformer
  with cross-entropy** (Chronos) — a zero-architecture-change numeric tokenizer that turns regression into
  classification and yields a flexible predictive distribution.
  `transferable_idea:numeric-value-binning-into-fixed-codebook-for-transformer`. (Caveat: univariate, fixed
  range; must be re-scoped PER FEATURE for a heterogeneous 70+-feature table.)
- **One fixed-width-d token per field in a shared space + EXPLICIT pairwise interaction** (DLRM) — make
  every heterogeneous field emit one d-token, then model interaction explicitly (dot product) rather than
  relying on a deep MLP to discover it. `transferable_idea:shared-d-field-token-space`. (Caveat: dense
  features collapsed into ONE token → no per-numerical interaction; pairwise dot product is O(F^2) in
  fields.)
- **stype -> swappable per-stype encoder -> concatenate registry** (PyTorch Frame) — decouple WHAT a column
  means (semantic type) from HOW it is tokenized (a swappable encoder), encode every column into the same
  d-channel space, stack into one `[B, num_cols, d]` sequence. The cleanest runnable scaffold for the build
  goal, with NaN first-class. `transferable_idea:stype-encoder-registry-for-heterogeneous-feature-typing`.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`. The persistent structural gap is unchanged and now seen from
  three NEW angles: none of the three handles the 70+-feature + high-cardinality + genuine-temporal triple.
  Chronos is univariate (no covariates/static/categoricals) with a fixed range; DLRM collapses all dense
  features into one token and pays O(F^2) interaction; PyTorch Frame's timestamp stype is calendar-feature
  encoding (not patch/forecast), has no built-in high-cardinality compression, and no learned missingness
  mask beyond NaN-as-index-0. The "one token per field" lever now has three more independent instances, but
  the wide-mixed-temporal stress test remains demonstrated nowhere.

### Weakest / most misleading directions (pitfalls recorded this cycle)
- **fixed-range-overflow-and-precision-loss** (Chronos): the [-15,+15] quantization range overflows for
  sparse/spiky series (when 1 > 15/n the spike is unrepresentable) and loses precision for
  large-dynamic-range values — a hazard when re-scoping to heterogeneous tabular features.
- **univariate-only-no-covariates-or-categoricals** (Chronos): no covariates, static attributes, or
  multivariate/categorical modeling — covariate handling is deferred to adapters or LightGBM stacking. Do
  NOT read Chronos as a mixed-type tokenizer.
- **dense-features-collapsed-into-one-token** (DLRM): all 13 dense features go through one bottom MLP into a
  SINGLE token, so individual numerical features cannot interact pairwise — the opposite of per-feature
  numerical tokenization (PLR/FT).
- **scaling-claim-conflates-tables-with-interacting-tokens** (DLRM): "scales to large models" addresses
  web-scale DATA + huge embedding TABLES (via sharding), NOT many interacting feature TOKENS (pairwise dot
  product stays O(F^2)). Do not cite DLRM as evidence the architecture scales to 70+ interacting fields.
- **no-learned-missingness-mask** + **timestamp-not-true-temporal-tokenization** +
  **no-builtin-high-cardinality-compression** (PyTorch Frame): NaN is just index-0 (no learned mask);
  timestamp is calendar-feature encoding not patch/forecast tokenization; no high-cardinality compression
  encoder. Cite it as runnable infrastructure, not as a method that solves the topic's hard cases.

### Graph changes and newly connected concepts
- Added **18 nodes** (3 works, 7 techniques, 3 transferable_ideas, 5 pitfalls) and **36 edges**. Graph now
  **249 nodes / 409 edges**, **39 belongs_to_route edges (one per work node)**. All three new work nodes
  carry `belongs_to_route` edges into the three newly-opened routes (timeseries-foundation-models,
  industrial-feature-systems, libraries-and-implementations).
- **Node reconciliation during collation (single-writer dedup):** four subagent-proposed endpoints were
  remapped to existing canonical nodes to avoid graph fragmentation:
  - Chronos `technique:autodis-numerical-discretization` (an `alternative_to` contrast target) →
    existing `technique:autodis`.
  - PyTorch Frame `technique:per-feature-affine-tokenizer` → existing `technique:feature-tokenizer`
    (FT-Transformer's per-feature affine token; same mechanism, label matches verbatim).
  - PyTorch Frame `technique:plr-periodic-numerical-embedding` → existing `technique:plr-embedding`
    (PLR = Periodic+Linear+ReLU).
  - PyTorch Frame `technique:quantile-bucket-numerical-embedding` → existing
    `technique:hard-discretization-binning` (the bucket encoder is fixed-bin hard discretization).
- **`scope:` is not a valid node kind** (the contract allows only route/work/technique/transferable_idea/
  pitfall). PyTorch Frame proposed two edges into `scope:70-plus-heterogeneous-features`; these were split
  by rel: the `transferable_to` edge was retargeted to a new
  `transferable_idea:stype-encoder-registry-for-heterogeneous-feature-typing` node (the natural "transferable
  to the 70+ setting" semantics), and the `enables_scaling` edge to `route:libraries-and-implementations`
  (precedent: cycle-11 retargeted the `scaling-interaction` concept-key edge to a route). Semantics
  preserved; contract satisfied.
- Cross-route / cross-work bridges established: Chronos `compared_against` PatchTST and TFT (the temporal
  route's existing anchors); its scale+uniform-quantize technique is `alternative_to` AutoDis (soft
  discretization) — wiring the value-tokenization family to the discretization-vq route. DLRM
  `uses_technique` entity-embeddings (the categorical-embedding ancestor), `compared_against` DCN-V2,
  `alternative_to` AutoInt and TIGER/RQ-VAE (the recsys-tokenization comparisons). PyTorch Frame
  `uses_technique` six in-corpus works (FT-Transformer, on-embeddings/PLR, ExcelFormer, Trompt, TabNet,
  TabTransformer) — it is the library that actually bundles the tokenizers this topic has been deep-reading,
  so it functions as an integration hub linking the tabular-transformer / numerical-embedding clusters to a
  runnable scaffold.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new:** open the fourth still-empty route, **recsys-tokenization-transfer** (TIGER/RQ-VAE already sit
  under discretization-vq; add a distinct semantic-ID / generative-retrieval or hashing/compositional-
  embedding anchor — QR embeddings, Bloom embeddings — to ground high-cardinality compression). OR add a
  second TS-foundation-model with a DIFFERENT tokenizer family (TimesFM/Moirai patch-based, or TOTEM VQ) to
  contrast value-tokenization vs patch vs VQ.
- **deepen:** wire a high-cardinality compression encoder and a patch/forecast temporal stype into the
  PyTorch Frame registry — the most concrete path to a runnable 70+-mixed-feature tokenizer that closes
  PyTorch Frame's three recorded gaps.
- **challenge (highest value):** the still-deferred wide-mixed-temporal stress test, now with three more
  contenders to disentangle on a genuine 70+-feature high-cardinality TabReD/TabArena task under a
  time-based split — (a) Chronos-style per-feature value-binning for the numeric leg, (b) DLRM
  field-token + dot-product interaction, (c) the PyTorch Frame registry as the integration substrate —
  reporting AUC AND params/latency. Converts three high-confidence-but-narrow claims into demonstrated ones.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. The refute-before-write
  challenges were absorbed into the `pitfalls` fields (above), which SCOPE the transfer claims (Chronos's
  fixed-range overflow + univariate-only; DLRM's dense-token collapse + O(F^2) scaling-claim conflation;
  PyTorch Frame's NaN-only missingness + calendar-only timestamp + no high-card compression) rather than
  overturning them.

## contract_violations  2026-06-16T11:25:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 249 nodes
  (12 route / 39 work / 99 technique / 31 transferable_idea / 68 pitfall), 409 edges, 39 belongs_to_route
  (one per work node). No auto-fixes required; no residual violations. The four fragmenting technique
  endpoints (`autodis-numerical-discretization`, `per-feature-affine-tokenizer`,
  `plr-periodic-numerical-embedding`, `quantile-bucket-numerical-embedding`) and the invalid
  `scope:70-plus-heterogeneous-features` endpoint were remapped/split during collation, before the
  validator ran, so it found nothing to fix.

## Cycle 14 — 2026-06-16 (mode=SYNTHESIS) — synthesis note

Second synthesis pass (REFRESH; synthesis_every_n_cycles = 7). Rewrote `report/main.md` (10 sections per
`topic.yaml.report_sections[]`), refreshed `report/reference_index.md` (now 36 works in the 4-tier guide),
appended `report/iteration_log.md`. All 18 NEW records (cycles 8-13) read in full; on-embeddings re-read to
re-verify the PLR citations the new default rests on; cycle-7's 18 corroborated against the prior brief + these
notes. Completeness self-check run on every `[Ref: …]`.

**The substantive change: the default recipe shifted.** Cycle 7 recommended a per-feature *attention* scaffold
(FT-Transformer + PLR). TabReD — the only public benchmark matching the user's regime (median 261 features,
time-based splits) — demotes per-feature attention to runner-up (FT-T rank 4.8, measured O(features²) cost) and
elevates **per-feature PLR/PLE embeddings + a parameter-efficient MLP ensemble (TabM)** to the proven default
(MLP-PLR ens. rank 2.4, above the GBDTs). Recipe A rewritten around embeddings+ensembling; the old attention default
became Recipe A′ ("adopt only if it beats A on a time-based split"). The ensembling line (TabM #1 / BatchEnsemble /
MIMO) is now first-class. TimeXer added a concrete linear-cost temporal-static fusion recipe (role-asymmetric +
global bridge token); TP-BERTa added a magnitude-aware numerical channel (RMT) and name+value→one-token fusion (IFA).

**Contradictions resolved vs left open:** RESOLVED — per-feature-attention-vs-flat-MLP-ensemble at width (now favors
embeddings+ensembling), and learned-vs-raw-digit numerics (RMT quantifies +12.45% AUC). PARTIALLY RESOLVED — explicit
interaction operators (DCN-V2/Trompt failed to transfer on TabReD). LEFT OPEN — retrieval-fails-under-drift cause is the
TabReD authors' hypothesis only; the 70+-features + high-cardinality categorical INPUTS + genuine per-row temporal
sequences triple is still unvalidated (TabReD does not isolate high-cardinality and treats time as the split axis, not
a per-row sequence; TimeXer has no categorical pathway; UniTabE textualizes numerics).

**Headline gap re-evaluated:** NARROWED (TabReD proves the wide+drift regime and gives a verdict; UniTabE tested at 80-85
columns; TimeXer gives a linear-cost fusion recipe) but NOT closed (the high-cardinality + genuine-temporal triple remains).

saturation_signal = FALSE: the new evidence materially changed the default, not merely confirmed it. Indexes left
untouched; `logs/cycle.txt` not touched (orchestrator is its single writer).

## Cycle 13 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Thirteenth cycle (orchestrator counter; `logs/notices.jsonl` shows "Cycle 13 starting" after the cycle-12 MIMO/UniTabE/Trompt batch — note the per-work-record narrative blocks below were labeled by an earlier, lower internal counter, so this block's heading follows the orchestrator's authoritative numbering). Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0` — **0 flagged claims this batch**. The batch's coherent theme: *three different routes converge on the same lever for taming many features — collapse each feature to ONE token and keep attention linear in feature count* — TP-BERTa via Intra-Feature Attention (name+value → one token), AMFormer via prompt-token queries (linear-in-N attention), TimeXer via role-asymmetric tokenization (one coarse variate token per context feature + 1×C cross-attention). It satisfies iteration_mix: a *new* magnitude-aware-numerical-channel anchor for the LLM-serialization route (TP-BERTa), a *deepen* of the feature-interaction route past additive-only operators with an explicit multiplicative one (AMFormer), and a *challenge/deepen* of the temporal route's "one joint attention over all variates" default with a role-asymmetric bridge-token scheme (TimeXer).

### New directions explored
- **new — magnitude-aware numerical channel for LLM serialization (llm-tabular-serialization):** TP-BERTa (ICML 2024) is the first LM-based tabular model to give the LM a *magnitude-aware* numerical channel instead of raw-digit strings (GReaT/LIFT) or scalar×name-vector affine tokens (FT-Transformer). Relative Magnitude Tokenization (RMT): C4.5 target-aware per-feature bins become NEW shared words in the RoBERTa vocabulary, embedding scaled by the raw value, regularized by a magnitude-ordering triplet loss. Intra-Feature Attention (IFA): a shared mini-self-attention fuses each feature's name+value sub-tokens into ONE token, so sequence length = feature count, not text length. Both are backbone-agnostic and separable.
- **new — explicit multiplicative feature interaction (feature-interaction-selection):** AMFormer (AAAI 2024) is the corpus's first explicit *multiplicative* attention operator — a stream that runs attention in log space then exponentiates (a weighted sum in log space = a weighted product in the original space; idea from Neural Arithmetic Logic Units), parallel to ordinary additive attention, fused by an FC over a 2N candidate axis. Adds hard top-k attention (sparse, k independent of N) and prompt-token queries (attention linear in N). It proposes NO tokenizer — it reuses FT-Transformer/AutoInt embeddings verbatim — so it composes with this topic's tokenizer choices.
- **deepen/challenge — role-asymmetric tokenization for exogenous fusion (temporal-feature-tokenization):** TimeXer (NeurIPS 2024) tokenizes the target series at fine PATCH granularity (PatchTST-style) and each context (exogenous) series as ONE coarse VARIATE token (iTransformer-style), bridged by a single learnable GLOBAL token that is the sole QUERY into the exogenous tokens via 1×C cross-attention. This makes exogenous fusion LINEAR in the number of context features — directly the lever the topic needs at 70+ width — and sharpens the cycle-11 iTransformer note: joint attention over all variates is not the only option; you can route many context features through a bridge token.

### Works deeply analyzed (not just collected)
1. **tp-berta-lm-tabular-prediction** (2024, ICML) — RoBERTa-base + RMT (C4.5 target-aware bins → shared magnitude-token vocabulary, value-scaled, triplet-ordered) + IFA (shared name+value → one-token fusion). Order-agnostic over features after fusion. Categoricals mapped to meaningful text via the normal LM word path. Broad 145-dataset eval + clean ablations, but rank-only headline and default-HP-vs-tuned-baselines asymmetry; categorical/semantic-name-dominated win, loses on all-numerical tables; pretrained ≤32 features.
2. **amformer-arithmetic-feature-interaction** (2024, AAAI) — Arithmetic Block replaces self-attention inside each layer with parallel additive + multiplicative (log-space+exp) streams, hard top-k attention, prompt-token queries (linear-in-N), residuals+FFN kept (unlike AutoInt). Strong measured scaling to 2000 features + clean ablations, but weak real-world breadth (4 datasets, single run) and a synthetic-monomial-favorable "necessity" claim.
3. **timexer-exogenous-endogenous-fusion** (2024, NeurIPS) — role-asymmetric patch (endogenous) + variate (exogenous) tokenization, one learnable global bridge token, endogenous self-attention over [N patches, 1 global] + 1×C exogenous→endogenous cross-attention. Linear-in-C exogenous scaling; loses to iTransformer on high-interaction Traffic; numeric/temporal only, no categorical/static pathway.

### Strongest actionable technical ideas so far (this cycle's additions)
- **Magnitude-aware numerical tokens (RMT, TP-BERTa)** — the cleanest way to give an LM/transformer a numerical channel that preserves magnitude ordering: a target-aware, order-regularized SHARED bin-token vocabulary scaled by the raw value, decoupling feature-name semantics from value magnitude. `transferable_idea:magnitude-aware-numerical-tokens`. (Caveat: C4.5 bins are LABEL-guided → out-of-fold construction needed to avoid leakage.)
- **Name+value fusion to one token (IFA, TP-BERTa)** — a shared mini-attention collapses each feature's column-name and value sub-tokens to a single feature token, making sequence length = feature count and blocking cross-feature name-value contamination. `transferable_idea:name-value-fusion-to-one-token`. This is the LLM-serialization route's answer to the token-budget wall (TabLLM/LIFT cap ≤30 columns).
- **Explicit multiplicative feature interaction (AMFormer)** — a log-space attention + exp stream synthesizes ratio/product features (BMI, T3/T4) that additive-only attention cannot; bolts onto AutoInt/FT-Transformer; pair with prompt-token queries for linear-in-N cost. `transferable_idea:explicit-multiplicative-feature-interaction`.
- **Role-asymmetric tokenization + global bridge token (TimeXer)** — don't tokenize every feature at the same granularity: fine tokens for the feature(s) you care about, one coarse token per context feature, bridged by cross-attention → LINEAR in context-feature count. A concrete affordability lever for 70+ features and a recipe for ingesting misaligned/missing/different-frequency features without timestamp alignment.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`. The persistent structural gap is unchanged and again sharpened: none of the three demonstrates a genuine 70+-feature-with-high-cardinality-AND-temporal handling. TP-BERTa pretrains ≤32 features and its win is categorical-dominated; AMFormer's wide-feature scaling is measured on synthetic monomials, not in-the-wild heterogeneous tables; TimeXer is numeric/temporal-only with no categorical/static pathway and bottlenecks through a single global token on high-interaction sets. The "one-token-per-feature keeps attention linear" lever now has three independent instances, but the wide-mixed-temporal stress test remains asserted, not demonstrated.

### Weakest / most misleading directions (pitfalls recorded this cycle)
- **tp-berta-target-aware-binning-leakage**: RMT bins come from C4.5 LABEL-guided splits; leakage risk unless boundaries are built out-of-fold (same hazard as PLEt target-aware binning).
- **tp-berta-feature-count-ceiling-32** + **tp-berta-categorical-driven-win**: pretrained/validated ≤32 features; headline win is categorical/semantic-name-dominated (loses on all-numerical tables) and uses default HPs vs tuned baselines — do not read TP-BERTa as a 70+-feature or numerical-tokenization win.
- **multiplicative-stream-instability-log-relu**: AMFormer's log(ReLU(X)+ε) is undefined/zeroed for non-positive inputs and ε-sensitive; a signed-log alternative is untested — a training-stability hazard at width.
- **synthetic-favorable-evaluation**: AMFormer's "arithmetic interaction is necessary" leans on synthetic monomial data; real-world breadth is 4 datasets, single run — re-validate on TabReD/TabArena before propagating the necessity claim.
- **single-global-token-bottleneck-on-many-interacting-features**: TimeXer funnels ALL exogenous info through one global token and loses to iTransformer joint attention on high-interaction many-variate sets (Traffic); no categorical/static pathway.

### Graph changes and newly connected concepts
- Added **19 nodes** (3 works, 7 techniques, 3 transferable_ideas, 6 pitfalls) and **45 edges**. All three new work nodes carry `belongs_to_route` edges (llm-tabular-serialization, feature-interaction-selection, temporal-feature-tokenization). Graph now **227 nodes / 373 edges**.
- **Node reconciliation during collation (single-writer dedup):** four subagent-proposed endpoints were remapped to existing canonical nodes to avoid graph fragmentation:
  - TimeXer `technique:patch-tokenization` → existing `technique:temporal-patch-tokenization` (the record explicitly says "PatchTST-style"; same patching mechanism).
  - TimeXer `technique:variate-as-token` → existing `technique:variate-as-token-inverted-embedding` (the record says "iTransformer-style"; same whole-series-to-one-token embedding).
  - TP-BERTa `technique:value-times-name-embedding` (an `alternative_to` contrast target) → existing `technique:feature-tokenizer` (FT-Transformer's per-feature affine token IS the value×name-vector embedding RMT contrasts with).
  - TP-BERTa `technique:value-string-serialization` (an `alternative_to` contrast target) → existing `technique:text-serialization-of-rows` (the raw-string LLM serialization RMT contrasts with).
- Cross-route / cross-work bridges established: TP-BERTa `improves_on` GReaT and `compared_against` FT-Transformer / SAINT / TabNet / AutoInt / DCN-V2 / XTab / tree-models; RMT `extends` on-embeddings-numerical-features (the PLR work) and is `alternative_to` the FT-Transformer affine token + raw-string serialization. AMFormer `improves_on` FT-Transformer + AutoInt and `compared_against` DCN-V2. TimeXer `improves_on` iTransformer + PatchTST and `compared_against` TFT. The "one-token-per-feature → linear attention" lever now links three routes via three new transferable_idea nodes plus two `enables_scaling` edges to `route:feature-interaction-selection` (prompt-token queries) and `route:temporal-feature-tokenization` (global bridge token).

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **challenge (highest value):** the deferred wide-mixed-temporal stress test, now with three concrete one-token-per-feature contenders to disentangle on a genuine 70+-feature high-cardinality TabReD/TabArena task: (a) RMT+IFA magnitude tokens, (b) AMFormer arithmetic block on a PLR/periodic tokenizer, (c) TimeXer role-asymmetric bridge-token scheme extended with a categorical/static pathway — reporting AUC AND params/latency AND behavior under a temporal split. This converts three high-confidence-but-narrow claims into demonstrated ones.
- **new:** the pretraining-source databases (CT-BERT / TabPertNet for TP-BERTa) or TapTap (value-string numerics) to map the LM-tabular pretraining-corpus design space; OR Neural Arithmetic Logic Units (Trask 2018) as the multiplicative-operator origin AMFormer builds on.
- **deepen:** add a categorical/static token pathway to TimeXer's role-asymmetric scheme and compose AMFormer's arithmetic block on top of an expressive (PLR/periodic) numerical tokenizer — both directly test whether these route-specific levers survive contact with the topic's mixed-type 70+-feature regime.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. The refute-before-write challenges were absorbed into the `pitfalls` fields (above), which SCOPE the transfer claims (RMT's target-aware-bin leakage and categorical-driven win; AMFormer's log-ReLU instability and synthetic-favorable necessity claim; TimeXer's single-global-token bottleneck and missing categorical pathway) rather than overturning them.

## contract_violations  2026-06-16T19:00:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 227 nodes (8 route / 36 work / 94 technique / 28 transferable_idea / 61 pitfall), 373 edges, 36 belongs_to_route (one per work node). No auto-fixes required; no residual violations. The four fragmenting endpoints (`technique:patch-tokenization`, `technique:variate-as-token`, `technique:value-times-name-embedding`, `technique:value-string-serialization`) were remapped to existing canonical nodes during collation, before the validator ran, so it found nothing to fix.

## Cycle 11 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Eleventh cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0` — **0 flagged claims this batch**. The batch's coherent theme: *what carries the load on wide tables when you step off the per-feature-tokenizer path* — a noise-robustness attention prior (ExcelFormer/SPA), the upstream mechanism behind TabM's cheap ensembling (BatchEnsemble), and an instance-axis alternative that sidesteps per-feature tokenization entirely (TabR). Together they satisfy iteration_mix: a *new* origin-technique anchor (BatchEnsemble), a *deepen* of the tabular-transformer lineage with a regularization-centric descendant (ExcelFormer), and a *challenge* to the "you need a per-feature tokenizer" default (TabR retrieval).

### New directions explored
- **new — origin technique for parameter-efficient ensembling (feature-interaction-selection):** BatchEnsemble (ICLR 2020) is the upstream source of the rank-1 multiplicative/additive adapters TabM uses. Recording it grounds the existing `technique:batchensemble-adapters` node in its originating work and clarifies the transfer boundary: the adapters are a *tokenizer-agnostic cheap-ensembling wrapper* (parameters independent of feature count), NOT a tokenizer and NOT a full deep ensemble. Evidence is non-tabular (vision/lifelong learning); tabular transfer is only inferred via TabM.
- **challenge — instance-axis retrieval vs per-feature tokenization (tabular-transformers):** TabR (2023, Yandex; later ICLR 2024) attends over *retrieved training instances*, not features, so its cost is **feature-count-invariant** — a genuinely different axis from per-feature tokenization for wide tables. It beats GBDTs on the Grinsztajn benchmark, directly *contradicting* the tree-models-outperform-deep line, while *improving on* the PLR numerical-embedding work it builds on. This sharpens the standing recommendation: per-feature tokenization is one of (at least) two ways to handle width; the other is to move the heavy attention onto the sample axis.
- **deepen — regularization-as-the-contribution tabular transformer (tabular-transformers):** ExcelFormer (KDD 2024) is the first FT-Transformer descendant in the corpus whose contribution is NOT a new tokenizer but two inductive biases: Semi-Permeable Attention (a mutual-information mask that lets low-importance features attend to high-importance ones but not vice-versa) and importance-weighted tabular Mixup (Feat-Mix / Hid-Mix). Headline: a "no-tuning" DNN beating tuned GBDTs.

### Works deeply analyzed (not just collected)
1. **excelformer-semi-permeable-attention** (2024, KDD) — SPA noise-robustness mask + Feat-Mix/Hid-Mix importance-weighted Mixup, on an FT-Transformer-style backbone; categoricals handled by CatBoost (ordered) target encoding into scalars (no native categorical/temporal tokenizer). SPA stays O(k^2); the MI mask is static, computed once, untested above 54 features.
2. **batchensemble-efficient-ensembles** (2020, ICLR) — rank-1 multiplicative (R, load-bearing) + additive fast-weight adapters around shared slow weights give k implicit ensemble members at near-single-model cost; an efficient-ensemble *approximation*, not a full deep ensemble. The originating mechanism for TabM's parameter-efficient ensembling.
3. **tabr-retrieval-tabular** (2023, arXiv→ICLR 2024) — retrieval-augmented tabular prediction with a key-only L2 retrieval-attention (similarity over keys, value-as-difference) over the training set; uses PLR numerical embeddings. Feature-count-invariant attention; authors explicitly caveat retrieval is not universally beneficial.

### Strongest actionable technical ideas so far (updated)
- **Tokenizer-agnostic cheap ensembling (BatchEnsemble rank-1 adapters)** is now anchored to its source: a near-free accuracy/calibration wrapper that can sit around *any* future heterogeneous-feature tokenizer, with parameters independent of feature count. The cleanest "free win" to layer onto a wide-table tokenizer.
- **Instance-axis retrieval as a feature-count-invariant escape hatch (TabR)**: when per-feature tokenization hits the O(k^2) wall at 70+ features, moving attention to the sample axis is a concrete alternative — at the cost of a train/deploy retrieval-leakage risk that is acute under temporal+static mixing.
- **Noise-robust wide-feature attention (SPA)**: an importance-masked attention prior that protects high-importance features from noisy uninformative ones — a candidate regularizer for wide tables, separable from ExcelFormer's lossy CatBoost-scalarization tokenizer.

### Records still shallow / needing deeper reading
- None this cycle — all three are deep. The persistent coverage gap is unchanged and now sharper: **none** of these three actually demonstrates 70+-feature-with-high-cardinality-AND-temporal handling. ExcelFormer caps at 54 features and has no temporal/native-categorical tokenizer; BatchEnsemble's tabular evidence is entirely indirect (via TabM); TabR's retrieval is feature-count-invariant but its temporal-drift behavior is hypothesized-to-fail, not measured. The genuine wide-mixed-temporal stress test remains asserted, not demonstrated, anywhere in memory.

### Weakest / most misleading directions (pitfalls recorded this cycle)
- **spa-is-not-a-scaling-mechanism**: SPA is a noise-robustness inductive bias, not a scaling mechanism — attention stays O(k^2) in feature count; the MI mask is static and untested above 54 features. Do not cite ExcelFormer as a wide-table scaling result.
- **no-native-categorical-or-temporal-tokenizer**: ExcelFormer scalarizes categoricals via CatBoost target encoding (lossy) and has no temporal handling — SPA/Feat-Mix transfer, but the *tokenizer* does not cover mixed types.
- **rank1-not-full-ensemble-and-not-a-tokenizer**: BatchEnsemble adapters are an efficient-ensemble approximation (not a full deep ensemble) and not a tokenizer; tabular transfer is inferred only via TabM, not directly shown.
- **train-deploy-retrieval-leakage**: retrieval-augmented tabular models can leak across the train/deploy boundary on temporal+static mixed data (which rows are retrievable at inference vs train differs); acute under temporal drift — the likely cause of the TabReD-recorded "retrieval fails under drift" observation.

### Graph changes and newly connected concepts
- Added **15 nodes** (3 works, 5 techniques, 3 transferable_ideas, 4 pitfalls) and **26 edges**. All three new work nodes carry `belongs_to_route` edges (tabular-transformers ×2, feature-interaction-selection ×1).
- **Node reconciliation during collation (single-writer dedup):** three subagent-proposed endpoints were remapped to existing canonical nodes / valid targets to avoid graph fragmentation and one malformed edge:
  - `technique:batchensemble-rank1-adapter` → existing `technique:batchensemble-adapters` (the exact technique already created in the TabM cycle; BatchEnsemble now `introduces_technique` it, and the proposed `TabM uses_technique` edge deduped against the pre-existing one).
  - `technique:plr-numerical-embeddings` → existing canonical `technique:plr-embedding` (PLR Periodic+Linear+ReLU) — TabR `uses_technique` the canonical node.
  - `scaling-interaction` (a `concept_layers` key, NOT a valid `<kind>:` graph node — would have been a dangling/malformed edge) → retargeted the `enables_scaling` edge to `route:feature-interaction-selection`, whose description explicitly covers efficiency/scaling to large feature counts. Semantics preserved (rank-1 adapters enable scaling), contract satisfied.
- Cross-route / cross-work bridges established: TabR `contradicts` tree-models-outperform-deep-tabular and `improves_on` on-embeddings-numerical-features and is `alternative_to` SAINT (row-attention vs instance-retrieval — both move attention off the feature axis); ExcelFormer `improves_on` FT-Transformer and `compared_against` tree-models; TabM `improves_on` BatchEnsemble, closing the loop from the cycle-10 TabM node back to its mechanism source.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **challenge (highest value):** the deferred wide-table stress test, now with two concrete contenders to disentangle — on a genuine 70+-feature high-cardinality TabReD/TabArena task, compare (a) per-feature tokenizer (PLR + learned categorical tokens) vs (b) TabR instance-axis retrieval vs (c) the same tokenizer wrapped in BatchEnsemble adapters — reporting AUC AND params/latency AND calibration under a temporal split. This single experiment would convert three high-confidence-but-narrow claims into demonstrated ones.
- **new:** MIMO / multi-input-multi-output ensembles, Masksembles, or Rank-1 BNN (Dusenberry 2020) as alternative cheap-ensemble primitives to BatchEnsemble — to map the cheap-ensembling design space the topic keeps leaning on.
- **deepen:** SPA static-MI mask vs T2G-Former's learned feature-interaction graph at 70+ features — both impose a sparse/importance-weighted interaction prior; contrast static-MI vs learned-graph as the noise-robustness mechanism.

## contract_violations  2026-06-16T17:00:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` exited 0 after collation: 193 nodes (route 8, work 30, technique 81, transferable_idea 24, pitfall 50), 297 edges, 30 belongs_to_route edges (one per work). No auto-fixes were needed (no malformed ids, no dangling edges, no work node without a record file). The three potential issues were resolved in-collation, before the validator ran: the malformed `scaling-interaction` edge endpoint was retargeted to `route:feature-interaction-selection`, and the two fragmenting technique slugs (`batchensemble-rank1-adapter`, `plr-numerical-embeddings`) were remapped to existing canonical nodes.



Ninth cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0`. This batch satisfies the iteration_mix on a single coherent theme — "what actually carries the load in a tabular tokenizer: the codebook, the column token, or the backbone?" — by adding a *new* discretization anchor (AutoDis), *deepening* the foundational tabular-transformer lineage (TabTransformer), and *challenging* the implicit "you need an attention tokenizer" default (TabM).

### New directions explored
- **new — soft/learned discretization (discretization-vq):** AutoDis (KDD 2021) is the route's second anchor and its first *soft* one. It turns a scalar into a soft-weighted mixture over a tiny per-field codebook (H=20-40 meta-embeddings) via a differentiable scorer + temperature softmax + weighted-average — a continuous, end-to-end, parameter-bounded numerical tokenizer that explicitly names the failure modes of hard binning (SBD: similar-value/dissimilar-embedding; DBS: dissimilar-value/same-embedding). Conceptual bridge from the numerical-embeddings route (it is an alternative to PLE/PLR) to the VQ route (it is the soft analogue of RQ-VAE residual quantization).
- **challenge — flat-concat MLP ensemble vs attention tokenizer (feature-interaction-selection):** TabM (ICLR 2025) is the current #1-ranked tabular-DL model on a 46-dataset shared-protocol benchmark, and it has *no* attention tokenizer: per-feature PLE embeddings flat-concatenated into a parameter-efficient MLP ensemble (k=32 BatchEnsemble adapters), linear in feature count. It directly sharpens the standing "FT-Transformer + PLR" composition recommendation: the evidence now says good per-feature numerical embeddings + a scalable backbone, not a token-sequence Transformer, are what move the needle on wide tables.

### Works deeply analyzed (not just collected)
1. **autodis-numerical-discretization** (2021, KDD) — Meta-Embeddings (small shared per-field codebook) + Automatic Discretization (2-layer leaky-ReLU scorer + skip + temperature-tau softmax) + Weighted-Average aggregation. Adaptive per-instance temperature beats any searched global tau. Backbone-agnostic CTR plug-in; soft > hard selection in the aggregation ablation.
2. **tabtransformer-contextual-categorical-embeddings** (2020, AWS) — per-column "Column embedding" = concat(shared column identifier, class value embedding) fed to a Transformer stack that contextualizes the categorical tokens across columns; dedicated per-column MISSING embedding row; generator-free per-column ELECTRA-style RTD pretraining. The categorical-tokenizer ancestor that FT-Transformer/SAINT extend.
3. **tabm-parameter-efficient-ensembling** (2025, ICLR) — MLP turned into k=32 implicit submodels via BatchEnsemble adapters (the first multiplicative adapter R is load-bearing); flagship variant adds PLE numerical embeddings. Submodels weak individually, strong collectively (genuine diversity). Linear-cost scaling demonstrated to 986 features / 6.5M rows.

### Strongest actionable technical ideas so far (updated)
- Standing recipe sharpened: **per-feature PLE/PLR numerical embeddings + a scalable backbone** is now the highest-confidence actionable. TabM is concrete evidence the backbone can be a cheap linear-cost MLP ensemble rather than an O(k^2) attention Transformer — and the BatchEnsemble-adapter wrapper is a near-free accuracy/regularization boost that can wrap *any* future heterogeneous-feature tokenizer.
- **Per-column field-provenance token (concatenated, not added)** (TabTransformer) is the cleanest reusable nugget for the categorical leg: it is the tabular substitute for positional encoding and lets attention disambiguate which field a value came from. Pair with the per-column MISSING embedding row and generator-free per-column RTD.
- **Soft, parameter-bounded per-field discretization over a tiny codebook** (AutoDis) is a cheap numerical-leg alternative whose temperature->0 limit bridges to hard VQ/semantic-ID codes — a single dial connecting the numerical-embeddings and discretization-vq routes.

### Records still shallow / needing deeper reading
- None this cycle — all three are deep. Coverage gap that persists: every "scales to 70+ features" claim in this batch is either a constant-per-field-param argument (AutoDis), a categorical-only argument (TabTransformer), or leans on a few wide outliers (TabM benchmark Q50 is only 20 features). The genuine 70+-mixed-with-high-cardinality-and-temporal stress test is still asserted, not demonstrated, anywhere in the memory.

### Weakest / most misleading directions (pitfalls recorded this cycle)
- **temperature-collapse-soft-discretization**: AutoDis tau is load-bearing — too high collapses to uniform mixing, too low degenerates to hard binning (reintroducing SBD/DBS). The global optimum varies wildly across datasets (1e-5 vs 4e-3), which is exactly why the paper needs an adaptive-temperature network.
- **scalable-means-param-budget-not-many-features**: AutoDis "scalable" = constant per-field parameter budget, NOT a many-feature / attention-cost result. Do not read it as a 70+-feature scaling demonstration.
- **numerical-features-bypass-transformer**: TabTransformer's continuous features are concatenated raw and never attended — on a numerical-heavy 70+ table most of the input gets zero contextualization. Borrow the column-embedding idea, NOT the claim that it tokenizes heterogeneous features. (This is precisely the gap FT-Transformer closes.)
- **one-hot-categoricals-bad-for-high-cardinality**: TabM's default one-hot categoricals inflate input width / first-layer params linearly with total category count — the wrong primitive for high-cardinality 70+ tables; learned/hashing/target encoding must be swapped in.
- **not-a-tokenizer-no-explicit-feature-interaction**: TabM is filed under feature-interaction-selection but does neither tokenization (borrows one-hot+quantile+PLE) nor explicit interaction/selection (no cross/attention/gate). Cite it as a scalable backbone baseline, not as an interaction method. The big numerical-embedding gain is attributable to PLE (Gorishniy 2022), NOT to ensembling — disentangle the credit.

### Graph changes and newly connected concepts
- Added 17 nodes (3 works, 7 techniques, 2 transferable_ideas, 5 pitfalls) and 39 edges. All three new work nodes carry `belongs_to_route` edges (discretization-vq, tabular-transformers, feature-interaction-selection respectively).
- Cross-route bridges established: `technique:soft-discretization-meta-embeddings` is `alternative_to` both `technique:plr-embedding` (numerical-embeddings route) and `technique:rq-vae-semantic-id` (discretization-vq) — wiring AutoDis as the soft pivot between the two routes. TabM `uses_technique` (via the in-batch edge) the on-embeddings PLE work and is `compared_against` FT-Transformer / SAINT / T2G / tree-models / TabReD, anchoring the "MLP-ensemble beats attention tokenizer" claim into the existing evidence cluster. TabTransformer wired into the categorical lineage: `improves_on` entity-embeddings, and `improves_on`-by FT-Transformer and SAINT (lineage direction), `contradicts`-by tree-models (Grinsztajn line).
- **Node reconciliation during collation (single-writer dedup):** five subagent-proposed technique slugs were remapped to existing canonical nodes to avoid graph fragmentation — `technique:entity-embeddings`->`technique:entity-embedding-categorical`; `technique:learned-numerical-embedding-ple-plr`->`technique:plr-embedding`; `technique:piecewise-linear-numerical-embeddings`->`technique:piecewise-linear-encoding`; `technique:rqvae-semantic-ids`->`technique:rq-vae-semantic-id`; `technique:self-attentive-feature-interaction`->`technique:multi-head-self-attention-interacting-layer` (AutoInt's interacting layer). Pre-existing `technique:autodis` and `technique:tabtransformer` baseline nodes were left in place; the new richer technique nodes (soft-discretization-meta-embeddings, column-identifier-embedding, contextual-categorical-embeddings, etc.) capture the mechanism specifics the baseline nodes did not.
- One intentionally-kept rel quirk: TabM->on-embeddings is recorded as `uses_technique` (work->work) as proposed by the subagent — it reflects that TabM's flagship variant adopts the PLE embeddings from that work; the rel is in the allowed set so it passes the contract, but the semantically cleaner edge (TabM uses `technique:piecewise-linear-encoding`) is ALSO present.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **challenge (highest value):** run the head-to-head the memory keeps deferring — AutoDis soft-codebook vs PLE/PLR vs raw-scalar, all under the SAME backbone on a genuine 70+-feature TabReD/TabArena task, reporting AUC AND params/latency. This is the single experiment that would convert the standing "PLE + scalable backbone" recommendation from high-confidence-but-narrow to demonstrated.
- **new:** BatchEnsemble (Wen et al. 2020) as the underlying technique anchor for parameter-efficient ensembling, and/or Packed-Ensemble (Laurent et al. 2023) — to ground the TabM mechanism node in its source.
- **deepen:** stack a high-cardinality (entity/MinHash) + temporal tokenizer ON a TabM backbone and ablate ensembling-gain vs tokenizer-gain — directly tests the composition story (proper tokenizer on top of cheap scalable backbone) that this cycle's evidence motivates.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis written yet (synthesis_every_n_cycles = 7; last synthesis note was the Cycle 7 placeholder). This cycle's main effect on the eventual synthesis: it **sharpens** the recommended-approaches section toward "per-feature PLE/PLR + scalable (possibly non-attention) backbone + parameter-efficient ensembling," and adds a concrete caution that the headline "scales to many features" claims in this subfield are frequently param-budget or categorical-only arguments, not 70+-mixed demonstrations.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. The refute-before-write challenges were absorbed into the `pitfalls` fields (above), which scope the transfer claims (AutoDis beaten by PLE/PLR on general tabular; TabTransformer's "matches GBDT" is 82.8 vs 82.9 and categorical-heavy-dataset-dependent; TabM's "beats GBDT" rests on heavy per-dataset Optuna tuning + multi-seed averaging with CatBoost/XGBoost within ~1 rank) rather than overturning them.

## contract_violations  2026-06-16T16:30:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 178 nodes (8 route / 27 work / 76 technique / 21 transferable_idea / 46 pitfall), 271 edges, 27 belongs_to_route (one per work node). No auto-fixes required; no residual violations.

## Cycle 8 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Eighth cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0`. This batch closes the last named-but-uncovered anchor papers from `topic.yaml` (XTab in `tabular-foundation-models`, LIFT in `llm-tabular-serialization`) and adds the topic's most directly-on-target evaluation evidence (TabReD), the only public benchmark whose feature counts (median 261, up to 1026) AND time-based splits match this topic's 70+-mixed, partly-time-varying regime.
- **new**: TabReD (`tabular-transformers`, primary; also touches `numerical-embeddings` and the temporal eval discipline) — the wide-feature + temporal-drift arena. Verdict from the regime that matters: per-numerical-feature (PLR) embeddings + ensembling win, per-feature attention tokenizers (FT-Transformer) pay an O(features^2) cost and only rank runner-up, retrieval (TabR/ModernNCA) and fancy training recipes do NOT transfer.
- **deepen**: XTab (`tabular-foundation-models`) — cross-table pretraining; the decisive finding for this topic is that cross-table transfer moves only the shared transformer BACKBONE (interaction prior), NOT the tokenizer/featurizer, which stays data-specific and is re-initialized per table. Plain affine FT-Transformer numeric tokenizer (no PLR); still loses to CatBoost; 16GB memory wall dropped 20/104 datasets.
- **challenge/anchor**: LIFT (`llm-tabular-serialization`) — foundational NeurIPS-2022 text-serialization sibling to TabLLM/GReaT covering classification AND regression; a cautionary anchor — explicit "low-dimensional" scope, regression collapse at p>=50, context/memory wall, raw-digit numerics, no temporal/missing handling, no deep-tabular baselines.

### New directions explored
- **tabular-transformers / numerical-embeddings** gained **TabReD** (ICLR 2025; arXiv 2406.19380): the first fair head-to-head evidence on the exact regime this topic targets. It is a BENCHMARK, not a tokenizer — cited as evidence/evaluation context only. Its two reusable outputs: (1) per-numerical-feature PLR embeddings are the one learned-tokenization idea that demonstrably keeps its benefit on wide, temporally-drifting industrial tables (MLP-PLR ensemble = rank 1); (2) methodology — any new tokenizer claim for this topic MUST be validated under time-based (out-of-time) splits, because random splits give optimistic, sometimes time-leakage-inflated rankings and the model ordering genuinely flips.
- **tabular-foundation-models** gained **XTab** (ICML 2023): the tokenizer/backbone decoupling result — you can warm-start the attention/interaction stack from a corpus of unrelated tables (federated FedAvg over shared blocks) without aligning schemas or sharing a vocabulary, but the heterogeneous-feature tokenizer stays bespoke per dataset. Reconstruction SSL (SCARF-style corruption) beats contrastive and supervised pre-finetuning; gains are largest under tight finetuning budgets and shrink under heavy finetuning (catastrophic forgetting in the <1M-param backbone).
- **llm-tabular-serialization** gained its foundational **LIFT** anchor: text serialization + the LM's own subword tokenizer + ordinary autoregressive fine-tuning (no learned tabular tokenizer, no architecture/loss change), covering both classification and regression. Sibling to TabLLM (discriminative) and GReaT (generative).

### Works deeply analyzed (not just collected)
1. **tabred-benchmark-in-the-wild** (2024 arXiv / ICLR 2025) — re-runs a battery of tokenization regimes (FT-Transformer per-feature attention, MLP-PLR numerical embeddings, DCNv2 cross, Trompt, TabR/ModernNCA retrieval, GBDTs) on 8 industrial datasets with median 261 features (up to 1026) under time-based splits. Average-rank result (lower=better): MLP-PLR ens. 2.4, XGBoost 2.9, LightGBM 3.1, CatBoost 3.4, MLP-PLR 3.8, FT-Transformer 4.8, TabR/ModernNCA 5.6-6.0, DCNv2 7.6. Refute-checked: the retrieval-failure and training-recipe-failure CAUSES are the authors' explicit HYPOTHESES (multicollinearity/noisy features + temporal-shift), not demonstrated mechanism — recorded as `pitfall:retrieval-fails-under-drift`. Features are mostly engineered numerical, so it gives NO verdict on categorical/high-cardinality tokenization, and time is the split axis, not a per-row sequence (validates drift-aware EVALUATION, not temporal tokenization).
2. **xtab-cross-table-pretraining** (2023, ICML) — per-column FT-Transformer-style featurizer kept data-specific; only the transformer blocks are pretrained and transferred. Beats no-pretrain FTT in every finetuning regime (XTab-best rank 4.39 vs FTT-best 4.94) and is the best DEEP model, but CatBoost remains best overall. Refute-checked transfer: the decoupling principle (transfer the interaction prior, keep the tokenizer bespoke) is the reusable idea; BUT it does NOT give a reusable heterogeneous-feature tokenizer (the topic's actual question), the numeric leg is the weak plain-affine FT-Transformer tokenizer (no PLR), gains are modest/budget-dependent, FedAvg here is an engineering parallelization trick (not privacy), and there is a hard 16GB memory wall (20/104 datasets excluded). Backbone is <1M params — far smaller than "foundation model" connotes.
3. **lift-language-interfaced-finetuning** (2022, NeurIPS) — each labeled row rendered to one English sentence and fine-tuned with ordinary next-token CE; GPT-J (LoRA) and GPT-3 (API). Refute-checked transfer: the verbatim-serialization MECHANISM is NOT directly reusable at 70+ rich heterogeneous features (context-length wall, raw-digit numerics, no temporal story, regression collapse at p=50/100 — Linear RAE 1.18 vs GP 0.13). Reusable nuggets are the column-name-as-semantics idea (shared with TabLLM/CARTE), the SHUFFLED-NAMES ablation protocol (a clean test that any name-aware tokenizer actually uses feature-name/value association), the two-stage pretext warm-up, and data augmentation against test-time feature corruption. High-feature classification wins are mostly on image/digit pixels, NOT 70+ semantically rich mixed columns — do not read MNIST-784/Mfeat-216 as evidence for the user's setting.

### Strongest actionable technical ideas added this cycle
- **Per-numerical-feature (PLR) embeddings + ensembling are the proven default for wide drifting tables** (TabReD evidence) → if you must pick one tokenization upgrade for the topic's setting, this is it. (`transferable_idea:per-numerical-feature-embeddings-scale-to-wide-tables`)
- **Validate every tokenizer claim under time-based (out-of-time) splits** (TabReD methodology) → random splits on temporally-ordered data inflate rankings and flip orderings. (`pitfall:random-split-temporal-leakage`)
- **Decouple per-table tokenizer from cross-table interaction backbone** (XTab) → warm-start the interaction stack across unrelated tables without schema/vocabulary alignment; only the relational reasoning transfers. (`transferable_idea:tokenizer-backbone-decoupling-for-cross-table-transfer`)
- **Reconstruction SSL from feature corruption** (XTab; SCARF-style marginal resampling) as a transferable cross-table pretraining signal that beats contrastive/supervised. (`technique:reconstruction-ssl-feature-corruption`)
- **Shuffled-names ablation protocol** (LIFT) → architecture-agnostic test that a name-aware tokenizer genuinely uses correct feature-name/value association.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`, all `confidence: high`.

### Weakest / most misleading directions (pitfalls recorded)
- **cross-table-pretraining-transfers-backbone-not-tokenizer** (XTab): the headline "cross-table pretraining" transfers only the interaction backbone; the featurizer is randomly re-initialized per table. Anyone hoping XTab yields a reusable heterogeneous-feature TOKENIZER will be disappointed — CARTE/TabPFN-v2 are the right comparisons for transferable tokenization.
- **llm-serialization-context-and-regression-wall** (LIFT): the same context/memory ceiling as TabLLM plus high-D regression collapse (p>=50) and raw-digit numerics — confirms the "weak numeric leg" pattern and bounds feature count by the LM window. Reinforces that LLM serialization is a cautionary anchor, not a 70+-feature recipe.
- **retrieval-fails-under-drift** (TabReD): TabR/ModernNCA underperform on wide drifting tables, but the cause (multicollinearity/temporal-shift breaking the retrieval assumption) is the authors' HYPOTHESIS — do NOT propagate it as established mechanism.
- **random-split-temporal-leakage** (TabReD): XGBoost looks strongest on random splits partly by exploiting time-leakage; its margin shrinks under time-based splits. Any tokenizer tuned/validated on random splits of temporally-ordered data may report inflated gains.

### Graph changes and newly connected concepts
- Added 3 work nodes (each with a `belongs_to_route` edge): TabReD→tabular-transformers, XTab→tabular-foundation-models, LIFT→llm-tabular-serialization.
- Added 13 nodes total (3 work, 2 technique, 3 transferable_idea, 4 pitfall — actually 2 technique [federated-cross-table-backbone-pretraining, reconstruction-ssl-feature-corruption, text-serialization-finetuning, lora] = 4 technique) and 26 edges. Graph now 161 nodes / 232 edges.
- Cross-work links established: TabReD `compared_against` FT-Transformer, `transferable_to` on-embeddings-numerical-features (the PLR evidence link), `alternative_to` TabArena (the other living benchmark); XTab `uses_technique`+`improves_on` FT-Transformer, `uses_technique` SAINT, `alternative_to` CARTE and TabPFN-v2 (the transferable-tokenization comparisons), `compared_against` tree-models; LIFT `alternative_to` and `contradicts` TabLLM (the feature-name-importance tension — names matter in LIFT's shuffled-names ablation, conditional on the LM's pretraining knowledge of those names), `compared_against` tree-models.
- **Node-id normalizations during collation:** the LIFT subagent proposed all of its edges with BARE slugs (no `<kind>:` prefix), e.g. `lift-language-interfaced-finetuning`, `tabllm-few-shot-llm-serialization`, `tree-models-outperform-deep-tabular`, `lora`, `text-serialization-finetuning`. Per the node-id contract these were normalized to their correct kind prefixes (`work:`, `technique:`, `pitfall:`) before merge, mapping `tabllm-…` and `tree-models-…` onto the existing in-graph work nodes rather than fragmenting the graph with duplicate prefixless nodes. TabReD and XTab proposals were already correctly prefixed.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write challenges were absorbed into the `pitfalls` fields of each record (the retrieval-failure cause, the backbone-not-tokenizer transfer scope, the LIFT scope-mismatch and regression collapse), which scope/qualify the transfer claims rather than overturn them.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: adopt TabReD's 8 time-split datasets as a standard tokenizer-validation harness; OR open `discretization-vq` beyond the single TIGER/RQ-VAE recsys anchor with a tabular-native quantization work; OR a categorical/high-cardinality stress test in the wide-table regime that TabReD does not cover.
- **deepen**: isolate retrieval vs missing-embeddings in TabR on TabReD (re-add PLR numerical embeddings into TabR/ModernNCA to test whether the retrieval failure is really about embeddings, not retrieval); OR test the XTab backbone warm-start with a PLR numeric tokenizer swapped in on a genuine 70+-feature wide table.
- **challenge**: TabReD now provides regime-matched evidence that should sharpen the still-unwritten synthesis default — "per-numerical-feature embeddings + ensembling, validated on time-based splits" is the strongest-supported recommendation for the topic's setting, and per-feature attention's quadratic cost is now an evidenced (not just asserted) liability at width. The matched-compute interaction/selection comparison (TabNet gate vs T2G prior vs DCN-V2 cross vs AutoInt attention) at 70+ features remains the open challenge.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis written this cycle (this is a RESEARCH batch). TabReD STRENGTHENS the emerging default recommendation (PLR numerical embeddings + ensembling) with regime-matched evidence and adds a hard methodological requirement (time-based splits). XTab WEAKENS any hope that cross-table pretraining circa-2023 yields a reusable heterogeneous-feature tokenizer. LIFT confirms (does not redirect) the prior conclusion that LLM serialization is a cautionary anchor, not a 70+-feature recipe.

## contract_violations  2026-06-16T16:00:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 161 nodes (8 route / 24 work / 69 technique / 19 transferable_idea / 41 pitfall), 232 edges, 24 belongs_to_route (one per work node). No auto-fixes required; no residual violations. The LIFT subagent's prefixless edge slugs were normalized to `<kind>:` prefixes during collation (see "Node-id normalizations" above), so the validator found nothing to fix.

<!-- The block below was previously mislabeled "Cycle 8"; it is the Cycle 7 RESEARCH batch (GReaT/TabNet/T2G; graph 148 nodes/206 edges). Relabeled during cycle-8 collation. -->
## Cycle 7 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0`. This batch closes the last two named-but-uncovered anchor papers from `topic.yaml` and adds the generation-side LLM-serialization anchor:
- **new**: GReaT (generation-side anchor of `llm-tabular-serialization`) — the route had only TabLLM (discriminative); GReaT adds the generative paradigm and, more importantly, the random feature-order-permutation trick.
- **deepen**: TabNet (`feature-interaction-selection`) — the canonical 2019 attentive-selection anchor named in topic.yaml; adds the instance-wise sparsemax SELECTION half to a route that previously had only explicit-interaction operators (AutoInt attention, DCN-V2 cross).
- **challenge/sharpen**: T2G-Former (`tabular-transformers`) — sharpens the "dense per-feature self-attention" default by showing a learned SPARSE feature-relation graph on top of the FT-Transformer tokenizer; decouples tokenizer from interaction mechanism and beats FT-Transformer/AutoInt/DCN-V2 on its benchmark.

### New directions explored
- **llm-tabular-serialization** gained its generation-side anchor **GReaT** (ICLR 2023): serialize each cell as `COLUMN_NAME is VALUE`, train a GPT-2-class LM with the causal-LM objective, and — the load-bearing trick — apply a fresh **random feature-order permutation per row at train time** so the model becomes order-invariant and supports conditioning on ANY feature subset at inference with zero retraining (arbitrary conditioning). The route now has both the discriminative (TabLLM) and generative (GReaT) ends.
- **feature-interaction-selection** gained the SELECTION half via **TabNet** (sparsemax instance-wise feature mask, O(D) in feature count) — complementing AutoInt's attention and DCN-V2's cross operator, which model interaction-representation rather than selection. Also brings a masked-feature reconstruction SSL objective.
- **tabular-transformers** gained **T2G-Former**: a Graph Estimator learns a sparse Feature Relation Graph (data-adaptive pairwise edges + a dataset-global static topology, indegree-restricted by sparsemax/entmax) that replaces dense self-attention while reusing the FT-Transformer tokenizer verbatim.

### Works deeply analyzed (not just collected)
1. **tabnet-attentive-interpretable-tabular** (2019, AAAI'21) — sequential attentive transformer emits a sparsemax mask selecting a sparse feature subset per decision step per instance; masks aggregate into instance-wise importances; decision-step processing is GLU-based. Self-supervised pretraining reconstructs randomly masked feature columns. Refute-checked transfer: the SELECTION primitive (linear-cost instance-wise sparse gate) is the reusable nugget and is architecture-agnostic; BUT the input encoding is impoverished (raw numerics + plain categorical embeddings, no PLR/periodic), and the reported supervised wins are likely on under-tuned baselines and were not reproduced by later controlled benchmarks (both recorded as pitfalls). Models interactions only implicitly.
2. **t2g-former-graph-tabular** (2023, AAAI) — reuses the FT-Transformer per-feature tokenizer, then a Graph Estimator learns a sparse FR-Graph controlling which feature tokens interact. Strong evidence base (12 datasets, 15-seed, tuned, multiple ablations). Refute-checked transfer: the decoupling (per-feature tokenizer + learned sparse interaction PRIOR) is the reusable idea for imposing a 70+-feature interaction prior so only relevant pairs interact; BUT the sparse graph is a learned PRIOR, not a FLOP saving — compute stays O(M^2) — and evaluation caps at 93 features with no temporal data and a static-topology-freeze training hack (both pitfalls).
3. **great-generative-tabular-llm** (2023, ICLR) — text serialization + LLM BPE tokenizer used for GENERATION; the random feature-order-permutation training is what converts a position-sensitive sequence model into an order-free arbitrary-conditioning joint model. Refute-checked transfer: the permutation/order-invariance principle is architecture-agnostic and the single most reusable nugget; the verbatim-text generation machinery itself does NOT transfer to a 70+-feature ENCODER (caps at 47 features, raw-digit numerics, serial autoregressive sampling cost — all recorded as pitfalls).

### Strongest actionable technical ideas added this cycle
- **Random feature-order-permutation training** (GReaT) → order-invariant, arbitrary-conditioning tokenizer; architecture-agnostic, applies to any token-sequence tabular model. (`transferable_idea:order-invariant-arbitrary-conditioning-tokenizer`)
- **Linear-cost O(D) instance-wise sparsemax feature gate** (TabNet) → the SELECTION primitive that scales in feature count, to be paired with a rich (PLR/FT-Transformer) tokenizer rather than TabNet's impoverished encoder. (`transferable_idea:linear-cost-instance-wise-feature-gate`)
- **Decouple tokenizer from interaction**: keep per-feature tokens, replace dense self-attention with a learned sparse interaction PRIOR (T2G FR-Graph) — a candidate for taming N^2 feature interactions at 70+ width (with the caveat that it is a prior, not a compute saving).
- **Tabular masked-feature SSL** (TabNet reconstruction objective) as a transferable pretraining signal. (`transferable_idea:tabular-masked-ssl`)

### Records still shallow / needing deeper reading
- None this cycle — all three are deep, all confidence high.

### Weakest / most misleading directions (pitfalls recorded)
- **tabnet-undertuned-baseline-wins**: TabNet's supervised accuracy claims do not survive later tuned benchmarks; treat the SELECTION mechanism as the contribution, not the leaderboard numbers.
- **tabnet-impoverished-input-encoding** + **raw-digit-numerics-no-embedding** (GReaT): two more instances of the recurring "weak numeric leg" pattern (cf. DCN-V2, CARTE, AutoInt) — none of these anchors pairs a strong numeric embedding with its headline mechanism.
- **fr-graph-no-compute-saving-quadratic**: a learned sparse interaction graph imposes a PRIOR but does not reduce FLOPs; do not credit T2G with solving the O(M^2) wall.
- **feature-count-extrapolation-max-47** + **t2g-no-temporal-93-feature-ceiling**: both new architectures top out below the topic's 70+ target on real evaluations (GReaT 47, T2G 93) and neither touches temporal — the persistent structural gap (70+ features + high-cardinality INPUTS + temporal together) named in the cycle-7 synthesis remains unclosed.

### Graph changes and newly connected concepts
- Added 3 work nodes (each with a `belongs_to_route` edge): TabNet→feature-interaction-selection, T2G→tabular-transformers, GReaT→llm-tabular-serialization.
- Added 21 supporting nodes (13 technique, 3 transferable_idea, 5 pitfall) and 34 edges total. Graph now 148 nodes / 206 edges.
- Cross-work links established: TabNet `compared_against` FT-Transformer; T2G `improves_on` + `compared_against` FT-Transformer and `compared_against` AutoInt / DCN-V2 / tree-models (ties the new sparse-interaction work into the existing interaction cluster); GReaT `alternative_to` TabLLM (connects the two LLM-serialization anchors) and `compared_against` CTGAN/TVAE synthesis baselines.
- **Node-id normalizations during collation:** (1) subagent-proposed `technique:ft-transformer-feature-tokenizer` (T2G `uses_technique`) remapped to the existing `technique:feature-tokenizer` — the T2G record states it reuses the FT-Transformer tokenizer verbatim, so this avoids a duplicate-with-different-slug fragmenting the graph. (2) GReaT's proposed `concept:complex-feature-tokenization` target (an invalid node kind — `concept:` is not in graph_edge_types' allowed prefixes) remapped to a new `transferable_idea:order-invariant-arbitrary-conditioning-tokenizer` node, preserving the edge's intended meaning (the permutation trick is transferable to the topic) under an allowed kind. Precedent: cycle-1 collation similarly remapped `concept:token-granularity` → `transferable_idea:token-granularity`.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write challenges were absorbed into the `pitfalls` fields (above), which scope the transfer claims rather than overturn them.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: open `discretization-vq` beyond the single TIGER/RQ-VAE recsys anchor with a tabular-native quantization work, or add LIFT as the third LLM-serialization paradigm.
- **deepen**: TabTransformer (the SAINT/T2G baseline) as the contextual-categorical-embedding contrast that is still only referenced, not recorded.
- **challenge**: run the matched-compute width comparison the route_index has wanted since cycle 2 — TabNet sparsemax SELECTION gate vs T2G sparse interaction PRIOR vs DCN-V2 cross vs AutoInt attention on the same 70+-feature tokenizer — to settle which interaction/selection primitive actually tames many heterogeneous features. Still unevidenced.

## contract_violations  2026-06-16T15:30:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 148 nodes (8 route / 21 work / 65 technique / 17 transferable_idea / 37 pitfall), 206 edges, 21 belongs_to_route (one per work node). No auto-fixes required; no residual violations.


## Cycle 7 — 2026-06-16 (mode=SYNTHESIS) — synthesis note

First synthesis pass (synthesis_every_n_cycles = 7). Wrote `report/main.md` (10 sections per
`topic.yaml.report_sections[]`), `report/reference_index.md` (4-tier reading guide), and
`report/iteration_log.md`. 16 of 18 per-work JSON records re-read in full to verify every `[Ref: …]`
against the sentence it backs (completeness self-check); no citation overclaims the record. The brief
lands `recommended-approaches` on four ranked, implementable recipes (default per-feature build;
temporal-static fusion; shared zero-per-feature-param embedder; buy-don't-build baseline), each tied to
the recorded pitfalls and the 70+-feature scale. Contradictions surfaced explicitly: learned numeric vs
TabLLM raw-digit; deep-tabular vs GBDT-still-wins; joint attention vs channel-independence. The persistent
structural gap (no single work covers 70+ features + high-cardinality INPUTS + temporal together) is
stated as the topic's headline open problem. saturation_signal = false (coverage near-saturating, but the
matched-compute width comparison and temporal-fusion-at-width remain unevidenced). Indexes left untouched.


## Cycle 6 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Sixth cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed `deep`, all `confidence: high`, all `flagged: 0`. This cycle answers exactly the iteration_mix the cycle-5 plan called for: a **deepen** of `tabular-transformers` past the FT-Transformer scaffold (SAINT — intersample/row attention + contrastive pretraining), a **new mechanism** on `categorical-high-cardinality` (the first vocabulary-free/stateless string encoder, MinHash + Gamma-Poisson, past the 2016 entity-embedding anchor), and a **challenge/yardstick** (TabArena — a fixed-budget living benchmark that bounds the foundation-model scaling claims accumulated in cycles 3-5).

### New directions explored
- **categorical-high-cardinality** (was a single 2016 anchor) gained its first vocabulary-free / stateless string encoder: **MinHash n-gram encoding** (hash character n-grams into a fixed-width signature; OOV-robust, no fitted vocabulary, no label leakage) and the interpretable **Gamma-Poisson n-gram matrix factorization** variant. This is the missing high-cardinality primitive — entity embeddings are closed-vocab and need an OOV bucket; target encoding leaks the label; MinHash is fixed-width, stateless, and degrades gracefully on dirty/typo'd categories. Peer-reviewed (TKDE), 17+ real datasets, productionized in skrub/dirty_cat.
- **tabular-transformers** (deepen) gained **SAINT**: intersample (row) attention treats each ROW as a token and lets rows attend within a batch — a learned, end-to-end soft-kNN — plus a self-supervised contrastive pretraining objective using CutMix (input space) + mixup (embedding space). Distinct from FT-Transformer's column-only attention; helps on wide + label-scarce + noisy/missing tables.
- **tabular-transformers** (challenge) gained **TabArena**, a living benchmark (not a tokenizer): 51 curated IID datasets (10-1000 features, 500-250k samples), 16 models including 3 foundation models (TabPFNv2 / TabICL / TabDPT). It is the fixed-budget yardstick the route_index has been asking for since cycle 2, and it directly checks the foundation-model scaling story from cycles 3-5.

### Works deeply analyzed (not just collected)
1. **saint-row-attention-contrastive** (2021) — per-feature single-ReLU continuous embedding + categorical token; alternating self-attention (over features) and intersample attention (over rows in a batch); contrastive CutMix+mixup SSL pretraining. Strongest on wide / label-scarce / noisy data. Refute-checked transfer: intersample attention reshapes a row to (n·d) dims, so its projection matrices are (n·d)×(n·d) — **quadratic in feature count**; the paper cut d to 4-12 on wide datasets to fit one GPU, which masks the cost. The "SAINT-i is fast (123s vs 1759s)" line is a config artifact (L=1). Row attention also makes per-row predictions **batch-composition-dependent** (non-i.i.d. at inference). The "beats GBDT" headline is benchmark-optimistic.
2. **encoding-high-cardinality-string-categoricals** (2020, Cerda & Varoquaux, TKDE) — MinHash signatures over character n-grams give a stateless fixed-width encoder with no vocabulary and graceful OOV behavior; the Gamma-Poisson factorization recovers interpretable latent "categories" from n-gram counts. Beats one-hot and matches/beats target/similarity encoding on dirty high-cardinality columns. Refute-checked transfer: MinHash coordinates are NOT a metric space, so raw codes are not directly meaningful for attention/distance — they need a learned projection before feeding a transformer tokenizer (recorded as a pitfall).
3. **tabarena-living-benchmark** (2025) — 51 curated IID datasets, 16 models, leakage-audited, living/versioned. Topic-critical scoping: foundation-model wins are **bounded to ≤500-feature subsets**, and **temporal data is excluded by design** — so TabArena cannot validate temporal-static fusion claims and cannot certify foundation models above ~500 features. It is a yardstick + a guardrail on the cycle-3-5 foundation-model narrative, not a new mechanism.

### Strongest actionable technical ideas so far (this cycle's additions)
- **MinHash n-gram encoder** (technique:minhash-ngram-encoder): the cleanest vocabulary-free, stateless, OOV-robust fixed-width encoder for the high-cardinality categorical half of a 70+-mixed-feature tokenizer. Complements (does not replace) entity embeddings and target encoding. Open design work: project MinHash codes into the transformer's token space (they are not a metric space).
- **Per-feature ReLU continuous embedding + contrastive CutMix/mixup pretraining** (SAINT): a transferable label-free pretraining recipe and a simple numeric-embedding leg that can be grafted onto an FT-Transformer/PLR scaffold without importing the expensive intersample attention.
- **TabArena as fixed-budget yardstick**: gives the project a leakage-audited, versioned evaluation harness; use it to test a from-scratch wide-table tokenizer against the 16 baselines — while respecting that its ≤500-feature ceiling and temporal exclusion leave the topic's hardest regime uncertified.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`. The persistent structural gap is unchanged: still NO single work demonstrates a genuine 70+-heterogeneous-feature width WITH high-cardinality categorical INPUTS AND time-varying signals together. SAINT's intersample attention does not scale in feature count; MinHash solves only the high-cardinality string leg (and only up to a learned projection); TabArena explicitly excludes temporal data and caps foundation-model validation at ≤500 features.

### Weakest / most misleading directions (pitfalls recorded)
- **quadratic-row-attention-cost** (SAINT): intersample attention's (n·d)×(n·d) projections blow up with feature count; the paper's small-d workaround on wide datasets hides this. Do NOT credit SAINT-i as a free scaling win.
- **non-iid-batch-dependent-predictions** (SAINT): row attention couples a prediction to its batch's composition — a serving/consistency hazard analogous to TabPFN-v2's query-set coupling pitfall.
- **minhash-coords-not-metric-for-attention** (encoding-high-card): MinHash output is not a metric space; raw codes need a learned projection before attention/distance use.
- **TabArena scoping (absorbed into the record):** foundation-model wins are ≤500-feature-bounded and temporal data is excluded by design — a guardrail on over-reading the cycle-3-5 "foundation models scale" claims, sharpening the cycle-5 `feature-count-is-extrapolation` pitfall with an external benchmark.

### Graph changes and newly connected concepts
- Graph went from **110 nodes / 147 edges to 124 nodes / 172 edges** (+14 nodes, +25 edges).
- Added 3 work nodes (all with `belongs_to_route` edges: SAINT→tabular-transformers, encoding-high-card→categorical-high-cardinality, TabArena→tabular-transformers), 6 technique nodes, 1 transferable_idea node, 3 pitfall nodes.
- Cross-work lineage now explicit: SAINT `alternative_to` FT-Transformer, `improves_on`/`compared_against` TabTransformer (baseline), `contradicts` the tree-models-outperform benchmark; MinHash encoder `alternative_to` entity-embeddings; TabArena `compared_against` FT-Transformer / TabPFN-v2 / tree-models and `contradicts` the tree-models benchmark (foundation models win on its ≤500-feature subsets). The categorical-high-cardinality route is now a two-node cluster (closed-vocab entity embedding vs vocabulary-free MinHash).
- **Collation reconciliations (node-id / edge normalization by the single writer):**
  1. SAINT's subagent proposed `work:tabtransformer` as the target of `improves_on` + `compared_against`, but no `records/works_json/tabtransformer.json` exists — a `kind: work` node without a record file is the one hard violation the validator cannot auto-fix. Following the cycle-1 precedent for `autoint` (a baseline architecture used only as a comparison target), it was represented as **`technique:tabtransformer`** and the two edges rewired to it. Avoids an orphan work node.
  2. SAINT proposed `technique:intersample-row-attention -> concept:scaling-interaction (transferable_to)`; `concept:` is not an allowed node kind (`scaling-interaction` is a concept_LAYER key, not a route or node). Remapped the target to a new **`transferable_idea:intersample-row-attention-as-soft-knn`** node, preserving the intent (the idea is transferable to scaling/interaction at width).
  3. TabArena's subagent emitted ALL edges with bare slugs (`tabarena-living-benchmark`, `ft-transformer-revisiting-tabular-dl`, `tabpfn-v2`, `tree-models-outperform-deep-tabular`) — every one prefixed to the `work:` node-id contract.
  4. `technique:target-encoding` did not previously exist; created as a valid technique node (target encoding is a real baseline) as the target of encoding-high-card's `compared_against` edge.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: a learned MinHash-into-transformer projection probe (resolve the not-a-metric-space pitfall) OR LIFT/GReaT to complete the llm-tabular-serialization route's paradigms; alternatively the discretization-vq route still has only one recsys-native anchor (RQ-VAE) and wants a genuine tabular VQ.
- **deepen**: the recurring five-cycle structural gap — lift TabICL's shared Set-Transformer column embedder into a SUPERVISED wide-table tokenizer and evaluate it on TabArena's leakage-audited harness at a true 70+-feature width with high-cardinality (MinHash-encoded) categorical INPUTS.
- **challenge**: now that TabArena gives a fixed-budget external yardstick, directly test the emerging default ("FT-Transformer scaffold + PLR numeric + MinHash categorical + feature-axis attention") against frozen foundation models (TabPFNv2/TabICL/TabDPT) on TabArena — and quantify what happens past its ≤500-feature ceiling and on the temporal data it excludes.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7; this is cycle 6 — the synthesis pass is due NEXT cycle). This cycle completes the evidence base for that pass: it fills the high-cardinality-categorical gap with a vocabulary-free primitive, adds a contrastive-pretraining + row-attention deepen on the transformer route, and — most importantly for synthesis honesty — adds an external, leakage-audited benchmark (TabArena) that bounds the foundation-model scaling claims the report would otherwise have inherited uncritically from cycles 3-5.

### Flagged claims
- None subagent-flagged (all three returned `flagged: 0`, empty verdict lists). Refute-before-write challenges were absorbed into each record's `pitfalls` field (scoping transfer claims rather than overturning them): SAINT's quadratic cost + batch-dependence, MinHash's non-metric coordinates, TabArena's ≤500-feature + no-temporal scoping. The cycle's honesty risk again lived in the GRAPH layer — a phantom `work:tabtransformer` target, a `concept:`-kind node, and TabArena's bare-slug edges — all caught and normalized by the single writer (see Collation reconciliations); no record-level claim was inflated.

## contract_violations  2026-06-16T14:30:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 124 nodes (8 route / 18 work / 54 technique / 14 transferable_idea / 30 pitfall), 172 edges, 18 belongs_to_route (one per work node). No auto-fixes required; no residual violations. All node-id/edge normalization (phantom `work:tabtransformer` → `technique:tabtransformer`, `concept:scaling-interaction` → `transferable_idea:intersample-row-attention-as-soft-knn`, TabArena bare-slug edges prefixed) was done manually during collation, so the validator had nothing left to fix.

---

## Cycle 5 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Fifth substantive cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed as `deep`; two `confidence: high` (TabLLM, TabICL v1), one `confidence: medium` (TabICL v2 — strong claims but 2026 arXiv, pretraining code unreleased, headline gains depend on 8-estimator shuffle ensembling). Zero subagent-flagged claims. This cycle finally seeds the last unexplored route — `llm-tabular-serialization` (TabLLM) — and deepens `tabular-foundation-models` to four paradigms (TabPFN-v2, CARTE, TabICL v1, TabICL v2). **All 8 execution routes are now active.**

### New directions explored
- **llm-tabular-serialization** (was the LAST unexplored route) seeded with TabLLM — serialize a table ROW into a natural-language sentence via a manual Text Template (`The <column> is <value>.`), tokenize with the LLM's own SentencePiece subword tokenizer, classify by the normalized probability of a verbalizer token. No learned tabular tokenizer at all; the LLM IS the classifier; few-shot adaptation = T-Few PEFT. The route's defining lesson is mostly a *cautionary* one (token-budget wall), plus one transferable nugget (column-name-as-semantics, shared with CARTE) and one reusable protocol (permuted-names/only-values ablation to prove a tokenizer uses names + fine-grained values).
- **tabular-foundation-models** (already active, now 3 searches) gained the TabICL lineage as a third and fourth paradigm. TabICL v1: a SHARED Set-Transformer column embedder (ISAB hypernetwork emitting per-cell affine `W,B`, **zero per-feature parameters**) + column-collapse to a single per-row token so the expensive sample-axis ICL attention is paid once (`O(m^2 n + n^2)` vs TabPFNv2's `O(m^2 n + n^2 m)`). TabICL v2 (2026 open SOTA): target-aware embedding (TAE), column-then-row attention, repeated-feature-grouping (3 columns per token), QASSMax; surpasses tuned RealTabPFN-2.5 on TabArena/TALENT without tuning at 10x the speed.

No routes remain unexplored. The remaining frontier is *depth/scope within* routes (high-cardinality categorical INPUTS, temporal-static fusion at width, behavior above the <=100-feature pretraining ceiling), not coverage.

### Works deeply analyzed (not just collected)
1. **tabllm-few-shot-llm-serialization** (2023, AISTATS) — nine serialization variants studied; the simple manual Text Template beats LLM-generated serializers (which hallucinate / drop features). T0 11B (1024-token limit), T-Few PEFT on k serialized examples. Zero-shot is non-trivial (Income 0.84, Car 0.82 AUC) by exploiting LLM priors; matches/beats GBDTs up to 256 shots on most public datasets, wins by >5 AUC in the very-few-shot regime. **Strongest baseline is TabPFN, not a tree** — it matches/exceeds TabLLM across most shot counts. Topic-critical negative: public datasets capped <=30 columns by design; the 106-feature claims case needed lossy concept-selection + List Short<=10 and was overtaken by LR/LightGBM past 256 shots. Numerics = raw digit strings (no numeric embedding; authors flag Gorishniy-2022 as future work).
2. **tabicl-in-context-large-data** (2025, ICML / PMLR 267) — three stacked transformers: TFcol (shared Set-Transformer/ISAB column embedder, distribution-aware affine `e = W⊙c + B`, shared across ALL features) → TFrow (row-wise attention, 4 [CLS] tokens collapse a row to one 512-d token, RoPE over the feature axis to de-collapse identically-distributed features) → TFicl (12-layer dataset-wise ICL). Tree-SCM-augmented synthetic prior (30% XGBoost-regressor SCMs) + size curriculum, 20 days on 3×A100. Best median rel-accuracy on TALENT-200; statistically tied with TabPFNv2 but **surpasses both TabPFNv2 and CatBoost on the 53 >10K-sample datasets**, 3-10x faster on large data. Code + weights released.
3. **tabicl-v2-scalable-foundation-model** (2026, arXiv:2602.11139) — repeated feature grouping (token = 3 circularly-shifted columns) + target-aware embedding (`E2 = E1 + EmbedTAE(y)` on context rows) + column-then-row-then-dataset attention + QASSMax + Muon. `O(n^2 + n*m^2)`; 1M samples / 500 features in ~450s with disk offload. Surpasses tuned RealTabPFN-2.5 on TabArena (51) + TALENT (300) **without tuning**; wins where TabPFN-2.5 OOMs; 10.6x faster on H100. Mixed-radix label encoding handles arbitrary class counts — but that is for high-cardinality TARGETS, NOT high-cardinality input features (easy misread, recorded as a pitfall).

### Strongest actionable technical ideas so far (this cycle's additions)
- **Shared distribution-aware column embedder + column-collapse-to-row-token** (technique:shared-set-transformer-column-embedder + technique:column-collapse-row-token, TabICL v1): the cleanest "ingest N heterogeneous features with ZERO per-feature parameters, adapt to each column's distribution, then pay the expensive sample-axis attention ONCE on collapsed per-row tokens" recipe. Directly attacks both the per-feature-param-blowup pitfall AND the quadratic-attention-feature-count pitfall recorded in cycle 1. Single most reusable 70+-feature primitive found to date. Pair with RoPE-over-feature-axis to avoid representation collapse among identically-distributed features.
- **Target-aware embedding (TAE)** (technique:target-aware-embedding, TabICL v2): inject the label additively into the per-feature embedding of context rows instead of appending the target as an extra column — a cheap, generic way to make every feature token label-conditioned, claimed to mitigate representation collapse. Caveat: only applies where labeled context exists at inference (ICL); adapting it to a non-ICL supervised tokenizer is open work.
- **Column-name-as-semantics + the permutation ablation protocol** (TabLLM, reinforcing CARTE's open-vocabulary-colname-value-tokenizer): the reusable nugget from the LLM-serialization route is that feature NAMES carry transferable semantics; the reusable *method* is the permuted-names / only-values / permuted-values ablation that proves a tokenizer genuinely uses (i) correct names and (ii) fine-grained values — applicable to evaluate ANY tokenizer we build.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`. The persistent structural gap is unchanged and now sharper: still NO work demonstrates a genuine 70+-heterogeneous-feature width WITH high-cardinality categorical INPUTS and many rows. TabICL v1/v2 are pretrained <=100 features, so the topic's 70+ target sits at/above the training ceiling and leans on RoPE/grouping extrapolation. TabLLM tops out <=30 readable columns. Every "scales to 500 features" claim is an inference-extrapolation ceiling, not the pretraining regime.
- TabICL v2 is `deep` but `confidence: medium`: 2026 arXiv preprint, pretraining + synthetic-prior code unreleased at submission, and the "surpasses tuned RealTabPFN-2.5 without tuning" headline bakes in 8-estimator column/class-shuffle ensembling (test-time augmentation cost). Do not over-read the no-tuning claim.

### Weakest / most misleading directions (pitfalls recorded)
- **token-budget-scaling-wall** (TabLLM): verbatim text serialization does NOT scale to 70+ rich features — the 1024-token cap forced <=30 columns by design and lossy truncation on the 106-feature case. Treat any "works on tabular data" LLM-serialization claim as <=30 readable columns. This is the route's defining limitation for the topic.
- **rope-breaks-column-permutation-invariance** (TabICL v1): RoPE over the feature axis sacrifices a defining tabular property (permutation invariance), only approximately restored by a 32-shuffle ensemble — a 32x inference tax that complicates serving.
- **feature-count-is-extrapolation** (TabICL v1) / mixed-radix-is-for-TARGETS (TabICL v2): both "scales to 500 features" and "handles arbitrary class counts" are easy to over-read — the former is OOD inference-extrapolation above a <=100-feature training regime; the latter solves high-cardinality TARGETS, not high-cardinality input features.

### Graph changes and newly connected concepts
- Graph went from 95 nodes / 116 edges to **110 nodes / 147 edges** (+15 nodes, +31 edges).
- Added 3 work nodes (all with `belongs_to_route` edges: TabLLM→llm-tabular-serialization, TabICL v1→tabular-foundation-models, TabICL v2→tabular-foundation-models), 12 technique nodes, 3 pitfall nodes; no new transferable_idea nodes this cycle (reused token-granularity, routed enables_scaling/transferable_to edges to existing route nodes per the subagents' proposals).
- Cross-work lineage now explicit: TabICL v2 `improves_on` + `compared_against` TabICL v1; TabICL v1 `improves_on` + `compared_against` TabPFN-v2; both TabICL variants `compared_against` FT-Transformer / tree-models benchmark. TabLLM `compared_against` TabPFN-v2, CARTE, and the tree-models benchmark, and `contradicts` on-embeddings-numerical-features (its raw-digit numeric serialization stands against that work's finding that learned numeric embeddings matter — a tension the TabLLM authors themselves concede).
- **Collation reconciliations (node-id / edge normalization by the single writer):**
  1. TabICL v1's subagent proposed ALL its edges with bare slugs (e.g. `tabicl-in-context-large-data`, `tabpfn-v2`, `tree-models-outperform-deep-tabular`, `ft-transformer-revisiting-tabular-dl`) — prefixed every one to the `work:` node-id contract.
  2. TabLLM proposed `technique:text-serialization-of-rows -> technique:llm-column-name-embedding (alternative_to)`; `llm-column-name-embedding` does not exist — remapped to the canonical CARTE node `technique:column-name-lm-embedding-as-relation`.
  3. TabLLM proposed `technique:text-serialization-of-rows -> concept:token-granularity (transferable_to)`; `concept:` is not an allowed node kind — remapped to the existing `transferable_idea:token-granularity` node.
  4. The `contradicts on-embeddings-numerical-features` edge was kept after refute-check: TabLLM's own pitfall #4 and transferable_idea both concede raw-digit numerics are the weak point vs Gorishniy-2022, so the tension is real, not a hallucinated edge.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: all 8 routes are seeded, so "new" now means a genuinely new MECHANISM rather than a new bucket — e.g. SAINT/TabTransformer for contextual categorical embeddings + intersample attention (deepens categorical-high-cardinality past the 2016 anchor), or skrub TableVectorizer / Gamma-Poisson as a non-LM high-cardinality baseline.
- **deepen**: lift TabICL's shared Set-Transformer column embedder into a SUPERVISED wide-table tokenizer and stress-test at a true 70+-feature width with high-cardinality categorical INPUTS — the recurring structural gap across all five cycles.
- **challenge**: the emerging default recommendation (FT-Transformer scaffold + PLR numerical branch + feature-axis attention) is now rivaled by "just use a pretrained foundation model (TabICL v2)". Sharpen: when does a from-scratch supervised tokenizer beat a frozen foundation model at 70+ features with many rows — exactly the regime where TabICL claims to win but is extrapolating above its training ceiling?

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7; this is cycle 5). With all 8 routes now seeded and the evidence base spanning every route, the first synthesis pass at ~cycle 7 will be well-supported. This cycle adds the LLM-serialization leg (mostly cautionary) and promotes tabular-foundation-models to the best-covered route (4 paradigms).

### Flagged claims
- None subagent-flagged (all three returned `flagged: 0`, empty verdict lists). Refute-before-write challenges were absorbed into each record's `pitfalls` field (scoping transfer claims rather than overturning them). The cycle's honesty risk again lived in the GRAPH layer: TabICL v1's subagent emitted every edge without `<kind>:` prefixes, and TabLLM proposed two non-existent/wrong-kind target nodes — all caught and normalized by the single writer (see Collation reconciliations); no record-level claim was inflated.

## contract_violations  2026-06-16T13:20:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 110 nodes (8 route / 15 work / 47 technique / 13 transferable_idea / 27 pitfall), 147 edges, 15 belongs_to_route (one per work node). No auto-fixes required; no residual violations. All node-id/edge normalization was done manually during collation (see Cycle 5 Collation reconciliations), so the validator had nothing left to fix.

---

## Cycle 4 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Fourth substantive cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed as `deep`; two `confidence: high` (CARTE, iTransformer), one `confidence: medium` (TIGER — strong mechanism but recsys-native, only the RQ-VAE kernel transfers). Zero subagent-flagged claims. Collation made several node-id and edge reconciliations (below): one bare-slug work-node prefix fix, two concept-layer-key targets rewired to proper transferable_idea nodes, two slug remaps to existing canonical technique nodes, and one redundant-but-valid dual-rel edge kept. Both previously-unexplored routes that remained after cycle 3 are now seeded or advanced: `discretization-vq` gets its first anchor; `tabular-foundation-models` and `temporal-feature-tokenization` each gain a representative work.

### New directions explored
- **discretization-vq** (was unexplored) seeded with TIGER / RQ-VAE Semantic IDs — residual quantization of a content embedding into a short coarse-to-fine tuple of hierarchical discrete codes from a small shared codebook (3 levels × 256 + 1 collision token). This is the first record on the only-VQ route; the transferable kernel is "bounded shared codebook for extreme cardinality + content-derived cold-start," stripped of the recsys generative-retrieval machinery (explicit topic anti-pattern).
- **tabular-foundation-models** (already active) gained a second paradigm: CARTE — an open-vocabulary tokenizer that LM-embeds the COLUMN NAME (FastText) as a graph edge feature and fuses it with the cell value, turning each row into a star graphlet. Distinct from TabPFN-v2's synthetic-SCM per-cell prior: CARTE's prior is REAL background knowledge (contrastive pretraining on YAGO with edge-dropout positives), and the same tokenizer transfers across tables with different/renamed columns with zero schema matching.
- **temporal-feature-tokenization** (already active) gained a third anchor: iTransformer — variate-as-token (inverted) embedding, where one whole variate's lookback series becomes one token and attention runs over variates (joint cross-feature interaction), the explicit-interaction opposite of PatchTST's channel-independence.

Only **llm-tabular-serialization** remains entirely unexplored after this cycle (TabLLM / LIFT / GReaT).

### Works deeply analyzed (not just collected)
1. **carte-pretraining-transfer-tabular** (2024, ICML / PMLR 235) — graphlet row tokenization: row → star graph, leaf node = cell value, edge = FastText embedding of the COLUMN NAME; numeric cell = value × E_colname, string cell = FastText(string); missing columns simply dropped. Graph-attentional Transformer contextualizes each entry. Contrastive YAGO pretraining (9.3M params, InfoNCE, edge-dropout positives). Best avg rank vs 42 baselines on 51 datasets at train sizes 32–2048, largest edge on string-heavy/high-cardinality tables and in the low-sample regime. Robust to missing values; entity matching NOT needed. BUT numerical encoder is admittedly weak (no PLR/periodic), one fine-tune attention layer, no test beyond ~2048 rows or at 70+ columns, high compute that grows with n.
2. **itransformer-inverted-transformers** (2024, ICLR) — inverts the token: shared MLP embeds a variate's whole T-length series → one D-dim token; self-attention over N variate tokens models inter-variate correlation; per-token LayerNorm reconciles heterogeneous-scale series; shared FFN learns each series' temporal representation; linear head per token. SOTA on high-dimensional forecasting (Traffic N=862, ECL 321, PEMS up to 883), essentially a TIE with PatchTST on small ETT. Generalizes to unseen variates (train on ~20%); variate subsampling per batch tames O(N²). It is FT-Transformer's feature-as-token applied to time-varying features with JOINT attention.
3. **tiger-rqvae-semantic-ids** (2023, NeurIPS) — Sentence-T5 fuses item metadata → 768-d vector; RQ-VAE MLP → 32-d latent; residual quantization with m=3 codebooks (256 each) → coarse-to-fine code tuple (+1 collision token); a seq2seq model autoregressively generates the next item's semantic-ID tuple. The quantizer never sees raw heterogeneous features — only one pre-fused embedding. Beats sequential-recsys baselines by +5–29% on Amazon subsets; graceful cold-start via content embedding. Scope-trap: ONLY the RQ-VAE discretize-an-embedding-into-hierarchical-codes idea transfers; the generative-retrieval system is out of scope.

### Strongest actionable technical ideas so far (this cycle's additions)
- **Open-vocabulary (column-name-embedding, value) tokenizer** (transferable_idea:open-vocabulary-colname-value-tokenizer): LM-embed every column NAME once and fuse it with the cell value, so a token is a (colname-vector, value) pair rather than a fixed feature slot. Single most reusable CARTE move: open vocabulary ingests arbitrary heterogeneous columns including high-cardinality strings with zero per-column lookup tables, makes the SAME tokenizer reusable across renamed/reordered schemas (enables cross-table pretraining/transfer), and handles missing values by dropping nodes. Recipe for 70+ features: LM-embed colnames; numeric cell = scalar × colname-vector (upgrade to PLR/periodic), string cell = LM(string); attention modulates column importance via the edge feature.
- **Variate-as-token over joint attention with shared per-token weights** (transferable_idea:feature-as-token-joint-attention-shared-weights + :variate-token-bridges-temporal-static-fusion): the cleanest unification blueprint — encode each feature (time-varying via MLP/PatchTST patching, static/categorical via its own encoder) into one token, run ONE joint self-attention over the mixed token set (explicit cross-feature interaction), per-token FFN learns each feature's representation. Two scaling/heterogeneity tools come free: per-token LayerNorm/RevIN to reconcile heterogeneous scales, and random variate-subsampling per batch to keep O(N²) attention affordable at 70+ tokens.
- **RQ-VAE shared-codebook hierarchical codes for high cardinality** (technique:rq-vae-semantic-id, route discretization-vq): turn an extreme-cardinality entity into a short ordered tuple of hierarchical discrete codes from a small shared codebook so similar entities share prefixes and cold/rare entities inherit a code from their content embedding instead of an OOV bucket. Bounds vocabulary and gives graceful OOV — a candidate replacement for per-field high-cardinality embedding tables, OR a way to compress a whole 70-feature row into a few tokens to cut attention length.

### Records still shallow / needing deeper reading
- None this cycle — all three are `deep`. But the structural gap persists: still NO work demonstrated at a genuine 70+-heterogeneous-feature width with many rows. CARTE pretraining centers on ~15-relation graphlets and ≤2048 rows; iTransformer's 862 variates are all NUMERIC (not mixed-type); TIGER's quantizer sees one pre-fused vector, never raw features. Every "scales to many features" signal this cycle is either below the target width, single-type, or orthogonal to the per-feature axis.
- TIGER is `deep` but `confidence: medium` because its evidence is entirely recsys-retrieval — it says nothing about tabular-prediction accuracy, so its numbers must not be cited as tokenizer-helps-tabular evidence.

### Weakest / most misleading directions (pitfalls recorded)
- **scaling-claim-without-70-feature-evidence** (CARTE): "tabular foundation model" here does NOT mean wide-table or large-n; all results ≤2048 rows / ~15-relation graphlets. Do not assume it works at 70+ columns without re-testing (topic scaling anti-pattern).
- **weak-numerical-encoder** (CARTE): numeric tokenization is just scalar × colname-vector + power transform — far weaker than PLR/periodic from the numerical-embeddings route; CARTE's strength is the string LM + pretraining, not numeric handling. Authors themselves list adopting Gorishniy-2022 embeddings as future work.
- **benchmark-composition-string-heavy** (CARTE): the headline win is concentrated on deliberately string-heavy/high-cardinality datasets; on numeric-heavy tables TabPFN can win (proposal's GBDT-vs-deep composition caveat applies).
- **recsys-machinery-wholesale-import** (TIGER): importing TIGER wholesale is out of scope; only the RQ-VAE kernel transfers. The quantizer never sees raw heterogeneous features (Sentence-T5 + text serialization does that upstream), so "it handles complex items" is misleading for the topic.
- **variate-not-mixed-type-heterogeneity** + **tie-with-patchtst-on-low-dimensional-data** (iTransformer): "variates" are numeric time series differing in scale, NOT numeric+categorical+static heterogeneity; per-token LayerNorm reconciling scale is not mixed-type fusion. And the variate-as-token win is concentrated on many-correlated-variate datasets — it ties PatchTST on low-dimensional ETT, so do not cite it as universally beating patch-based tokenization.

### Graph changes and newly connected concepts
- Graph went from 75 nodes / 83 edges to **95 nodes / 116 edges** (+20 nodes, +33 edges).
- Added 3 work nodes (all with `belongs_to_route`): CARTE→tabular-foundation-models, TIGER→discretization-vq, iTransformer→temporal-feature-tokenization.
- New technique nodes: column-name-lm-embedding-as-relation, graphlet-row-tokenization, fasttext-string-embedding, contrastive-pretraining-edge-dropout, rq-vae-semantic-id, vq-vae-quantization, lsh-semantic-id, variate-as-token-inverted-embedding. New transferable_idea nodes: open-vocabulary-colname-value-tokenizer, feature-as-token-joint-attention-shared-weights, variate-token-bridges-temporal-static-fusion. New pitfall nodes: scaling-claim-without-70-feature-evidence, weak-numerical-encoder, benchmark-composition-string-heavy, recsys-machinery-wholesale-import, variate-not-mixed-type-heterogeneity, tie-with-patchtst-on-low-dimensional-data.
- Cross-cycle links: CARTE `compared_against` work:tabpfn-v2 and work:tree-models-outperform-deep-tabular, `alternative_to` work:entity-embeddings-categorical-variables (three distinct tokenization paradigms now triangulated on the foundation-model question); CARTE's graphlet-row-tokenization `alternative_to` the canonical technique:feature-tokenizer (FT-Transformer). iTransformer `compared_against` + `alternative_to` work:patchtst-time-series-64-words (the two temporal tokenizers now directly linked: joint attention vs channel-independence), its variate-as-token technique `extends` technique:feature-tokenizer and the work `uses_technique` feature-tokenizer (explicit FT-Transformer bridge). TIGER's rq-vae-semantic-id `extends` technique:vq-vae-quantization, `alternative_to` technique:entity-embedding-categorical (codebook vs lookup table) and technique:lsh-semantic-id, and is flagged `transferable_to route:categorical-high-cardinality` + `enables_scaling route:discretization-vq`.

### Collation reconciliations (subagent proposals overridden by single writer)
- **PREFIX FIX** — TIGER subagent emitted bare slugs (`tiger-rqvae-semantic-ids`) for its work node and edges, violating the `<kind>:<slug>` node-id contract. Rewritten to `work:tiger-rqvae-semantic-ids` throughout (matches the records/works_json filename stem).
- **CONCEPT-LAYER-KEY REWIRE** — iTransformer proposed edges to `scaling-interaction` and `temporal-static-fusion`, which are `concept_layers[]` keys, not graph node kinds (no `<kind>:` prefix, not a permitted node kind). Rewired to two proper transferable_idea nodes: `enables_scaling → transferable_idea:feature-as-token-joint-attention-shared-weights` and `transferable_to → transferable_idea:variate-token-bridges-temporal-static-fusion`.
- **SLUG REMAP** — iTransformer's `technique:feature-as-token` (extends target) and CARTE's `technique:per-feature-tokenization` (graphlet-row-tokenization alternative_to target) both remapped to the existing canonical `technique:feature-tokenizer` (FT-Transformer) to avoid duplicate-with-different-slug fragments. TIGER's `technique:entity-embedding-table` remapped to the existing canonical `technique:entity-embedding-categorical`.
- **DUAL-REL EDGE KEPT** — CARTE proposed both `transferable_to` and `enables_scaling` from `technique:column-name-lm-embedding-as-relation` to `transferable_idea:open-vocabulary-colname-value-tokenizer`. These are distinct (src,dst,rel) triples and both are semantically defensible (the idea is transferable AND the open-vocabulary move is what lets the tokenizer scale across schemas), so both were kept rather than collapsed.
- No work-to-work edge was dropped this cycle: CARTE's three cross-work edges (compared_against TabPFN-v2 / tree-models; alternative_to entity-embeddings) and iTransformer's two PatchTST edges are all supported by the records' baselines/contrast sections; all endpoints already exist as nodes, so none were dangling.

### Best next directions for next cycle (iteration_mix: new≥1, deepen≥1, challenge≥1)
- **new**: open `llm-tabular-serialization` (TabLLM / LIFT / GReaT row-to-text) — the last zero-coverage route, and a natural contrast to CARTE's LM-on-column-names (serialize-the-whole-row-as-text vs embed-each-colname-as-a-relation).
- **deepen**: push `tabular-foundation-models` past two anchors toward the wide-table regime — XTab (federated cross-table featurizer), TabICL, or TabPFN-2.5/3 (2026); OR record skrub TableVectorizer / Gamma-Poisson as the non-LM high-cardinality baseline CARTE beats.
- **challenge**: the topic's central unresolved engineering question is unchanged and now sharper — run the matched-compute comparison at 70+ fields across the interaction/selection/tokenization mechanisms now recorded (DCN-V2 low-rank cross vs AutoInt field-shared attention vs TabPFN feature-axis attention vs TFT VSN vs iTransformer variate-as-token vs CARTE colname-relation), all on the SAME per-feature(+PLR) tokenizer, measuring accuracy AND wall-clock. Every mechanism remains validated only below the target width or on single-type data.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7; this is cycle 4). This cycle adds the cross-schema transfer paradigm (CARTE LM-on-column-names), the third temporal anchor (iTransformer variate-as-token, the joint-attention counterpoint to PatchTST), and the discretization-vq kernel (RQ-VAE codes). Evidence base now spans 7 of 8 routes (only llm-tabular-serialization empty); first synthesis pass still due around cycle 7.

### Flagged claims
- None subagent-flagged (all three returned `flagged: 0`, empty verdict lists). Refute-before-write challenges were absorbed into each record's `pitfalls` field (scoping transfer claims, not overturning them). As in prior cycles, the cycle's honesty risk lived in the GRAPH layer — but this time it was node-id contract violations (bare slugs, concept-layer-key targets) rather than unsupported work-to-work edges; all were caught and reconciled by the single writer (see Collation reconciliations). One record (TIGER) carries `confidence: medium` because its evidence is recsys-only and silent on tabular prediction — noted for scope, not flagged as false.

## contract_violations  2026-06-16T13:10:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 95 nodes (8 route / 12 work / 38 technique / 13 transferable_idea / 24 pitfall), 116 edges, 12 belongs_to_route (one per work node). All node-id and concept-layer-key issues were reconciled during collation BEFORE the validator ran (see Collation reconciliations above), so the validator required no auto-fixes and reported no residual violations.

---

## Cycle 3 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Third substantive cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed as `deep`; two `confidence: high`, one `confidence: medium` (TabPFN v2 — its primary source is auth-gated, so in-paper benchmark tables were not read line-by-line). Zero subagent-flagged claims. Collation made five edge-level reconciliations (below): three remaps to existing canonical nodes and two drops of work-to-work edges the records do not support. Two previously-active routes gained a second representative work; one previously-unexplored route now has its first anchor.

### New directions explored
- **tabular-foundation-models** (was unexplored) seeded with TabPFN v2 — per-cell tokenization + two-way (feature-axis + sample-axis) alternating attention + prior-data-fitted synthetic-SCM pretraining. Directly answers the Grinsztajn "does pretraining/large-data narrow the DL-vs-GBDT gap" open question — answer: yes, but only in the small-data (<=~10k samples, <=~500 features) regime.
- **temporal-feature-tokenization** (already active) gained a second representative work: TFT — supplies the static-covariate-fusion mechanism (Variable Selection Networks + three-way input split + static context vectors) that PatchTST entirely lacks.
- **feature-interaction-selection** (already active) gained a second representative work: DCN-V2 — the field-count-scalable explicit-interaction operator (full-matrix Hadamard cross + low-rank MoE), the cheaper alternative to AutoInt's O(M^2) attention.

Two routes remain entirely unexplored: llm-tabular-serialization, discretization-vq.

### Works deeply analyzed (not just collected)
1. **tabpfn-v2** (2025, Nature) — PER-CELL tokenization (one token per (row, feature) cell) inside a single pretrained PFN; FeatureEncoder+TargetEncoder embed cells, then ~12 layers of alternating AttnFeat (within-row, across features) / AttnSamp (within-feature, across rows) + MLP; permutation-invariant in both rows and columns. Pretrained on ~130M synthetic structural-causal-model datasets (in-context Bayesian posterior-predictive objective). Matches/beats tuned CatBoost/XGBoost/AutoGluon in one forward pass — but ONLY at <=~10k samples / <=~500 features. INWT replication confirms the edge erodes as data grows (600 obs: 14.2% vs XGB 17.3% MAPE; 6k obs: 13.1% vs 13.3%).
2. **temporal-fusion-transformer** (2021, Int. J. Forecasting) — per-variable embedding (entity embeddings for categorical, linear for continuous) → Variable Selection Network (instance-wise softmax gating + per-variable GRN) on each of three input groups (static / observed-past / known-future) → LSTM seq2seq (init by static contexts) → single interpretable multi-head attention → quantile heads. ~7%/9% lower P50/P90 q-Risk vs next-best on 4 datasets. Crucial caveat: 370/440 are ENTITY counts, not feature counts — VSN at 70+ features is a plausible mechanism, untested.
3. **dcn-v2-deep-cross-network** (2020, WWW 2021) — per-field embeddings concatenated into a flat x0; cross layer x_{l+1} = x0 ⊙ (W_l x_l + b_l) + x_l with a FULL d×d matrix (V2's change from V1's rank-1 vector) producing all crosses up to order L+1; cost O(d^2 L_c), low-rank/MoE O(d r K L_c), independent of field count M (no O(M^2) attention). Wins ~+0.0014-0.0016 AUC over AutoInt/xDeepFM/DCN-V1 on Criteo — material at web-scale conventions, small in absolute terms. CTR/recsys only; raw-scalar numerics; no temporal/missing.

### Strongest actionable technical ideas so far (this cycle's additions)
- **Variable Selection Network as a learned per-feature soft-gating tokenizer** (transferable_idea:variable-selection-as-feature-tokenizer): embed every feature to a common d_model (entity embeddings for categorical, linear for continuous), learn a per-instance softmax weight per feature conditioned on static context, plus a per-feature GRN, then sum. Single most reusable idea for 70+ mixed features: uniform recipe across numeric+categorical+static+temporal, explicit capacity allocation away from noise, free per-feature importance. Pair with the three-way input split (static / observed-past / known-future) + four static context vectors for temporal-static fusion.
- **Field-count-independent explicit-interaction operator** (transferable_idea:field-count-independent-explicit-interaction-operator): DCN-V2's Hadamard cross (and AutoInt's field-shared attention) both add interaction capacity whose PARAM/COMPUTE cost is driven by embedding-dim d (cross) or is M-independent in params (attention) — bolt 1-2 low-rank cross layers between a per-feature tokenizer and an MLP head to get all order-3 interactions without the O(M^2) attention wall. The low-rank MoE knob trades accuracy for latency under fixed memory.
- **Feature-axis attention + synthetic-SCM-prior pretraining** (transferable_idea:feature-axis-attention-for-many-heterogeneous-features, transferable_idea:synthetic-prior-pretrained-tokenizer): TabPFN v2 shows raw mixed numeric/categorical/missing cells can be ingested with zero feature engineering, and that a tokenizer pretrained on synthetic causal datasets generalizes across schemas. The feature-axis attention block and the prior-fitting recipe are reusable even though the full v2 model is below the topic's scale.
- Composition story now spans the temporal-static leg (FT-Transformer/PatchTST + VSN-style gating + static context fusion) and the interaction leg (per-feature tokenizer + DCN-V2 low-rank cross OR AutoInt field-shared attention + efficient attention for O(M^2)).

### Records still shallow / needing deeper reading
- TabPFN v2 is `deep` but `confidence: medium` — the Nature source is auth-gated, so the exact in-paper benchmark tables were cross-verified via README/Wikipedia/INWT replication rather than read line-by-line. Re-verify against a non-gated PDF when available; this is the one record this cycle whose evidence base is secondhand for the headline numbers.
- Structural gaps persist: still NO work demonstrated at a genuine 70+-heterogeneous-feature width (TFT's VSN, DCN-V2's cross, and TabPFN's feature-axis attention are all plausible-at-scale MECHANISMS validated below that width); high-cardinality-at-scale still asserted, not demonstrated.

### Weakest / most misleading directions (pitfalls recorded)
- **foundation-model-not-wide-table-scale**: TabPFN v2 is a SMALL-DATA model (<=~500 features / ~10k samples); "foundation model" must not be read as "scales to wide tables". The topic's 70+-feature-with-many-rows target is OUTSIDE its recommended regime — use successors (v2.5/v3) or the transferable blocks, not the published v2 model.
- **query-set-coupling-predictions-not-row-independent**: TabPFN v2 predictions depend on which test rows are batched together — a real serving/reproducibility gotcha.
- **feature-count-inflation-entities-vs-features**: TFT's 370/440 are ENTITY counts, not feature counts; do NOT cite TFT as empirical evidence for 70+-feature scaling. Its VSN is a mechanism for it, untested at that width; per-variable GRNs + per-variable embeddings make params grow linearly in feature count.
- **cross-cost-quadratic-in-flattened-dim-d**: DCN-V2 is M-independent in field count but O(d^2) in the FLATTENED dimension d = #fields×embedding_dim; 70 fields × 32-dim ⇒ d≈2240 ⇒ ~5M-param dense cross per layer — low-rank/MoE is effectively mandatory at width, "O(d^2)" is not cheap.
- **raw-scalar-numeric-input-no-numeric-embedding** (DCN-V2) + the same weakness in TFT: both feed raw/linear scalars — borrow their interaction/selection layers, NOT their numeric front-ends; pair with PLR/periodic from the numerical-embeddings route.
- **small-absolute-auc-gain-recsys-only**: DCN-V2's headline win is ~+0.0015 AUC, recsys-only, and a well-tuned plain DNN nearly matches all explicit-interaction baselines — the explicit-cross benefit is modest once a strong MLP is present; transfer to a non-recsys 70-feature target is plausible but unverified.

### Graph changes and newly connected concepts
- Graph went from 56 nodes / 57 edges to **75 nodes / 83 edges** (+19 nodes, +26 edges).
- Added 3 work nodes (all with `belongs_to_route`), 6 technique nodes (per-cell two-way attention, PFN synthetic-SCM pretraining, VSN, full-matrix Hadamard cross, low-rank MoE cross, DCN-V1 rank-1 CrossNet), 4 transferable_idea nodes, 6 pitfall nodes.
- Cross-cycle links: TabPFN's per-cell tokenizer tied as `alternative_to` the existing `technique:feature-tokenizer` (FT-Transformer); TFT `uses_technique` the existing canonical `technique:entity-embedding-categorical` (shared with the 2016 anchor and DCN-V2); DCN-V2 `compared_against work:autoint-feature-interaction` and its cross layer `alternative_to` the existing `technique:multi-head-self-attention-interacting-layer` (AutoInt) — the two explicit-interaction primitives are now directly linked on one route; TFT `alternative_to work:patchtst-time-series-64-words` ties the two temporal tokenizers (static-fusion vs patching).
- **Collation reconciliations (subagent proposals overridden by single writer):**
  - REMAP `technique:per-feature-token-ft-transformer` (TabPFN proposal) → existing canonical `technique:feature-tokenizer` to avoid a duplicate-with-different-slug fragment.
  - REMAP `technique:entity-embeddings` (TFT) and `technique:per-field-entity-embedding` (DCN-V2) → existing canonical `technique:entity-embedding-categorical`.
  - REMAP `technique:self-attentive-interacting-layer` (DCN-V2's alternative_to target) → existing canonical `technique:multi-head-self-attention-interacting-layer` (AutoInt's interacting layer).
  - DROPPED `work:tabpfn-v2 improves_on work:ft-transformer-revisiting-tabular-dl`: the record frames TabPFN as a per-cell ALTERNATIVE to per-feature tokenizers, not an improvement on FT-Transformer (its baselines are GBDTs/AutoGluon, never FT-Transformer). The genuine relation is captured at the technique level via `per-cell-two-way-attention-tokenization alternative_to feature-tokenizer`.
  - DROPPED `work:tabpfn-v2 compared_against work:tree-models-outperform-deep-tabular`: TabPFN v2 (2025) did not benchmark against the Grinsztajn benchmark paper (2022); the conceptual link (TabPFN answers Grinsztajn's large-data open question) is real but is not a `compared_against` method relation.
  - DROPPED `work:temporal-fusion-transformer compared_against work:deepar`: DeepAR is a genuine TFT baseline but has no node/record → would be a dangling edge the validator drops. Rolls forward as a candidate baseline to record (mirrors cycle 2's DLinear handling).

### Best next directions for next cycle (iteration_mix: new≥1, deepen≥1, challenge≥1)
- **new**: open `discretization-vq` (RQ-VAE / VQ-VAE codebook semantic-ID tokens) for the high-cardinality compression Grinsztajn flags as unsolved; OR `llm-tabular-serialization` (TabLLM/LIFT/GReaT) — both are the only zero-coverage routes left.
- **deepen**: record DeepAR (TFT baseline) and iTransformer to round out the temporal route; OR CARTE/XTab/TabICL to push tabular-foundation-models past a single anchor and toward the wide-table regime.
- **challenge**: run the matched-compute scaling comparison the records keep pointing at — DCN-V2 low-rank cross vs AutoInt field-shared attention vs TabPFN feature-axis attention vs TFT VSN, all on the SAME per-feature(+PLR) tokenizer at 70+ fields, measuring accuracy AND wall-clock. This is now the topic's central unresolved engineering question; every interaction/selection mechanism is validated only below the target width.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7). This cycle adds the static-fusion mechanism (TFT VSN), the field-count-scalable interaction operator (DCN-V2 cross), and the foundation-model paradigm (TabPFN v2). Evidence base now spans 6 of 8 routes; first synthesis pass still due around cycle 7.

### Flagged claims
- None subagent-flagged (all three returned `flagged: 0`, empty verdict lists). Refute-before-write challenges were absorbed into each record's `pitfalls` field (scoping transfer claims, not overturning them). As in cycle 2, the cycle's honesty risk lived in the GRAPH layer: two subagent-proposed work-to-work edges asserted relationships the records do not support (TabPFN improves_on/compared_against, see reconciliations) — caught and dropped by the single writer. One record (TabPFN v2) carries `confidence: medium` because its headline numbers are secondhand (auth-gated source) — noted for re-verification, not flagged as false.

---

## Cycle 2 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

Second substantive cycle. Three works deep-read in parallel (per-work isolation respected; single-parent collation). All three landed as `deep`, `confidence: high`, zero subagent-flagged claims — but collation surfaced four edge-level reconciliations (below), three of which were dropped/rewritten because the subagent-proposed edge contradicted the work's own record. Three previously-unexplored routes now have anchors; one previously-active route gained a second representative work.

### New directions explored
- **temporal-feature-tokenization** (was unexplored) seeded with PatchTST — patching as the canonical time-varying tokenizer + masked-patch self-supervised pretext.
- **feature-interaction-selection** (was unexplored) seeded with AutoInt — explicit field-shared self-attention interacting layer, params O(1) in feature count.
- **tabular-transformers** (already active) gained a second representative work: the Grinsztajn 2022 benchmark, as the challenge/motivation anchor for the whole topic.

Three routes remain entirely unexplored: tabular-foundation-models, llm-tabular-serialization, discretization-vq.

### Works deeply analyzed (not just collected)
1. **patchtst-time-series-64-words** (2023, ICLR) — subseries PATCHING (P-length window → one linearly-projected token, default P=16, "64 words" = 64 patches at L=512) + CHANNEL-INDEPENDENCE (shared weights, per-channel univariate, no cross-channel attention) + RevIN-style instance norm + masked-patch (40% zeroed) MAE pretext. 21% MSE cut vs Transformer baselines; smaller, setting-dependent margin over the linear DLinear.
2. **autoint-feature-interaction** (2019, CIKM) — per-field embedding → stacked multi-head self-attention "interacting layer" with a load-bearing residual; attention params O(L·d·d'·H) INDEPENDENT of feature count M, but compute O(M²). Best/tied AUC on 3/4 CTR datasets; max M=39 in their data.
3. **tree-models-outperform-deep-tabular** (2022, NeurIPS D&B) — 45-dataset, ~20k-compute-hour fixed-budget benchmark: trees beat all NNs (incl. FT-Transformer, the DL best-case) at every search budget. Three inductive-bias findings: NNs over-smooth / fail on irregular targets; NNs fragile to uninformative features (super-linear sample-complexity penalty); data are not rotation-invariant so learners shouldn't be (random rotation REVERSES the ranking).

### Strongest actionable technical ideas so far (this cycle's additions)
- **Patching as the time-varying tokenizer** (transferable_idea:patching-controls-sequence-length): aggregate consecutive timesteps of a temporal feature into a fixed window, project to one token — gives local semantics and collapses the per-feature time axis to ~L/S tokens. Borrow patching; do NOT borrow channel-independence (it deliberately removes the cross-feature interaction the 70+-mixed setting needs).
- **Field-shared interacting layer** (transferable_idea:field-shared-attention-m-independent-params): one set of Q/K/V/Res matrices reused across all field tokens → widening to 70+ fields adds ZERO attention params. The canonical explicit interaction layer to bolt onto a per-feature tokenizer; pair it with PLR/periodic numerics (its own rank-1 numerical embedding is its weak link) and an efficient-attention fix for the O(M²) compute.
- **Break-rotation-invariance lens** (transferable_idea:per-feature-embedding-breaks-rotation-invariance): per-feature embeddings help deep tabular models less from richness and more from preserving the meaningful per-feature basis (matters MORE as uninformative features accumulate) + injecting high-frequency capacity. Argues: keep tokens per-feature, prefer PLR/periodic over raw scalars, and pair tokenization with explicit feature selection/gating.
- Composition story sharpened: FT-Transformer scaffold + PLR numerical branch + AutoInt-style field-shared interaction layer (with efficient attention) + (for the time-varying half) patch tokens fused with static tokens.

### Records still shallow / needing deeper reading
- None this cycle — all three are deep. Coverage gaps remain structural, not depth: NO work yet fuses temporal + static (PatchTST has no static/categorical pathway); the high-cardinality-at-scale story is still asserted, not demonstrated (Grinsztajn explicitly excludes >20-cardinality categoricals).

### Weakest / most misleading directions (pitfalls recorded)
- **channel-independence-drops-feature-interaction**: PatchTST shows cross-channel mixing HURTS for homogeneous numeric channels — this does NOT license dropping interactions in a heterogeneous 70+ numerical+categorical+static setting. Common over-transfer trap.
- **autoint-quadratic-attention-in-feature-count**: "scales to many features" is true for PARAMS (M-independent) but FALSE for COMPUTE (O(M²)); headline efficiency rests on M≤39. The binding constraint at the topic's 70+ target.
- **autoint-rank1-numerical-embedding**: e_m = v_m·x_m is rank-1, no bias — borrow AutoInt's interaction layer, NOT its numerical tokenizer.
- **rotation-invariance-hurts-mlp** + **benchmark-excludes-highcard-missing-temporal**: the "trees still win" verdict is conditioned on medium (~10K) data and EXCLUDES high-cardinality, missing, and temporal features — exactly the topic's hardest cases. Do not cite it as a verdict on the topic's setting; it sets the motivation, not the conclusion.

### Graph changes and newly connected concepts
- Graph went from 35 nodes / 31 edges to **56 nodes / 57 edges** (+21 nodes, +26 edges).
- Added 3 work nodes (all with `belongs_to_route`), 9 new technique nodes, 3 transferable_idea nodes, 5 pitfall nodes.
- Cross-cycle links: the cycle-1 baseline node `technique:autoint` is now tied to its source work via `work:autoint-feature-interaction introduces_technique technique:autoint`; `technique:per-field-embedding-tokenizer extends technique:entity-embedding-categorical` connects AutoInt's tokenizer to the 2016 categorical anchor; `transferable_idea:per-feature-embedding-breaks-rotation-invariance transferable_to route:tabular-transformers` ties the benchmark's diagnosis back to the architecture route.
- **Collation reconciliations (subagent proposals overridden by single writer):**
  - `technique:entity-embeddings-categorical` (AutoInt, plural) remapped to the existing canonical `technique:entity-embedding-categorical` (singular) to avoid a duplicate-with-different-slug fragment.
  - Malformed edges `{dst:"enables_scaling"}` (PatchTST) and `{dst:"scaling-interaction"}` (AutoInt, two edges) had bare/concept-key dsts (no `<kind>:` prefix) → rewritten to point at new `transferable_idea:` nodes (`patching-controls-sequence-length`, `field-shared-attention-m-independent-params`).
  - DROPPED `work:autoint-feature-interaction compared_against work:ft-transformer-revisiting-tabular-dl`: contradicts the record — AutoInt (2019) predates FT-Transformer and explicitly did NOT benchmark against it. The real relation is the reverse (FT-Transformer compared_against technique:autoint, already in graph from cycle 1).
  - DROPPED `work:patchtst compared_against work:dlinear`: DLinear has no node and no record → would be a dangling edge. Rolls forward as a candidate baseline to record.
  - DROPPED `work:tree-models compared_against work:on-embeddings-numerical-features` and `work:on-embeddings improves_on work:tree-models`: the benchmark cites Gorishniy 2022 as a hypothesis source but does NOT benchmark the PLR models (its DL set is MLP/ResNet/FT-Transformer/SAINT), and "improves_on a benchmark" is not a meaningful method relation. The benchmark→idea link is instead expressed via `transferable_idea:per-feature-embedding-breaks-rotation-invariance`.

### Best next directions for next cycle (iteration_mix: new≥1, deepen≥1, challenge≥1)
- **new**: open `tabular-foundation-models` (TabPFN v2 / CARTE / XTab) — directly answers the Grinsztajn "large-data / pretraining narrows the gap" open question and is zero-coverage; OR `discretization-vq` (RQ-VAE semantic-ID tokens) for the high-cardinality compression Grinsztajn flags as unsolved.
- **deepen**: record DLinear (PatchTST's strongest non-Transformer baseline) and iTransformer/TFT to get a static-covariate-fusion mechanism PatchTST lacks; pushes the temporal route past a single anchor.
- **challenge**: stress the "FT-Transformer + PLR + AutoInt interaction layer" composition against the O(M²) wall — find an efficient/sparse-attention or DCN-V2-style interaction that keeps AutoInt's M-independent params without the quadratic compute; this is now the topic's central scaling bottleneck.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7). This cycle adds the temporal and interaction legs plus the motivating benchmark — the evidence base now spans 5 of 8 routes. First synthesis pass still due around cycle 7.

### Flagged claims
- None subagent-flagged (all three returned `flagged: 0`, empty verdict lists). Refute-before-write challenges were absorbed into each record's `pitfalls` field (scoping transfer claims rather than overturning them). The cycle's honesty risk lived in the GRAPH layer, not the records: three subagent-proposed edges asserted relationships the records themselves contradict (see Collation reconciliations) — caught and dropped by the single writer.

---

## Cycle 1 — 2026-06-16 (mode=RESEARCH, fanout=3, verify=off)

First substantive cycle. Three works deep-read in parallel (per-work isolation respected; collation by single parent writer). All three landed as `deep` records with `confidence: high` and zero flagged claims.

### New directions explored
- **numerical-embeddings** seeded with the canonical per-feature numerical tokenizer (PLE / Periodic / PLR).
- **tabular-transformers** seeded with the canonical mixed-type Feature Tokenizer (FT-Transformer).
- **categorical-high-cardinality** seeded with its pre-2018 foundational primitive (learned per-field entity embeddings).

Five routes remain entirely unexplored: tabular-foundation-models, llm-tabular-serialization, temporal-feature-tokenization, discretization-vq, feature-interaction-selection.

### Works deeply analyzed (not just collected)
1. **on-embeddings-numerical-features** (2022, NeurIPS) — PLE (soft ordinal one-hot over bins), Periodic (sin/cos with learnable frequencies), and PLR (Periodic+Linear+ReLU) per-feature numerical embeddings; quantile and C4.5-tree (target-aware) bin construction. Closes most of the DL-vs-GBDT gap; backbone-agnostic (helps MLP/ResNet, not just Transformers).
2. **ft-transformer-revisiting-tabular-dl** (2021, NeurIPS) — unified per-feature affine token `Tj = bj + fj(xj)` (scalar*vector for numerical, lookup for categorical), [CLS] readout over vanilla pre-norm Transformer. The minimal scaffold every later tokenizer extends.
3. **entity-embeddings-categorical-variables** (2016, historical anchor) — learned per-field embedding table trained end-to-end; tunable per-field dimension; ancestor of all deep tabular categorical tokenizers.

### Strongest actionable technical ideas so far
- **PLR / PLE as the numerical leg** of a 70+-mixed-feature tokenizer (transferable_idea: per-feature token granularity). Default to PLR; use quantile PLE when interpretability/compute/preprocessing-robustness matters.
- **Unified per-feature affine token** (FT-Transformer) as the mixed-type scaffold; the per-feature additive bias is empirically necessary, and the numerical branch is the obvious slot to upgrade with PLR/periodic.
- **Tunable per-field embedding dimension** (entity embeddings) decouples token width from cardinality.
- Clear composition story emerging: FT-Transformer scaffold + PLR numerical branch + (future) high-cardinality-aware categorical branch + (future) efficient attention.

### Records still shallow / needing deeper reading
- None this cycle — all three are deep. But coverage is narrow: the categorical anchor is a single-dataset 7-feature 2016 paper, so the high-cardinality-at-scale story is asserted, not demonstrated.

### Weakest / most misleading directions (pitfalls recorded)
- **per-feature-param-blowup** + **quadratic-attention-feature-count**: per-feature non-shared embeddings and O(k^2) MHSA are the two costs that bite exactly at the topic's 70+-feature target; neither paper solves them.
- **target-aware-bin-leakage** (PLEt): tree bins fit on train labels — must be out-of-fold controlled or leakage results.
- **supervised-embedding-transfer-leakage** (entity embeddings): feeding supervised-trained embeddings into a second model is close to learned target encoding; "boosts all ML methods" is partly absorbed target signal, not clean feature encoding.
- **naive-scalar-numerical-embedding**: FT-Transformer's numerical embedding is just scalar*vector+bias; do NOT credit it with PLR-strength numerical encoding (common conflation).
- **concat-then-mlp-implicit-interaction-unscaled**: entity-embedding concat-then-MLP leaves interactions implicit and does not scale cleanly to 70+ features — motivates attention-based interaction.

### Graph changes and newly connected concepts
- Graph went from 8 route nodes / 0 edges to 35 nodes / 30 edges.
- Added 3 work nodes (all with `belongs_to_route` edges), 13 technique nodes, 3 transferable_idea nodes, 7 pitfall nodes.
- Cross-work links established: on-embeddings `improves_on` + `compared_against` FT-Transformer; both Yandex numerical-tokenization lineage now connected. FT-Transformer `uses_technique` entity-embedding-categorical, linking the categorical anchor into the transformer scaffold.
- Node-id normalizations during collation (see contract_violations note): subagent-proposed `work:ft-transformer` remapped to the in-batch slug `work:ft-transformer-revisiting-tabular-dl`; `work:autoint` represented as `technique:autoint` (architecture used as a comparison/improvement target, consistent with other baseline technique nodes, avoids an orphan work node with no record file); `concept:token-granularity` remapped to `transferable_idea:token-granularity` (the `concept:` prefix is not an allowed node kind).

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: open a temporal route (PatchTST / iTransformer / TFT) — directly serves the topic's time-varying + static fusion goal, currently zero coverage; OR open feature-interaction-selection (efficient attention / DCN-V2 / AutoInt) to attack the O(k^2) wall.
- **deepen**: TabTransformer / SAINT to contrast token granularity and contextual categorical embeddings vs the FT-Transformer scaffold; pushes the high-cardinality-at-scale story past the 2016 anchor.
- **challenge**: test the implied "FT-Transformer + PLR" composition recommendation against the Grinsztajn-2022 line that GBDT still beats tuned DL on many tabular tasks — sharpen or scope the default recommendation.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis written yet (synthesis_every_n_cycles = 7). This cycle establishes the evidence base; the first synthesis pass is due around cycle 7.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write challenges were absorbed into the `pitfalls` fields of each record (above), which scope the transfer claims rather than overturn them.

## contract_violations  2026-06-16T12:42:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 75 nodes (8 route / 9 work / 30 technique / 10 transferable_idea / 18 pitfall), 83 edges, 9 belongs_to_route (one per work node). No auto-fixes required; no residual violations.

---

## Cycle 12 — 2026-06-16T18:00:00Z (collation)

3 works deep-read this cycle, all returned `analysis_depth: deep`, all `flagged: 0`.

### New directions explored this cycle
- **MIMO (Training Independent Subnetworks for Robust Prediction, ICLR 2021)** — deep-read the *ancestor* of TabM. Grounds the tabular-ensembling lineage already in the corpus (TabM, BatchEnsemble). Multi-input/multi-output multiplexing of M independent subnetworks through one shared backbone; Deep-Ensemble-level diversity/calibration/OOD at a single forward pass and ~0.03% extra params. Route: feature-interaction-selection.
- **UniTabE (ICLR 2024)** — first corpus work with an *explicit per-cell data-type embedding* tokenizer. TabUnit encodes each cell as (column-name embedding, data-type embedding, value tokens) fused by two cheap gates (Fuse + Linking); unifies numeric/categorical/text/missing in one schema-agnostic scheme; evaluated on 80–85-column tables (GPP 81, IO 85, HPA 80). Route: tabular-foundation-models.
- **Trompt (ICML 2023)** — prompt-learning importance gate as an O(P×C) replacement for O(C²) feature self-attention; learned input-independent column embeddings + P soft prompts → per-sample, per-prompt, interpretable column importances. Route: tabular-transformers.

### Works deeply analyzed (not just collected)
- All three: mechanism + ablations + transfer assessment extracted (honesty gate satisfied). Each carries scoped transfer claims and a pitfalls block (refute-before-write applied — claims scoped, not overturned).

### Strongest actionable technical ideas added
- **Cell-as-token + explicit data-type embedding (UniTabE TabUnit)**: the cleanest concrete recipe yet for unifying numeric/categorical/text/missing in ONE tokenizer that admits any column count (incremental-columns at only +3.5%/5.8% AUC drop for k=1/2 dropped). Fuse+Linking gates are the dominant ablation contributors (+0.11 AUC), cheap, and reimplementable independent of the 7TB pretraining.
- **Prompt-importance gate (Trompt)**: O(P×C) importance over columns instead of O(C²) self-attention, interpretable and GBDT-comparable — an attractive interaction/selection primitive for wide tables (with a hidden B×P×C×d activation constant to watch).
- **MIMO multiplexing**: near-zero prediction-cost robustness/calibration wrapper that COMPOSES with any tokenizer; the conceptual seed of TabM. The input-repetition coefficient ρ is the load-bearing knob.

### Records still shallow / needing deeper reading
- None new. All three are deep. The three records' own next-experiments (PLR-into-Trompt, magnitude-aware numerics into UniTabE, MIMO/TabM head over an FT-Transformer at 70+ features) are recorded as route next_angles.

### Weakest / most misleading directions (pitfalls flagged into the graph)
- **numerics-textualized-no-magnitude-embedding (UniTabE)**: despite criticizing textualization, UniTabE itself textualizes numerics — exactly the weakness the numerical-embeddings route exists to fix; it sidesteps with scale + a type flag, does not solve it.
- **per-cell-multitoken-sequence-blowup-quadratic-attention (UniTabE)**: one cell = (1+q) tokens, so a 70+-column table is a sequence MUCH longer than the column count; O(L²) attention in total token length. "Scales to many features" = schema flexibility, NOT compute efficiency.
- **pretraining-domain-leakage-public-benchmarks (UniTabE)**: only the 12 Kaggle tasks are guaranteed held out; scratch (0.81) vs finetuned (0.83) shows the pretraining lift on public sets is modest, win is mostly the TabUnit architecture.
- **untested-high-cardinality-and-wide-tables (Trompt)**: Grinsztajn45 filters out high-cardinality categoricals and missing values; "narrows the gap to GBDT" is NOT 70+-heterogeneous evidence. Supplementary FT/SAINT tables are un-tuned (not apples-to-apples).
- **mimo-misfiled-as-tokenizer-capacity-contingent (MIMO)**: MIMO is neither a tokenizer nor a feature-interaction method; "for free" is prediction-time only (batch repetition raises training cost); benefit is contingent on backbone over-parameterization and ρ tuning — this is exactly why TabM had to adapt rather than drop MIMO in.

### Graph changes and newly connected concepts
- Added 3 work nodes (each with a `belongs_to_route` edge): `work:mimo-independent-subnetworks-robust-prediction` → feature-interaction-selection; `work:unitabe-universal-tabular-encoder` → tabular-foundation-models; `work:trompt-prompt-tabular` → tabular-transformers.
- Added 6 technique nodes (tabunit-cell-keyvalue-tokenization, data-type-embedding-fuse-gate, multi-cell-masking-pretraining, prompt-learning-importance-gate, per-feature-value-tokenizer, feature-self-attention), 1 transferable_idea (explicit-data-type-embedding-for-feature-typing), 5 pitfall nodes.
- Cross-work links: TabM `improves_on` MIMO and MIMO `alternative_to`/`compared_against` BatchEnsemble now make the parameter-efficient-ensembling lineage (MIMO → BatchEnsemble → TabM) explicit. UniTabE `improves_on` TabTransformer and `compared_against` FT-Transformer / TabPFN-v2 / SAINT / AutoInt, `alternative_to` XTab — ties the cell-as-token foundation model into the existing transformer + foundation-model clusters. Trompt `improves_on`/`compared_against` FT-Transformer and SAINT.
- Node-id normalizations during collation: two subagent-proposed `transferable_to concept:feature-typing` edges (UniTabE) were retargeted to a new `transferable_idea:explicit-data-type-embedding-for-feature-typing` node — `concept:` is not an allowed node kind (only route/work/technique/transferable_idea/pitfall). One Trompt edge `enables_scaling route:scaling-interaction` was retargeted to `route:feature-interaction-selection` — `scaling-interaction` is a concept_layer key, not an execution_route, so `route:scaling-interaction` would be a dangling node; feature-interaction-selection is the correct execution route for scaling.

### Best next directions for next cycle (iteration_mix: new>=1, deepen>=1, challenge>=1)
- **new**: open the discretization-vq or numerical-embeddings depth on magnitude-aware fixes for textualized numerics (UniTabE's gap), OR a temporal-static fusion candidate — temporal route still thin on genuine mixed-type fusion.
- **deepen**: compose UniTabE's TabUnit (cell-as-token + data-type embedding) with a PLR/periodic numerical leg — the single highest-value composition the three records jointly point to.
- **challenge**: the implicit recommendation that prompt-importance / cell-as-token tokenizers help at 70+ features is UNVERIFIED at high cardinality and wide width (Grinsztajn-filtered evals). Next cycle should either find topic-native (TabReD/TabArena, 70+ high-card) evidence or scope the recommendation down.

### Report conclusions strengthened / weakened / redirected
- No `report/main.md` synthesis yet (synthesis_every_n_cycles = 7; orchestrator notes next synthesis ~cycle 14). This cycle adds the cell-as-token-with-type-embedding and prompt-importance-gate primitives plus the MIMO→TabM lineage to the evidence base.

### Flagged claims
- None this cycle. All three records returned `flagged: 0` with empty verdict lists. Refute-before-write challenges were absorbed into the `pitfalls` fields (above), which scope the transfer claims rather than overturn them.

## contract_violations  2026-06-16T18:00:00Z
- None. `validate-contract.sh --fix complex-feature-tokenization` passed clean (exit 0): 208 nodes (8 route / 33 work / 87 technique / 25 transferable_idea / 55 pitfall), 328 edges, 33 belongs_to_route (one per work node). No auto-fixes required; no residual violations.
