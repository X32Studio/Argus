# Learned Semantic-ID Codebooks via RQ-Kmeans (OneRec lineage)

- **Primary source:** OneRec Technical Report — arXiv:2506.13695 (Jun 2025). Lineage origin: OneRec — arXiv:2502.18965 (Feb 2025), Kuaishou Technology.
- **Route:** `recsys-tokenization-transfer` (also touches `discretization-vq`).
- **Depth:** deep · **Confidence:** medium.
- **Metadata correction:** the task-supplied URL `arXiv:2406.13235` is a *different* paper (GAL-Rec, graph-aware LLM recommendation) and does NOT describe RQ-Kmeans. The actual RQ-Kmeans method lives in the OneRec papers above; this record is anchored there.

## 1. What this work actually does

OneRec is Kuaishou's end-to-end generative recommender that replaces the classic retrieve-then-rank cascade with a single encoder-decoder that *generates* the next session of recommended short videos. To make generation over a billion-scale, ever-growing item space tractable, each item is tokenized into a short coarse-to-fine **Semantic ID** (a 3-tuple of discrete codes). The tokenizer of interest here is **RQ-Kmeans**: residual quantization whose per-layer codebooks are produced by **k-means clustering on residuals** rather than by gradient-trained VQ-VAE codebooks. The paper's tokenization claim is that RQ-Kmeans beats RQ-VAE on codebook utilization, code entropy/balance, and reconstruction.

## 2. Technical mechanism

Two stages:

**(a) Build the embedding to be quantized.** Video signals (caption, tag, ASR, OCR, cover image + 5 frames) → miniCPM-V-8B vision-language encoder → ~1280 token vectors (dim 512) → compressed to **4 learnable query tokens** via a 4-layer QFormer cross-attention. This is then **aligned**: a contrastive loss pulls together items with high *collaborative* similarity (co-watched), plus a caption-generation loss, yielding one fused *collaborative-aware multimodal* embedding `M̃` per item.

**(b) RQ-Kmeans quantize.** Residual quantization with `Lt = 3` layers, codebook size `Nt = 8192` per layer (ablated to 32768):
- Layer 1: run k-means over all item embeddings `M̃`; the `Nt` centroids ARE the layer-1 codebook; assign each item its nearest centroid `s1`.
- Compute residual `r = M̃ − centroid(s1)`.
- Layer 2: run k-means over the layer-1 residuals → layer-2 codebook; assign `s2`; update residual.
- Layer 3: same on layer-2 residuals → `s3`.
- Semantic ID = `(s1, s2, s3)`, coarse-to-fine.

The crucial difference from TIGER/RQ-VAE (see `tiger-rqvae-semantic-ids`): codebooks are **Lloyd centroids**, not gradient-learned vectors, and there is **no reconstruction/commitment loss** — the "training" is just clustering. Codes are **frozen** before the generative encoder-decoder (sparse MoE) is trained for session-wise next-item generation; a reward model + DPO-style Iterative Preference Alignment then tunes generation. Combinatorial code space `Nt^Lt = 8192^3` >> item count, so codes are near-unique with graceful OOV for new items (they snap to nearest centroids).

## 3. Why it matters for the topic's stated goals

The topic needs to tokenize 70+ heterogeneous features including high-cardinality categoricals. The existing `tiger-rqvae-semantic-ids` record establishes RQ-VAE semantic IDs as the canonical way to turn an extreme-cardinality entity into a short hierarchical code tuple — but flags **codebook collapse / dead codes** as RQ-VAE's known failure mode. RQ-Kmeans is the direct, drop-in answer to that exact weakness: k-means-on-residuals empirically gives near-perfect (reported 1.0000) per-layer codebook utilization and higher code entropy, and is *training-free*. It is the single most actionable upgrade to the discretization-vq route for bounding high-cardinality vocabulary.

## 4. What is reusable

- **The core idea:** build each residual-quantization layer's codebook by running k-means on the previous layer's residuals (centroids = codebook, nearest-centroid = assignment). Cheap (faiss/scikit-learn), no second VQ training stage, no commitment-loss tuning, no collapse.
- For 70+ features: (a) map each high-cardinality field's value embeddings to shared k-means semantic codes (bounded vocab + graceful OOV); (b) compress a whole feature-row embedding into a few RQ-Kmeans codes to shorten the transformer sequence.
- The utilization/entropy comparison gives a concrete, measurable acceptance test for any codebook quantizer you build (utilization → 1.0, balanced per-layer entropy).

## 5. What is NOT safely transferable (within scope)

- The whole generative-recommender system: sparse-MoE encoder-decoder, session-wise generation, reward model, DPO preference alignment, beam-search decoding — all recsys-specific, all out of scope.
- The quantizer never touches raw heterogeneous features; it sees ONE fused embedding from a heavy miniCPM-V-8B + QFormer + contrastive pipeline. The hard 90% (what embedding to quantize for a 70-feature row) is unsolved by this paper.
- K-means codebooks are fixed after clustering — non-adaptive to any downstream tabular loss, and require periodic refits as the corpus drifts.

## 6. Evidence quality

- **Tokenizer ablation (RQ-Kmeans vs RQ-VAE):** reported ~1.0000 codebook utilization per layer and per-layer entropy improvements of ~+6.31% / +3.50% / +1.44% (layers 1/2/3), plus better reconstruction balance. **Medium confidence** — surfaced via search summary of the Technical Report Section 2.1.2 ablation; I could not re-confirm the exact table cells through the fetched HTML (table truncated). Verify against the PDF before quoting as fact.
- **Codebook scaling 8K→32K:** long-view rate 0.5118→0.5245 (+2.48%), P-Score 0.2516→0.2635 (+4.75%).
- **Collaborative-aware features vs vid-only:** P-Score +28.88%, long-view +11.34%.
- **Deployment:** OneRec +1.6% watch-time (main scene); Technical Report App Stay Time +0.54% (Kuaishou) to +1.24% (Lite), ~25% of queries. These are **whole-system** gains, NOT tokenizer-isolated, and irrelevant to tabular accuracy.
- PDF saved to `sources/papers/rqkmeans-semantic-ids-generative-retrieval.pdf` (OneRec Technical Report, 8 MB).

## 7. Concrete next experiments / hypotheses

1. **Direct A/B on a tabular row encoder:** quantize per-row embeddings of a 70-feature tabular model with (i) RQ-VAE and (ii) RQ-Kmeans; measure codebook utilization/entropy AND downstream AUC. Hypothesis: RQ-Kmeans ≥ utilization, but downstream accuracy difference is small (utilization ≠ accuracy).
2. **High-cardinality field test:** take the highest-cardinality categorical in TabRed / a CTR dataset, embed values, RQ-Kmeans into 2–3 layers × 1–4k codes; compare against hashing-trick and compositional (quotient-remainder) embeddings on AUC + OOV handling.
3. **Refit cadence:** simulate corpus drift; measure how stale k-means centroids degrade before a refit is needed — quantifies the maintenance cost vs end-to-end-learned embeddings.
