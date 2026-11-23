# Outis Two-Layer JEV Decision Routing

- **Route:** `thin-protocol-gates`
- **Depth:** `deep`
- **URL:** https://x32studio.com

Separates zero-output-token Layer-1 relevance screening (`noul`, dropping `< 0.35` while preserving ambiguous items `0.35–0.70`) from Layer-2 calibrated choice aggregation (`PASS_FLOOR = 0.70`, direct conflicts force `unknown` / `contested` instead of smoothing contradictions).
