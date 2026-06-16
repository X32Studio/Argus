# TabReD: Analyzing Pitfalls and Filling the Gaps in Tabular Deep Learning Benchmarks

- **Authors:** Ivan Rubachev, Nikolay Kartashev, Yury Gorishniy, Artem Babenko (Yandex; HSE University)
- **Year:** 2024 (arXiv:2406.19380; later ICLR 2025)
- **URL:** https://arxiv.org/abs/2406.19380
- **Code:** https://github.com/yandex-research/tabred
- **Work type:** benchmark
- **Primary route:** tabular-transformers (spans: numerical-embeddings, temporal-feature-tokenization, feature-interaction-selection)
- **Analysis depth:** deep · **Confidence:** high

---

## 1. What this work actually does

TabReD is a **diagnostic benchmark**, not a model. It makes two arguments about the tabular-ML evaluation landscape and then backs them with a new dataset collection and a large re-evaluation.

The two pitfalls it identifies in existing benchmarks (from a survey of 100 classification/regression datasets):
1. **No drift-aware evaluation.** Real deployments face gradual temporal shift, which calls for time-based train/test splits, but popular tabular datasets lack timestamps (only 15 of the surveyed had them) and 11 of 100 had outright data leakage. So the field benchmarks almost entirely on random splits.
2. **Too few features.** Most academic datasets have <60 features; production datasets, born from heavy feature-engineering pipelines, are far wider with many predictive, noisy, and correlated features.

To fill both gaps it introduces **TabReD: 8 industry-grade datasets** (4 from Kaggle competitions, 4 new from a large tech company's production ML), all with timestamps and time-based splits, and all feature-rich:

| Dataset | Samples | **# Features** | Task |
|---|---|---|---|
| Maps Routing | 192K (8.8M) | **1026** | Navigation ETA from live road-graph features |
| HomeCredit Default | 381K (1.5M) | **696** | Loan default |
| Sberbank Housing | 20K | 387 | Real-estate price |
| Homesite Insurance | 224K | 296 | Insurance acceptance |
| Delivery ETA | 224K (6.9M) | 225 | Grocery courier ETA |
| Cooking Time | 228K (10.6M) | 195 | Restaurant order cooking time |
| Ecom Offers | 106K | 119 | Offer redemption |
| Weather | 605K (6.0M) | 98 | Temperature |

Median 261 features vs <60 in academic benchmarks. It then re-runs ~18 methods (GBDTs, MLP/ResNet/SNN, FT-Transformer, DCNv2, Trompt, MLP-PLR, TabR, ModernNCA, ensembles, augmentation recipes) under its time-based protocol with Optuna tuning and 15 seeds.

## 2. Technical mechanism

There is no tokenization mechanism of its own. The mechanisms that matter are the **evaluation protocol** and the **regimes it compares**:

- **Time-based splitting:** datasets are ordered by timestamp and split train/val/test by time (Section 5.4 uses a sliding window to make three time-splits + three matched random splits). Models are selected on the validation set; results aggregated over 15 seeds with std-dev-aware ranking + Tamhane's T2 significance test.
- **Preprocessing (following Gorishniy et al. 2021/2024):** numerical features get **quantile normalization** (NaN → variable mean → 0 after normalization); categorical features use learned encodings with unseen val/test categories mapped to a special "unknown" category. No bespoke encoder is contributed.
- **The tokenization regimes compared:** per-feature attention tokens (FT-Transformer), per-numerical-feature **PLR embeddings** (MLP-PLR; periodic + linear + ReLU embeddings of Gorishniy et al. 2022), cross-feature interaction (DCNv2), column/prompt tokens (Trompt), retrieval-augmented context (TabR, ModernNCA, with their own numerical embeddings deliberately removed to isolate retrieval), vs. tokenless GBDTs.

## 3. Why it matters for the topic's stated goals

This topic targets tokenizing **70+ heterogeneous, partly time-varying** features. TabReD is the only **public** benchmark that actually exhibits both axes at once: feature counts squarely in (and far above) the 70+ range, plus genuine temporal drift. Everything else this topic reads (FT-Transformer, TabR, MLP-PLR, foundation models) was validated mostly on <60-feature, random-split academic data. TabReD is the closest thing to a fair test of "does this tokenizer survive my actual setting?" Its answer is sharply differentiating:

- **Per-numerical-feature embeddings (MLP-PLR) survive** and are top-tier (ensemble = rank 1, single = rank 3.8), confirming numerical embeddings transfer to wide + drifting tables.
- **Per-feature attention (FT-Transformer) is only runner-up** and explicitly flagged as slow because self-attention is **quadratic in the number of features** — a cost that bites precisely on TabReD's wide tables.
- **Retrieval (TabR/ModernNCA) and augmentation training recipes do NOT transfer** (TabR goes from +1.34% over MLP on a prior benchmark to **-2.78%** on TabReD).

## 4. What is reusable

1. **A proven default tokenization upgrade:** per-numerical-feature PLR embeddings + post-hoc ensembling. Of all learned-tokenization ideas, this is the one with direct evidence at median-261 features under temporal drift.
2. **An evaluation discipline (load-bearing):** validate any new tokenizer on **time-based / out-of-time splits**, not random splits. Section 5.4 shows the model ranking, variances, and relative gaps all change; random splits can be optimistic and can let GBDTs exploit time-leakage.
3. **A ready testbed:** the 8 datasets + preprocessing code, usable as-is to stress a tokenizer on wide, drifting, industrial data.
4. **A negative result to design against:** retrieval-based context-building and long augmentation training are not safe bets in this regime.

## 5. What is NOT safely transferable (within scope)

- **It is not a tokenizer** — never cite as a technique. It bounds and contextualizes claims about other tokenizers.
- **It under-tests categorical / high-cardinality tokenization.** Its features are mostly engineered numerical; it does not isolate categorical performance. "MLP-PLR wins" is a verdict on numerical embeddings, **not** on categorical encoders.
- **Time is the SPLIT axis, not a per-row sequence.** TabReD validates drift-aware *evaluation*; it says nothing about tokenizing time-varying signals (patches/channels/recurrence). The temporal-static-*fusion* part of this topic is untouched.
- **The "why retrieval fails" story is a hypothesis,** not a proven mechanism (the authors write "we hypothesize", "might"). Do not propagate it as established.

## 6. Evidence quality

High for the headline rankings: 18 methods, 8 datasets, Optuna tuning, 15 seeds, std-dev-aware ranking + Tamhane's T2 test, and a controlled random-vs-time-split experiment (Fig. 2). Weaker for causal explanations (multicollinearity/noisy-features and temporal-shift-violating-retrieval are conjectures). Single research group, single preprocessing convention, only 8 datasets, industry-numerical-heavy bias — so the *ranking* is solid within that regime but its generality to categorical-heavy or true time-series settings is unproven.

## 7. Concrete next experiments / hypotheses

- **H1 (test):** On TabReD's widest datasets (Maps Routing 1026, HomeCredit 696), does adding PLR embeddings on top of FT-Transformer recover the attention model's standing, or does the quadratic-in-features cost still dominate? Tests whether per-feature attention is salvageable at width.
- **H2 (test):** Re-introduce numerical embeddings into TabR/ModernNCA (the paper stripped them to isolate retrieval). Does retrieval + embeddings transfer, isolating whether retrieval per se or the missing embeddings caused the -2.78%?
- **H3 (challenge):** Build an explicit feature-selection / decorrelation front-end (the paper blames multicollinearity + noisy features). Does selecting the top-k features before tokenization close the gap for the failing methods at 261+ features?
- **H4 (protocol):** Adopt TabReD's time-based splits as the *standard* validation harness for any new tokenizer in this topic, and always report the random-split vs time-split delta as a leakage/optimism check.

---

### Key claims a skeptic should check
- **(mechanism)** FT-Transformer's per-feature self-attention is quadratic in feature count, so its tokenizer pays a real cost on TabReD's wide tables (median 261, up to 1026) and it only ranks runner-up.
- **(transfer)** Per-numerical-feature PLR embeddings are the one learned-tokenization idea shown to keep its benefit on wide + temporally-drifting industrial data (MLP-PLR ensemble = rank 1).
- **(evidence)** Switching random → time-based splits changes the model ranking and shrinks XGBoost's margin over MLPs, implying random-split results can be optimistic / leakage-inflated.
- **(evidence)** Retrieval-augmented DL collapses from +1.34% (prior benchmark) to -2.78% vs MLP on TabReD; the cause (temporal shift / noisy features) is the authors' hypothesis, not proven.
- **(transfer)** TabReD says little about categorical/high-cardinality tokenization — its "best method" verdict is about numerical embeddings only.
