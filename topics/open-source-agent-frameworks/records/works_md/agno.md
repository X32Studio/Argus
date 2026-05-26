# Agno (formerly Phidata)

- Repo: https://github.com/agno-agi/agno
- Docs: https://docs.agno.com/
- License: Apache-2.0
- Language: Python (~99.6%)
- Stars at capture: ~40.4k (May 2026)
- Last release: v2.6.9 (2026-05-21)
- Iteration captured: 5

## 1 What this work actually does

Agno is a general-purpose Python agent framework. Its core abstraction is an `Agent(model=..., tools=..., instructions=..., memory=..., knowledge=..., storage=...)` object that exposes a stateful run-loop (`agent.run()`, async + streaming variants, plus a print-helper). Above the single agent it adds two orthogonal composites: `Team` (a coordinator agent that dispatches to member agents in coordinate / route / collaborate / hand-off modes) and `Workflow` (deterministic step-based orchestration with conditional branches, loops, parallel steps). In v2 (late-2025 onward) Agno also ships **AgentOS**, a self-hostable runtime that exposes those same agents as a service with REST/SSE/WebSocket APIs, RBAC, cron scheduling, session/memory/knowledge/trace storage in the user's own DB, and OpenTelemetry tracing.

The project was originally released as **Phidata** (a data-tools-adjacent agent library) and was renamed to **Agno** in 2024 when the maintainers pivoted from data-engineering positioning to a general-purpose agent SDK. This is a rename, not a fork — the GitHub repo was renamed in place, so historical commits and stars carried over.

The maintainers publicly use a **"5 levels of agentic systems"** ladder as a pedagogical and API-shape framing — roughly: L1 tools, L2 knowledge (RAG), L3 memory, L4 teams, L5 workflows. This ladder is a curriculum/marketing device, not a research-grounded taxonomy.

## 2 Technical mechanism

**Kernel.** The Agent class is a stateful control loop around a stateless model — the docs describe it verbatim as: *"a stateful control loop around a stateless model. The model reasons and calls tools in a loop, guided by instructions."* This is the same family of kernel as LangChain's `AgentExecutor` and LlamaIndex's `AgentRunner` — i.e. convergent at the kernel level — but differs in three deliberate ways:

1. **Memory as a primitive, not a bolt-on.** Agno ships a three-layer memory model: (a) session storage (chat history per session, in Postgres / SQLite / Mongo / etc.); (b) user memory via a `MemoryManager` that *extracts and stores facts about the user across sessions* — this is the long-term-memory story Agno markets aggressively; (c) agentic session state (dictionaries the agent mutates during a run). Knowledge (RAG over vector stores) is a fourth, separate primitive.

2. **Eval as a primitive.** Four orthogonal eval modes are first-class SDK objects: Accuracy Evals (LLM-as-judge vs gold), Agent-as-Judge Evals (custom criteria), Performance Evals (latency + memory footprint), Reliability Evals (tool-call correctness). Most peers (LangChain, LlamaIndex, CrewAI) ship evaluation as an external/companion package.

3. **A bundled runtime (AgentOS).** Most peers stop at the SDK and let users wire up FastAPI + Postgres + Redis + a tracing backend themselves. Agno bundles all of that.

**Multi-agent.** Teams are LLM-mediated dispatch — closer in spirit to CrewAI / OpenAI Swarm than to AutoGen's conversational GroupChat. Workflows are deterministic graphs — analogous to LangGraph but with a higher-level step DSL rather than a node/edge state-machine API.

**Tool protocol.** Standard function-calling against Python callables, ~100+ pre-built toolkits, first-class **MCP client** (`MCPTools`) and the ability to expose AgentOS itself as an MCP server. Tool-call compression, filtering, and human-in-the-loop confirmations are built in.

**Provider coverage.** ~25+ LLM providers under a unified `agno.models.*` namespace: OpenAI, Anthropic, Google, Meta, Mistral, Cohere, Groq, Together, Fireworks, DeepSeek, xAI, Azure, Bedrock, Ollama, vLLM, HuggingFace, plus a litellm bridge.

**Observability.** OpenTelemetry tracing out of the box; AgentOS adds run history, audit logs, token counts, context-compression metrics, and a tracing UI.

**Benchmarks.** Through 2024–2025 Agno published widely-cited microbenchmarks claiming **~3 μs agent instantiation time** and **~6.5 KiB memory footprint per agent**, vs reportedly orders of magnitude more for LangGraph. Methodology was open-sourced in `cookbook/agent_concepts/other/performance.py`. The claims were credible but contested as **cold-instantiation-only** — not full-run latency, which is dominated by LLM API calls. In v2 docs these headline numbers have been de-emphasized in favor of the Performance Evals primitive.

## 3 Why it matters for the topic's stated goals

For the *open-source agent frameworks* topic, Agno is a **kernel-discriminator stress test**, and the verdict is: **convergent kernel, distinct envelope.** Agno's run-loop is the same family as LangChain/LlamaIndex's AgentExecutor/AgentRunner — a stateful loop that lets the LLM call tools until done. The differentiation lives one layer up:

- **Memory + eval as primitives** rather than ecosystem packages — this is a real architectural difference, not just packaging.
- **Bundled runtime (AgentOS)** — this moves Agno into a different competitive niche from pure SDKs (LangChain core, LlamaIndex core, pydantic-ai, openai-agents-sdk) and closer to managed-platform plays (OpenAI Assistants, LangSmith/LangGraph Platform).
- **The "5 levels" framing** is the maintainers' attempt to claim a taxonomic high ground over peers. Useful as an API ladder; weak as a research framework.

It also matters as an **adoption datapoint**: Agno crossed ~40k stars in 2025, passing CrewAI, with a tighter API surface than LangChain and a more opinionated runtime story than LlamaIndex. The community read is that Agno hit a sweet spot between "framework that doesn't get in your way" (vs LangChain's perceived sprawl) and "batteries-included production runtime" (vs the bring-your-own-everything SDKs).

## 4 What is reusable

- **The three-layer memory model** (session storage / user fact extraction / agentic session state) is a directly-portable design pattern, independent of Agno itself.
- **Eval as a first-class SDK primitive** with four orthogonal modes is a strong pattern to copy — most teams reinvent this badly.
- **The Team coordination modes** (coordinate / route / collaborate / hand-off) are a clean taxonomy of LLM-dispatched multi-agent patterns and map well onto other frameworks.
- **MCP-as-both-client-and-server** posture (Agno consumes MCP servers AND exposes AgentOS as one) is the right symmetry to design for in any agent runtime.
- **The 5-levels ladder** is reusable as a curriculum scaffold for onboarding teams to agentic systems, even if it isn't a research taxonomy.

## 5 What is not safely transferable

- The **3μs / 6.5 KiB benchmark** should not be cited as evidence of runtime performance — it measures cold instantiation, not full-run cost. The dominant cost in any real agent is the LLM API call.
- **AgentOS** is presented as part of the open-source story, but the licensing boundary between the Apache-2.0 SDK and the AgentOS control plane is not maximally transparent in the v2 docs. Verify before assuming the whole stack is OSS.
- **The "5 levels" taxonomy** is a marketing/pedagogical device; do not present it as a peer-reviewed framework.
- **The v2 enterprise pivot** has rewritten much of the README away from concrete code-shape and toward platform-marketing language ("own your stack", "RBAC", "audit trails"). Teams evaluating Agno purely from the landing page will under-estimate the actual kernel quality — go straight to `docs.agno.com/agents/introduction` and the cookbook.

## 6 Evidence quality

**Strong evidence (fetched this iteration):**
- GitHub repo page — stars (~40.4k), license (Apache-2.0), language (Python ~99.6%), last release (v2.6.9, 2026-05-21).
- `docs.agno.com/llms.txt` — confirmed multi-agent (Teams + Workflows), three-layer memory (MemoryManager + session + agentic state), MCP client + server, four eval modes, OpenTelemetry observability.
- `docs.agno.com/agents/introduction` — kernel framing verbatim ("stateful control loop around a stateless model").

**Moderate evidence (prior knowledge, not fetched this iteration):**
- The Phidata → Agno rebrand (well-documented in community threads, the v1 README, and HN/Reddit discussions in 2024).
- The 3μs / 6.5 KiB benchmark and its methodology (open-sourced in the v1 cookbook, widely discussed 2024–2025, de-emphasized in v2 docs).
- The "5 levels of agentic systems" framing (prominent in v1 README and conference talks; less foregrounded in v2 enterprise docs).

**Weak/missing evidence:**
- The v2 README has been rewritten so a single fetch no longer surfaces the level taxonomy or benchmark numbers — a deeper crawl of the v1 README on git history (or the cookbook) would harden citations.
- Exact AgentOS open-core boundary — needs a dedicated investigation.

## 7 Concrete next experiments or hypotheses

1. **Kernel-comparison experiment.** Wire identical 5-tool RAG agents in Agno, LangChain, LlamaIndex, and openai-agents-sdk against the same dataset and measure end-to-end latency, token cost, and reliability — testing the hypothesis that *the kernels are convergent and observed differences are dominated by tool/memory/eval-layer design choices, not by the run loop itself.*
2. **Memory primitive transfer test.** Re-implement Agno's MemoryManager (cross-session user-fact extraction) as a standalone LangChain memory class and an OpenAI Agents SDK guardrail — does it port cleanly, or does Agno's API shape it in load-bearing ways?
3. **AgentOS open-core audit.** Pull the AgentOS source tree, enumerate which modules are Apache-2.0 vs commercial, and document the boundary. This is the highest-leverage open question for production adopters.
4. **5-levels taxonomy stress test.** Take 10 production agent systems (mix of frameworks) and try to map each onto Agno's L1–L5. How often does the level boundary become ambiguous? This tests whether the ladder is a real taxonomy or a curriculum scaffold.
5. **v1-vs-v2 narrative drift.** Diff the README at the rename commit, the 5-levels-launch commit, and the v2 launch commit — track how the project's stated identity has moved and what that says about where the agent-framework market thinks the value is now.
