# XTab: Cross-table Pretraining for Tabular Transformers

- **Authors:** Bingzhao Zhu (EPFL / Cornell, AWS intern), Xingjian Shi (Boson AI), Nick Erickson (AWS), Mu Li (Boson AI), George Karypis (AWS), Mahsa Shoaran (EPFL)
- **Venue / Year:** ICML 2023 (PMLR 202); arXiv:2305.06090v1, 10 May 2023
- **URL:** https://arxiv.org/abs/2305.06090
- **Code:** https://github.com/BingzhaoZhu/XTab (code + sample pretrained checkpoints; built on AutoGluon)
- **Primary route:** tabular-foundation-models
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

XTab is a framework for *cross-table* self-supervised pretraining of tabular transformers. The motivating problem: tabular transformers (FT-Transformer, SAINT, TransTab) are strong, but unlike NLP/CV models they cannot transfer across datasets because tables differ in the number and meaning of columns. Prior tabular SSL (SCARF, SubTab, VIME, SAINT, TransTab) pretrains and finetunes on the *same* dataset (or a few related ones), so the learned weights don't generalize to new tables.

XTab's answer: split a tabular transformer into (a) **data-specific** components — the per-column featurizer (tokenizer) and the projection heads — and (b) a **cross-table-shared** transformer backbone. Pretrain a large pool of *unrelated* tables jointly via federated averaging, sharing only the backbone. For any new downstream table, throw away nothing of the prior except the backbone weights: initialize a fresh featurizer + head, load the pretrained backbone, and finetune end-to-end.

Tested on 84 AMLB (OpenML AutoML Benchmark) tasks, XTab consistently beats the identical-architecture FT-Transformer trained from scratch, and (as XTab-best) becomes the best deep model and 2nd overall — still behind CatBoost.

## 2. Technical mechanism

**Tokenizer (data-specific, NOT transferred).** Each row -> token sequence `E ∈ R^{c×d}` (c = columns, d = 192), mirroring FT-Transformer:
- numerical: `token_k = x_k · W_k + b_k`, per-column trainable vector `W_k ∈ R^d` (plain affine; no PLR/periodic/quantile embedding).
- categorical: integer index into a per-dataset embedding matrix `∈ R^{N_cat × d}`.
- a learned `[CLS]` token appended for pooling.
- preprocessing: numerical z-scored (train-only stats), regression targets standardized; missing numerics imputed with column mean, missing categoricals -> extra category.

**Backbone (shared, transferred).** A transformer that ingests variable-length token sequences — which is *why* a transformer can be shared but an MLP cannot. Three interchangeable variants: FT-Transformer (default, ~<1M params, 3 blocks/8 heads), Fastformer (additive attention, linear in sequence length — the many-column efficiency option), Saint-v (a variable-column SAINT with column- and row-wise attention).

**Pretraining objectives** (each through a data-specific head): reconstruction (corrupt 60% of entries by resampling each column's marginal, then CE on categorical + MSE on numerical — SCARF-style); contrastive (InfoNCE/SimCLR positives = (x, x̃)); supervised "pre-finetuning" (predict each table's own label). **Reconstruction wins** (71.0% win rate light finetune).

**Federated pretraining (FedAvg).** Pretraining cost grows *linearly* with the number of tables, so XTab distributes it: one client per table holds its own featurizer + head + a copy of the shared backbone; the server averages only the shared-backbone deltas every `N` local steps (`N=5` default; larger `N` = cheaper communication, worse downstream). This is unitary-scalarization multi-task learning, *not* privacy-motivated. ~30k T4 GPU-hours total.

**Finetuning.** Fresh featurizer + head per table; backbone warm-started. Light (3 epochs) / heavy (early-stop patience 3) / best (patience 20 + model soup of top-3 checkpoints).

## 3. Why it matters for the topic's stated goals

The topic asks how to tokenize 70+ heterogeneous features and whether tokenization can *transfer* across tables. XTab is the clean 2023 statement of the answer that the field reached: **the feature-interaction engine transfers across tables; the tokenizer does not.** XTab explicitly declines to learn a universal tokenizer ("the meaning and context of each table varies") and instead learns a generalizable *weight initialization* for the shared backbone. For the topic's learning-signal layer (supervision/pretraining/transfer) this is a concrete data point; for the token-granularity layer it is mostly a negative result.

## 4. What is reusable

- **The decoupling pattern:** keep a bespoke per-table tokenizer (any column count/type/vocabulary admissible) but pretrain and reuse only the column-agnostic transformer blocks as a portable feature-interaction prior. You can warm-start the attention stack from a large corpus of unrelated tables **without aligning schemas or sharing a vocabulary** — directly applicable to warm-starting a 70+-feature interaction model.
- **Federated/distributed pretraining** as the mechanism to scale across many tables when joint pretraining cost is linear in table count.
- **Reconstruction > contrastive > supervised** as the SSL objective ranking for tabular SSL, and **share blocks, not `[CLS]`** as the "which component carries general knowledge" finding.
- **Fastformer** flagged as the linear-attention backbone for the many-column regime.

## 5. What is NOT safely transferable (within this topic's scope)

- **The tokenizer itself is not transferred** — anyone hoping XTab yields a reusable heterogeneous-feature tokenizer (the topic's core question) should look to CARTE (LM-on-column-names, open vocabulary) or TabPFN-v2 instead. XTab's featurizer is randomly re-initialized per table.
- **Numerical handling is the weak plain-affine FT-Transformer tokenizer** — no PLR/periodic embeddings — so it inherits exactly the numerical weaknesses the topic's numerical-embeddings route tries to fix.
- **No high-cardinality, no string-semantic, no temporal handling.** Text is coerced to categorical id; high-cardinality vocabularies inflate the per-table lookup matrix and are re-learned from scratch (no sub-word/LM fallback for unseen categories).
- **Not zero/few-shot:** featurizers + heads need enough finetuning data; the subsampled-data ablation shows the pretraining advantage does *not* grow as finetuning data shrinks.

## 6. Evidence quality

Strong empirical breadth: 84 AMLB tasks (regression + binary + multiclass), 2-fold cross-pretrain, 5 trials/dataset, both default and HPO. Ablations cover objective, backbone, number of pretraining tasks (1→18→52, monotone improvement), shareable component, and FedAvg `N`. Honest negatives: still loses to CatBoost; catastrophic forgetting under heavy finetuning; 20/104 datasets dropped for 16 GB GPU memory limits. The headline gains are real but **modest and budget-dependent** — largest under tight finetuning (light, fewer epochs), shrinking under heavy finetuning, and never beating GBDTs. Caveat: the backbone is <1M params, much smaller than "foundation model" connotes; the transferred prior is shallow. Confidence high — full methods + ablations + transfer assessment extracted from the PDF.

## 7. Concrete next experiments / hypotheses

- **Swap in a better tokenizer, keep the transfer:** replace XTab's plain-affine numerical featurizer with PLR/periodic embeddings (Gorishniy 2022) while still pretraining only the shared backbone — does the transferable interaction prior compose with a stronger tokenizer, or does the featurizer/backbone mismatch break warm-start?
- **70+-column stress test:** XTab never isolates the wide-table regime and hits a 16 GB memory wall. Re-run with the Fastformer backbone at 70-200 columns to see whether the linear-attention variant preserves the cross-table benefit at scale.
- **Hybrid with an open-vocabulary tokenizer:** combine CARTE-style LM-on-column-name tokens (which *do* transfer) with XTab-style federated backbone pretraining — does sharing both tokenizer and backbone beat sharing only the backbone?
- **Forgetting mitigation:** the heavy-finetuning erosion is attributed to catastrophic forgetting in a <1M-param backbone; test LoRA/adapter or EWC finetuning to retain more of the pretrained prior.
