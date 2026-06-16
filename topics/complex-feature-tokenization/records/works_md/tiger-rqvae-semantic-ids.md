# Recommender Systems with Generative Retrieval (TIGER / RQ-VAE Semantic IDs)

- **Authors:** Shashank Rajput, Nikhil Mehta, Anima Singh, Raghunandan H. Keshavan, Trung Vu, Lukasz Heldt, Lichan Hong, Yi Tay, Vinh Q. Tran, Jonah Samost, Maciej Kula, Ed H. Chi, Maheswaran Sathiamoorthy (Google DeepMind / Google Research)
- **Year:** 2023 (arXiv:2305.05065)
- **Venue:** NeurIPS 2023
- **URL:** https://arxiv.org/abs/2305.05065
- **PDF:** saved to `sources/papers/tiger-rqvae-semantic-ids.pdf`
- **Code:** no official Google release; reproduced by the community (e.g. `EdoardoBotta/RQ-VAE-Recommender`). The RQ-VAE component is standard and re-implementable.
- **Work type:** paper
- **Primary route:** discretization-vq
- **Analysis depth:** deep — **Confidence:** medium (medium because the deep-read is of the recsys mechanism; the *transfer* to 70+ tabular features is inferred, not demonstrated by the paper)
- **Concept layers touched:** primarily *token-granularity* (learned hierarchical code, multi-token-per-entity) and *learning-signal* (self-supervised RQ-VAE reconstruction, then autoregressive next-token). Strong relevance to high-cardinality handling. Does NOT touch *feature-typing* (sees one pre-fused vector) or *temporal-static-fusion* (no time axis in the tokenizer).

## 1. What this work actually does

TIGER reframes sequential recommendation as **generative retrieval**: instead of scoring a query against N item embeddings, it *generates* the next item's identifier autoregressively. To make that possible it gives every item a **Semantic ID** — a short tuple of discrete codes produced by an **RQ-VAE** over the item's content embedding. A small T5-style encoder-decoder is then trained to read a user's history (as a flat stream of these tuples) and emit the next item's tuple token-by-token. The headline appeal is (a) beating sequential-recsys SOTA, (b) better cold-start because IDs are content-derived, and (c) constant-size decoding cost independent of corpus size.

For THIS topic, only the middle piece — RQ-VAE turning a high-cardinality entity into a short hierarchical discrete-code tuple — is in scope. The paper's scope_out status (recsys-specific semantic-ID system) is explicit in `topic.yaml`/`proposal.md`; this record deliberately isolates the transferable kernel.

## 2. Technical mechanism

**Stage 1 — Semantic ID via RQ-VAE.**
- Each item's metadata (title, price, brand, category) is concatenated to text and embedded by a **frozen Sentence-T5** into one **768-d** vector `x`.
- An RQ-VAE encoder MLP `768 -> 512 -> 256 -> 128 -> 32` maps `x` to a 32-d latent `z`.
- **Residual quantization**, `m = 3` levels, each with a **separate codebook of size 256, dim 32**: set `r_0 = z`; at level `d` pick nearest codebook vector `e_{c_d}`, record index `c_d`, set `r_{d+1} = r_d - e_{c_d}`. The indices `(c_0, c_1, c_2)` are a **coarse-to-fine** 3-tuple = the Semantic ID.
- A **4th disambiguation token** is appended when two distinct items map to the same 3-tuple (collision handling) -> final length-4 ID.
- Loss: `L = ||x - x_hat||^2 + sum_i (||sg[r_i] - e_{c_i}||^2 + beta||r_i - sg[e_{c_i}]||^2)`, `beta = 0.25`, `sg` = stop-gradient (the familiar VQ-VAE codebook + commitment terms). 20k epochs, Adagrad lr 0.4, batch 1024.

**Stage 2 — generative retrieval.**
- Encoder-decoder Transformer: 4+4 layers, 6 heads x dim 64, `d_model 128`, MLP 1024, ~**13M params**, dropout 0.1.
- Vocabulary = **1024 codeword tokens** (256 x 4 levels) + **2000 hashed user-ID tokens**.
- A user's chronologically ordered history is flattened: `(user_token, c_{1,0..m-1}, c_{2,0..m-1}, ..., c_{n,0..m-1})`. The decoder **autoregressively generates** the next item's tuple. Generated tuples that match no real item (~0.1-1.6% at top-10) are filtered.

## 3. Why it matters for the topic's stated goals

The user's problem includes **high-cardinality categorical fields** and a desire for a **bounded, scalable token vocabulary** over 70+ heterogeneous features. RQ-VAE is the cleanest published demonstration that you can take an arbitrarily-large entity space (here: an item corpus = effectively unbounded "categorical" cardinality) and represent it with **a tiny shared, hierarchical codebook** (3 x 256 = 768 codes) such that:
- similar entities share **prefix codes** (coarse-to-fine structure encodes a semantic taxonomy for free);
- **rare / unseen entities** get a sensible code from their content embedding rather than an OOV bucket (the cold-start win);
- the entity is compressed to **a handful of tokens**, which — if applied to a whole feature-row — could shrink a 70-feature row into a short transformer sequence, attacking the quadratic-attention scaling pain directly.

This is the discretization-vq route's anchor and the concrete "learned code" point in the token-granularity layer.

## 4. What is reusable

- **The RQ-VAE primitive itself**: encode an embedding to a latent, residual-quantize across m small codebooks, train with reconstruction + commitment loss. Standard, small, re-implementable.
- **Hierarchical-code-as-high-cardinality-encoder**: replace per-field high-cardinality embedding tables with shared RQ-VAE codes -> bounded vocabulary + graceful OOV. This is the single most reusable idea for the topic's categorical-high-cardinality pain.
- **Coarse-to-fine prefix structure**: gives a learned taxonomy; could let a downstream model attend at multiple granularities or share statistics across rare codes.
- **Content-derived IDs for cold-start**: deriving the discrete code from a content embedding (not a random ID) is the mechanism behind the cold-start gain — directly applicable to new categorical values / new entities in a tabular pipeline.
- **Quantize-a-row idea (extrapolated)**: compress a full 70-feature row embedding into k semantic-ID tokens to bound sequence length. *Not demonstrated by the paper* — flagged as a design hypothesis, not a result.

## 5. What is NOT safely transferable (within this topic's scope)

- **The whole generative-retrieval / seq2seq next-item system** is recsys-specific and out of scope. Importing it wholesale is exactly the proposal's named anti-pattern ("importing recsys semantic-ID machinery wholesale when only the discretization idea transfers").
- **The quantizer never sees raw heterogeneous features.** It sees ONE pre-fused 768-d Sentence-T5 vector. "Handles complex items" really means "text-serialization + Sentence-T5 handled them; we then compressed one vector." For tabular use you must first decide *what embedding to quantize* (per-row? per-field-group? per-temporal-patch?) — TIGER offers no guidance; **this is the real design work**, not a solved problem.
- **The +5-29% gains are over sequential-recsys baselines on Amazon review data.** They say nothing about tabular-prediction accuracy and must never be cited as evidence the tokenizer helps a deep tabular model.
- **No feature typing, no numerical embedding, no temporal/static fusion** inside the tokenizer. Price (the only numeric) is just text to Sentence-T5; time lives only in the history sequence.
- **Frozen, non-adaptive codes**: codes are trained before the downstream task and never adapt to its loss — the opposite of end-to-end learned embeddings.

## 6. Evidence quality and ablations

- **Tokenizer ablation (Beauty, Recall@5):** RQ-VAE 0.0454 > LSH semantic IDs 0.0379 (−16.7%) > Random/independent IDs 0.0296 (−34.8%). This is the load-bearing evidence that *RQ-VAE structure specifically* (not just "having codes") drives the gain — the most relevant ablation for our topic, since it argues hierarchical learned codes beat hash-based discretization.
- **Main results:** beats best baseline on all 3 datasets / all metrics (see JSON `key_results`). Datasets are modest: 12-18k items, 19-36k users.
- **Cold-start:** on 5% held-out unseen items, beats Semantic-KNN across K — supports the content-derived-ID cold-start claim.
- **Diversity:** temperature sampling trades accuracy for diversity (Entropy@10 0.76@T=1.0 -> 1.38@T=2.0).
- **Gaps:** no industrial-scale evaluation (later work: RPG, LIGER, EAGER); no per-feature scaling study; codebook-collapse not deeply ablated.

## 7. Refute-before-write check (skeptic's view)

- *Claim: "RQ-VAE solves high-cardinality for 70+ tabular features."* Strongest counter: TIGER only quantizes a holistic content embedding of a single entity type, never a heterogeneous feature row, and is evaluated on ~15k-item corpora; there is **zero** evidence at 70+ features. **Kept but scoped** to "transferable hypothesis for the high-cardinality leg," not a validated recipe.
- *Claim: "hierarchical codes beat hashing."* The LSH-vs-RQ-VAE ablation supports this *for recsys retrieval*; it may not hold when the downstream task is supervised tabular prediction with a target-aware encoder available. **Kept, flagged as domain-limited.**
- *Claim: "great cold-start."* Holds because IDs are content-derived; transfers only if your tabular OOV values also have a content embedding to quantize. **Kept, conditioned.**

## Proposed graph edges

- `tiger-rqvae-semantic-ids` `belongs_to_route` `route:discretization-vq`
- `tiger-rqvae-semantic-ids` `introduces_technique` `technique:rq-vae-semantic-id`
- `technique:rq-vae-semantic-id` `extends` `technique:vq-vae-quantization`
- `technique:rq-vae-semantic-id` `transferable_to` `route:categorical-high-cardinality` (bounded vocab + graceful OOV for high-cardinality fields)
- `technique:rq-vae-semantic-id` `enables_scaling` `route:discretization-vq` (compresses an entity to a few tokens -> shorter sequence)
- `technique:rq-vae-semantic-id` `alternative_to` `technique:lsh-semantic-id`
- `tiger-rqvae-semantic-ids` `compared_against` `technique:lsh-semantic-id`
- `technique:rq-vae-semantic-id` `alternative_to` `technique:entity-embedding-table` (shared hierarchical codes vs per-field lookup; see entity-embeddings record)
- `tiger-rqvae-semantic-ids` `has_pitfall` `pitfall:recsys-machinery-wholesale-import`
