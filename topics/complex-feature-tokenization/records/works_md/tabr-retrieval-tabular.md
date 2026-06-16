# TabR: Tabular Deep Learning Meets Nearest Neighbors in 2023

- **Authors:** Yury Gorishniy, Ivan Rubachev, Nikolay Kartashev, Daniil Shlenskii, Akim Kotelnikov, Artem Babenko (Yandex Research)
- **Year:** 2023 (arXiv:2307.14338; later ICLR 2024)
- **URL:** https://arxiv.org/abs/2307.14338
- **Code:** https://github.com/yandex-research/tabular-dl-tabr (MIT, PyTorch)
- **Primary route:** tabular-transformers (with caveats — see §1)
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

TabR is a feed-forward tabular network with a custom k-Nearest-Neighbors-like retrieval
module bolted into the middle. For a target row it retrieves similar *training rows*, reads
their features **and labels**, and uses them to sharpen the prediction. On public benchmarks
up to several million objects it has the best average rank among tabular DL models, sets SOTA
on several datasets, and — the headline — beats XGBoost/CatBoost on the Grinsztajn et al. 2022
"why tree models still outperform DL" benchmark that was built to show GBDT superiority.

Important framing for this topic: **TabR is not a feature-tokenizer.** It does not produce one
token per feature. Its Input Module flattens normalized numerical + one-hot categorical features
into a single vector per row, an encoder maps that to one object embedding `x~ ∈ R^d`, and the
attention happens over *training examples* (the instance axis), not over features. It is filed
under `tabular-transformers` only because it is an attention-based tabular DL model; conceptually
it lives on a different axis from FT-Transformer / SAINT.

## 2. Technical mechanism

Architecture = encoder `E` → retrieval module `R` (residual branch) → predictor `P`.
`E` and `P` are ordinary MLP-style blocks; the contribution is `R`, derived in four ablation steps:

- **Step-0 (baseline):** vanilla self-attention over candidates, top-m. Dot-product query/key
  similarity, value = `W_V(x~_i)`. No gain over MLP.
- **Step-1:** add context **labels** to the value, `V = W_Y(y_i) + W_V(x~_i)`. Still no gain —
  counter-intuitively, the dot-product similarity can't exploit labels.
- **Step-2 (turning point):** drop the query (`W_Q`), use **key-only L2 distance**:
  `S(x~, x~_i) = -||W_K(x~) - W_K(x~_i)||^2 · d^-1/2`, value still `W_Y(y_i) + W_V(x~_i)`.
  Gains over MLP finally appear. Removing **any one** of {context labels, key-only key,
  L2 distance} collapses performance back to MLP level.
- **Step-3:** make the value depend on the target via a key-difference correction:
  `V = W_Y(y_i) + T(W_K(x~) - W_K(x~_i))`, with
  `T(·) = LinearNoBias(Dropout(ReLU(Linear(·))))`. Inspired by DNNR. `W_Y(y_i)` is the neighbor's
  raw label contribution; `T(...)` translates key-space differences into label-space corrections.
- **Step-4 = TabR:** drop the `d^-1/2` scaling and exclude the target from its own context.

Final form (Eq. 5):
`k = W_K(x~)`, `k_i = W_K(x~_i)`, `S = -||k - k_i||^2`, `V = W_Y(y_i) + T(k - k_i)`.
Default context size `m = 96`, candidate set `Icand = Itrain` (all training rows). `W_Y` is an
embedding table for classification, a linear layer for regression. The retrieval output is added
residually to `x~` before `P`.

Variants: **TabR-S** (simple) uses a linear encoder (`N_E=0`), one predictor block, and no
feature embeddings. **Full TabR** can add PLR/periodic numerical embeddings (Gorishniy et al. 2022)
in the Input Module.

## 3. Why it matters for the topic's stated goals

The topic's central pain is feature-count blow-up: per-feature tokenizers turn 70+ features into
70+ tokens and pay O(k^2) attention. **TabR's cost is independent of feature count** — its
attention is over `m`/N_candidates objects, so it sidesteps that wall entirely. It is therefore a
serious *alternative paradigm* to per-feature tokenization for wide heterogeneous tables: instead
of engineering better tokens, it makes predictions local via retrieval. It also contributes a clean
empirical lesson (Step-2) that the *form* of attention similarity matters more than adding capacity:
key-only L2 + label-aware values beats vanilla dot-product attention.

## 4. What is reusable

- **The instance-axis move:** when feature tokenization is the bottleneck, attend over training
  rows instead of features. Cost scales with data, not feature count.
- **The Step-2/Step-3 retrieval head** (key-only L2 similarity + `W_Y(y_i)` label embedding +
  `T(k - k_i)` correction). This is a compact, well-ablated module that could be appended to *any*
  encoder — including a per-feature-token encoder — to add a label-aware kNN signal cheaply.
- **"Context freeze" (subsec 5.1):** mine contexts once after N epochs and reuse them, to cut the
  per-step all-candidate search cost — a practical recipe for scaling retrieval to large N.
- **The candidate-subset hook** `Icand = Icand(x)`: retrieval can be restricted per target, which
  is exactly the lever needed to make retrieval temporally/causally safe.

## 5. What is not safely transferable (within this topic's scope)

- It does **not** solve heterogeneous-feature *tokenization*. Categoricals are plain one-hot /
  learned embeddings; there is no high-cardinality compression, no target-aware encoding, no
  temporal patching. If the goal is "how do I tokenize 70+ mixed features," TabR answers a
  different question.
- **Train/deploy retrieval mismatch is a correctness hazard, not a nuance.** For the topic's
  mixed temporal+static setting, naive `Icand = Itrain` leaks the future and "related objects"
  (e.g. same-entity rows) that won't exist for new objects in production. The authors flag this
  explicitly (Appendix B); honoring it requires custom, domain-specific candidate filtering.
- **Sample-axis scaling** replaces the feature-axis problem: with all-training candidates, every
  step re-encodes/searches the whole set, and the authors say it "may not scale to truly large
  datasets as-is." Not validated on very wide, high-cardinality tables.

## 6. Evidence quality

Strong and unusually honest. The step-by-step ablation (Table 2, 10 datasets) isolates each
ingredient and shows the leave-one-out collapse, so the mechanism claims are well-supported. The
GBDT-beating result is on a *named, third-party* benchmark (Grinsztajn 2022) rather than a curated
home set, which strengthens it — but the authors temper it: trees "remain a cheaper solution,"
retrieval "is not universally beneficial," and Table 3 contains datasets where it doesn't help.
Limitations are documented in a dedicated appendix. Code is official, MIT, reproducible (lightly
maintained). Main residual uncertainty for *this topic*: zero evidence on 70+-feature
high-cardinality tables — feature counts here top out around 136.

## 7. Concrete next experiments / hypotheses

1. **Bolt the TabR retrieval head onto a per-feature-token encoder** (FT-Transformer / MLP-PLR)
   for a 70+-feature table: test whether the instance-axis label signal adds on top of good feature
   tokens, given the paper's claim the two powers are entangled-but-not-orthogonal.
2. **Causal candidate filtering for temporal+static data:** implement `Icand(x)` = past-only,
   windowed retrieval and measure the accuracy delta vs. the leaky `Icand=Itrain` default to
   quantify the realistic (non-leaking) gain.
3. **Stress the sample axis at scale:** combine context-freeze + candidate subsampling on a
   wide, large-N table and chart the accuracy/latency trade-off vs. a pure parametric MLP-PLR.
4. **High-cardinality probe:** swap the one-hot Input Module for learned/hashed categorical
   embeddings and check whether retrieval quality degrades when many features are high-cardinality.
