# Research state

## Iteration 2 — 2026-05-26 (Black Pearl 三钻 + closures + Fabula deepening)

### New directions explored this iteration
- **black-pearl-and-michelin** — recovered the 2026 三钻 Shanghai list that iter 1 missed: 菁禧荟外滩店 (粤/潮汕, 7-year streak), 甬府北外滩来福士 (宁波菜, 2024 flagship — distinct from yong-fu-hongkou), 遇外滩新天地店 (新闽菜, 2钻→3钻 in one year). All three recorded at medium depth.
- **openings-and-closings** — finally seeded the closure-anchor side: Ultraviolet by Paul Pairet (3-Michelin-star, closed 2025-03-29) and Sage Gastro (closed 2025-12-31). Also added Nora's Wine Shop & Bar (2025-04 opening, Yongfu Lu / Xuhui — fills the mid-tier neighborhood gap iter 1 flagged).
- **dianping-must-eat** — first contact attempt: extracted 2025 必吃榜 aggregate stats (Shanghai 155 restaurants, 60% 烟火小店, 35% 老店, 40% first-time) and ~8 named restaurants. Full list still needs direct 大众点评 ranking URLs.
- **red-xiaohongshu-trending** — also first contact via 武康路/安福路 aggregator articles. Few specific restaurant names extracted; the route remains the lowest-yield from indirect search. Lokal, Dongxin Restaurant (东欣酒家), 13DE MARZO CAFE queued.

### Works added (6 new) + depth upgrades (2)
| slug | depth | route | maturity | iter |
|---|---|---|---|---|
| yu-waitan-xintiandi | medium | black-pearl-and-michelin | hot-new | 2 (new) |
| jing-xi-hui-waitan | medium | black-pearl-and-michelin | established | 2 (new) |
| yong-fu-north-bund | medium | black-pearl-and-michelin | hot-new | 2 (new) |
| noras-wine-shop | medium | openings-and-closings | hot-new | 2 (new) |
| ultraviolet-paul-pairet | medium | openings-and-closings | closed | 2 (new — historical anchor) |
| sage-gastro | shallow | openings-and-closings | closed | 2 (new — historical anchor) |
| fabula | medium | openings-and-closings | hot-new | 1 → upgraded iter 2 |
| lao-zheng-xing | medium | black-pearl-and-michelin | established | 1 → upgraded iter 2 |

Total master_index now: 18 works (12 from iter 1 + 6 new in iter 2).

### Records still shallow & needing deeper reading
- Sage Gastro — only one source (NOMFLUENCE list); address, year, signature dishes still missing.
- All remaining iter-1 shallow entries: Fu 1088, Canton 8 Runan, Yong Fu Hongkou, Xin Rong Ji Nanjing Xi, Ática, Ocean's Table, Lan Xin.
- Priority next iteration: **Rambu** (Jun Nishiyama's successor concept after Sage Gastro), **Alea** (Fabula's casual sibling), one of the 2钻 升钻 (中国菜·头灶 or Ling Long 上海总会店).

### Strongest actionable technical ideas so far
- **The Michelin-vs-crowd-consensus contradiction pattern** — Lao Zheng Xing is now the worked example. The Michelin star rewards lineage and signatures, not day-to-day kitchen consistency; the contradictions field MUST be populated for any 老字号 Michelin entry. This is a transferable check for all future 老字号 records.
- **Multi-chef Michelin format (Fabula)** — Zee Zheng + Charles Tan + Ricky, plus the vertical Fabula/Alea two-tier offering, is templatable. Track whether it sustains beyond 12 months as a model.
- **High-tier reshuffling, not expansion** — Black Pearl Shanghai 三钻 count went up to 3, but Ultraviolet (3-star) and Sage Gastro both closed in 2025. The narrative 'Shanghai fine dining is exploding' is wrong; the correct framing is 'the top tier is reshuffling — new institutional darlings replacing closed flagships.' Surface this in synthesis when it happens.
- **Yong Fu Group lineage now traceable**: founder 翁拥军 (Weng Yongjun) 1971-era, 2011 founding, three Shanghai branches (Jinjiang / Longbai / North Bund Raffles), plus 明路川 + LES NUAGES brands, planned Singapore/London/NYC expansion. Predictive value: any major Yong Fu opening abroad reflects backward on the Shanghai brand's positioning.

### Weakest or misleading directions
- **dianping-must-eat from media coverage** is low-yield. Media articles cite stats and a handful of names; the full 155-restaurant list requires direct 大众点评 API or ranking page access. Next iter try `m.dianping.com/rankinglist/index` URL or 大众点评 neighborhood-specific 'top 3' URLs.
- **red-xiaohongshu-trending via aggregator** also low-yield. The aggregator articles describe street trends (foot traffic, brand mix) rather than enumerating specific viral restaurants. Next iter try direct 公众号 探店 articles or RED-themed 必吃 listicles.

### Graph changes & newly connected concepts
- 6 new `work:` nodes + 6 `belongs_to_route` edges.
- 1 new closure cluster: Ultraviolet, Sage Gastro both anchored to openings-and-closings route.
- 1 new same_group edge: yong-fu-north-bund ↔ yong-fu-hongkou (Yong Fu Group within-brand pair).
- 1 new same_cuisine cluster: yong-fu-north-bund ↔ yong-fu-hongkou (宁波菜 brand pair); jing-xi-hui-waitan ↔ canton-8-runan (潮汕/粤 high-end pair).
- 1 new successor_concept edge: sage-gastro → fabula (loose — both 2025 vintage Michelin one-star context shifts; actual chef lineage is Jun Nishiyama → Rambu, will refine when Rambu is recorded).
- 2 new contrasted_in edges: ultraviolet-paul-pairet ↔ fabula (high-end experiential closure vs new entrant), ultraviolet-paul-pairet ↔ taian-table (signature avant-garde 3-star vs European 2-star).
- 3 new same_district + multiple co_listed (2026 Black Pearl 三钻 trio + 升钻 cohort) + buzz_pair edges integrating the new 2025-2026 cohort.

### Best next directions for the next iteration (iter 3)
1. **Rambu** — Jun Nishiyama's successor concept after Sage Gastro closure. Top of openings queue.
2. **Alea** — Fabula's casual ground-floor sibling. Vertical-format experiment worth its own record.
3. **2钻 升钻 cohort** — 中国菜·头灶 + Ling Long 上海总会店 (the two Shanghai promotions to 2钻 in 2026).
4. **公众号 long-form on Fabula** — still missing, blocks moving Fabula to deep.
5. **Direct 大众点评 ranking URLs** — try `m.dianping.com/rankinglist/...` for 武康路 / 安福路 / 巨富长 neighborhood-specific top-3.
6. **One 老字号 comparison** — pull either 王宝和 or 绿波廊 to test whether the Lao Zheng Xing 'Michelin-vs-consensus' contradiction generalizes.

### Which report conclusions were strengthened, weakened, or redirected
Report has not been written yet (synthesis_every_n_cycles = 7; iter 2 of 7). Iter 2 contributions to the eventual report:
- TL;DR: 'reshuffling, not expansion' framing established.
- Classics aging well / Fading or overrated: Lao Zheng Xing's contradictions provide a worked example of the second category.
- Hot right now: Yu Waitan + Yong Fu Beibund are the two newest institutional darlings; Fabula remains the most-watched solo-chef opening.

### Time budget for this iteration
Inline (no subagent dispatch — would have triggered 7-min sleep watchdog that exceeds the iteration budget). Parallel WebSearch + WebFetch calls used instead. Wall-clock ~5 minutes.

---

## Iteration 1 — 2026-05-26 (breadth seed)

### New directions explored this iteration
All eight routes touched in some form. The four substantively populated:
- **black-pearl-and-michelin** (8 works) — backbone of the iteration. Pulled the 2026 Michelin Shanghai list as the central authority signal.
- **chinese-food-media** (1 deep work + several co-listings) — Old Jesse anchors this route; remainder is queued.
- **editorial-reviews** + **openings-and-closings** (3 works — Ática, Ocean's Table, Fabula) — covers the 2025 opening cohort.
- **chef-and-restaurant-group** — implicit via Fu Group + Taian Table→Fabula chef-lineage edges; no dedicated record yet.

Not yet seeded: `red-xiaohongshu-trending`, `dianping-must-eat`, `personal-verdicts`. RED in particular is hard to fetch directly and should be approached via aggregator articles.

### Works added (12 total, all from iteration 1)
| slug | depth | route | maturity |
|---|---|---|---|
| taian-table | medium | black-pearl-and-michelin | established |
| fu-he-hui | medium | black-pearl-and-michelin | established |
| old-jesse | medium | chinese-food-media | established |
| fu-1088 | shallow | black-pearl-and-michelin | established |
| lao-zheng-xing | shallow | black-pearl-and-michelin | established |
| canton-8-runan | shallow | black-pearl-and-michelin | established |
| fabula | shallow | openings-and-closings | hot-new |
| yong-fu-hongkou | shallow | black-pearl-and-michelin | established |
| xin-rong-ji-nanjing-xi | shallow | black-pearl-and-michelin | established |
| atica | shallow | editorial-reviews | hot-new |
| oceans-table | shallow | openings-and-closings | hot-new |
| lan-xin | shallow | black-pearl-and-michelin | established |

### Records still shallow & needing deeper reading
All shallow entries above. Highest priority for next iteration:
- **Fabula** — Michelin one-star debut, hot-new, no 公众号 review yet. Find one.
- **Ocean's Table & Ática** — both 2025 openings in 徐汇, 6-month corroboration window approaching.
- **Fu 1088 / Yong Fu / Xin Rong Ji** — business-dinner backbone; would benefit from a 公众号 comparative review.

### Strongest actionable technical ideas so far
- Multi-source authority triangulation: Michelin + 老字号 status + sustained 公众号 attention identifies the "stable" tier.
- Chef-lineage edges (Taian Table → Fabula) are a leading indicator for next-iteration hot-new candidates.
- Group portfolios (Fu Group with 4 properties; Yong Fu Group with multiple Shanghai branches; Bottega Group with Ática) are predictive of opening patterns.

### Weakest or misleading directions
- 小红书 / RED has the highest visual-noise-to-signal ratio. Don't seed it via direct RED fetch; use aggregator articles or 大众点评 cross-check.
- Genie Yip's personal-recommendation article was thin on extractable detail; future personal-verdict sources should be evaluated for context-density before extraction.

### Graph changes & newly connected concepts
- 12 new `work:` nodes + 12 `belongs_to_route` edges anchoring each to its primary route.
- Same-cuisine clusters: 本帮菜 cluster (Old Jesse, Lao Zheng Xing, Fu 1088, Lan Xin); Ningbo/Taizhou cluster (Yong Fu, Xin Rong Ji); Spanish cluster (Ática, Ocean's Table).
- Same-district clusters: 静安 backbone (Taian Table, Fu 1088, Fabula, Xin Rong Ji); 黄浦 (Lao Zheng Xing, Canton 8 Runan, Lan Xin); 徐汇 (Old Jesse, Ática, Ocean's Table).
- Same-group: Fu He Hui ↔ Fu 1088.
- Chef-lineage + successor-concept: Taian Table → Fabula.
- Co-listed (Michelin 2026): a dense subnetwork of co_listed edges.
- Buzz-pair: Ática ↔ Ocean's Table (same 2025 opening cycle, same district, same broader cuisine).

### Best next directions for the next iteration
1. **Deepen Fabula** — it's the highest-novelty record and needs a 公众号 long-form review to validate the Michelin debut.
2. **Black Pearl 2026 Shanghai three-diamond list** — failed to fetch in this iteration; try the Meituan official URL `https://awp.meituan.com/meis/meishi-talos-h5/blackpearl-board/main.html` or Chinese-language search queries.
3. **Seed 大众点评 必吃榜 2026** — full route still empty.
4. **Add 3-4 mid-tier neighborhood records** to balance the high-prestige bias of iteration 1: 进贤路 cluster around Lan Xin, 武康路 / 安福路 opening cohort, 巨富长 area.
5. **Closures** — find 1-2 formerly hyped places that closed in 2025-2026 to anchor the maturity_signal "declining" / "closed" bucket; otherwise the recency-bias antidote is weak.

### Which report conclusions were strengthened, weakened, or redirected
N/A — report has not been written yet. Will be addressed at the first synthesis cycle (every 7 iterations per `iteration_mix.synthesis_every_n_cycles`).

### Time budget for this iteration
Inline (no parallel subagent dispatch) — kept records mostly at `shallow` to spread breadth across 12 restaurants and 4 routes. Wall-clock ~4 minutes.
