# CARTE: Pretraining and Transfer for Tabular Learning

- **Authors:** Myung Jun Kim, Léo Grinsztajn, Gaël Varoquaux (SODA Team, Inria Saclay; Probabl.ai)
- **Venue / Year:** ICML 2024 (PMLR 235); arXiv:2402.16785v2, May 2024
- **URL:** https://arxiv.org/abs/2402.16785
- **Code:** https://github.com/soda-inria/carte (`pip install carte-ai`) — sklearn-style `CARTERegressor`/`CARTEClassifier`, released pretrained weights
- **Primary route:** tabular-foundation-models (spans: feature-typing, token-granularity, learning-signal; touches categorical-high-cardinality)
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

CARTE (Context-Aware Representation of Table Entries) is a pretrained deep model for tabular data
whose central trick is to make tokenization *schema-agnostic* so that a single model can be
pretrained on background data and transferred to any downstream table — even tables with different,
renamed, or reordered columns, and even entity strings written differently ("London" vs "Londres").
It is pretrained once on the YAGO3 knowledge base via self-supervised contrastive learning, then
fine-tuned per task. It also supports joint learning across multiple weakly-related tables with no
manual column or entity matching. On 51 real datasets it beats 42 baselines (incl. CatBoost,
XGBoost, TabPFN, TabLLM), especially on string-heavy / high-cardinality tables in the low-sample
regime.

## 2. Technical mechanism

**Row → graphlet.** Each row becomes a *star-like graph*: a center/readout node + one leaf node per
non-missing column. The leaf node carries the cell **value**; the **edge** from center to leaf
carries the **column name**. Missing columns are simply omitted (10-col row with 1 missing → 9 leaves).

**LM initialization (the tokenizer).** Every node and edge feature is initialized by **FastText
(300-dim)** applied to the raw string:
- categorical / string value → `FastText(value_string)`
- column name → `FastText(column_name)` (this is the edge feature)
- numerical value → `scalar_value * FastText(column_name)` (element-wise) — e.g. H-index 239 →
  `239 * E_Hindex`
- center node → mean of its leaflets (readout).

This is an **open-vocabulary** tokenizer: no fixed feature slots, no per-category lookup table, no
one-hot/target encoding. Semantically-similar strings land near each other for free.

**Graph-attentional Transformer.** Self-attention where Query = node·W_Q, but
**Key = (node ⊙ edge)·W_K** and **Value = (node ⊙ edge)·W_V** — i.e. the column-name (relation) is
fused into key/value by *element-wise product* (a knowledge-graph-embedding trick from TuckER /
KEN, shown to beat additive fusion). Attention is **masked to the star structure** (each node only
attends to graph neighbors). Pretrained backbone = 12 layers × 12 heads, hidden dim 300, 9.3M params.

**Pretraining.** Contrastive (SimCLR + InfoNCE) on YAGO3 (~18.1M triplets, ~6.3M entities). Each
entity's 2-hop subgraph (capped 100 one-hop / 10 two-hop relations; median ~15 one-hop) is a
graphlet; the positive is an **edge-truncated copy** (drop 30–70% of edges); other batch graphlets
are negatives. 1M steps (~40 epochs), AdamW + cosine, V100 GPUs.

**Fine-tuning.** Reuse initial node/edge layers + Aggregation&Readout; attach a linear head.
Crucially uses only **k=1 attention layer** downstream (to avoid GNN over-smoothing). Yeo-Johnson
power transform on numerics for stability. **Bagging** ensemble over different early-stopping splits.

**Transfer / multi-table.** Jointly fine-tune on target+source graphs (batch 64, 8 from target);
source outcome `y_S` is moment-matched to target via power transform / binarized; early stopping on
target validation. Multiple sources → pairwise (target, source_i) learners ensembled with a
self-supervised softmax weighting, plus the single-table learner as fallback.

## 3. Why it matters for the topic's stated goals

The topic needs a tokenizer for 70+ heterogeneous mixed-type features, especially **high-cardinality
categoricals/strings**, with a transfer story. CARTE is the cleanest demonstration that
**embedding the column NAME with a language model and fusing it with the cell value** yields an
open-vocabulary tokenizer that (a) ingests arbitrary heterogeneous columns with zero per-column
engineering, (b) is reusable across tables → enables cross-table pretraining/transfer, and (c)
handles missing values by node deletion. It is also the topic's prime example of robust
high-cardinality handling without one-hot/target-encoding (which the proposal flags as leaky/colliding).

## 4. What is reusable

- **Column-name-as-relation, LM-embedded.** Treat a token as a `(LM(column_name), value)` pair, not
  a fixed feature index. Directly portable to a 70+-feature tokenizer.
- **Element-wise value⊙column fusion** as the key/value parameterization in attention (cheap, no
  extra params, beats additive).
- **String values via a (sub-word/semantic) LM** for high-cardinality + unseen categories.
- **Missing = drop the node** (no imputation token).
- **Contrastive pretraining with edge-dropout augmentation** as a self-supervised signal that shapes
  the tokenizer across schemas.
- **Source-outcome moment-matching + ensemble fallback** as a pragmatic transfer recipe.

## 5. What is not safely transferable (within this topic's scope)

- **Scale is unproven at the topic's target.** All experiments are ≤2048 train samples and graphlets
  centered on ~15 relations; **no test at 70+ columns or large n.** Treat "scales to many features"
  as unsupported here (proposal anti-pattern). The k=1 downstream layer also caps multi-hop
  feature-interaction modeling.
- **Numerical encoding is weak.** Just `scalar * column-name-vector` + power transform — no
  PLR/periodic/quantile embedding. The authors themselves list adopting Gorishniy-2022 numerical
  embeddings as future work; on numeric-heavy tables TabPFN beats CARTE.
- **No temporal axis** — does not address the time-varying half of the feature set.
- **High compute**, growing with n (~315s at n=512 vs ~1s CatBoost).
- **FastText is static/English-leaning** — semantic matching only as good as its vocabulary; not a
  contextual LM.

## 6. Evidence quality

Strong and adversarial: 51 real datasets, 42 baselines, normalized-score + critical-difference
diagrams, learning curves over train sizes, dedicated ablations for attention, string-level
representation, entity-matching (Fig 5: CARTE robust to entity variants without matching, unlike
KEN), and missing-value robustness (Table 1). **But** the benchmark is deliberately curated to be
string-heavy/high-cardinality (Table 3: 62.5% columns with |C|>10 vs TabLLM's 4.3%), which is where
CARTE wins — on the more numeric TabLLM benchmark TabPFN ranks first and CARTE second. So the
"beats everything" headline is benchmark-composition-sensitive. No large-scale (wide/long table)
evidence. Overall: high confidence in the mechanism and the small-scale string-heavy results;
low confidence in any extrapolation to 70+ columns / large n.

## 7. Concrete next experiments or hypotheses

1. **Replace the numerical encoder.** Swap `scalar*column-vector` for PLR/periodic embeddings
   (On-Embeddings-for-Numerical-Features) while keeping the column-name edge fusion — test whether
   CARTE's weak-numeric gap closes on numeric-heavy tables.
2. **Stress-test at 70+ columns.** Build graphlets with 70–200 leaves and large n; measure attention
   cost, over-smoothing, and whether the star-mask + k=1 layer still learns interactions (may need
   ≥2 layers or DCN-style explicit crosses).
3. **Swap FastText → a contextual / instruction sentence-encoder** for column names and string
   values; quantify gain on entity-variant robustness and high-cardinality columns.
4. **Borrow only the tokenizer** (LM(column_name) ⊙ value pairs + missing-as-drop) into an
   FT-Transformer / TabPFN-style backbone and isolate the tokenizer's contribution (proposal's
   "isolate the tokenizer" rule).
5. **Temporal extension hypothesis:** model a time-varying column as multiple timestamped leaf nodes
   sharing one column-name edge, fusing temporal + static into the same graph.

## Key claims a skeptic should check

- **(mechanism)** A token = `(FastText(column_name), value)` with key/value computed as
  `(node ⊙ edge)·W`, giving an open-vocabulary, schema-agnostic tokenizer with native missing-value
  handling. (Verified from §3.1–3.2 and Eqs 1–3.)
- **(transfer)** Embedding the column name as a relation is the reusable move for 70+ heterogeneous
  features and cross-table transfer — but validated only at ≤2048 rows / ~15 columns, so scaling is
  unverified.
- **(evidence)** Wins vs 42 baselines are concentrated on deliberately string-heavy/high-cardinality
  datasets; on numeric-heavy TabLLM datasets TabPFN beats CARTE — the headline is
  benchmark-composition-dependent.
