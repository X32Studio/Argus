# Tabular Transformers for Modeling Multivariate Time Series (TabBERT / TabGPT / TabFormer)

- **Authors:** Inkit Padhi, Yair Schiff, Igor Melnyk, Mattia Rigotti, Youssef Mroueh, Pierre Dognin, Jerret Ross, Ravi Nair, Erik Altman (IBM Research / MIT-IBM Watson AI Lab)
- **Venue / Year:** ICASSP 2021 (arXiv:2011.01843v2, Feb 2021)
- **URL:** https://arxiv.org/abs/2011.01843
- **Code:** https://github.com/IBM/TabFormer (also ships the open-sourced 24M-row synthetic credit-card dataset)
- **Primary route:** `temporal-feature-tokenization`
- **Also touches:** `feature-typing`, `token-granularity`, `temporal-static-fusion`, `discretization-vq`, `learning-signal`
- **Analysis depth:** deep · **Confidence:** high

## 1. What this work actually does

It is (per the authors) the first transformer treatment of *tabular time series* — sequences of structured rows where each row mixes continuous and categorical fields (e.g. a user's stream of credit-card transactions, or an air-quality station's hourly readings). It proposes two models under the TabFormer umbrella:

- **TabBERT** — a hierarchical BERT-style encoder for *representation learning*, pretrained with masked field modeling and then used as a frozen feature extractor for downstream classification (fraud detection) and regression (pollutant concentration).
- **TabGPT** — a GPT-style causal decoder for *generating* realistic synthetic transaction sequences (a privacy-preserving surrogate for sensitive financial data).

The enabling trick for both is a "language metaphor": quantize every continuous field into a finite per-field vocabulary so the whole heterogeneous table becomes a stream of discrete field-tokens, exactly like words.

## 2. Technical mechanism

**Tokenization.** Every column is given its OWN local finite vocabulary. Categorical fields keep native categories; continuous fields are **quantized (binned)** into a field-specific vocabulary so they too become categorical token ids. Each field has its own embedding table — no global shared vocabulary, so the same surface value in different fields never collides. One token = one field's (quantized) value in one row.

**Two-level hierarchy (TabBERT).**
1. *Field transformer* (row level): the N field-tokens of a single row are embedded and attended over, capturing **intra-row, cross-field** dependencies, and rolled up into one row embedding `RE_t`.
2. *Sequence transformer* (window level): a sliding window of T contiguous rows yields T row embeddings `RE_1..RE_T`, which are themselves treated as tokens and fed to a second Transformer (the actual "BERT"), capturing **inter-row temporal** dependencies and producing sequence embeddings `SE_1..SE_T`.

The stack trains end-to-end. On the credit-card data, windows are T=10 rows, stride 5; on PRSA, 10 rows, stride 5.

**Pretraining objective.** Field-level **MLM**: 15% of field-tokens are replaced with `[MASK]` and predicted via cross-entropy. The label column (`isFraud?`) is excluded from pretraining to avoid leakage. TabGPT instead uses autoregressive next-token generation and — importantly — *drops the hierarchy*, feeding quantized rows separated by `[SEP]` straight to a GPT encoder.

**Downstream use.** TabBERT is frozen; pooled row/sequence embeddings feed a small MLP or LSTM head. TabGPT generation is evaluated by per-field chi-square histogram distance plus a FID computed in TabBERT's own embedding space.

## 3. Why it matters for the topic's stated goals

The topic targets tokenizing 70+ heterogeneous features that are partly time-varying and partly static. TabFormer is the canonical early demonstration that you can (a) unify numerical + categorical fields under ONE token interface by quantizing continuous fields, and (b) handle the time dimension by stacking a temporal transformer on top of a per-row feature encoder. That "compress the wide row first, then run a temporal model over the row sequence" pattern is precisely the temporal-static-fusion skeleton the topic needs, and it keeps the temporal model's sequence length equal to the number of rows rather than rows×fields.

## 4. What is reusable

- **Per-field quantization to a local vocabulary** as a uniform numerical+categorical token interface — enables NLP-style masked pretraining over mixed tabular fields. (Borrow the *uniform interface*; upgrade the *encoder* — see §5.)
- **The two-stage hierarchy:** field transformer → row embedding → sequence transformer. Decouples the feature-count axis from the time axis; directly applicable to many-feature + time-varying settings.
- **Field-level MLM** as a self-supervised pretext for tabular tokens (label column held out to avoid leakage).
- **Frozen-feature transfer recipe:** pretrain once unsupervised, reuse embeddings across a classification and a regression head.
- **The open-sourced 24M-transaction synthetic dataset** — now a standard fraud/tabular-time-series benchmark.

## 5. What is NOT safely transferable (within this topic's scope)

- **Plain quantization as the numerical encoder.** Binning into an *unordered* categorical vocabulary throws away magnitude/ordinal structure. Later work (On Embeddings for Numerical Features, AutoDis) shows piecewise-linear/periodic embeddings beat naive bins. For 70+ features with informative magnitudes, keep the per-field-vocabulary idea but replace bins with order-aware embeddings.
- **High-cardinality handling.** Per-field vocabularies over fields like merchant name/address imply huge embedding tables; the paper gives no hashing/truncation/sub-word scheme. Do not assume it scales to high-cardinality fields out of the box.
- **The scaling claim.** Validated only on 12 and 11 fields with 10-row windows. The many-feature scaling story is architectural, not empirical — do not cite it as evidence for 70+ features.
- **Static-covariate fusion.** No dedicated static pathway; static attributes would have to be repeated each row. The topic's static-vs-time-varying split is unaddressed.

## 6. Evidence quality

Moderate but narrow.

- **Table 1 (frozen TabBERT vs raw features, same head).** Fraud F1: MLP 0.74→0.76, LSTM 0.83→0.86. PRSA RMSE: MLP 38.5→34.2, LSTM 43.3→32.8 (large drop). Consistent improvement on both tasks.
- **Table 2 (TabGPT).** GPT-Gen user-1 FID 22.90 to real user-1 (vs 492.92 cross-user real-real); user-2 FID 49.08 — generated data matches the correct user and preserves cross-user separation.

**Caveats:** baselines are only *raw embedded features*, not GBDT or modern deep tabular models — so "rich representations" is relative to raw features, not to methods one would actually deploy. The fraud dataset is synthetic from a rule-based generator authored by the same group. Only 12 PRSA sites. The TabGPT realism metric is computed inside TabBERT's own space (mild circularity). No end-to-end fine-tuned numbers.

## 7. Concrete next experiments or hypotheses

1. **Swap the numerical encoder:** keep TabFormer's per-field token + hierarchy but replace quantization bins with PLR/periodic numerical embeddings; measure whether the modest fraud F1 gains widen.
2. **Stress-test feature count:** run the field-transformer → row-embedding → sequence-transformer stack on a 70+-field dataset (e.g. TabRed-style in-the-wild data) to see whether row compression actually controls cost and accuracy at scale.
3. **Add a static pathway:** route static covariates through a separate embedding fused once into the row embedding rather than repeated per row; compare against the repeat-every-row default.
4. **High-cardinality ablation:** replace large per-field vocabularies with hashing / compositional (quotient-remainder) embeddings and measure the table-size vs accuracy trade-off.
5. **Fair baseline bar:** benchmark frozen TabBERT features against GBDT and FT-Transformer on the same windows to test whether the representation actually beats deployable baselines, not just raw features.

## Key claims a skeptic should check

1. *(mechanism)* Quantizing every continuous field into its own local vocabulary turns a mixed tabular table into a uniform token stream amenable to BERT/GPT-style modeling — but this discards numerical order.
2. *(mechanism)* The field-transformer → row-embedding → sequence-transformer hierarchy keeps the temporal model's sequence length = number of rows (T), not rows×fields, decoupling feature count from time.
3. *(evidence)* Frozen TabBERT features beat raw-feature embeddings on fraud F1 and PRSA RMSE — but only vs raw features, on a synthetic fraud set, at 11–12 fields.
4. *(transfer)* The per-field-quantization + row-compression pattern is the reusable temporal-static-fusion skeleton for 70+ mixed features — though scaling beyond ~12 fields is untested here.
5. *(evidence)* TabGPT generates user-faithful synthetic transactions (low same-user FID, high cross-user FID) — but realism is judged in TabBERT's own embedding space.
