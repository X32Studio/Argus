# Hash Embeddings for Efficient Word Representations

- **Authors:** Dan Svenstrup (DTU), Jonas Meinertz Hansen (FindZebra), Ole Winther (DTU)
- **Year / Venue:** 2017, NeurIPS 2017 (arXiv:1709.03933)
- **URL:** https://arxiv.org/abs/1709.03933
- **Work type:** paper
- **Primary route:** recsys-tokenization-transfer
- **PDF:** `sources/papers/hash-embeddings-efficient-word-representations.pdf` (extracted text: `hash-embeddings.txt`)
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

It is an NLP word-representation method that sits *between* a standard learned word embedding and the pure "hashing trick". Instead of giving every one of K vocabulary items its own `d`-dim row (K·d params), every item draws `k` (default 2) component vectors from a **shared pool of B vectors** via `k` independent hash functions, and the item's final embedding is a **learnable weighted sum** of those `k` picks. The per-item learnable weights ("importance parameters") are what distinguish it from plain feature hashing. Result: huge vocabularies (millions–100M tokens) with a parameter budget that barely grows with cardinality, no need to build a dictionary up front, and accuracy at least matching standard embeddings across 7 text-classification benchmarks.

## 2. Technical mechanism

For token `w`:
- `c_w = (H_1(w), ..., H_k(w))` — `k` component vectors, each `H_i(w) = E[D2(D1(w))]`, picked from the `B × d` shared matrix `E`.
- `p_w ∈ R^k` — the token's importance parameters, a row of the `K × k` matrix `P`.
- `ê_w = p_wᵀ c_w` — the `d`-dim representation (optionally concatenate `p_w` to get the final vector).

Two layers of hashing: `D1: token → {1..K}` (a real dictionary, or a hash if K is unmanageable), then `D2: {1..K} → {1..B}` (the collision-inducing hash into the shared pool).

- **Parameters:** `B·d + K·k` vs standard `K·d`. Adding one new category costs `k` (=2) params, not `d` (=10–300). Defaults: `k=2`, `K > 10·B`, `d ∈ [20, 200]`.
- **Collision math (their worked example):** with `|T|=100M`, `B=1M`, going `k=1 → k=2` approximates a single hash into `B^k = 10^12` buckets, dropping per-token collision probability from ≈1.0 to ≈1e-4.
- **Importance weights do two jobs:** (i) implicit vocabulary pruning — drive unimportant tokens' weights to ~0; (ii) collision repair — two colliding-but-important tokens can still be separated in the `k`-dim subspace their distinct hash picks span.
- **Special cases:** `k=1, p=1` ⇒ hashing trick; `B=|T|`, identity hash ⇒ standard embedding. Hence "extension and improvement" framing.

## 3. Why it matters for the topic's stated goals

Our target is tokenizing 70+ heterogeneous tabular features, several of which are **high-cardinality categoricals** (IDs that can run to millions). Entity-embedding tables blow up linearly in cardinality and force a fixed dictionary. Hash embeddings give a bounded-parameter, dictionary-free, **online-friendly** alternative for exactly those columns, and the importance-weight trick targets the precise failure of the naive hashing trick (a rare-but-important value colliding with a common one). This is the recsys-transfer machinery (DLRM-style massive-ID hashing, but with learnable collision repair) brought down to a clean primitive.

## 4. What is reusable

- **The importance-weighted multi-hash shared pool** as a drop-in replacement for a per-field embedding table on genuinely high-cardinality columns: `+k` params per new value, no dictionary, handles a dynamically growing value space.
- **The `B`-as-regularizer insight:** bucket count is an explicit capacity knob (smaller B ⇒ stronger regularization), which on their deep-net experiments beat a full-vocab standard embedding on Yahoo (71.3 vs 65.8) and Yelp-full.
- **Cheap ensembling:** because each model's embedding is tiny, an ensemble of small-B models (with different hashes) fits in the same budget as one big standard embedding and recovers any rare-collision loss.

## 5. What is NOT safely transferable (within scope)

- It is **per-value, single-token-space** — no notion of distinct fields, no feature interaction, no numerical/temporal/missing handling. It is one leg of a tokenizer, not a tokenizer for the full 70-feature set.
- For a feature whose cardinality is **below ~10·B**, hashing buys nothing over a plain entity-embedding table and only adds collision risk. Apply it only to the few truly high-cardinality fields.
- **First-layer (`D1`) collisions are catastrophic** when `D1` is a hash: two ids sharing a `D1` bucket get *identical* component vectors AND importance weights — fully indistinguishable. Authors flag using a separate hash for the importance index as a fix, but it is future work.
- Demonstrated only on balanced BOW text classification with a sum-pool; the regularization win may not survive in a deep tabular transformer with attention-based interaction.

## 6. Evidence quality

Solid, honest empirics: 7 standard datasets, same protocol as Zhang et al. 2015, explicit parameter counts, a clean shallow-vs-deep comparison, and an importance-parameter interpretability table (high-|p| n-grams are sentiment-bearing phrases). But: gains over the **plain hashing trick** are mostly ~1–2 points and several ties, so the "better than standard embeddings" headline leans on a regularization effect a smaller standard vocab could partly replicate. Key design choices (`D-hat ≠ D1`, concatenation aggregation) are *claimed* better but left unimplemented. No official author code located. Confidence high on the mechanism, medium on the magnitude of the advantage.

## 7. Concrete next experiments / hypotheses

1. **Tabular port:** on a recsys-style table with a million-cardinality ID column among ~70 features, swap that column's entity-embedding table for a hash embedding (`k=2`, `B` cross-validated) feeding an FT-Transformer feature tokenizer; measure params, AUC, and rare-value recall vs the full table.
2. **Collision-repair stress test:** synthetically force a rare high-signal category to collide with a frequent one; verify importance weights actually separate them, and confirm the failure when `D1` itself collides.
3. **Per-field vs shared pool:** test whether a *single* shared pool across all high-cardinality fields (one `E`) hurts vs one pool per field, to gauge cross-field interference.
4. **B as regularizer:** sweep `B` and check whether the "small-B regularizes" effect transfers to deep tabular models or is specific to BOW sum-pooling.

## Key claims a skeptic should check
- (mechanism) Final token vector is a learnable weighted sum of `k` hash-selected shared vectors; params = `B·d + K·k`, so cost is near-independent of cardinality `K`.
- (mechanism) Importance parameters repair collisions and implicitly prune — but only if the FIRST-layer `D1` does not itself collide (else two ids are fully identical).
- (evidence) Matches/beats standard embeddings on 7 datasets at 3–5× fewer params; but the margin over the plain hashing trick is small (~1–2 pts, some ties).
- (transfer) Reusable as a high-cardinality-categorical leg only; below ~10·B cardinality it adds collision risk with no benefit.
