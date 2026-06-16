# AMFormer — Arithmetic Feature Interaction Is Necessary for Deep Tabular Learning

- **Authors:** Yi Cheng, Renjun Hu (equal), Haochao Ying (corresponding), Xing Shi, Jian Wu, Wei Lin — Zhejiang University + Alibaba Group
- **Venue / Year:** AAAI 2024 (arXiv:2402.02334v2, Mar 2024)
- **URL:** https://arxiv.org/abs/2402.02334
- **Code:** https://github.com/aigc-apps/AMFormer (PyTorch, GPL-3.0, ~41 stars)
- **Primary route:** `feature-interaction-selection`
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

AMFormer tests a single hypothesis: *additive* attention (what every classic transformer and AutoInt/FT-Transformer does) is not enough for tabular data, because many predictive signals are **arithmetic combinations** of raw features — ratios and products like BMI = weight/height² or the T3/T4 thyroid ratio. A pure self-attention transformer can only mix features additively, so it has to approximate those interactions, much like a tree split over raw values.

The fix is an **Arithmetic Block** that replaces self-attention inside each transformer layer with two parallel attention streams — one additive, one multiplicative — whose outputs are fused so that every layer can express a complete arithmetic combination of features. It is delivered as a **drop-in module**, demonstrated by inserting it into AutoInt (→ AMF-A) and FT-Transformer (→ AMF-F).

Important framing for THIS topic: **AMFormer proposes no new tokenizer.** It reuses FT-Transformer's input embedding (1-in-d-out linear per numerical feature; lookup table per categorical feature). It is a feature-*interaction* paper, not a feature-*tokenization* paper.

## 2. Technical mechanism

Per layer, input embedding matrix `X ∈ R^{N×d}` (N = #features):

- **Additive stream:** ordinary scaled-dot-product attention `O_A = softmax(QK^T/√d) V`. Combining tokens with softmax weights is an additive (weighted-sum) operation.
- **Multiplicative stream:** map to log space `X_log = log(ReLU(X) + ε)`, run the same attention there, then apply `exp`. A weighted *sum* in log space is a weighted *product* in the original space — so this stream learns multiplicative interactions. (Borrowed from Neural Arithmetic Logic Units, Trask 2018.)
- **Sparse interaction (hard top-k):** in each attention row, keep only the k largest `QK^T` entries and mask the rest to −∞ (→ 0 after softmax). Each feature interacts with ≤ k others; k is independent of N. Default k = 8.
- **Fusion:** stack the two outputs vertically to `2N×d`, then an FC layer along the candidate axis projects back to `N×d`: `O = FC(VConcat([O_A, O_M])^T)^T`. This lets one layer mix additive and multiplicative candidates into a full arithmetic combination.
- Residual connections + FFN are retained (AutoInt had dropped them; the ablation shows keeping them helps).

**Prompt-token optimization (the scaling lever).** The data-dependent query `Q (N×d)` is replaced by `Np` learned prompt tokens `P ∈ R^{Np×d}`. This (a) drops attention cost from O(N²d) to O(Np·N·d) = **linear in N** for fixed Np, (b) lets the model learn *data-invariant* interaction patterns (domain priors that don't vary per row), and (c) suppresses spurious correlations among redundant features (anti-overfitting). Recommended Np = N for a few hundred features; for large datasets start Np = 256/512 and **halve per layer**.

Defaults that generalize: L = 3 layers (universal across all 4 datasets), k = 8, Np = 256.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing **70+ heterogeneous features** feeding deep tabular models. AMFormer is relevant on two axes:

1. **Expressiveness for interaction at scale.** Real wide-feature tables contain ratio/product signals; an additive-only transformer must waste capacity approximating them. The multiplicative stream supplies them directly, and the hard top-k keeps interaction sparse regardless of how many features there are.
2. **Measured efficiency at 2000 features.** This is the rare tabular-transformer paper that *shows* hard scaling numbers in the wide regime: on EP (2000 numerical features), prompt tokens cut training ~7×, GFLOPs ~90–94%, and GPU memory to ~52%. Most tabular transformers (FT-Transformer, ExcelFormer, SAINT) only argue O(N²) is "fine" up to ~50 features; AMFormer demonstrates linear-in-N cost in the regime this topic cares about.

## 4. What is reusable

- **The multiplicative attention stream** (log → attention → exp) as a bolt-on to ANY per-feature transformer tokenizer the pipeline already uses (PLR/periodic numerical embeddings, learned categorical tokens, etc.). It is orthogonal to tokenization, so it composes with this topic's tokenizer choices.
- **Prompt-token queries** to make a wide-feature transformer's attention linear in N and to encode data-invariant interaction priors — directly addresses the 70+-feature cost wall.
- **Hard top-k attention** for sparse, N-independent interaction degree.
- **Module-not-model packaging:** the whole thing is a layer swap, validated on two different backbones — low integration risk.

## 5. What is NOT safely transferable (within scope)

- **No tokenization contribution.** Embedding is FT-Transformer's; do not cite AMFormer as a categorical/numerical/temporal tokenizer.
- **No high-cardinality handling.** Plain lookup table → params and table size grow with cardinality; rare/unseen categories unhandled. The prompt-token "scalability" is about *attention* cost only — embedding tables still scale with cardinality.
- **No missing-value, no temporal/static fusion.**
- **Multiplicative stream instability.** `log(ReLU(X)+ε)` is sign-blind (zeros all negative coordinates) and ε-sensitive; the FT-Trans **multiplicative-only** ablation on EP collapsed to **50.05% (chance)**. The product branch can dominate and break training unless balanced by the additive stream + FC fusion — a concrete risk at 70+ correlated features.

## 6. Evidence quality

- **Synthetic evidence (strong-but-circular):** the GAM-style dataset is built from multiplicative monomials `r = Σ α_i Π_j x_j^{β_ij}` — i.e., the data-generating process is *exactly* what a multiplicative operator fits. The +57%/+20%/+42% gains over a vanilla transformer are real but demonstrate that the operator fits its own prior, not that real tables need it.
- **Real-world evidence (moderate):** 4 datasets (EP 2000 feat, HC 104+16, CO 54, MI 136). AMF-F mean rank 1.3 ± 0.5, AMF-A 2.0 ± 0.8, beating FT-Transformer (4.5), DCAP (4.3), XGBoost (5.3). Both variants beat XGBoost on all 4 — the raw backbones do not. **But:** single reported run per cell, no per-dataset variance/significance test, and small gaps (AMF-A vs FT-Trans on HC) are not clearly meaningful.
- **Ablation (good):** additive + multiplicative > either alone in all 4 cases; prompt optimization improves accuracy AND efficiency; L and k sensitivity curves support L=3, k=8.
- **Scalability (strong):** measured FLOPs/time/memory on the 2000-feature dataset — the most topic-relevant evidence in the paper.

## 7. Concrete next experiments / hypotheses

1. **Compose, don't replace:** drop the Arithmetic Block on top of a PLR/periodic numerical tokenizer + learned categorical tokens, and test whether multiplicative interaction still helps once the tokenizer is already expressive (vs the raw-affine embedding used here). If gains vanish, the benefit was partly compensating for a weak tokenizer.
2. **Stress-test the multiplicative stream at 70+ correlated features:** measure how often the product branch destabilizes; try a signed log (`sign(x)·log(1+|x|)`) instead of `log(ReLU(X)+ε)` to recover negative-coordinate information.
3. **High-cardinality reality check:** swap the lookup table for hashing / target-encoded tokens and confirm the prompt-token scaling story survives when categorical embedding tables, not attention, are the memory bottleneck.
4. **Significance:** rerun the 4 real datasets with ≥5 seeds + repeated splits to see whether AMF-F's rank-1 lead is robust or within noise of FT-Transformer + good numerical embeddings.
5. **Beyond synthetic-favorable data:** test on TabReD/TabArena-style in-the-wild tables where the interaction order is unknown, to check the "arithmetic interaction is *necessary*" claim outside its purpose-built synthetic.
