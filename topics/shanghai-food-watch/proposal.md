# 上海餐厅观察 — Shanghai food & restaurant watch

## Why this topic, why now

Shanghai's restaurant scene moves faster than any single source can keep up with. 黑珍珠 and Michelin publish annual lists; 小红书 is reshuffled weekly by visual virality; 大众点评 lags but converges; chef-driven and group-driven openings cluster around 武康路 / 安福路 / 巨富长 / 新天地 in waves. The point of this watch is to maintain — over weeks, refining itself each cycle — a continuously sharpened personal shortlist of "where to eat now in Shanghai," resilient to any single source's bias.

End goal: a personal eating list for general curiosity, not a guidebook, not commercial. That shapes the bias: optimize for *signal* per source — what a thoughtful local would actually recommend — over breadth, coverage, or institutional authority.

## Concept layers — why these five

Restaurants compete across overlapping but distinguishable layers:

1. **Cuisine & culinary lineage** — the most discriminating "is this what I want tonight" signal. 本帮菜 vs 江浙菜 vs 粤菜 vs 日料 vs 西餐 — different occasions, different appetites. Within each lineage, faithfulness to tradition vs. creative interpretation is the secondary axis.
2. **Occasion & experience design** — the single most under-captured layer in 大众点评 / 小红书. "Good food" doesn't tell you whether it's for a date, a business dinner, or solo lunch. The room, noise, service style, and dress code all matter; record them.
3. **Buzz signals & curatorial authority** — multiple sources, each with predictable bias: 黑珍珠/Michelin (institutional, fine-dining-skewed), 小红书 (visual, queue-driving, low food-quality precision), 大众点评 (crowd consensus, middle-market), editorial reviews (expat-skewed), 公众号 (substantive but harder to query). The synthesis is mostly about reconciling these biases.
4. **Value & accessibility** — price-per-person, reservation difficulty, walk-in feasibility, queue length. The "should I bother on a Tuesday" layer.
5. **Maturity & staying power** — buzz fades fast in Shanghai. A restaurant goes hot-new → established → plateaued (or declining) on a roughly 18-month cycle. This layer encodes where in the cycle each place sits.

## Scope choices — what's deliberately excluded

- **Restaurants outside Shanghai** are out. Hangzhou / Suzhou day-trip destinations may appear as side notes but not as full records.
- **Delivery-only / ghost kitchens** are out unless they have notable cult following (where the food itself is the destination).
- **Hotel buffets** are out unless distinctive enough to draw non-guests — most aren't.
- **Pure dessert and coffee shops** are borderline — keep when the place is a clear food destination, drop when it's a beverage shop with snacks. (Flagged as `UNCERTAIN:` in topic.yaml.)
- **Historical / closed restaurants** are out except as *context* for successor concepts (e.g., when a famous chef from a closed place opens a new one).

## Where contradictions will come from

Three predictable sources of disagreement across signals:

1. **小红书 viral vs. food-quality reality.** A photogenic interior and short queue-friendly menu can take a mediocre kitchen viral. The cross-check is 大众点评 over 6+ months (does the rating stick?) and 公众号 long-form reviews (do food critics bother to write about it?).
2. **黑珍珠 / Michelin authority vs. occasion fit.** Institutional lists skew toward grand-banquet 中餐 and tasting-menu Western — both poor matches for "casual Wednesday dinner." A high Black Pearl rating does not imply this is the right place for *this* night.
3. **Hot-new recency vs. staying power.** A restaurant in its first 6 months has uncalibrated reviews. The synthesis editor should explicitly distinguish "hot-new (recommend cautiously)" from "established (recommend with confidence)" and refresh both labels each cycle.

## Reading order — for a fresh reader of the report

1. Start with the **TL;DR** — Shanghai food landscape in one paragraph.
2. Skim **Hot right now** — what just opened, what's freshly buzzy.
3. Use **By occasion** as the primary navigation — "I need a date spot in 静安" gets you straight to the shortlist.
4. **By cuisine** and **By district** are secondary filters when occasion isn't the main lens.
5. **Classics aging well** vs **Fading or overrated** is the antidote to recency bias — read these before committing to anything trending.
6. **Chef & group lineage** is the predictive section — where the next interesting opening will be.

## Anti-patterns to flag aggressively

- **小红书 viral with no 大众点评 history.** Recall, don't recommend — capture once with `maturity_signal: hot-new`, revisit after 3 months.
- **Black Pearl listed but service complaints in 公众号 reviews.** Note the contradiction in `contradictions` — do not silently inherit the authority signal.
- **Restaurants pivoting to crowd-pleaser menus** after viral fame. Track in the `declining` bucket.
- **English-only editorial reviews** for places that don't actually serve a Western-friendly menu. Down-rank as recommendation signal; treat as occasion-fit-only data.
- **"Best in Shanghai" 公众号 round-ups** with sponsored placements. Cross-check against independent personal verdicts before promoting.

## What "done" looks like for this watch

This is a continuous local food map, not a one-shot guide. The brief is "done enough" when:

- Every restaurant in the user's monthly rotation has a fresh record (verified within 3 months).
- New openings on 武康路 / 安福路 / 巨富长 / 新天地 / 陆家嘴 are integrated within one synthesis cycle of their first major buzz event.
- The "Hot right now" section has < 20 entries and the rest of the report is stable cycle-to-cycle.
- For at least 3 occasion types (date, friends, business), the recommendation top-3 has been verified by either personal visit or trusted friend report.

Then the watch shifts into maintenance mode — adding new openings, retiring closed/declining places, and noting buzz shifts.
