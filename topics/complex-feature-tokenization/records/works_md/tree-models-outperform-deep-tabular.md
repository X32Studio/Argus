# Why do tree-based models still outperform deep learning on tabular data?

- Authors: Léo Grinsztajn, Edouard Oyallon, Gaël Varoquaux (Soda, Inria Saclay; ISIR, CNRS, Sorbonne University)
- Venue / Year: NeurIPS 2022 Datasets and Benchmarks Track — arXiv:2207.08815 (preprint 18 Jul 2022)
- URL: https://arxiv.org/abs/2207.08815
- Code: https://github.com/LeoGrin/tabular-benchmark (benchmark code + full 20,000-compute-hour random-search raw results); datasets via OpenML
- Primary route: `tabular-transformers` (it is the standard benchmark/critique against which tabular-transformer tokenizers are judged)
- Concept layers touched: feature-typing (numerical vs categorical handling, but high-cardinality/missing/temporal excluded), scaling-interaction (uninformative-feature robustness + rotation invariance vs feature count), learning-signal (supervised-only; motivates why embeddings shape the target)
- Analysis depth: deep | Confidence: high

## 1. What this work actually does

A benchmark-and-diagnosis paper, not a model proposal. Two contributions matter for us:

(a) **A curated 45-dataset tabular benchmark** with an unusually disciplined methodology — explicit dataset-inclusion rules (heterogeneous columns, not high-dimensional, i.i.d., real-world, not-too-easy, not-deterministic), aggressive "remove side issues" preprocessing, and a hyperparameter-tuning-aware evaluation that reports score as a function of random-search budget (≈400 iterations/model/dataset, 15–30 reshuffles, ~20,000 compute-hours, raw results released). The headline empirical result: **tree-based models (XGBoost, GBT, RandomForest) remain state-of-the-art on medium-sized (~10K) tabular data and beat every NN (MLP, ResNet, FT-Transformer, SAINT) at every tuning budget**, before even counting trees' much faster training.

(b) **An empirical inductive-bias investigation** that perturbs datasets (smooth the target, add/remove uninformative features, randomly rotate the feature space) to explain *why* trees win. It distills three "challenges for tabular NNs": (1) be robust to uninformative features, (2) preserve the orientation of the data, (3) be able to learn irregular functions.

## 2. Technical mechanism

The paper has no tokenizer of its own; its mechanism is the **diagnostic transformation suite** plus a minimal, deliberately-standard preprocessing pipeline. Three experiments carry the argument:

- **Finding 1 — NNs are biased to overly-smooth, low-frequency solutions.** Smooth the train target with a Gaussian-kernel smoother (lengthscale-controlled, covariance = data covariance, on Gaussianized features). For small lengthscales, smoothing *markedly hurts tree-based models but barely touches NNs*. Interpretation: the real target functions are irregular; trees (piecewise-constant weak learners) fit them, NNs (low-frequency-biased, cf. Rahaman 2019) cannot. The paper explicitly ties this to numerical embeddings: **periodic embeddings (Gorishniy 2022) add high-frequency capacity, and target-aware binning makes the effective target smoother** — both help the NN for this reason.

- **Finding 2 — uninformative features hurt MLP-like NNs more.** Tabular data is full of low-importance features (a GBT loses little accuracy after dropping up to ~50% of features ranked by RF importance, and a GBT trained *only* on the dropped features scores near chance up to ~20% removed — so they are genuinely uninformative, not merely redundant). Removing uninformative features **narrows** the MLP/ResNet-vs-tree/FT-Transformer gap; adding uncorrelated Gaussian noise features **widens** it.

- **Finding 3 — data are not rotationally invariant, so learners should not be either.** An MLP/ResNet learning procedure is rotation-invariant in Ng (2004)'s sense (apply a unitary matrix to train+test features and the learned function is unchanged). Ng shows any rotation-invariant learner has worst-case sample complexity that grows *at least linearly in the number of irrelevant features* — connecting Finding 2 to Finding 3. Empirically, randomly rotating the feature space **reverses the ranking**: NNs then beat trees and ResNet beats FT-Transformer, proving (i) ResNet really is rotation-invariant, (ii) the natural per-feature basis carries information that rotation destroys. The paper concludes that **the reason embeddings (FT-Transformer, SAINT, Gorishniy 2022) help is largely that an embedding layer breaks rotation invariance** and preserves the per-feature basis.

Pipeline mechanics: NN features Gaussianized via scikit-learn `QuantileTransformer`; categoricals `OneHotEncoder`'d for non-native models (trees use native categorical support); regression targets log/quantile-transformed when heavy-tailed.

## 3. Why it matters for the topic's stated goals

This is the motivation document for the whole topic. It establishes — with the most careful benchmark in the field at the time — that:
- The *tokenizer/embedding* is not cosmetic: per-feature embeddings are implicated as the main lever that lets DL approach trees, and the paper gives a falsifiable mechanistic reason (break rotation invariance + add high-frequency capacity).
- Numerical encoding quality matters more than categorical handling (the gap mostly persists on numerical-only data; "categorical variables are not the main weakness of NNs").
- Feature count is not free for deep models: uninformative features hurt rotation-invariant learners super-linearly, so a 70+-feature tokenizer must be paired with selection/gating, and must keep tokens per-feature rather than letting an early linear layer rotate-mix them.

## 4. What is reusable

- **Design rule: keep tokenization per-feature, never pre-mix the whole feature vector with a learned dense projection before the model can isolate features.** Mixing = approximating rotation invariance = the failure mode the rotation experiment exposes.
- **Prefer high-frequency-capable numerical embeddings (PLR/periodic) over raw scalars**, with the explicit rationale that real tabular targets are irregular.
- **Couple tokenization with explicit feature selection / gating**, because the deep model's penalty for uninformative features grows with feature count — directly relevant at 70+ features.
- **The benchmarking methodology itself**: budget-aware evaluation curves + released raw search results are the right way to later prove our own tokenizer helps without cherry-picking a tuning budget.

## 5. What is not safely transferable (within this topic's scope)

- The benchmark **excludes high-cardinality categoricals (>20 items), all missing data, and all temporal/stream data** — the three defining traits of the topic's 70+-mixed-feature target. The "trees still win" verdict is *untested* on our hardest cases; the paper lists high-cardinality and missing-data handling as explicit open questions.
- "Trees beat DL" is conditioned on **medium-sized (~10K)** data; the large-data regime is under-studied here and later foundation-model / large-data results narrow or flip the gap.
- The "embeddings help because they break rotation invariance" claim is an **interpretation**, not an ablation that toggles the embedding while holding rotation fixed — strong hypothesis, not proven causation.
- "Categorical is not the main weakness" is measured on **low-cardinality one-hot** categoricals only; it says nothing about the high-cardinality fields where naive tokenization actually breaks.

## 6. Evidence quality

High for what it tested. Strengths: 45 datasets across 4 settings, ~400-iteration random search per model, 15–30 reshuffles for variance, tuning-budget-aware curves, raw data released for reproducibility, principled dataset-inclusion criteria, a normalized cross-dataset aggregation (distance-to-minimum / ADTM). Weaknesses for *our* use: the deliberate exclusion of high-cardinality / missing / temporal features means the strongest claims are out-of-distribution for this topic; Sec-5 inductive-bias experiments are numerical-features + binary-classification only; the causal embedding claim is inferential.

## 7. Concrete next experiments or hypotheses

- **Rotation-invariance probe for our tokenizer.** Take a candidate 70+-feature tokenizer, randomly rotate the raw feature space (on Gaussianized numerics), retrain. If accuracy is unchanged, the tokenizer is leaking rotation invariance and will be fragile to uninformative features — fix by enforcing strictly per-feature tokens.
- **Uninformative-feature stress test at scale.** Inject K uncorrelated Gaussian noise features (K from 0 to ~3x the real count) and measure degradation of our deep model vs an XGBoost baseline; this directly forecasts behavior as feature count grows toward 70+. Use it to justify a feature-gating module.
- **High-frequency capacity ablation.** Compare raw-scalar vs PLR vs periodic numerical embeddings on a deliberately *irregular*-target subset; the paper predicts periodic embeddings recover the high-frequency component — verify this holds once high-cardinality categoricals and temporal channels are also present (the regime the paper never tested).
- **Reuse the released raw search results** as a fixed-budget yardstick: drop our tokenizer into the LeoGrin/tabular-benchmark harness to get an apples-to-apples, tuning-budget-controlled comparison against trees.
