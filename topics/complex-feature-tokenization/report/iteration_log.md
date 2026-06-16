# Iteration Log — Complex Feature Tokenization for Deep Tabular Models

## Synthesis iteration — cycle 21 — 2026-06-16 (UTC)

**Mode:** SYNTHESIS (third synthesis pass; REFRESH of the cycle-14 brief; synthesis_every_n_cycles = 7).

**Files read:**
- Methodology `.claude/loop-summary.md`; topic config `topic.yaml`, `proposal.md` (incl. the cycle-14 "Scope
  expansion" section).
- Indexes/logs: `master_index.jsonl` (54 works), `route_index.json` (all 12 routes), `knowledge_graph.json`
  (339→335 nodes / 571 edges), `logs/research_state.md` (orchestrator_directive + cycles 15–20 in full).
- Prior report: `report/main.md` (cycle-14 version, full), `reference_index.md`, `iteration_log.md`.
- All 18 NEW records (cycles 15–20) read in full: tabpfn-wide-extreme-feature-counts,
  feature-aware-modulation-temporal-tabular, tabformer-tabular-transformers-multivariate-time-series,
  chronos-time-series-tokenization, totem-tokenized-time-series-embeddings, moirai-unified-universal-forecasting,
  timesfm-patch-decoder-foundation, rqkmeans-semantic-ids-generative-retrieval,
  compositional-embeddings-quotient-remainder, hash-embeddings-efficient-word-representations,
  dlrm-criteo-ctr-feature-encoding, high-cardinality-categorical-encoding-kaggle-writeup,
  pytorch-frame-stype-library, rtdl-research-tabular-dl-library, realmlp-better-by-default-tabular-mlp,
  tabflex-scaling-tabpfn-linear-attention, limix-large-tabular-foundation-model, tabpfn-2-5-foundation-model.

**What changed in the main report (vs cycle 14):**
- **Default UNCHANGED, confirmed from 4 new literatures.** PLR + parameter-efficient MLP ensemble on time-based
  splits survives; RealMLP and FiLM-on-TabM independently reinforce the linear-cost-MLP-at-width verdict. Saturation
  on the recommendation.
- **New cross-domain CONVERGENCE section in the executive summary:** "one fixed-width token per field in a shared
  d-dim space" recurs across DLRM, pytorch-frame, Moirai, TabFormer, rtdl — stated explicitly with the design
  implication (emit one d-token per field, keep encoders swappable).
- **recommended-approaches** re-grounded: each component mapped to a runnable library (rtdl numerical leg,
  pytorch-frame registry / high-cardinality escape hatch, TabM backbone). Recipe B (temporal-static) now gives an
  explicit ranked recipe — FiLM (cheap) / TabFormer row-compression (structural) / TimeXer (exogenous fusion). Recipe
  D (buy-don't-build) upgraded: TabPFN-2.5 / LimiX / TabPFN-Wide push the feature ceiling past 70.
- **categorical-and-high-cardinality** turned from a thin pillar into a bounded-memory primitive menu (QR, hash,
  RQ-Kmeans, target/ordered encoding) + the high-cardinality convergence (shared codebook + unique key).
- **open-problems** re-evaluated the headline gap precisely: TabPFN-Wide covers width (HDLSS only), TabFormer the
  temporal-static skeleton, FiLM token-level numeric fusion — but no single work covers high-cardinality INPUTS +
  per-row temporal + 70+ width + many-rows + time-split jointly. Added the NEW grouping-vs-1:1-token tension
  (TabPFN-2.5 vs TabPFN-Wide).

**Technique-dedup (cycle 21):** merged 4 clear semantic duplicate technique nodes →
vqvae-codebook-tokenization→vq-vae-quantization; revin-instance-normalization→instance-normalization-revin;
patch-tokenization-time-series→temporal-patch-tokenization; rqvae-semantic-ids→rq-vae-semantic-id. Rewired all edges
onto canonicals, deduped triples (0 collisions, 0 self-loops), deleted duplicates. 339→335 nodes (technique 144→140);
571 edges preserved; `validate-contract.sh --fix` → exit 0. Recorded under "## technique_dedup cycle 21" in
research_state.md. Conservatively did NOT merge related-not-duplicate techniques (Chronos value-bins vs VQ-VAE vs
TabFormer per-field bins; RQ-Kmeans vs RQ-VAE).

**Newly promoted Must-Read:** tabformer-tabular-transformers-multivariate-time-series (closest to the full setting),
pytorch-frame-stype-library + rtdl (runnable scaffolds), tabpfn-2-5-foundation-model (stronger buy-don't-build).

**Newly identified weak / risky claims:** TabPFN-Wide width is HDLSS-only (not the user's regime); FiLM is
numeric-only + PLR-incompatible; RQ-Kmeans/QR never see raw features and utilization≠accuracy; DLRM "scales" = tables
not tokens; TabPFN-2.5/LimiX are vendor/self-reported (medium confidence); the grouping-vs-1:1-token tension is
unresolved.

**Completeness self-check:** all 51 distinct `[Ref:]` slugs in main.md resolve to real records (0 broken);
reference_index covers all 54 records exactly once. SAINT is the only record not cited in main.md body (tangential —
row attention does not solve feature scaling); retained in reference_index.

**Saturation:** saturation_signal = TRUE. The cycles 15–20 additions mostly CONFIRM rather than change the
recommendations: the default is unchanged and now triangulated from 4 literatures; the genuinely new substance
(FiLM, TabFormer, foundation-model ceiling, runnable libraries) fills in the temporal/library gaps but does NOT
overturn any conclusion, and the residual headline gap (joint high-cardinality + per-row-temporal at 70+ width on
many rows) is inherently the user's own unpublished setting. Diminishing returns — most new works are variants or
adjacent-domain transfers of established mechanisms.

**Published:** <commit SHA recorded after push>.

## Synthesis iteration — cycle 14 — 2026-06-16 (UTC)

**Mode:** SYNTHESIS (second synthesis pass; REFRESH of the cycle-7 brief; synthesis_every_n_cycles = 7).

**Files read:**
- Methodology: `.claude/loop-summary.md`.
- Topic config: `topic.yaml`, `proposal.md`.
- Indexes/logs: `master_index.jsonl` (36 works), `route_index.json`, `logs/research_state.md` (cycles 1-13, full).
- Prior report: `report/main.md` (cycle-7 version), `report/reference_index.md`, `report/iteration_log.md`.
- All 18 NEW per-work records (cycles 8-13) read in full: tabred-benchmark-in-the-wild, tabm-parameter-efficient-ensembling,
  timexer-exogenous-endogenous-fusion, mimo-independent-subnetworks-robust-prediction, batchensemble-efficient-ensembles,
  trompt-prompt-tabular, amformer-arithmetic-feature-interaction, excelformer-semi-permeable-attention, tabr-retrieval-tabular,
  autodis-numerical-discretization, t2g-former-graph-tabular, tabtransformer-contextual-categorical-embeddings,
  xtab-cross-table-pretraining, unitabe-universal-tabular-encoder, tp-berta-lm-tabular-prediction,
  lift-language-interfaced-finetuning, great-generative-tabular-llm, tabnet-attentive-interpretable-tabular.
  Re-read on-embeddings-numerical-features in full to re-verify the PLR citations the new default rests on.
  Cycle-7's 18 records corroborated against the prior brief + research_state mechanism notes.

**What changed in the main report (vs cycle 7):**
- **Default recipe SHIFTED.** Cycle 7's default was a per-feature *attention* scaffold (FT-Transformer + PLR). The new
  regime-matched evidence (TabReD: median 261 features, time-based splits) demotes per-feature attention to runner-up
  (measured O(features²) cost) and elevates **per-feature PLR/PLE embeddings + parameter-efficient MLP ensemble (TabM)** to
  the proven default. Recipe A rewritten around this; old attention default kept as Recipe A′ ("adopt only if it beats A").
- **Ensembling promoted to first-class** (new TabM/BatchEnsemble/MIMO cluster) — tokenizer-agnostic, near-free, linear in
  feature count.
- **Temporal-static-fusion** gains TimeXer's role-asymmetric + global-bridge-token recipe (linear in context-feature count),
  plus the TabReD-forced distinction between snapshot-with-drift (time = split axis) vs genuine per-row series.
- **scaling-and-interaction** reframed by the TabReD verdict (DCN-V2/Trompt/TabR did NOT transfer); added the
  one-token-per-feature linear-attention contenders (AMFormer prompt queries, TimeXer bridge, TP-BERTa IFA).
- **Evaluation discipline** now leads with time-based splits.
- **open-problems** marks which contradictions the new evidence RESOLVES (attention-vs-MLP-ensemble at width; raw-digit-vs-learned
  numerics quantified by RMT) vs leaves OPEN (the 70+-features + high-cardinality + genuine-temporal triple).

**Newly promoted Must-Read records:** tabred-benchmark-in-the-wild, tabm-parameter-efficient-ensembling (the two that moved the default).

**Newly identified weak / risky claims (carried as caveats):** TabReD does not isolate high-cardinality categoricals and its
"temporal" is split-axis-only (so the headline gap is narrowed, not closed); TimeXer's linear cost is role-specific (loses to joint
attention on richly-interacting features, no categorical pathway); AMFormer's necessity claim is synthetic-favorable + log-ReLU
unstable; XTab/TP-BERTa transfer backbone/semantics not a reusable wide-feature tokenizer; ExcelFormer/Trompt are not categorical/temporal
tokenizers.

**Saturation:** saturation_signal = FALSE. The 18 new works did NOT merely confirm cycle 7 — TabReD + the ensembling line
materially **changed the default recommendation** and converted the quadratic-attention liability from asserted to evidenced;
TimeXer + TP-BERTa sharpened the temporal and numerical legs. Coverage is saturating (all 8 routes deep, 36 records), but the
matched-compute 70+-feature comparison and the high-cardinality + genuine-temporal triple remain unevidenced.

**Published:** committed and pushed to origin/main as `9aa669f` (004ddf1..9aa669f).

## Synthesis iteration — cycle 7 — 2026-06-16 (UTC)

**Mode:** SYNTHESIS (first synthesis pass; synthesis_every_n_cycles = 7).

**Files read:**
- Methodology: `.claude/loop-summary.md`.
- Topic config: `topic.yaml` (report_sections, concept_layers, execution_routes, record_fields),
  `proposal.md` (framing, anti-patterns, END GOAL).
- Indexes/logs: `indexes/master_index.jsonl` (18 works), `indexes/route_index.json` (all 8 routes),
  `logs/research_state.md` (cycles 1-6, full).
- Per-work JSON records read in full to verify citations:
  on-embeddings-numerical-features, ft-transformer-revisiting-tabular-dl,
  encoding-high-cardinality-string-categoricals, entity-embeddings-categorical-variables,
  tree-models-outperform-deep-tabular, tabpfn-v2, tabicl-in-context-large-data,
  tabicl-v2-scalable-foundation-model, temporal-fusion-transformer, dcn-v2-deep-cross-network,
  autoint-feature-interaction, patchtst-time-series-64-words, itransformer-inverted-transformers,
  carte-pretraining-transfer-tabular, saint-row-attention-contrastive, tiger-rqvae-semantic-ids,
  tabarena-living-benchmark, tabllm-few-shot-llm-serialization (16 of 18 read in full; tabicl v1
  + the rest corroborated against research_state mechanism notes).

**What changed in the main report:**
- Replaced the "research has not started" stub with a full 10-section citation-backed brief organized
  by `topic.yaml.report_sections[]`.
- `recommended-approaches` now lands on four concrete, ranked recipes (A: default per-feature build;
  B: temporal-static fusion; C: shared zero-per-feature-param embedder; D: buy-don't-build baseline) plus
  an evaluation-discipline subsection — each tied to the recorded pitfalls (param blow-up, O(k²) attention,
  target-aware bin leakage, MinHash-not-metric, foundation-model feature ceilings, temporal exclusion).
- `open-problems-and-contradictions` surfaces the three explicit contradictions (learned numeric vs
  raw-digit; deep-tabular vs GBDT-wins; joint attention vs channel-independence) and the persistent
  structural gap (no work covers 70+ features + high-cardinality inputs + temporal together).

**Newly promoted Must-Read records:**
- on-embeddings-numerical-features, ft-transformer-revisiting-tabular-dl,
  encoding-high-cardinality-string-categoricals, tabicl-in-context-large-data (the four backbone records).

**Newly identified weak / risky claims (carried as caveats, not asserted):**
- Recipe B (temporal-static fusion) is assembled entirely from mechanisms validated only below the user's
  width or on all-numeric variates — flagged in-text as the corpus's biggest gap and most uncertified recipe.
- Foundation-model "scales to 500 features" numbers are inference-time extrapolations above a ≤100-feature
  pretraining ceiling — flagged.
- Lower-confidence records (TabPFN v2 secondhand numbers; TabICL v2 unreleased pretraining code + ensembling;
  TIGER recsys-only) explicitly called out in open-problems and reference_index.

**Saturation:** coverage is near-saturating (all 8 routes seeded, 18 deep records, no new route to open),
but substance is NOT — the central engineering question (matched-compute 70+-feature comparison) and the
temporal-static-fusion-at-width regime remain entirely unevidenced. saturation_signal = false: more depth
at width would still add real substance.

**Published:** committed and pushed to origin/main as `a510a8f` (2c0f57c..a510a8f).
