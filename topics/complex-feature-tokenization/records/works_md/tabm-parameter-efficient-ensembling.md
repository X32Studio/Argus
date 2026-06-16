# TabM: Advancing Tabular Deep Learning with Parameter-Efficient Ensembling

- **Authors:** Yury Gorishniy, Akim Kotelnikov, Artem Babenko (Yandex; HSE University)
- **Year / Venue:** 2025 — ICLR 2025 (arXiv:2410.24210v3; first posted Oct 2024)
- **URL:** https://arxiv.org/abs/2410.24210
- **Work type:** paper
- **Primary route:** feature-interaction-selection (see caveat in §5 — this is a stretch)
- **Code:** https://github.com/yandex-research/tabm (`pip install tabm`, actively maintained, ~1.1k stars, v0.0.3 Aug 2025)
- **Analysis depth:** deep — **Confidence:** high

---

## 1. What this work actually does

TabM is a **deep-ensemble-in-one-network** model for supervised tabular learning. One TabM
"is" an ensemble of `k = 32` MLPs that are trained simultaneously and **share most of their
weights**, producing `k` predictions per object whose mean is the output. It is built on
BatchEnsemble (Wen et al., 2020). The paper's claim: this parameter-efficient ensembling is a
"previously overlooked low-hanging fruit" — even plain `MLP + BatchEnsemble` already beats
FT-Transformer, and the tuned TabM (with piecewise-linear numerical embeddings) ranks **#1 among
all tabular DL models** on a 46-dataset benchmark, while being far cheaper than attention- or
retrieval-based models.

Crucially for THIS topic: **TabM does not propose a tokenizer.** Its input is a flat
concatenation of per-feature representations (quantile-normed scalars for numerical, one-hot for
categorical, optionally PLE embeddings for numerical). The contribution is the *backbone +
ensembling*, not the feature representation.

## 2. Technical mechanism

**BatchEnsemble core.** For a shared linear layer `l(x) = Wx + b`, member *i* computes
`l_i(x_i) = s_i ⊙ (W (r_i ⊙ x_i)) + b_i`, i.e. `W_i = W ⊙ (s_i r_iᵀ)`. `W` is shared; the rank-1
per-member adapters `r_i, s_i, b_i` (called *adapters*) are not. Vectorized over the ensemble:
`lBE(X) = ((X ⊙ R) W) ⊙ S + B`, with `X ∈ R^{k×d}` holding one object-copy per submodel. Adding a
submodel costs only `3d` params/layer — negligible vs `d² + d`. Parallel forward passes mean
wall-clock overhead is well under ×k.

**The ladder (ablation that defines TabM):**
- `MLP×32` (true deep ensemble) — already > FT-Transformer.
- `TabM_packed` (Packed-Ensemble, k fully independent MLPs, no sharing) — better than `MLP×32`
  **because training/early-stopping/HP-tuning are done for the ensemble, not per-member.**
- `TabM_naive` (BatchEnsemble weight sharing) — *better still*: weight sharing acts as
  **regularization**.
- `TabM_bad` (remove the very first multiplicative adapter R) — drops sharply ⇒ **the first
  adapter R is the load-bearing one** (it maps the k identical inputs into k different spaces
  before any weight mixing).
- `TabM_mini` (keep ONLY the first adapter R, drop the other 3N−1) — as good as / slightly better
  than `TabM_naive` with one adapter.
- `TabM` (all 3N adapters, but non-first multiplicative adapters initialized to **1** so they
  start as no-ops and gain expressivity during training) — best plain variant.
- `TabM†` / `TabM†_mini` — add **piecewise-linear numerical embeddings** (PLE, modified from
  Gorishniy et al. 2022); `TabM†_mini` is the overall benchmark winner.

**Why it works (analysis §5):** the k submodels are individually **weak and overfitted** (best
single submodel ≈ plain MLP, `TabM[B] = −0.06%`), but their mean **generalizes strongly**
(`+2.15%`). That gap is direct evidence of submodel **diversity**. Weight sharing also raises
neuron utilization (fewer dead ReLUs). `k` has a sweet spot — larger/wider TabM accommodates more
submodels; too-large k can hurt; too-narrow (d=64) / too-shallow (n=1) underperforms.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing **70+ heterogeneous features** for deep tabular models. TabM is
relevant on the **scaling** axis (`scaling-interaction` concept layer):

- It is **linear in feature count** (flat-concat → MLP), so it sidesteps FT-Transformer's
  O(k²)-in-features self-attention and retrieval models' O(n)-in-dataset-size cost. Demonstrated
  on a 986-feature / 6.5M-row table and a 103-feature / 13M-row table where FT-T is 10–40× slower
  and TabR runs OOM.
- It supplies the strongest single piece of evidence in this corpus that **you do not need a
  token-sequence Transformer to top the leaderboard on wide tables** — a strong per-feature
  numerical embedding (PLE) + a scalable MLP ensemble beats FT-Transformer, SAINT, T2G,
  ExcelFormer, and ties/edges GBDT.

So TabM is best read as the **recommended backbone to put a real heterogeneous-feature tokenizer
on top of**, plus a near-free accuracy wrapper (ensembling) that is tokenizer-agnostic.

## 4. What is reusable

1. **Flat-concat per-feature PLE embeddings into an MLP** — the largest single jump in the ablation
   (`TabM` +2.15% → `TabM†_mini` +2.92%) comes from PLE, not from ensembling. This is the directly
   transferable tokenization lesson: prioritize good *numerical* embeddings; the backbone need not
   be attention.
2. **Parameter-efficient ensembling as a wrapper** — the BatchEnsemble adapter trick (esp. just the
   first multiplicative adapter R = "MiniEnsemble") is cheap (`3d`/layer, ≪×k runtime) and
   **orthogonal** to whatever tokenizer you choose. It can wrap a future 70+-feature tokenizer.
3. **Ensemble-aware training/tuning/early-stopping** — tune and early-stop on the *collective*
   metric, not per-member; this alone (TabM_packed) beats a naive deep ensemble.
4. **Post-hoc submodel pruning** — greedy selection keeps ~8.8/32 submodels at ~full accuracy ⇒
   cheaper inference if latency matters.
5. **Strong, honest baseline + benchmark** — 46 datasets incl. 9 domain-aware (time-aware TabReD)
   splits with a shared protocol; useful reference numbers.

## 5. What is NOT safely transferable (within this topic's scope)

- **It is not a tokenizer.** Filing under `feature-interaction-selection` is a stretch: TabM does
  **no explicit feature interaction** (no cross-layer, no attention) and **no feature selection**.
  Its only tie to that route is linear-cost scaling. Do **not** cite TabM as a feature-interaction
  method.
- **One-hot categoricals are hostile to high cardinality.** The headline protocol uses one-hot for
  categoricals; input width and the first adapter R grow linearly with total category count. For a
  70+-feature set with high-cardinality fields you must replace this with learned embeddings /
  hashing / target encoding *before* the TabM backbone — the paper offers nothing here.
- **No temporal / time-varying fusion.** Rows are static bags of features even on the time-aware
  TabReD splits. Any temporal structure must be engineered upstream.
- **No missing-value mechanism**; assumes preprocessed input.
- **The "k object embeddings" problem** — TabM's representation is k vectors, not one, so reusing
  it as a single feature extractor (e.g. for a multi-task heterogeneous pipeline) is explicitly
  flagged as unsolved.

## 6. Evidence quality

Strong and credible: 46 public datasets (28 reg / 18 clf), shared HP-tuning (Optuna) + multi-seed
averaging, rank + relative-to-MLP + efficiency (training time, CPU/GPU throughput, params)
reported. Mechanistic claims (diversity of weak submodels, first-adapter criticality, dead-neuron
reduction) are backed by targeted ablations. **Caveats:** (a) benchmark median is only 20 features
— the "many features" claim leans on a few wide outliers (986, 103) rather than a sweep at 70+; (b)
the "beats GBDT" framing depends on heavy per-dataset tuning + multi-seed averaging, and CatBoost/
XGBoost sit within ~1–1.5 ranks (XGBoost is actually 2nd, ahead of plain TabM, on the 9
domain-aware shift splits); (c) credit for the flagship score is split between ensembling and PLE.

## 7. Concrete next experiments or hypotheses

1. **Swap one-hot → learned/compositional embeddings for high-cardinality fields** under a TabM
   backbone on a genuinely wide (70–200 feature) high-cardinality table; does the linear-cost
   advantage survive once categorical embeddings dominate the parameter budget?
2. **Stack a real heterogeneous-feature tokenizer (per-feature PLE + learned categorical tokens +
   temporal patches) → flatten → TabM ensemble** and ablate ensembling vs the tokenizer to confirm
   the two gains are additive and orthogonal.
3. **MiniEnsemble (first-adapter-only) wrapped around FT-Transformer / a token-sequence model** —
   does the cheap ensembling boost transfer to attention tokenizers, or is it MLP-specific?
4. **Temporal-static fusion test:** feed time-aware features as patches vs flat lags into TabM on
   TabReD; quantify how much accuracy is left on the table by treating rows as static.
5. **k vs feature-count interaction:** does the optimal k shift as feature count grows into the
   hundreds (more input diversity ⇒ more productive submodels)?

---

### Key claims a skeptic should check
- **(mechanism)** TabM's gain is "weak-individual / strong-collective" submodel diversity, not just
  a bigger model — supported by `TabM[B] = −0.06%` (best single submodel ≈ MLP) vs `TabM = +2.15%`.
- **(mechanism)** The *first multiplicative adapter R* alone (MiniEnsemble) recovers ~all of the
  benefit; removing it (`TabM_bad`) collapses performance.
- **(evidence)** The flagship #1 rank belongs to `TabM†_mini`, i.e. with **PLE numerical
  embeddings**; disentangle PLE's contribution (+0.77% over plain TabM) from ensembling's.
- **(transfer)** Linear-in-feature-count cost lets TabM scale to 986-feature / 6.5M-row tables
  where FT-T is far slower and TabR OOMs — the main reason it's relevant to the 70+-feature goal.
- **(transfer)** TabM is NOT a tokenizer and uses high-cardinality-hostile one-hot categoricals;
  any 70+-heterogeneous-feature use needs a separate tokenizer bolted on top.
