# Proposal — Complex Feature Tokenization for Deep Tabular Models

## The problem

You have **70+ complex, heterogeneous features**: a mix of numerical and high-cardinality
categorical fields, some time-varying and some static. Classic tokenizers (NLP subword
tokenizers, or naive "one embedding per categorical / raw scalar per numeric") only cope with
a handful of basic features. They waste capacity on numerics, choke on high-cardinality
categoricals, ignore feature interactions, and have no story for fusing temporal and static
fields. The goal of this watch is to find, deep-read, and continuously refine a citation-backed
brief on **tokenization/embedding methods that scale to many heterogeneous mixed-type features**
and feed a deep tabular / transformer model.

## Why these concept layers

A method in this space is best understood along five axes, which are our `concept_layers`:

1. **Feature typing** — does it treat numerics, categoricals, temporals, and missing values
   differently, or force one scheme on all? Forcing one scheme is exactly the failure mode the
   user is hitting.
2. **Token granularity** — the single most consequential design choice: is a token a *feature*
   (FT-Transformer style), a *value*, a *field-value pair*, a *bin*, a *temporal patch*, or a
   *learned code* (VQ)? Granularity drives sequence length, which drives cost at 70+ features.
3. **Scaling & interaction** — 70+ features means 70+ tokens (or more). Attention is quadratic;
   interactions matter. We track what each method does about both.
4. **Learning signal** — tokens can be learned end-to-end, made *target-aware*, pretrained
   self-supervised, or transferred from a tabular foundation model. This is where the biggest
   recent gains live.
5. **Temporal–static fusion** — because the feature set is explicitly mixed, we must track how
   each method unifies a time-varying channel with a static attribute (e.g. TFT-style separate
   encoders + gating, or flattening everything into one token stream).

## Why these execution routes

The routes are the largely-disjoint literatures we mine in parallel. The center of gravity is
**numerical-embeddings** + **tabular-transformers** (the FT-Transformer / "On Embeddings for
Numerical Features" lineage is the most directly applicable), with **categorical-high-cardinality**
as the second pillar. **temporal-feature-tokenization** covers the time-varying half of the
feature set (PatchTST / iTransformer / TFT). **tabular-foundation-models** and
**llm-tabular-serialization** are higher-risk / higher-reward alternative paradigms worth tracking
but not over-investing in early. **discretization-vq** and **feature-interaction-selection** are
cross-cutting toolkits that show up inside many methods.

## Where contradictions usually come from

- **"Deep tabular beats GBDT" vs "GBDT still wins"** — benchmark-dependent; watch dataset size,
  tuning budget, and whether numerical embeddings were used. Flag every sweeping claim with its
  benchmark conditions.
- **Numerical embedding necessity** — some papers show piecewise-linear/periodic embeddings give
  large gains; others find them marginal. Record the conditions, don't average them away.
- **High-cardinality handling** — target encoding leaks; hashing collides; learned embeddings
  overfit on rare categories. Claims here are very setup-sensitive.
- **Scaling claims** — "handles many features" is often shown on ≤30 features. Treat any claim
  about 70+ features as needing explicit evidence; flag extrapolations as pitfalls.

## Reading order (for the synthesis brief)

1. Start with the **numerical-embeddings** lineage ("On Embeddings for Numerical Features",
   PLR/periodic) and **FT-Transformer** — this is the backbone for the user's case.
2. Then **categorical / high-cardinality** encoding.
3. Then **temporal tokenization** and **temporal–static fusion** for the time-varying half.
4. Then the scaling/interaction toolkit, then the foundation-model and LLM-serialization
   alternatives, then open problems.

## Anti-patterns to flag

- Accepting "scales to many features" without evidence at the user's feature count.
- Treating all numerics as raw scalars or all categoricals with one shared scheme.
- Target-leakage in target-aware encodings evaluated without proper out-of-fold.
- Reporting a method's accuracy without its tokenization ablation (we want the *tokenizer's*
  contribution, isolated).
- Importing recsys semantic-ID machinery wholesale when only the discretization idea transfers.

## End goal

Confirmed 2026-06-16: **build/train a tokenizer for the user's own deep tabular model** (not just a survey).
So the `recommended-approaches` report section must end in concrete, implementable recipes for
70+ mixed numerical/categorical/temporal features — not only a literature map. Every method we
deep-read should be scored on "can this be implemented for 70+ heterogeneous features, and what
would it cost?", and the brief should converge toward a small set of recommended tokenizer recipes.

## Scope expansion (cycle 14, per user directive)

After 13 research cycles + 2 syntheses covered the academic core, scope was deliberately widened to
find broader sources. Four routes were added: **timeseries-foundation-models** (Chronos / MOMENT /
Moirai / TimesFM / Lag-Llama — value scaling/quantization/patching for the temporal half),
**recsys-tokenization-transfer** (semantic IDs, RQ-VAE/RQ-Kmeans codebooks, DLRM-style multi-field
feature handling — the transferable machinery, not the ranking specifics), **industrial-feature-systems**
(production/ad-tech/fraud/finance feature encoding, feature stores, embedding services, Kaggle winners),
and **libraries-and-implementations** (rtdl / pytorch-frame / pytorch_tabular / AutoGluon — runnable
components to ground the build goal). Source types are explicitly broadened beyond arXiv to include
repos, libraries, benchmarks, and engineering blog writeups. The remaining structural gap — no single
work jointly validates 70+ features + high-cardinality categorical inputs + genuine per-row temporal —
is the user's own setting; the expansion hunts the closest transferable evidence rather than a ready answer.
