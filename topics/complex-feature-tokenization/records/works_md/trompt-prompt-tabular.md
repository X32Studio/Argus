# Trompt: Towards a Better Deep Neural Network for Tabular Data

- **Authors:** Kuan-Yu Chen, Ping-Han Chiang, Hsin-Rung Chou, Ting-Wei Chen, Tien-Hao Chang (National Cheng Kung University, Taiwan)
- **Year / Venue:** 2023, ICML 2023 (poster) — arXiv:2305.18446
- **URL:** https://arxiv.org/abs/2305.18446
- **Primary route:** `tabular-transformers`
- **Analysis depth:** deep · **Confidence:** high
- **Code:** pyg-team/pytorch-frame — `torch_frame.nn.models.Trompt`, `torch_frame.nn.conv.TromptConv`, `examples/trompt.py` (no standalone author repo found; the PyG port reproduces the Grinsztajn45 claims)
- **PDF:** `sources/papers/trompt-prompt-tabular.pdf`

## 1. What this work actually does

Trompt ("Tabular Prompt") is a deep tabular architecture that tries to close the gap to GBDTs by borrowing the *idea* of prompt learning from NLP. Its thesis: column importances in tabular data are **not invariant across samples** — they can be grouped into multiple "modalities", and a model should assign **per-sample feature importances** (the implicit behavior of tree root-to-leaf paths). Trompt does this explicitly. It keeps the now-standard per-feature value tokenizer (numerical → Dense, categorical → Embedding, as in FT-Transformer / SAINT) but **replaces self-attention with a prompt-driven importance gate**. It is the first prompt-inspired tabular network. On the Grinsztajn45 benchmark it beats SAINT, FT-Transformer and ResNet across most task groups and narrows (does not close) the gap to tree models.

## 2. Technical mechanism

Two learned, **input-independent** matrices are the heart of the model:
- **Column embeddings** `E_column ∈ R^{C×d}` — one vector per column, the column's sample-invariant "intrinsic property" (analogous to a fixed pretrained LM).
- **Prompt embeddings** `E_prompt ∈ R^{P×d}` — `P` learned soft prompts (default P=128).

Trompt stacks `L=6` **Trompt Cells**; each cell has three parts:

1. **Derive importances.** Prompts are fused with the previous cell's output `O_prev` (a Dense over `concat(E_prompt, O_prev)` plus residuals → `hat_SE_prompt`), so input information flows in even though `E_prompt` itself is input-independent. Then
   `M_importance = softmax(hat_SE_prompt ⊗ SE_column^T) ∈ R^{B×P×C}`,
   a batched matmul (cosine-style similarity) between prompts and column embeddings, softmaxed **over columns**. This yields, per sample, `P` distinct importance distributions over the `C` columns.
2. **Construct feature embeddings.** Standard per-column value tokens `E_feature ∈ R^{B×C×d}` (numerical→Dense, categorical→Embedding, +LayerNorm).
3. **Expand.** A Dense layer expands `E_feature` to `hat_E_feature ∈ R^{B×P×C×d}` so **each prompt gets a different feature embedding** (ablation shows this is essential).

Cell output = column-wise sum of `hat_E_feature ⊙ M_importance` → `O ∈ R^{B×P×d}`. The shared **Trompt Downstream** turns each cell's `O` into a prediction: a Dense+softmax computes prompt weights `W_prompt`, a prompt-wise weighted sum gives `hat_O ∈ R^{B×d}`, then a 2-layer MLP head produces `P_i`. **Deep supervision:** every cell's prediction contributes to the loss (`loss = Σ loss_fn(P_i, y)`); at inference predictions are averaged (`pred = Σ P_i / L`).

Contrast with self-attention (the paper's framing): attention computes token-to-token (column-to-column) similarity at `O(C²)`; Trompt computes **sample-to-intrinsic-property** similarity at `O(P×C)`.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing 70+ heterogeneous features for deep tabular models, where attention cost and feature-interaction modeling are the binding constraints. Trompt is interesting precisely because it **decouples tokenization from interaction/importance** and drops `O(C²)` self-attention for an `O(P×C)` importance gate, while remaining permutation-aware via per-column learned embeddings. The prompt set is effectively a learned **mixture-of-importance-views**, which is a plausible way to handle heterogeneous feature subsets that matter for different samples — conceptually adjacent to feature gating/selection at scale.

## 4. What is reusable

- **Column-embedding-as-intrinsic-property:** a single learned, input-independent vector per column, used as the "key" against which sample representations are scored. Cheap, interpretable, portable to any per-feature tokenizer.
- **Soft-prompt importance gate:** `softmax(prompts ⊗ columns^T)` as an `O(P×C)` replacement for self-attention to produce per-sample, per-prompt column importances — a candidate for wide-table efficiency.
- **Per-prompt feature-embedding expansion** (part 3): the ablation-confirmed trick that lets each prompt see a different feature view; without it performance drops measurably.
- **Deep supervision across cells** (sum-loss / average-inference) as a regularizer for stacked tabular blocks.
- **Directly interpretable importances** (`hat_M_importance`, Eq. 10) that rank like GBDT importances on mushroom / TabNet synthetics.

## 5. Hidden assumptions / what would likely fail at 70+ heterogeneous features

- **High-cardinality categoricals untested.** Grinsztajn45 deliberately filters out high-cardinality categoricals and missing values. Per-column embedding tables grow linearly with cardinality; no hashing/target/compositional codes. The 70+-feature target (high-card + time-varying) is *out of distribution* for this paper's evidence.
- **Activation memory, not just FLOPs.** The `O(P×C)` framing hides a large constant: part 3 materializes a `B×P×C×d` tensor, and with P=128 that dominates memory on wide tables. Reported params reach 38–60M on SAINT's wider datasets — comparable to SAINT, not lean.
- **Naive numerical embedding.** Numerical = scalar→Dense; no PLR/periodic/binning. Pairing Trompt's gate with strong numerical embeddings is the obvious upgrade but is untested.
- **No temporal/static fusion, no missing handling, no pretraining/transfer** — "prompt learning" is an architectural analogy, not real prompting or in-context learning.

## 6. Evidence quality & key results

- **Grinsztajn45** (45 datasets, grouped by size × {numerical-only / heterogeneous}; acc / r²): Trompt consistently above SAINT, FT-Transformer, ResNet; joins the tree leading cluster on medium heterogeneous classification; **beats all models** on large numerical classification; beats DL by a large margin on large heterogeneous regression. **Weak spot:** large numerical-only regression (slightly worse than SAINT/FT). Curves are flat → strong at defaults, with a *smaller* search space than baselines.
- **Ablations:** P=1 collapses (clf 79.74% vs 81.81% at P=128); 64/128/256 within ~0.1% (insensitive once P large enough). Removing part-3 expansion Dense: clf 81.81→80.76%, reg 74.15→73.73% (per-prompt feature variation is load-bearing).
- **Interpretability:** recovers ground-truth informative features on Syn2/Syn4; ranks `odor` top-1 on mushroom, consistent with GBDTs.
- **Caveat on side comparisons (Tables 21–22):** vs FT-Transformer / SAINT on *their* chosen datasets, Trompt is **un-tuned** (defaults, 100 epochs, baselines copied from their own tuned papers) — NOT apples-to-apples, and clearly worse on some (covertype CO 0.9048 vs FT 0.967; AL 0.9317 vs 0.953/0.96).

## 7. Pitfalls noticed during deep-read

1. **Name oversells.** No pretrained backbone, no transfer/in-context — do not expect TabPFN-style few-shot.
2. **Benchmark hygiene.** Grinsztajn45 filters high-card categoricals + missing values; the "narrows gap to GBDT" claim is not evidence for the 70+-heterogeneous (esp. high-card) regime.
3. **Unfair supplementary tables.** Trompt un-tuned vs tuned baselines (see §6 caveat); read those tables as lower bounds, and note real losses on CO/AL.
4. **Memory footprint.** `B×P×C×d` expansion is the dominant cost; `O(P×C)` is misleading without the P=128 constant.
5. **Numerical branch is minimal** (scalar→Dense); strongest natural extension (Trompt gate + PLR/periodic numerical embeddings) is unexplored.

## Key claims a skeptic should check

1. *(mechanism)* The "prompt" gate is `softmax(hat_SE_prompt ⊗ SE_column^T) ∈ R^{B×P×C}` — a batched matmul between input-independent learned column embeddings and previous-output-fused soft prompts, NOT self-attention; importances are per-sample because `O_prev` carries input info into the prompts.
2. *(evidence)* On Grinsztajn45 Trompt beats SAINT/FT/ResNet on most groups but only **narrows** the GBDT gap; it loses on large numerical-only regression and on covertype/CO vs FT-Transformer (0.9048 vs 0.967).
3. *(evidence)* Ablations show P=1 collapses performance while P∈{64,128,256} are within ~0.1%, and the part-3 per-prompt expansion Dense is necessary (clf −1.05pp, reg −0.42pp without it).
4. *(transfer)* The `O(P×C)` importance gate is cheaper per-feature than `O(C²)` attention, BUT the `B×P×C×d` activation tensor (P=128) means real memory does not obviously improve on a wide-table SAINT — the scaling claim needs a wide-table (hundreds of features) stress test, which the paper does not provide.
5. *(transfer)* High-cardinality categoricals, missing values, and temporal features are absent from both the architecture and the benchmark, so reusing Trompt for the 70+-mixed-(static+time-varying) target requires adding categorical compression, a stronger numerical embedding, and temporal fusion — none validated here.

## Proposed graph edges (for collation editor)

- `work:trompt-prompt-tabular` `belongs_to_route` `route:tabular-transformers`
- `work:trompt-prompt-tabular` `introduces_technique` `technique:prompt-learning-importance-gate`
- `work:trompt-prompt-tabular` `uses_technique` `technique:per-feature-value-tokenizer`
- `work:trompt-prompt-tabular` `alternative_to` `technique:feature-self-attention` (FT-Transformer/SAINT)
- `work:trompt-prompt-tabular` `improves_on` `work:saint-row-attention-contrastive`
- `work:trompt-prompt-tabular` `improves_on` `work:ft-transformer-revisiting-tabular-dl`
- `work:trompt-prompt-tabular` `compared_against` `work:ft-transformer-revisiting-tabular-dl`
- `work:trompt-prompt-tabular` `compared_against` `work:saint-row-attention-contrastive`
- `technique:prompt-learning-importance-gate` `transferable_to` `route:feature-interaction-selection`
- `technique:prompt-learning-importance-gate` `enables_scaling` `route:scaling-interaction`
- `work:trompt-prompt-tabular` `has_pitfall` `pitfall:untested-high-cardinality-and-wide-tables`
