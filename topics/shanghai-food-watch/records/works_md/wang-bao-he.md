# 王宝和酒家 (Wang Bao He, Huangpu)

## What this work actually does
Wang Bao He is Shanghai's most famous 蟹宴 (crab banquet) 老字号 — founded 1744 (Qianlong era), based at 福州路603号 Huangpu. Michelin Plate (厨艺精湛, not starred), 大众点评 必吃榜 2018 + 2020 (dropped in 2025), Ctrip Dianping 4.6, Tripadvisor 3.8. The second worked example of the 老字号 authority-vs-experience contradiction pattern (after Lao Zheng Xing).

## Technical mechanism
- **Specialty platform**: a single-cuisine specialty restaurant (crab) with seasonal pricing — most relevant Oct-Nov hairy-crab season.
- **Brand portfolio**: 王宝和酒家 (the food-focused restaurant at 福州路) + 王宝和大酒店 (a 4.5-star hotel at 九江路555号) — same brand, two venue types. The restaurant is the food destination, the hotel is hospitality.
- **Cuisine focus**: 清蒸大闸蟹, 蟹粉炒年糕, 蟹粉狮子头, 蟹粉小笼包 — all crab variations. Plus own-brand 黄酒.

## Why it matters for the topic's stated goals
- **Generalization test**: confirms the Lao Zheng Xing Michelin-vs-consensus contradiction pattern with a second worked example. Both are 老字号, both hold Michelin recognition, both show divergence between institutional authority and granular customer experience.
- **Crowd-consensus drift signal**: dropping off 必吃榜 between 2020 and 2025 (while keeping Michelin Plate) is a generalizable indicator that the institutional and crowd-consensus signals can decouple over time.

## What is reusable
- **Multi-source authority comparison rubric**: for any 老字号 Michelin entry, populate {Michelin status, Black Pearl status, 必吃榜 history (multi-year), Dianping rating, Tripadvisor rating, 公众号 reviews}. The cross-platform deltas are the early warning of a place plateauing.
- **必吃榜 multi-year tracking**: appearing then disappearing on 必吃榜 across years is a stronger signal than a single-year snapshot. Worth retroactively building this for other 老字号 entries.

## What is not safely transferable
- Seasonal specialty restaurants are bimodal — recommend in season, don't in off-season. The recommendation logic differs from year-round Michelin venues.
- Tripadvisor signal is biased toward English-speaking tourists; the 3.8 may reflect language/service-style mismatch rather than food quality.

## Evidence quality
Ctrip 携程美食 page + Tripadvisor venue page + Baidu Baike + 必吃榜 multi-year cross-reference + Michelin Guide listing. Address, signature dishes, pricing all triangulated. Head chef name not surfaced — gap for next iteration if needed.

## Concrete next experiments or hypotheses
- **The Lao Zheng Xing + Wang Bao He pattern now generalizes**: surface in iter-7 synthesis as the 老字号 Michelin contradiction rule. Next 老字号 to test: 绿波廊 (city-god temple, similar heritage profile).
- Quantify the **必吃榜 dropout rate** — what fraction of 2018-2020 必吃榜 entries are NOT on 2025? If this is structural (not noise), 必吃榜 itself is the signal to weight.
- Test whether the Tripadvisor-vs-Dianping rating gap correlates with the 必吃榜 dropout — a unified "crowd-consensus has shifted" composite signal.
