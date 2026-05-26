# ChatDev

Repo: https://github.com/OpenBMB/ChatDev | Paper: arXiv:2307.07924 (ACL 2024) | Follow-up: NeurIPS 2025 "Multi-Agent Collaboration via Evolving Orchestration" | Stars (2026-05-26): ~33.2k | License: Apache-2.0 | Maintainer: OpenBMB / Tsinghua NLP Lab (THUNLP)

## 1 What this work actually does

ChatDev is a role-play multi-agent framework that simulates a virtual software company. A one-line user prompt ("build me a 2048 game") is decomposed into phases of a waterfall SOP — design, coding, testing, documentation — and each phase is executed as a two-agent dialogue between an "instructor" persona (e.g. CEO, CTO, reviewer) and an "assistant" persona (e.g. programmer, art designer). The outputs of one phase feed the next via a structure the paper calls the **Chat Chain**.

In **January 2026**, the project shipped ChatDev 2.0 ("DevAll"), which generalizes the hardcoded software-company waterfall into a YAML-/visual-canvas-configurable orchestration platform that targets data viz, 3D generation (via Blender), short-video generation (via Manim), and research drafting — i.e. it pivoted from "auto-coder demo" to "zero-code multi-agent IDE."

## 2 Technical mechanism

- **Chat Chain.** A static, directed sequence of phases. Each phase = one (instructor, assistant) prompt template + termination condition. v1.x's software chain hardcodes ~4 phases x ~3 sub-tasks (e.g. design -> language choice, GUI design, file structure). The chain is not learned; it is a hand-authored SOP.
- **Communicative Dehallucination.** The core technical claim. Before the assistant agent acts on an instruction, it proactively asks targeted clarification questions back to the instructor — a multi-turn negotiation that grounds the spec before any code is emitted. The paper argues this reduces compounding hallucination across the chain compared to single-shot instruction-following.
- **Experiential Co-Learning (ECL) + Iterative Experience Refinement (IER).** A persistent experience pool of (task, shortcut, outcome) tuples accumulated across runs; future runs retrieve relevant shortcuts as in-context exemplars. Closer to case-based reasoning than vector RAG.
- **v2.0 / DevAll.** Visual DAG editor for workflows, web console, Python SDK, MCP integration for external tools, OpenClaw orchestration runtime. The chain becomes user-editable; the role list is no longer fixed.
- **Provider abstraction.** Generic `API_KEY` + `BASE_URL` — works against any OpenAI-compatible endpoint (OpenAI, vLLM, Ollama, Claude via gateway).

## 3 Why it matters for the topic's stated goals

ChatDev closes the role-play sub-graph alongside MetaGPT and CrewAI and is the **academic-bridge** of that trio — it is the only one with a peer-reviewed (ACL 2024 + NeurIPS 2025) account of *why* role-play helps. Two ideas from the paper are independently re-usable even if you do not adopt ChatDev's runtime: (a) **communicative dehallucination** is a generic pattern for any agent-to-agent handoff, not specific to software, and (b) **Chat Chain as static SOP** is the cleanest articulation of the "process-as-orchestration" school — MetaGPT's SOP-with-typed-artifacts is one instantiation, ChatDev's phase-dialogues another. Comparing the two clarifies the design axis "freeform chat vs typed artifacts" that every multi-agent framework must pick a side on.

## 4 What is reusable

- **Communicative dehallucination as a primitive.** Easy to graft onto any framework: before tool-call or code-emit, force the agent to emit a clarifying-question turn unless N consecutive clarifications have already happened. Cheap, model-agnostic.
- **Phase-template pattern.** A phase = (instructor_prompt, assistant_prompt, termination_condition). Useful as a building block in any orchestration framework that needs more structure than AutoGen group-chat but less than a typed-artifact pipeline.
- **Experience pool / ECL.** The (task, shortcut, outcome) memory schema is generalizable to any repetitive agent workflow — e.g. tracking which retrieval queries worked for a given research sub-task in an Argus-style loop.
- **YAML workflow templates (v2.0).** The DevAll template format is reasonable prior art for declarative agent-workflow DSLs.

## 5 What is not safely transferable

- **The hardcoded software-company waterfall.** ChatDev v1.x's specific phase list is over-fit to "small demo program from one-line prompt"; it does not generalize to iterative/exploratory or research-style workflows. Anyone copying the *phases* (rather than the *pattern*) will inherit the brittleness.
- **Output-quality claims.** The viral 2023-2024 demos were small CLI/GUI tools; independent benchmarks on realistic software tasks (SWE-bench-style) show ChatDev underperforms purpose-built coding agents (SWE-agent, OpenHands). Do not transfer the implicit claim "role-play SOP => production-quality software."
- **Custom UI/observability.** ChatDev's WebUI/log-replay is bespoke and not based on OpenTelemetry or any standard tracing — not reusable infra; if you need observability, layer your own.
- **DevAll v2.0 marketing.** The "zero-code multi-agent platform" framing is unbenchmarked as of capture; treat the generalization claim as unproven until third-party evals appear.

## 6 Evidence quality

Strong on academic side: ACL 2024 acceptance plus NeurIPS 2025 follow-up on "evolving orchestration" — the team is publishing, not vanishing. Strong on engineering signals: 33.2k stars, Apache-2.0, v2.2.0 shipped 2026-03, deliberate v1->v2 pivot rather than abandonment. **Weak** on independent benchmarks: most quantitative claims (e.g. dehallucination reduces error by X%) come from the original paper's self-evaluation; few third-party reproductions on hard tasks. Not abandoned, not rebranded — it kept the name and the lab through the pivot. Maturity verdict: **ACTIVE, academically credible, but commercial/production-grade claims still ahead of independent evidence.**

## 7 Concrete next experiments or hypotheses

1. **Dehallucination ablation.** Take a CrewAI or AutoGen agent team on a real task (e.g. multi-step web research) and add a forced-clarification turn before every tool call. Measure: does this reproduce the paper's claim outside the software-dev domain? Hypothesis: yes for high-spec-ambiguity tasks, no marginal benefit for well-specified tool calls.
2. **Chat Chain vs SOP-with-artifacts head-to-head.** Run ChatDev (free-form chat phases) and MetaGPT (typed-artifact handoffs) on identical specs; measure handoff-failure modes. Hypothesis: typed artifacts dominate on complex specs; free-form chat dominates on under-specified creative tasks.
3. **ECL transfer test.** Pre-warm ECL experience pool on task type A, run on task type B. Hypothesis: shortcuts overfit to task type; cross-task transfer is poor — which would mean ECL is closer to fine-tuning-in-context than true generalization.
4. **DevAll independent benchmark.** Pick one DevAll YAML template (e.g. data-viz workflow) and benchmark end-to-end against a single-agent o1/Claude run with code execution. Hypothesis: the multi-agent overhead is not worth it for tasks a single strong model can already do — a key falsifier of the v2.0 thesis.
5. **MCP adoption depth.** Audit ChatDev v2.0's MCP integration: is it a first-class tool protocol or a surface-level adapter? Compare with OpenAI Agents SDK MCP support. Useful signal on whether MCP is becoming the universal tool layer across role-play frameworks.
