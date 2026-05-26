# Iteration log — synthesis edits

## 2026-05-26T14:00Z — cycle 7 (first synthesis)

**Files read:**
- `topic.yaml`, `proposal.md` for framing
- `master_index.jsonl` (15 records, all deep)
- `route_index.json` (9 routes; 5 active, 4 untouched)
- `knowledge_graph.json` (17 entity nodes + 9 route nodes, ~88 edges, all 7 edge types present)
- `logs/research_state.md` (full iter 1-6 narrative)
- `logs/search_log.jsonl` (29 search entries)
- Spot-reads of `records/works_json/{langchain,agno,pydantic-ai,MCP,A2A}.json` for synthesis quotes
- `sources/protocol_notes/mcp_adoption_depth.md`
- `sources/benchmark_notes/cross_framework_2026_05.md`

**What changed in the main report:**
- First version of `report/main.md` written from scratch; 9 sections per `topic.yaml.report_sections[]`.
- Reframed the "execution kernel is the discriminator" thesis to "kernel is dominant for kernel-distinct frameworks; envelope is dominant for kernel-convergent frameworks" — driven by the agno counterexample from iter 5.
- Pulled the **MCP adoption-depth nuance** (iter-4 headline as corrected in iter 6) into both TL;DR and a dedicated key-axis paragraph.
- Pulled the **benchmark-grounding gap** (iter-6 survey) into trends and anti-patterns.
- Pulled the **OpenAI-vs-LF protocol split** (iter-6 A2A finding) into trends.

**Newly promoted must-read records:**
- agno (kernel-discriminator counterexample)
- pydantic-ai (new kernel position)
- MCP + A2A (protocol governance story)
- The two curated notes (MCP matrix, benchmark survey) — strategically more useful than any single record for synthesis-section grounding.

**Newly identified weak/risky claims:**
- AFlow paper table specifics — benchmark survey flagged that exact metagpt-vs-autogen-vs-chatdev numbers were inferred from abstract+cross-refs, not parsed from PDF body. Listed as open-question #6.
- OpenManus maintenance velocity — last release April 2025 with 150+ open issues + team partly on OpenManus-RL. The "mature" label may need re-evaluation by cycle 14.
- The "1 framework does NOT implement MCP" claim (browser-use) was iter-4 audit error vs iter-6 source reading. The synthesis trusts iter-6.

**Source files fetched/read at this iteration:** none beyond what's already on disk. Records and curated notes were sufficient for first synthesis; no narrow web search needed.

**Commit/push:** SKIPPED at this iteration. The working tree contains unrelated WIP changes (skill development files: `.claude/loop.md`, `.claude/skills/argus/SKILL.md`, `README.md`) that the user did not authorize for commit. Per general no-autonomous-commit policy + the synthesis spec's "investigate unexpected files rather than blindly stage" directive, the report files are written but not committed. Recommend the user separately commit topic state when ready.
