# Research state

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
