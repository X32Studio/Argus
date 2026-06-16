# Iteration Log — Complex Feature Tokenization for Deep Tabular Models

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
