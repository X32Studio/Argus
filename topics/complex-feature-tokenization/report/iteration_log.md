# Iteration Log — Complex Feature Tokenization for Deep Tabular Models

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
