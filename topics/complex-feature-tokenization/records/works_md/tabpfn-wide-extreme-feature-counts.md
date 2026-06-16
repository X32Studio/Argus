# TabPFN-Wide: Continued Pre-Training for Extreme Feature Counts

- **Slug:** `tabpfn-wide-extreme-feature-counts`
- **Authors:** C. Kolberg, J. Kreuer, J. Huurdeman, S. Ouaari (equal); K. Eggensperger; N. Pfeifer (corresponding). University of Tübingen + Lamarr Institute / TU Dortmund.
- **Year / Venue:** 2025 — arXiv:2510.06162 [cs.LG] (v2, Mar 2026). Journal-template preprint (bioinformatics), peer-review status unconfirmed at this version.
- **URL:** https://arxiv.org/abs/2510.06162
- **Code:** https://github.com/not-a-feature/TabPFN-Wide (training code, package, weights)
- **Primary route:** `tabular-foundation-models` · spans `scaling-interaction`, `learning-signal`, `categorical-high-cardinality`
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

TabPFN-Wide makes a frozen tabular foundation model (TabPFNv2 classifier) work on **High-Dimensional Low-Sample-Size (HDLSS)** data — tens-to-hundreds of rows but **thousands to tens of thousands of features** — without dropping or compressing features. The motivating domain is biomedicine (multi-omics cancer-subtype classification), where you may have ~200 patients and 60,000 molecular measurements, and where you must keep **per-feature interpretability** (which gene matters) intact.

The key move is *not* a new tokenizer or architecture. It is **continued pre-training**: take the existing TabPFNv2 classifier checkpoint and keep training it on a **new synthetic prior** that emits datasets with extreme feature counts, so the same model learns to do in-context prediction over thousands of feature-tokens. The result handles **>30,000** continuous+categorical features (real omics up to ~60k, synthetic SNP up to ~70k) while staying flat in accuracy as width grows, where vanilla TabPFNv2 and TabICL collapse.

## 2. Technical mechanism

Three components:

1. **A feature-widening HDLSS prior.** Start from a moderate-width synthetic dataset (50–350 features, 40–400 samples, ≤10 classes) sampled from the *open-source TabICL* structural-causal-model prior (TabPFNv2's own prior is not public). Then synthetically **widen** it to a target width `d` (capped at `dmax ∈ {1500, 5000, 8000}`):
   - *Continuous widening (Alg. 1):* new features are sparse random linear projections of the originals, `X_wide = X·(M⊙W)`, `W~N(0,1)`, mask `M~Bernoulli(p)`; then add feature-dependent Gaussian noise `N~N(0, σ·σ_j)` with `σ_j = std` of the projected column. This preserves correlation structure while injecting realistic noise.
   - *Categorical widening (Alg. 2):* each new categorical column copies values per-sample from `k = max(1, ⌊p·m_cat⌋)` randomly-chosen donor categorical columns, then a **category-reduction** step merges the rarest categories until cardinality ≤ `K_j`, with `K_j` drawn from a **discrete exponential** (biased low, occasionally high) to avoid degenerate high-cardinality variables.
   - A single **sparsity knob `p ∈ [0,0.05]`** controls the induced inter-feature correlation (dense vs sparse), matched to biomedical data. With prob 0.5 the original un-widened features are appended and the full column order randomly permuted (keeps permutation-invariance, anchors the original distribution).

2. **Continued pre-training.** Start from the TabPFNv2 classifier checkpoint, update **all** params with AdamW (lr 1e-5, wd 1e-4, cosine decay + warmup, grad-clip 1.0), batch 16 (8 for >5k features), **fixed 10,000 steps**, cross-entropy loss. Separate models per `dmax` → `TabPFN-Wide-{1.5k,5k,8k}`. Inference runtime complexity is **unchanged** from TabPFNv2; only training cost rises (used 4×H100 / 320 GB). Mixing the original distribution back in is the explicit guard against **catastrophic forgetting**.

3. **Per-feature interpretability via attention.** By default TabPFNv2 groups feature-cells / adds distribution-dependent derived features / removes features — which **breaks the token↔feature mapping**. They **disable** all of that so each transformer feature-token = one dataset feature. The averaged **feature-axis attention toward the label column** (averaged over samples, heads, layers) is then read as a per-feature importance score.

## 3. Why it matters for the topic's stated goals

The topic asks how to tokenize 70+ heterogeneous features for deep tabular models. TabPFN-Wide is a direct existence proof that a **permutation-invariant, per-feature tokenizer can be pushed two orders of magnitude past its training feature ceiling (500 → 30k+) without redesigning the tokenizer** — purely by **engineering the synthetic prior and continuing pre-training**. That reframes "scaling the tokenizer to many features" from an architecture problem into a **data/prior problem**, which is much cheaper and reusable.

## 4. What is reusable

- **Prior-engineering + continued pre-training recipe** to patch a frozen tabular PFN into a new feature-count regime: cheap (10k steps), no architecture change, no catastrophic forgetting if you mix the original distribution back at prob ~0.5.
- **The two widening algorithms themselves** as a way to *synthesize* wide heterogeneous data with controllable correlation: sparse random linear projection (continuous) + sparse donor-copy-then-cardinality-cap (categorical), governed by one sparsity knob `p`.
- **Strict 1:1 token-to-feature mapping** (disable cell-grouping/derived features) when per-feature interpretability is a hard requirement — plus the averaged feature-axis-attention-to-label as a lightweight, training-free importance signal.

## 5. What is not safely transferable (within this topic's scope)

- **The HDLSS assumption is baked in.** Everything is validated where `m ≫ n` (tens-to-hundreds of rows). The widening prior assumes high inter-feature correlation + noise (omics-like). A 70-feature business table with **many rows** and **mixed time-varying + static** signals violates both assumptions; there is no evidence the gains carry over, and the prior would likely need re-design.
- **No temporal axis at all.** Rows are static vectors; the topic's temporal-static fusion goal is unaddressed.
- **High-cardinality categoricals are deliberately bounded out** of the prior (cardinality capped, biased low). Extreme-cardinality / text / ID fields are not handled.
- **Classifier only**; regression for HDLSS is future work. The same prior **failed to train TabICL**, so the recipe is not obviously model-agnostic.
- **Still quadratic-attention-bound** — cannot also scale rows; widening raises *training* cost quadratically in `d` (hence `dmax` capped at 8k, and 1.5k≈5k≈8k downstream).

## 6. Evidence quality

Reasonably strong for the HDLSS claim, weaker for interpretability.
- **Scaling/robustness:** consistent across 5 TCGA multi-omics datasets, 15 Li-et-al. HDLSS datasets (92.0% pairwise win rate, Wilcoxon p<0.005), and synthetic SNP needle-in-haystack to ~70k features. TabPFNv2/TabICL demonstrably collapse, so the *relative* improvement is convincing.
- **No catastrophic forgetting:** Spearman ρ=0.9935 vs TabPFNv2 on 21 TabArena tasks — strong.
- **Interpretability:** clean only on synthetic ground-truth (Recall@k ≈ Random Forest); on real omics it is suggestive (9/10 top BRCA genes are known) but the authors themselves invoke the "attention is not explanation" literature and say "interpret with caution." No systematic eval. Treat as **low-confidence**.
- Sample sizes for the headline omics result are small (5 datasets × 5-fold CV).

## 7. Concrete next experiments / hypotheses

1. **Stress the prior outside HDLSS:** continue-pre-train TabPFNv2 with a *non*-HDLSS widening prior (many rows, low feature correlation, an explicit temporal-block structure) and test whether the recipe still avoids forgetting and helps on 70+-feature many-row tables. This is the make-or-break transfer test for this topic.
2. **Add a temporal-static widening mode:** extend Alg. 1/2 with a "temporal patch" widening branch so the prior emits mixed time-varying + static columns; see if continued pre-training teaches the per-cell tokenizer to fuse them.
3. **Grouping vs widening:** directly compare TabPFN-Wide's *disable-grouping* path against TabPFN-2.5's *enable-grouping (groups of 3)* path at matched feature counts — quantify the interpretability/scale/cost trade-off (the two papers take opposite design stances).
4. **High-cardinality probe:** remove the cardinality cap in Alg. 2 (or feed string/ID donors) and measure whether continued pre-training can also absorb high-cardinality columns, currently the explicit gap.
5. **Regressor variant:** repeat the recipe on a TabPFNv2 *regressor* checkpoint for HDLSS regression.

---

### Key claims a skeptic should check
- **(mechanism)** Extreme-feature-count capability comes entirely from a feature-widening synthetic prior + continued pre-training of *unchanged* TabPFNv2 weights — no tokenizer/architecture change.
- **(transfer)** "Scales beyond 30,000 features" is an **HDLSS-only** claim (m ≫ n, correlated+noisy omics-style data); it is not validated for many-row or temporal mixed-feature tables.
- **(evidence)** 92.0% pairwise win rate over baselines on 15 HDLSS datasets (Wilcoxon p<0.005) and ρ=0.9935 agreement with TabPFNv2 on TabArena (no catastrophic forgetting).
- **(transfer)** Disabling TabPFNv2 cell-grouping to keep a 1:1 token↔feature map (for attention-based importance) is the **opposite** scaling stance to TabPFN-2.5's feature-grouping; the trade-off is untested jointly.
- **(evidence)** Attention-to-label as feature importance is clean only on synthetic ground truth; on real omics it is suggestive and the authors flag it as controversial.
