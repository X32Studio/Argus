# AutoInt: Automatic Feature Interaction Learning via Self-Attentive Neural Networks

- **Authors:** Weiping Song, Chence Shi, Zhiping Xiao, Zhijian Duan, Yewen Xu, Ming Zhang (Peking University); Jian Tang (Mila / HEC Montreal / CIFAR AI Chair)
- **Year / Venue:** 2019, CIKM 2019 (arXiv:1810.11921v2)
- **URL:** https://arxiv.org/abs/1810.11921
- **Code:** https://github.com/DeepGraphLearning/RecommenderSystems (TensorFlow); reimplemented in DeepCTR / FuxiCTR / pytorch-fm
- **Primary route:** feature-interaction-selection
- **Analysis depth:** deep · **Confidence:** high
- **Concept layers touched:** scaling-interaction (primary), token-granularity, feature-typing (secondary)

## 1. What this work actually does

AutoInt is a CTR-prediction model that learns **explicit high-order feature interactions** automatically, replacing hand-crafted cross features. It takes a sparse, high-dimensional, mostly-one-hot feature vector (e.g. Criteo: ~30M raw dims, >99.99% sparse, 39 fields), embeds each *field* into one dense token, and runs a stack of multi-head self-attention "interacting layers" over those field tokens. Each interacting layer lets every field attend to every other field; stacking layers raises the order of captured combinations. The final field tokens are concatenated and linearly mapped to a click probability. It is trained fully supervised end-to-end on Logloss.

## 2. Technical mechanism

**Input + embedding layer.** Input is the concatenation of M fields, `x = [x_1; ...; x_M]`, where a categorical field is a one-hot (or multi-hot) vector and a numerical field is a scalar.
- Categorical: `e_i = V_i x_i` (one-hot lookup into a per-field table). Multi-valued fields are averaged: `e_i = (1/q) V_i x_i`.
- Numerical: `e_m = v_m * x_m` — a single learned per-field vector scaled by the scalar value (rank-1, no bias). Numerical values are preprocessed with `z -> log2(z) if z>2`.
- All fields share embedding dim `d`, so categorical and numerical tokens live in one space and can interact by inner product.

**Interacting layer (the contribution).** Key-value multi-head self-attention over the M field tokens. For head `h`:
- `alpha^(h)_{m,k} = softmax_k <W_Query^(h) e_m, W_Key^(h) e_k>` (inner-product similarity; could be any function, they use inner product).
- `tilde-e_m^(h) = sum_{k=1..M} alpha^(h)_{m,k} (W_Value^(h) e_k)` — feature m's new representation in subspace h, a learned combination of itself and its relevant fields.
- Concatenate heads: `tilde-e_m = tilde-e_m^(1) ⊕ ... ⊕ tilde-e_m^(H)`.
- **Residual:** `e^Res_m = ReLU(tilde-e_m + W_Res e_m)`. The residual carries first-order/raw features forward; ReLU supplies the non-additivity that makes the combinations genuinely multiplicative-like.

**Order growth.** One layer produces ~2nd-order interactions per token. A second layer attends over tokens that already encode pairs (and, via residual, raw features), so it reaches 3rd/4th order; max attainable order grows roughly exponentially with depth L. Defaults: `d=16`, `d'=32`, `H=2`, `L=3` interacting layers.

**Output / training.** Concat all M output tokens, one linear layer, sigmoid -> CTR; Logloss. **AutoInt+** joint-trains a 2-layer DNN alongside for implicit interactions (Wide&Deep style).

**Complexity (key for this topic).**
- **Parameters:** interacting layers cost `L*(3*d*d' + d'*H*d) = O(L*d*d'*H)` — **independent of M** (weights shared across fields).
- **Time:** per layer `O(M*H*d'*(M+d))` — **quadratic in M** (full M x M attention).

## 3. Why it matters for the topic's stated goals

The topic needs to tokenize 70+ heterogeneous features and then make them tractable. AutoInt contributes the canonical **explicit interaction-and-selection layer**: a field-shared self-attention block whose parameter count does not grow with the number of fields, that explicitly models which fields interact (inspectable attention weights), and that guarantees raw/low-order features survive via residuals. It is directly composable on top of any per-feature tokenizer (e.g. FT-Transformer's affine tokens or PLR numerical embeddings).

## 4. What is reusable

- **Field-shared attention with M-independent parameters.** Widen from a handful to 70+ fields and the attention block adds zero parameters; only the embedding tables and the final concat-projection grow. This is the single most transferable idea for wide tabular inputs.
- **Residual-preserved interaction stacking.** Each interaction layer keeps first-order signal alive; ablation (Table 4) shows residuals are load-bearing on every dataset.
- **Unified shared-`d` space for mixed types**, so numerical and categorical tokens interact via inner products — same scaffold as FT-Transformer/SAINT, predating them.
- **Explicit, low-`H` multi-head design** (`H=2` already strong) keeps the block cheap.

## 5. What is not safely transferable (within this topic's scope)

- **The numerical tokenizer.** `e_m = v_m*x_m` is rank-1 with no bias — weaker than FT-Transformer's affine token and far weaker than PLR/periodic embeddings. Borrow the interaction layer, replace the numerical front-end.
- **The "efficient / scales to many features" headline.** True for *parameters*, false for *compute*: O(M^2) attention per layer. Their largest table is M=39; at 70+ fields the quadratic term bites and you need efficient/sparse attention (not provided).
- **High-cardinality compression.** Only a rare-feature `<unknown>` bucket; surviving categories still each get an embedding row. No hashing/target/compositional codes.
- **No missing-value, no temporal/static-fusion handling** — both required by the topic's target setting and absent here.
- **Domain transfer is unverified.** Results are sparse-one-hot CTR data with few numerical fields; dense 70+-mixed-feature tabular targets are plausible but untested in this paper.

## 6. Evidence quality

Strong, large-scale, multi-dataset: Criteo (45.8M rows), Avazu (40.4M), KDD12 (149.6M), MovieLens-1M. Standalone AutoInt is best or tied-best AUC/Logloss on 3 of 4 datasets (Criteo 0.8061/0.4455, KDD12 0.7883/0.1546, MovieLens 0.8456/0.3797; Avazu CIN slightly higher AUC but AutoInt wins Logloss), with p<0.01 significance on three. Residual and head-count ablations are reported. **Caveats:** no GBDT baseline; the exponential-order claim (Sec 4.7) is a capacity/existence argument, not evidence the high orders are learned; attention-as-explainability is correlational; AutoInt+ gains are small, implying the standalone model already captures most useful interactions.

## 7. Concrete next experiments or hypotheses

1. **Swap the numerical front-end:** replace `v_m*x_m` with PLR/periodic embeddings (from "On Embeddings for Numerical Features") feeding AutoInt's interaction layer; test whether the interaction layer still helps once numerical tokens are already rich.
2. **Stress the M^2 wall:** run AutoInt at 70-150 dense+categorical fields and measure where full attention becomes the bottleneck; benchmark a linear/sparse attention drop-in vs. accuracy loss.
3. **Interaction layer as a bolt-on:** add one AutoInt interacting layer on top of an FT-Transformer tokenizer and ask whether explicit interaction modeling beats vanilla MHSA on wide tables.
4. **High-cardinality:** combine AutoInt's field-shared attention with hashing/target encoding instead of full per-category tables and measure quality vs. parameter savings.

## Key claims a skeptic should check

- **(mechanism)** Interacting-layer parameter count `O(L*d*d'*H)` is independent of field count M; only embeddings + final projection grow with M.
- **(transfer)** "Scales to many features" splits: M-independent parameters (real) vs O(M^2) per-layer attention compute (binding at 70+ fields, untested beyond M=39).
- **(evidence)** Removing residual connections drops AUC on all four datasets (Table 4) — residual path is load-bearing, not cosmetic.
- **(transfer)** Numerical tokenization `e_m=v_m*x_m` is rank-1/no-bias and the weakest part for this topic; reuse the interaction layer, not the numerical front-end.
- **(evidence)** AutoInt+ (joint DNN) gives only a small lift over standalone AutoInt (Criteo +0.0023 AUC), supporting the claim that the explicit attention already captures most useful interactions.
