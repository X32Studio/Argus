# ExcelFormer: A Neural Network Surpassing GBDTs on Tabular Data

- **Authors:** Jintai Chen, Jiahuan Yan (co-first); Qiyuan Chen, Danny Z. Chen, Jian Wu, Jimeng Sun (UIUC / Zhejiang Univ. / Notre Dame)
- **Venue / Year:** KDD 2024 (arXiv:2301.02819v8, first posted Jan 2023)
- **URL:** https://arxiv.org/abs/2301.02819
- **Code:** https://github.com/whatashot/excelformer (PyTorch) · datasets: https://huggingface.co/datasets/jyansir/excelformer
- **Primary route:** `tabular-transformers`
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

ExcelFormer aims to be a "sure-bet" deep tabular model: a single architecture that, with **little or no hyperparameter tuning**, beats heavily-tuned XGBoost/CatBoost on *both* small (GBDT-favored) and large (DNN-favored) tables. It is an FT-Transformer descendant. The paper frames three DNN weaknesses it fixes:

- **P1 rotational invariance** → DNNs waste sample budget "ignoring" uninformative columns. Fix: **Semi-Permeable Attention (SPA)** + **interaction-attenuated initialization (IAI)**.
- **P2 large data demand** → fix: two tabular-specific Mixup variants, **Feat-Mix** and **Hid-Mix**.
- **P3 over-smooth solutions** → fix: replace the Transformer MLP-FFN with a **GLU "attentive FFN"**.

Critically, the *tokenizer is not the contribution* — it is FT-Transformer's per-feature embedding with a GLU gate added. All the novelty is in how the tokens are processed and augmented.

## 2. Technical mechanism

**Tokenizer (per feature, value-aware).** Numericals → sklearn `QuantileTransformer`; **categoricals → CatBoost target-encoder to a single scalar BEFORE the network**. So every column enters as one real number `f_i`. Each scalar is embedded by a per-feature GLU:
`z_i = tanh(f_i·W_{i,1}+b_{i,1}) ⊙ (f_i·W_{i,2}+b_{i,2})`, `W∈R^{1×d}`, `b∈R^d`. Tokens stacked to `z^(0)∈R^{f×d}`, **no [CLS]** (head pools all f tokens). `d=256`, `L=3`.

**Semi-Permeable Attention (SPA).** Standard scaled-dot attention with a *static additive mask* `M∈R^{f×f}` on the logits:
`M[i,j] = -inf if I(f_i) > I(f_j) else 0`, where `I(·)` = normalized **mutual information** of feature with the target (sklearn `mutual_info_classif/regression`), computed once before training. Effect: a more-informative feature `i` is **forbidden from attending to (reading) a less-informative feature `j`** — information may only flow *up* the importance order, so noise cannot contaminate strong features, but strong features can still inform weak ones. Multi-head, 32 heads.

**Interaction-Attenuated Initialization (IAI).** Scale all SPA weights' variance by `γ=1e-4` (He/Xavier × γ, mean 0). The model **starts ≈ a no-interaction, rotationally-VARIANT MLP** and grows feature interactions data-drivenly (a dynamical-isometry-friendly variant of LayerScale/ReZero, but baked into init rather than a learnable scalar).

**GLU attentive FFN.** Replace `Linear(ReLU(Linear(z)))` with `tanh(Linear1(z)) ⊙ Linear2(z)` (tanh, not sigmoid) over the embedding dim — same param/cost, sharper fitting of irregular boundaries.

**Feat-Mix / Hid-Mix (the P2 fix).**
- *Feat-Mix*: swap whole **features** between two rows (binary mask `s_F` over the f columns); label-mix weight `Λ = (Σ_{s_F=1} I(f_i)) / (Σ I(f_i))` — i.e. **importance-weighted**, so swapping a noisy column barely moves the label. Degenerates to CutMix if importance ignored.
- *Hid-Mix*: swap whole **embedding dimensions** between two rows (mask over the d axis), label weight `λ_H ∼ Beta(α,α)`. Acts like a bagging regularizer over "profile" copies of the input.
- Use **one or the other** per dataset (combination underperforms). Both avoid vanilla Mixup's convex interpolation, which over-smooths irregular tabular targets.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing 70+ heterogeneous (numeric + high-cardinality categorical, partly temporal) features for deep tabular models. ExcelFormer matters as **the strongest "no-tuning" FT-Transformer-class baseline** and as a source of **two cheap, tokenizer-agnostic inductive biases** that target exactly the pain of *many uninformative columns* — which is the regime a 70+-feature table lives in. SPA's "let signal flow, block noise" mask and importance-weighted Feat-Mix are both designed around "tables have lots of junk features," which is the core scaling-of-heterogeneity problem.

## 4. What is reusable

- **Importance-masked attention (SPA)** as a drop-in inductive bias on any FT-Transformer-style stack with wide noisy feature sets — bolt it on, recompute the MI ranking, mask the logits. Zero extra compute.
- **Interaction-attenuated init (γ-scaled SPA weights)** — start near an MLP, grow interactions; trivially portable, helps trainability on small data.
- **Feat-Mix / Hid-Mix with importance-weighted labels** — the single most transferable artifact; a tokenizer-agnostic augmentation that empirically beats Mixup/CutMix on *both* FT-Transformer and ExcelFormer backbones (Table 5), so it generalizes beyond this architecture.
- **GLU (tanh) FFN** instead of ReLU-MLP FFN — free fitting-capacity upgrade.

## 5. What is NOT safely transferable (within this topic's scope)

- **The tokenizer is numerical-only inside the net.** Categoricals are CatBoost-encoded to scalars *upstream*, so ExcelFormer has **no learned categorical token and no high-cardinality representation** — it cannot be cited as a categorical/high-cardinality tokenization method. (refute-survived: the "feature tokenizer" framing is real but applies post-scalarization.)
- **No temporal / static fusion, no missing-value handling.** Off-topic for the time-varying half of the target setting.
- **SPA is NOT a scaling mechanism.** The masked softmax is still O(f²); it trims information *flow*, not *cost*. Wide-table compute is unchanged from FT-Transformer.
- **No evidence at 70+ features.** Max feature count across *all* 117 datasets is **54** (covtype, jannis); the "small" set is mostly <30. Any 70+ applicability is extrapolation.
- **Static, pre-training MI ranking** — a strict total order frozen at t=0; brittle with noisy MI on many correlated features.

## 6. Evidence quality

- **Breadth: strong.** 96 small (<10k) + 21 large (>10k) datasets, 5 seeds, performance-rank aggregation, stratified by task/size/feature-count. Ablations isolate SPA, IAI, GLU (Table 4) and augmentation (Table 5, on two backbones).
- **Headline result credible:** ExcelFormer ranks #1 on small (≈3.2 vs tuned XGBoost ≈4.2, FT-T ≈4.3) and large (≈2.0 vs XGBoost ≈4.3), and beats *tuned* baselines even *untuned* — a genuinely useful "default-config" property.
- **Caveats:** single 80/20 split (no CV), so rank gaps <~0.5 are not clearly significant; GBDT/DNN baselines use a fixed shared protocol (from FT-Transformer's paper) rather than per-method-optimal pipelines; the "no tuning" claim still tunes the Mixup α. One benchmark smell: AAPL stock-price datasets used as i.i.d. regression.

## 7. Concrete next experiments / hypotheses

1. **Decouple the contributions for wide tables.** Take a plain FT-Transformer (with real PLR/periodic numerical embeddings *and* a learned categorical token table), add only SPA + Feat-Mix on a 70+-feature, high-cardinality dataset (e.g. from TabReD). Hypothesis: SPA/Feat-Mix help, but the CatBoost-scalarization that ExcelFormer relies on is the wrong move once cardinality is high.
2. **Stress-test the static MI mask** at f≥70 with correlated/duplicated columns: measure ranking stability across seeds/folds and whether a *learned* or *periodically-refreshed* importance mask beats the frozen one.
3. **Replace CatBoost-encode with a learned categorical token** and check whether SPA's mask logic survives when categoricals are multi-dim tokens (mask is per-feature, so it should — verify empirically).
4. **Combine Hid-Mix with PLR numerical embeddings** to see if importance-weighted dimension-swapping still acts as a bagging regularizer when input embeddings carry more numerical resolution.

---

### Proposed graph edges
- `work:excelformer-semi-permeable-attention` —belongs_to_route→ `route:tabular-transformers`
- `work:excelformer-semi-permeable-attention` —improves_on→ `work:ft-transformer-revisiting-tabular-dl`
- `work:excelformer-semi-permeable-attention` —compared_against→ `work:tree-models-outperform-deep-tabular` (GBDT framing) / XGBoost-CatBoost
- `work:excelformer-semi-permeable-attention` —introduces_technique→ `technique:semi-permeable-attention`
- `work:excelformer-semi-permeable-attention` —introduces_technique→ `technique:feat-mix-hid-mix-importance-weighted-mixup`
- `technique:semi-permeable-attention` —transferable_to→ `transferable_idea:noise-robust-wide-feature-attention`
- `work:excelformer-semi-permeable-attention` —uses_technique→ `technique:catboost-target-encoding` (categorical scalarization)
- `work:excelformer-semi-permeable-attention` —has_pitfall→ `pitfall:no-native-categorical-or-temporal-tokenizer`
- `work:excelformer-semi-permeable-attention` —has_pitfall→ `pitfall:spa-is-not-a-scaling-mechanism`
