# SAINT: Improved Neural Networks for Tabular Data via Row Attention and Contrastive Pre-Training

- **Authors:** Gowthami Somepalli, Micah Goldblum, Avi Schwarzschild, C. Bayan Bruss (Capital One), Tom Goldstein — University of Maryland, College Park
- **Year:** 2021
- **Venue:** arXiv:2106.01342 (preprint, "under review" 2021)
- **URL:** https://arxiv.org/abs/2106.01342
- **Code:** https://github.com/somepago/saint (official PyTorch)
- **Primary route:** `tabular-transformers`
- **Analysis depth:** deep · **Confidence:** high
- **PDF:** `sources/papers/saint-row-attention-contrastive.pdf`

## 1. What this work actually does

SAINT (Self-Attention and Intersample Attention Transformer) is a deep tabular model that adds two ideas on top of the now-standard "tokenize every feature, run a transformer" recipe:

1. **A second attention axis — intersample (row) attention.** In addition to ordinary self-attention *across the features of one row*, SAINT also attends *across the rows of a minibatch*, so a sample's representation is refined by looking at other samples. This is effectively a learned, end-to-end soft k-nearest-neighbours over the batch.
2. **Contrastive + denoising self-supervised pre-training** for label-scarce settings, using CutMix (raw input space) and mixup (embedding space) to build "views."

It also makes a small but empirically important embedding change versus TabTransformer: continuous features are projected into the shared token space (via a per-feature ReLU layer) and passed *through* the attention blocks, instead of being concatenated afterwards.

Headline claim: across 16 datasets SAINT beats prior deep tabular models and, on average, also beats XGBoost/CatBoost/LightGBM — with the biggest edge on wide, label-scarce, or noisy data.

## 2. Technical mechanism

**Embedding (tokenizer).** For a row `x = [[CLS], f^1, ..., f^n]`, an embedding layer `E` maps each feature to a `d`-dim token using a *different function per feature*: categoricals use a per-column learned lookup table (entity embeddings); each continuous feature gets its *own* single fully-connected layer + ReLU mapping `1 -> d`. Output is `E(x) ∈ R^{(n+1)×d}`. Columns get **no** positional encoding (column order is arbitrary), except the homogeneous MNIST-as-tabular case.

**Two-axis transformer stage.** Each of `L` stages is:
- Self-attention block: `z1 = LN(MSA(E(x))) + E(x)`, `z2 = LN(FF1(z1)) + z1` — attention over the `n+1` feature tokens of one row.
- Intersample block: `z3 = LN(MISA({z2_i}_{i=1..b})) + z2`, `r = LN(FF2(z3)) + z3` — attention across the `b` rows of the batch.

**Intersample attention (MISA), the novel part.** Pseudo-code (Alg. 1): take the batch tensor `x` of shape `b×n×d`, **reshape to `1×b×(n·d)`** (each row collapsed to one long vector), run ordinary self-attention over the `b` "row tokens," then reshape back to `b×n×d`. So rows attend to whole rows. Unlike axial/tied row attention (Axial Transformer, MSA Transformer, TABBIE), here *all features of different samples communicate jointly*, and it is hierarchical: features-within-a-row first, then rows-across-the-batch.

**Pre-training.** Build a view of `x_i`: CutMix in raw space `x'_i = x_i⊙m + x_a⊙(1−m)` (`m ~ Bernoulli(p_cutmix=0.3)`), then mixup in embedding space `p'_i = α·E(x'_i) + (1−α)·E(x'_b)` (`α=0.2`). Pass clean and mixed embeddings through SAINT and two projection heads. Loss = InfoNCE contrastive (temperature `τ=0.7`) pulling the two views of one point together, + `λ_pt(=10)` × per-feature denoising reconstruction (CE for categorical, MSE for continuous, via `n` per-feature MLPs). Finetune via the `[CLS]` token → single-hidden-layer MLP head.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing **70+ heterogeneous features** (numerical + high-cardinality categorical, partly time-varying). SAINT contributes a genuinely orthogonal idea to the per-feature column tokenizer that dominates this space (FT-Transformer, TabTransformer): the **row/intersample attention axis**. For our setting that matters because:
- when many features are noisy/missing — common in real wide tabular data — a row can "borrow" feature evidence from similar rows;
- on **wide + small-data** tasks (Arcene 783 feat, Arrhythmia 226 feat) SAINT-i is where the gains concentrate, which is precisely the regime where per-feature attention alone struggles.

It also confirms a cheap, transferable embedding upgrade (pass continuous features through attention via a per-feature ReLU projection) and a concrete tabular contrastive recipe.

## 4. What is reusable

- **Intersample/row attention as a learned soft-kNN module** — bolt a row-attention block onto any per-feature tokenizer to add cross-sample reasoning, robustness to missing/noisy features, and a label-scarce boost.
- **Per-feature continuous ReLU projection into the shared token space** — minimal, proven (89.38 → 91.72 AUROC vs leaving continuous features out of attention).
- **CutMix-in-input + mixup-in-embedding contrastive + denoising pretraining** — a packaged self-supervision objective for tabular tokens (the per-feature denoising heads are a clean way to keep heterogeneous reconstruction losses separate).

## 5. Hidden assumptions / prerequisites

- Intersample attention assumes a **representative minibatch** at both train and inference time — a sample's prediction depends on which *other* rows share its batch. This breaks the usual i.i.d.-prediction assumption (a serving/reproducibility hazard for small or skewed inference batches).
- The reshape `b×n×d → 1×b×(n·d)` makes MISA's projection matrices `(n·d)×(n·d)`, so **memory and parameters grow quadratically in `n·d`**. Assumes `n` (features) and `d` (embedding) are small enough to fit; the paper ran on a single RTX 2080Ti.
- Continuous features are assumed Z-normalized and categoricals label-encoded; high-cardinality categoricals are assumed manageable as plain lookup tables.

## 6. What would likely fail in the 70+-feature / temporal target setting

- **Scaling wall (the big one).** At `n≈70+` and a useful `d`, the `(n·d)×(n·d)` intersample projection is enormous. The paper itself was forced to shrink `d` to **4** (Arcene, 783 feat), **8** (Arrhythmia, 226 feat), **12** (MNIST) purely for single-GPU memory — i.e. it could not run wide tables at full capacity. The "SAINT-i is fast (123s vs 1759s)" line is a config artifact (L=1 vs L=6 stages), not evidence that row attention is cheap. Porting to our setting needs an *efficient / low-rank / sampled* row-attention variant, not the published dense one.
- **No temporal-static fusion and no positional handling** — columns are an unordered bag; there is no patching, recurrence, or time fusion, so the partly-time-varying half of our feature set is unaddressed.
- **No high-cardinality compression** — lookup tables grow linearly with cardinality; untested at high cardinality.
- **Benchmark optimism** — "beats XGBoost/CatBoost" is on 16 author-chosen datasets with author tuning; neutral later benchmarks (Grinsztajn 2022) find tuned GBDT still competitive-to-better. Treat as best-case-for-DL.

## 7. If I had to implement this, what would I borrow first

1. Add a **row-attention block** (intersample) after the per-feature self-attention in an FT-Transformer-style tokenizer — but implement it as **low-rank / sampled / chunked** attention over rows (e.g. project each row to a small summary before cross-row attention) to dodge the `(n·d)²` blowup.
2. Keep the **per-feature ReLU projection** for continuous features (or upgrade to PLR/periodic), and the **per-feature denoising + InfoNCE contrastive** pretraining for the label-scarce regime.
3. Explicitly **fix the inference batch** (or marginalize over batches) so predictions are deterministic, since intersample attention makes them batch-dependent.

## Key claims a skeptic should check

- **(mechanism)** Intersample attention's projection matrices are `(n·d)×(n·d)` because rows are reshaped to `1×b×(n·d)`; this is why SAINT-i has 352.7M params vs SAINT-s's 91.6M and why `d` had to drop to 4 on the 783-feature dataset. → Scaling claim, central to this topic.
- **(transfer)** Row attention behaves as a learned soft-kNN and helps most on wide + small-data + noisy/missing tables — the regime closest to real heterogeneous tabular data.
- **(evidence)** SAINT mean AUROC 93.13 over 14 binary datasets beats XGBoost 91.06 / CatBoost 90.73 — but on author-chosen, author-tuned datasets; neutral benchmarks disagree.
- **(evidence)** Merely embedding continuous features through attention lifts TabTransformer 89.38 → 91.72 AUROC (the "enhanced embedding" is just a per-feature ReLU layer, not a rich numerical embedding).
- **(mechanism/pitfall)** Predictions are non-i.i.d.: a row's output depends on the other rows in its inference batch — a deployment/reproducibility hazard SAINT does not foreground.
