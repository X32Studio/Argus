# Encoding High-Cardinality String Categorical Variables

- **Authors:** Patricio Cerda, Gaël Varoquaux (Inria — PARIETAL / NEUROSPIN)
- **Year / Venue:** 2020, IEEE TKDE (arXiv:1907.01860, 2019)
- **URL:** https://arxiv.org/abs/1907.01860
- **Primary route:** categorical-high-cardinality
- **Analysis depth:** deep · **Confidence:** high
- **Code:** dirty_cat `MinHashEncoder` / `GapEncoder`, now in **skrub** (https://github.com/skrub-data/skrub)

## 1. What this work actually does
Tackles *dirty*, high-cardinality **string** categorical columns — job titles, addresses, medical codes, free-text categories with thousands of unique values, typos, and morphological variants (e.g. "Police Officer" vs "Police Officer III"). One-hot encoding here is O(cardinality)-wide and treats near-identical strings as orthogonal. The paper proposes two encoders that map any string to a small **fixed-width (default d=30) dense vector built from its character n-grams**, so the representation width is decoupled from cardinality and similar strings get similar vectors.

## 2. Technical mechanism
- **MinHash encoder (stateless LSH).** Represent a string as the *set* of its character n-grams. Apply `d` independent hash functions; for each, keep the **minimum** hash over the n-gram set. The d-vector is a locality-sensitive signature whose key property is: P(two strings collide on a given coordinate) = **Jaccard similarity** of their n-gram sets. This "turns set inclusion into inequality relations" that a decision tree can split on. **No fitting** — works on streaming data and on unseen categories natively.
- **Gamma-Poisson factorization (GapEncoder).** Build a `(categories × n-grams)` count matrix and factorize it into `d` non-negative latent "topics": **Poisson** likelihood on the counts, **Gamma** prior on activations. Fit by **online/streaming** EM-style updates. Each output dimension is a soft membership in a latent substring-category, so the encoding is **interpretable** (you can read off which n-grams define each latent topic). This is stateful (it does fit), unlike MinHash.
- **Baseline they build on:** 3-gram **similarity encoding** (tf-idf string-similarity to prototype categories) — accurate but does not scale (needs a prototype set + pairwise string distances).

## 3. Why it matters for the topic's stated goals
The topic needs to tokenize 70+ heterogeneous features including high-cardinality categoricals. Learned entity-embedding tables (the usual deep-tabular primitive) require a **closed vocabulary** and break on OOV/cold-start; target encoding **leaks the label**. This paper supplies the missing primitive: a **vocabulary-free, OOV-robust, label-free** way to turn a messy string column into a compact fixed-width token. Per column it adds only ~30 dims regardless of cardinality — directly relevant to keeping a many-feature token sequence tractable.

## 4. What is reusable
- **MinHash as a drop-in high-cardinality featurizer**: stateless, streaming-friendly, native unseen-category handling, ~30 dims/column. Best first thing to borrow for dirty string fields in a large feature set.
- **The "character-n-gram → fixed dense code, width independent of cardinality" pattern** as the design contract for the categorical leg of a tokenizer.
- **Gamma-Poisson** when interpretability of the latent categories matters or when you want a learned (but label-free) summary of the long tail.
- Mature, scikit-learn-compatible implementation in **skrub** — low integration cost.

## 5. What is NOT safely transferable (within this topic's scope)
- Output is a **dense real vector, not a discrete token or embedding-table entry**. A transformer feature tokenizer wants a learned, target-shapeable embedding; bolting MinHash on needs an extra projection and forfeits end-to-end shaping.
- Results are demonstrated with **gradient-boosted trees**, which exploit MinHash's inequality-splittable signature. The coordinates of a MinHash vector are **arbitrary hash minima** — not metric-meaningful per-axis — so feeding them straight into attention/MLP may underperform. Do **not** assume the tree result carries over to a deep tokenizer unchanged.
- Captures **lexical/morphological** similarity only, not semantic ("NYC" vs "New York City" match only if they share n-grams).
- No numerical / temporal / missing-value handling — it is a single-column encoder, not a full heterogeneous tokenizer.

## 6. Evidence quality
Strong, broad empirical study: 17+ real-world dirty-categorical tasks (employee salaries, traffic violations, medical charges, open-payments, road-safety, …), downstream learner held fixed (gradient boosting) to isolate the encoder. Baselines include one-hot, target/impact encoding, 3-gram similarity, tf-idf bag-of-n-grams, fastText, hashing. Finding: substring encoders match or beat all baselines on dirty high-cardinality columns; **MinHash = best accuracy/cost with zero fitting**, **Gamma-Poisson = similarity-encoding accuracy + scalability + interpretability**. Peer-reviewed (TKDE) and productionized in dirty_cat/skrub, so reproducibility is high. Caveat: benefit is *conditional* on the column being genuinely dirty/high-cardinality — on clean low-cardinality columns one-hot/target ties or wins.

## 7. Concrete next experiments / hypotheses
1. **MinHash-into-transformer probe:** feed a MinHash(d=30) column code through a small learned linear projection into an FT-Transformer feature token; compare vs (a) raw MinHash + GBT, (b) a learned entity-embedding with OOV bucket. Hypothesis: projection recovers most of the tree-side benefit; raw coordinates into attention underperform.
2. **OOV / cold-start stress test:** hold out unseen string categories at test time and compare MinHash (native) vs entity-embedding+OOV-bucket vs hashing trick on a 70+-feature pipeline.
3. **Hybrid with target-aware shaping:** use Gamma-Poisson latent topics as a *prior* initialization for a learned, end-to-end-trained categorical token, to combine label-free robustness with target shaping while avoiding leakage.
4. **Many-feature cost ablation:** measure sequence-length / memory when 20+ high-cardinality string columns are each MinHash-encoded to d=30 vs one-hot vs entity embeddings, in a transformer tokenizer.

## Suggested graph edges
- `work:encoding-high-cardinality-string-categoricals` —belongs_to_route→ `route:categorical-high-cardinality`
- `work:encoding-high-cardinality-string-categoricals` —introduces_technique→ `technique:minhash-ngram-encoder`
- `work:encoding-high-cardinality-string-categoricals` —introduces_technique→ `technique:gamma-poisson-ngram-factorization`
- `work:encoding-high-cardinality-string-categoricals` —compared_against→ `technique:one-hot-encoding`
- `work:encoding-high-cardinality-string-categoricals` —compared_against→ `technique:target-encoding`
- `technique:minhash-ngram-encoder` —alternative_to→ `work:entity-embeddings-categorical-variables`
- `technique:minhash-ngram-encoder` —transferable_to→ `route:categorical-high-cardinality`
- `technique:minhash-ngram-encoder` —enables_scaling→ `route:categorical-high-cardinality`
- `work:encoding-high-cardinality-string-categoricals` —has_pitfall→ `pitfall:minhash-coords-not-metric-for-attention`
