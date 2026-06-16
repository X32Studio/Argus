# Better by Default: Strong Pre-Tuned MLPs and Boosted Trees on Tabular Data (RealMLP)

- **Authors:** David Holzmüller, Léo Grinsztajn, Ingo Steinwart (University of Stuttgart; Inria/Soda)
- **Year:** 2024 · **Venue:** NeurIPS 2024 · arXiv:2407.04491
- **URL:** https://arxiv.org/abs/2407.04491 · **Code:** https://github.com/dholzmueller/pytabkit
- **Primary route:** feature-interaction-selection
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

RealMLP is an "improved MLP" that, with a SINGLE fixed hyperparameter configuration (no per-dataset
tuning), becomes competitive with gradient-boosted trees on medium-to-large tabular data (1K–500K
samples). The paper's real contribution is two-fold: (1) a carefully engineered MLP front-end +
training recipe — a "bag of tricks" — and (2) a META-TUNING methodology that produces strong **tuned
default** (TD) hyperparameters for both RealMLP and the GBDTs (LightGBM/XGBoost/CatBoost), so users get
near-HPO quality out of the box. Defaults are tuned on a meta-train benchmark of 118 datasets and
evaluated frozen on a disjoint meta-test benchmark of 90 datasets.

## 2. Technical mechanism

Front-end (per-feature, then flatten/concat — no attention, no token sequence):

- **Numerical preprocessing:** robust scaling by the inter-quartile range, then smooth clipping
  `f(x)=x/(1+(|x|/3)^2)` into ≈(−3,3). Ablated as a win over `QuantileTransformer`.
- **Numerical embedding (PBLD):** optional "periodic bias linear densenet" embedding. Per feature a
  small 2-layer MLP outputs `(x_i, W^(2,i) cos(2π w^(1,i) x_i + b^(1,i)) + b^(2,i)) ∈ R^4` — the
  original value concatenated to a 3-dim periodic embedding from a 16-dim learnable cosine basis.
  PBLD ≈ +0.5% over plain PL embeddings (regression). RealMLP-TD-S drops embeddings for speed.
- **Categorical encoding:** threshold 8. Cardinality ≤8 → one-hot (binary → {−1,1}, missing → 0);
  cardinality >8 → learned **8-dim** embedding (missing as its own category).
- **Learnable diagonal scaling layer:** a per-feature scalar `s_i` (init 1.0) rescales inputs before
  the first linear layer — an implicit feature-importance reweighting worth ≈ +1.2%.

Backbone + training recipe:

- 3 hidden layers × 256, **neural tangent parametrization (NTP)**: `z = d^(-1/2) W x + b`.
- **Parametric activations** `(1−α)x + α·σ(x)` (SELU for classification, Mish for regression; α init 1).
- AdamW with **β2 = 0.95** (not 0.999 — this single change costs ≈ +22.8% regression error if reverted),
  multi-cycle **coslog4** LR schedule, **scheduled** dropout (base 0.15) and weight decay (base 0.02).
- **Label smoothing 0.1** (classification), **test-time output clipping** to training range (regression).
- 256 epochs, no early stopping, revert to best-validation epoch; data-dependent weight init.

Meta-tuning of defaults: optimize hyperparameters with hyperopt/SMAC3 (+ small manual rounding) on the
118-dataset meta-train suite, freeze, evaluate on the 90-dataset meta-test suite. The TD↔HPO gap is
"about equally large" on meta-train and meta-test → the defaults generalize. The identical recipe yields
LightGBM-TD / XGBoost-TD / CatBoost-TD. Scoring uses shifted geometric mean error (SGM, ε=0.01).

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing 70+ heterogeneous features feeding a deep tabular model. RealMLP is direct
evidence that for many-feature tables you can get top-tier accuracy WITHOUT a Transformer tokenizer:
good per-feature numerical embeddings + robust preprocessing + a strong backbone, at **linear cost in
feature count**, match or beat FT-Transformer/SAINT. It is the canonical "strong cheap backbone +
default per-feature embedding recipe" to drop a real heterogeneous-feature tokenizer onto, and it
supplies a reusable methodology (meta-tuned defaults) for shipping a tokenizer that needs no per-dataset HPO.

## 4. What is reusable

- **PBLD / periodic per-feature numerical embeddings** — a drop-in front-end for continuous features.
- **Robust-scale + smooth-clip preprocessing** — cheap, outlier-robust, beats quantile transform here.
- **Learnable diagonal scaling layer** — per-feature soft reweighting, ~+1.2%, trivially portable and
  could act as a lightweight, differentiable feature-importance front-end on a 70+-feature input.
- **Meta-tuned-defaults methodology** — tune one config on a meta-train suite, freeze, ship; directly
  applicable to producing strong default settings for a heterogeneous-feature tokenizer.
- **Training-recipe knobs** (β2=0.95, parametric activations, scheduled dropout/WD, label smoothing,
  output clipping) — backbone-agnostic, can wrap any tokenizer.

## 5. What is not safely transferable (within this topic's scope)

- **No explicit feature interaction or selection** despite the route name — the scaling layer is
  per-feature reweighting only; interactions happen implicitly inside dense weights.
- **High-cardinality handling is a constant 8-dim embedding** — no target/CatBoost encoding, no
  hashing, no frequency-aware sizing; untested on thousands-of-categories fields.
- **No missing-numerical support** (paper restricts to datasets without missing numericals) and **no
  temporal/time-series fusion** — both are core requirements of this topic's target setting.
- The "competitive with GBDTs" headline depends on the SGM metric and the tuned-default regime;
  CatBoost-TD is within ~1 win-rate point and RealMLP is "worse for classification" on the GBDT-friendly
  benchmark.

## 6. Evidence quality

Strong and honest. Cumulative + leave-one-out ablations quantify each trick (β2=0.95 ≈ +22.8% reg error
if removed; parametric activations ≈ +4.8% reg; scaling layer ≈ +1.2%; data init ≈ +1%; PBLD ≈ +0.5%
over PL; label smoothing ≈ +1.8% cls). The meta-train/meta-test split is genuinely disjoint, so the
"defaults generalize" claim is well-controlled. Caveats the authors themselves flag: single
train-val split (HPO can overfit val), non-architectural aspects not equalized across NN baselines,
runtime sensitivity to hardware/HPO. "Many features" on meta-test is largely one-hot-expanded width
rather than a controlled 70+-native-field sweep.

## 7. Concrete next experiments or hypotheses

1. **Tokenizer drop-in test:** keep RealMLP's preprocessing + diagonal scaling + backbone, swap PBLD for
   a heterogeneous-feature tokenizer; measure whether attention-style tokens beat flat-concat PBLD on a
   true 70+-mixed-feature table — RealMLP is the linear-cost baseline to beat.
2. **High-cardinality stress test:** replace the fixed-8-dim embedding with frequency-aware /
   target / hashing encodings on thousands-of-category fields; quantify the gap the paper never measured.
3. **Diagonal scaling as feature gate:** probe whether the learned `s_i` correlate with feature
   importance and could prune features at scale (cheap selection front-end for 70+ features).
4. **Meta-tuned defaults for a tokenizer:** apply the meta-train→freeze→meta-test recipe to a
   heterogeneous-feature tokenizer to ship strong no-HPO defaults.
5. **Temporal/missing extension:** add a missing-numerical mask channel and a temporal patch front-end;
   test whether RealMLP's recipe survives time-varying + static fusion.

## Key claims a skeptic should check

- (mechanism) The big gains are from the TRAINING recipe (β2=0.95, parametric activations), not the
  PBLD embedding — credit must be disentangled before crediting RealMLP as an embedding advance.
- (transfer) A flat-concat MLP with PBLD embeddings matches/beats FT-Transformer on many-feature tables
  at linear cost — i.e. attention tokenization may be unnecessary for 70+ features.
- (evidence) "Competitive with GBDTs" holds under SGM + tuned-default regime; CatBoost-TD is within ~1
  win-rate point and RealMLP is worse for classification on the GBDT-friendly benchmark.
- (transfer) The learnable diagonal per-feature scaling layer (~+1.2%) is a portable, differentiable
  feature-reweighting front-end usable on any wide tabular input.
- (mechanism) High-cardinality categoricals get only a fixed 8-dim embedding with no frequency
  awareness — likely a weak point on thousands-of-category fields, untested in the paper.
