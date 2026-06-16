# Compositional Embeddings Using Complementary Partitions (Quotient-Remainder Trick)

- **Authors:** Hao-Jun Michael Shi (Northwestern), Dheevatsa Mudigere, Maxim Naumov, Jiyan Yang (Facebook)
- **Year / Venue:** KDD '20 (ACM SIGKDD); arXiv:1909.02107 (v1 2019, v2 2020). DOI 10.1145/3394486.3403059
- **URL:** https://arxiv.org/abs/1909.02107
- **Primary route:** recsys-tokenization-transfer
- **Analysis depth:** deep | **Confidence:** high
- **PDF:** `sources/papers/compositional-embeddings-quotient-remainder.pdf`

## 1. What this work actually does
It is a **memory-compression scheme for high-cardinality categorical embedding tables** in deep recommendation models (DLRM/DCN). In CTR/personalization models each categorical feature (user, page, ad...) can have |S| ~ 10^7 categories; the per-feature embedding table `W in R^{|S|xD}` is the dominant memory cost (multiple GB each). The paper shows how to represent each category with a **unique** embedding while storing far fewer rows, by decomposing the category index into **complementary partitions** and combining several small-table lookups. It is NOT a tokenizer that adds representational power: at best it matches the full-table accuracy.

## 2. Technical mechanism
**Quotient-Remainder (Q-R) trick.** Pick bucket count `m`. For category index `i`:
- remainder index `j = i mod m` -> look up `W1 in R^{mxD}`
- quotient index `k = i \ m` (integer division) -> look up `W2 in R^{(|S|/m)xD}`
- combine: default `x_emb = x_rem (elementwise *) x_quo`.

Remainder and quotient are **complementary**: together they recover `i`, so any two distinct categories differ on at least one partition -> the composed embedding is unique. Memory drops from `O(|S|D)` to `O(|S|/m D + m D)`.

**Complementary partitions (general framework).** A set of partitions `P_1...P_k` is *complementary* if for all distinct `a,b` there is some `P_i` with `[a]_{P_i} != [b]_{P_i}`. Each partition = one small embedding table; combining the per-partition embeddings via an operation `omega` yields a unique per-category vector. Concrete families proved complementary: naive (full table), Q-R, **generalized Q-R** (`mod`/`quotient` chain over factors `m_1..m_k`), and **Chinese-Remainder partitions** (pairwise-coprime moduli). With k balanced partitions the optimal cost is **`O(k |S|^{1/k} D)`** (k=2 -> `O(sqrt(|S|) D)`).

**Operation `omega` options:** concatenation (uniqueness proven, Theorem 1), addition, **elementwise multiplication** (equivalent to a vector-wise tensor/outer-product factorization of the full table). Multiplication is reported best/most scalable overall.

**Path-based variant.** Seed an embedding from partition 1, then route it through a per-partition sequence of learned transforms (linear or MLP) `M_{k,p_k(x)} o ... o M_{2,p_2(x)}`. More compute, adds non-embedding params, harder to train; did not beat operation-based here.

**Key distinction vs product quantization / learned discrete codes:** partition codes are **fixed modular arithmetic** (a fixed codebook), so nothing per-category is stored or learned as codes — avoiding the `O(|S|)` code-storage that makes PQ/code-learning impractical at recsys cardinalities. The trade: no use of frequency or learned semantic structure.

## 3. Why it matters for the topic's stated goals
The topic targets tokenizing **70+ heterogeneous features**, a chunk of which are **high-cardinality categoricals**. CQR is the canonical, production-deployed (Meta DLRM) answer to *"how do I keep the categorical embedding tables from blowing up memory while still giving every category its own vector?"* — applied per-field above a cardinality threshold. It directly addresses the `categorical-high-cardinality` concern and the scaling-in-cardinality axis.

## 4. What is reusable
- **The Q-R lookup layer**: replace any single high-cardinality table with `(quotient table) (elementwise *) (remainder table)`, end-to-end trainable, ~`sqrt(|S|)` rows, collision-free, no stored codes. Small and trivial to reimplement.
- **Thresholding policy**: only compress tables above a cardinality threshold; leave small ones full. A clean, low-risk knob for a many-feature pipeline.
- **Complementary-partition idea** as a general lens: any factorization of an index into independent sub-codes that jointly recover it can compress a lookup table — applies to feature-row IDs or any high-cardinality token vocabulary you want to bound.

## 5. What is NOT safely transferable (within scope)
- **Nothing for numerical / temporal features.** No continuous-value encoding, no patching, no static/time fusion. The dense Criteo features are just log-transformed and bypass the trick.
- **Not a transformer tokenizer.** The unit consumed is still one embedding per feature; this is not a multi-token semantic-ID scheme (contrast TIGER). It does not reduce sequence length or attention cost.
- **No accuracy upside.** It only ever *approaches* full-table quality (within 0.3-0.7% at 4x); it cannot exceed it. Citing it as improving representation quality is wrong.
- **Architecture-dependent operation choice** (mult for DCN, concat for DLRM) — no universal recipe; needs per-model tuning.

## 6. Evidence quality
Single dataset (**Criteo Kaggle**, 45M rows), two **MLP/cross-net** models (DCN, Facebook DLRM), embedding dim 16, 5-trial averages with std. Headline: vs hashing@4-collisions, matched quality at up to **60 collisions (~15x smaller model)**; at 4 collisions within **0.3% (DCN) / 0.7% (DLRM)** of full table, thresholding cuts DLRM gap to 0.5%. Baseline ~5.4x10^8 params. Solid for its claim (beats *blind hashing* at equal compression), but: only one benchmark, only CTR-loss, only non-transformer models, and the comparison baseline (plain hashing) is a low bar versus modern semantic-ID/RQ-VAE codebooks that also add structure. Uniqueness is rigorously proven only for **concatenation**; for mult/add it is asserted but not generally guaranteed.

## 7. Concrete next experiments / hypotheses
1. **H: Q-R caps categorical memory with negligible loss in a transformer tabular tokenizer.** Drop a Q-R layer into FT-Transformer / pytorch-frame's categorical stype for the high-cardinality fields of a 70+-feature set; measure accuracy vs full table vs hashing at matched memory.
2. **Combine with semantic structure:** replace fixed modular partitions with RQ-VAE / RQ-Kmeans codes (from the TIGER/discretization-vq route) so the sub-codes carry meaning (graceful OOV/cold-start) while keeping the O(sqrt) memory shape — bridging CQR's storage win with semantic-ID's structure.
3. **Verify mult/add uniqueness empirically:** count collisions of the *composed* embedding under elementwise multiplication on real high-cardinality fields; if collisions occur, fall back to concatenation for safety-critical fields.
4. **Optimizer interaction:** confirm the AMSGrad-needed-for-mult finding on a transformer; test whether normalization on each sub-embedding removes the optimizer sensitivity.

## Key claims a skeptic should check
- **(mechanism)** Q-R with elementwise multiplication gives a *unique* per-category embedding at `O(sqrt(|S|)D)` — but the paper only PROVES uniqueness for concatenation; mult uniqueness is unverified in general.
- **(evidence)** "~15x smaller at similar quality" is vs the **plain hashing** baseline at 4 collisions on Criteo only, with MLP/cross-net (not transformer) models.
- **(transfer)** The trick helps ONLY the high-cardinality-categorical half of a 70+-feature set; it offers nothing for numerical/temporal features and never improves accuracy beyond a full table.
