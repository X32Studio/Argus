# Training Independent Subnetworks for Robust Prediction (MIMO)

- **Authors:** Marton Havasi, Rodolphe Jenatton, Stanislav Fort, Jeremiah Zhe Liu, Jasper Snoek, Balaji Lakshminarayanan, Andrew M. Dai, Dustin Tran (Cambridge; Google Research; Harvard)
- **Venue / Year:** ICLR 2021 (arXiv:2010.06610)
- **URL:** https://arxiv.org/abs/2010.06610
- **Primary route:** feature-interaction-selection (as an efficient-ensembling wrapper, not a tokenizer)
- **Analysis depth:** deep · **Confidence:** high
- **PDF:** `sources/papers/mimo-independent-subnetworks-robust-prediction.pdf`

## 1. What this work actually does

MIMO (Multi-Input Multi-Output) shows a "surprising result": the robustness/uncertainty
benefits of a deep ensemble can be obtained in a **single forward pass**, for a **~0.03%
parameter / ~0.01% FLOP** increase over the base network. It does this by training several
**independent subnetworks that co-habit one network** without explicit separation, then
ensembling their predictions at test time. It is an architectural/training recipe, **not** a
feature-representation or tokenization method.

## 2. Technical mechanism

Two minimal changes to any base network:

1. **Input layer:** concatenate `M` independently-sampled datapoints `{x_1,...,x_M}` before
   the first hidden layer.
2. **Output layer:** replace the single head with `M` heads; head `m` is trained to predict
   `y_m` for its matching input `x_m` only. Loss = sum of the `M` per-head NLLs.

Because features derived from the *other* inputs are useless for predicting a given head's
matching input, the heads **learn to ignore them**, and `M` independent subnetworks
self-organize inside the shared backbone. The paper verifies this with a per-activation
**conditional-variance analysis**: of ~8190 pre-activations in a ResNet28-10, almost every
one has non-zero variance w.r.t. exactly one input (the subnetwork it belongs to) and ~zero
w.r.t. the others — an explicit extension of the Lottery Ticket Hypothesis (multiple winning
tickets realized in one instance). Measured member disagreement matches that of independently
trained networks, far above Naive-multihead / TreeNet / BatchEnsemble.

At **test time** the query `x'` is tiled `M` times (`x_1=...=x_M=x'`), the `M` heads emit `M`
independent predictions, and their average is the ensemble output — one forward pass.

Two extra knobs (matter only when backbone capacity is tight):
- **Input repetition `rho`:** set `x_2 = x_1` with probability `rho` (else sample
  independently). `rho=0` -> fully independent (capacity-limited); larger `rho` lets
  subnetworks share features (helps low-capacity nets like ResNet50/ImageNet, used `rho=0.6`);
  `rho->1` collapses diversity. Does not change marginals, only the joint.
- **Batch repetition:** repeat each example in the minibatch (e.g. 4x CIFAR, 2x ImageNet) to
  cut gradient noise; implicit regularizer, raises training cost.

Optimal `M` is small: ensemble performance peaks at **M=2-4**; subnetwork individual accuracy
declines as `M` grows (they consume more shared capacity). Accuracy peaks at smaller `M` than
log-likelihood.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing **70+ heterogeneous tabular features** for deep tabular models.
MIMO is **not** a tokenizer and does **not** address feature count/scaling. Its relevance is
**lineage and composability**: MIMO is the direct conceptual ancestor of **TabM** (already in
this corpus), which ports the multi-input/multi-output, single-backbone ensembling idea onto
tabular MLPs. So MIMO explains *why* TabM works and supplies the `rho` insight that TabM had to
re-tune for capacity-limited tabular MLPs. As a wrapper, MIMO can harden any tokenizer +
downstream-model pipeline cheaply.

## 4. What is reusable

- The **MIMO head construction** itself: concatenate `M` inputs in, `M` heads out, average at
  test. Wrap it around a tokenized feature sequence + transformer/MLP to get
  ensemble-grade calibration and OOD robustness at single-pass cost.
- The **`rho` input-repetition knob** as the lever for capacity-limited backbones — the single
  most transferable tuning insight for tabular nets, which rarely have the spare capacity of a
  Wide-ResNet.
- The **conditional-variance diagnostic** for checking whether subnetworks are actually
  independent (a cheap reusable audit on any MIMO-wrapped tabular model).

## 5. What is NOT safely transferable (within this topic's scope)

- Nothing about feature **tokenization, numerical/categorical encoding, high-cardinality
  handling, or temporal-static fusion** — MIMO is silent on all of these.
- The "for free" magnitude (M=3 at 0.03% params, big robustness gain) is an **image-CNN /
  over-parameterized-Wide-ResNet** result. On a tightly-fit tabular MLP at `rho=0` the gain can
  be small — this is precisely why TabM adapts rather than copies MIMO. Treat the
  free-robustness claim as **contingent on backbone excess capacity**, not guaranteed.
- "For free" = prediction compute only; **training cost rises** with batch repetition.

## 6. Evidence quality

Strong, well-controlled empirical study via Google Uncertainty Baselines (well-tuned reference
baselines). Three model/dataset combos (ResNet28-10/CIFAR10, /CIFAR100, ResNet50/ImageNet),
IID + corrupted + 5 extra OOD sets, three metrics (Acc, NLL, ECE) plus a mechanistic
conditional-variance analysis and a loss-landscape diversity study. **Caveat for THIS topic:
zero tabular evidence** — all transfer claims to the 70+-feature setting are inferred via TabM,
not demonstrated here.

## 7. Concrete next experiments / hypotheses

- Wrap an FT-Transformer or a TabM-style MLP tokenizer over 70+ mixed features in a MIMO head;
  sweep `M in {2,3,4}` and `rho in {0, 0.3, 0.6}`; measure NLL/ECE on an in-the-wild tabular
  benchmark (TabReD) vs a deep ensemble — does single-pass MIMO recover most of the ensemble
  gain on heterogeneous tabular inputs?
- Run the conditional-variance diagnostic on the tabular tokenizer's per-feature embeddings:
  do subnetworks separate cleanly when inputs are tokenized features rather than image tensors?
- Test the capacity hypothesis on tabular: does MIMO need a *wider* tabular MLP/transformer to
  benefit at `rho=0`, and how does that interact with feature count (70+ features ~ larger
  input -> more or less excess capacity)?

## Key claims a skeptic should check

1. **(mechanism)** Independent subnetworks self-organize inside one shared backbone purely from
   the multi-input/multi-output training, verified by per-activation conditional variance
   (~each activation belongs to one input). Skeptic check: does this separation survive on
   non-image, tokenized tabular inputs?
2. **(evidence)** Single-forward-pass MIMO (M=3) beats all single-pass baselines and approaches
   Deep Ensemble (M=4) at ~1/4 prediction time on CIFAR/ImageNet IID+OOD.
3. **(transfer)** MIMO is the conceptual seed of TabM's tabular ensembling; the head construction
   composes with any feature tokenizer as a near-free robustness wrapper — but this is inferred
   from TabM, not shown on tabular data in this paper.
4. **(mechanism/pitfall)** The benefit is contingent on backbone excess capacity; under tight
   capacity you must raise `rho`, trading diversity for individual-member quality.
5. **(evidence)** "For free" is prediction-time only; batch repetition raises training cost to
   roughly match BatchEnsemble.
