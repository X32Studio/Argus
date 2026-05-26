# Open-source agent framework landscape — synthesis

*First synthesis at cycle 7. Built from 15 deep records (13 frameworks + 2 protocols) across 6 research iterations.*

---

## TL;DR

The open-source LLM agent framework space in mid-2026 is **not converging on a single design**. Across 13 in-scope frameworks, the most discriminating axis is the **execution kernel** — typed graph-state, event-driven Workflow, actor-model chat room, code-act, role-play (SOP-driven or flat), DOM+vision controller, and typed-validation-as-control-flow are all live, all production-deployed, and not interchangeable. Two protocols (MCP for host↔server, A2A for agent↔agent) are converging the **interop** layer faster than the runtime layer, but adoption depth is uneven — only ~3 frameworks ship MCP servers, only 4 frameworks have third-party citable benchmarks, and OpenAI/Swarm sit deliberately outside the A2A consensus. Concrete bottom line: **pick the kernel first** (it determines your debugging shape and multi-agent topology), then verify protocol-depth claims against source, not docs. `[Ref: topics/open-source-agent-frameworks/records/works_json/langchain.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/MCP.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/A2A.json]`

---

## Taxonomy

The cleanest classification uses three orthogonal axes:

**1. Execution kernel** (the actual loop shape):
- *Typed graph-state* — LangChain/LangGraph `StateGraph` with per-key reducers `[Ref: topics/open-source-agent-frameworks/records/works_json/langchain.json]`
- *Event-driven Workflow* — LlamaIndex `Workflow` with tick-buffer + pure reducer (NOT asyncio.Queue/gather) `[Ref: topics/open-source-agent-frameworks/records/works_json/llamaindex.json]`
- *Actor-model chat room* — AutoGen v0.4 Core/AgentChat with explicit lifecycle and async message passing `[Ref: topics/open-source-agent-frameworks/records/works_json/autogen.json]`
- *Code-act* — smolagents `CodeAgent` emits executable Python per step `[Ref: topics/open-source-agent-frameworks/records/works_json/smolagents.json]`
- *Role-play, SOP-prescriptive* — MetaGPT typed pub/sub with Pydantic Role + ActionNode `[Ref: topics/open-source-agent-frameworks/records/works_json/metagpt.json]` and ChatDev Chat-Chain of two-agent atomic chats `[Ref: topics/open-source-agent-frameworks/records/works_json/chatdev.json]`
- *Role-play, flat* — CrewAI Agent/Task/Crew/Process(sequential|hierarchical) `[Ref: topics/open-source-agent-frameworks/records/works_json/crewai.json]`
- *DOM+vision controller* — browser-use's CDP three-source fusion (DOMSnapshot + DOM.getDocument(pierce) + accessibility tree) `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]`; Skyvern's hybrid vision-first Planner-Agent-Validator triad `[Ref: topics/open-source-agent-frameworks/records/works_json/skyvern.json]`
- *Typed-validation as control-flow* — Pydantic AI elevates validation-failure to a first-class loop event with auto-retry `[Ref: topics/open-source-agent-frameworks/records/works_json/pydantic-ai.json]`
- *Loop-around-stateless-model (convergent)* — Agno, agno-class is functionally the same family as LangChain `AgentExecutor` / LlamaIndex `AgentRunner` `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]`

**2. Multi-agent style** (when present):
- Orchestrator (langchain supervisor/swarm/hierarchical/network via `Command(goto=)` handoff tools)
- Tool-call-shaped handoff (OpenAI Agents SDK `transfer_to_<agent>` observed by Runner; llamaindex `FunctionTool(return_direct=True)` writes `ctx.store` `[Ref: topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json]`)
- Function-call w/ isolated child memory (smolagents managed-agents-as-tools)
- Role-play (CrewAI flat; MetaGPT/ChatDev SOP-prescriptive)
- None (browser-use, single-agent; Pydantic AI composes from primitives)

**3. Deployment envelope** (where productization lives — this axis matters once the kernel is convergent):
- Pure SDK (langchain, llamaindex, autogen, smolagents, pydantic-ai, openai-agents-sdk, crewai-OSS)
- Platform-shape (skyvern: FastAPI+Postgres+UI+DAG; agno: AgentOS bundled runtime — REST/SSE/WS, RBAC, cron, OTel)
- SaaS-tier behind OSS-tier (CrewAI Enterprise/AMP, Skyvern Cloud, browser-use Cloud)

**Reframed thesis**: kernel is the dominant discriminator for kernel-distinct frameworks; for convergent-kernel frameworks (agno), the **envelope** (memory + eval + runtime) becomes the discriminator. `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]`

---

## Major framework families

### General-purpose, kernel-distinct triad
**LangChain (+ LangGraph)**, **LlamaIndex (agents)**, **AutoGen** — three different kernels (graph-state / Workflow / actor-model) reading source code is required to feel the difference. All three are mature, all three implement MCP (variably), all three landed major rewrites in 2024-2026 (LangChain → LangGraph; AutoGen v0.2→v0.4; LlamaIndex Workflows extracted to `run-llama/llama-agents`).

### General-purpose, kernel-convergent
**Agno** — convergent loop-around-stateless-model kernel; differentiation in three-layer memory (cross-session user-fact extraction), eval-as-first-class (accuracy/judge/performance/reliability), and AgentOS runtime. Important counterexample to the "kernel is the discriminator" thesis. `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]`

### Code-act
**smolagents** — descendant of CodeAct (arXiv:2402.01030, Wang et al., 20% absolute success-rate improvement vs JSON tool-calls on API-Bank). CodeAgent (Python actions) + ToolCallingAgent (JSON tool-calls) split with maintainers' explicit rubric: ToolCallingAgent for single-timeline browsing, CodeAgent for planning/orchestration. Sandbox security matrix: LocalPython NOT a boundary; E2B/Modal/Blaxel/Docker/Wasm are. `[Ref: topics/open-source-agent-frameworks/records/works_json/smolagents.json]`

### Multi-agent, tool-call-shaped handoff
**OpenAI Agents SDK** — successor to archived Swarm. Runner observes `transfer_to_<agent>` tool-call to swap active agent. MIT, in-scope as a *library*; soft OpenAI lock-in via hosted tools and Traces dashboard. **Tracing default `trace_include_sensitive_data=True`, ZDR-incompatible** — significant compliance footgun. `[Ref: topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json]`

### Multi-agent, role-play subgraph
**CrewAI** (flat role-play, productized through Enterprise/AMP tier; LiteLLM is *optional* dep, native paths for OpenAI/Anthropic/Google/Azure/Bedrock; memory is **unified Memory class**, NOT 3-tier — LanceDB-backed by default). **MetaGPT** (SOP-prescriptive role-play; Pydantic Role + ActionNode + typed pub/sub Environment; ICLR 2024 oral; AFlow paper ICLR 2025 oral = MCTS over code-represented workflow graphs; MGX productized to **Atoms 2026-01-13, $1M ARR in one month**). **ChatDev** (Chat-Chain of two-agent atomic chats with **communicative dehallucination** as the actual technical contribution; v1→v2 pivot to **DevAll** general-purpose platform Jan 2026 — NOT abandoned). `[Ref: topics/open-source-agent-frameworks/records/works_json/crewai.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/metagpt.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/chatdev.json]`

### Typed-contract-primary
**Pydantic AI** — kernel position: validation-failure as first-class control-flow event with auto-retry-on-validation. `pydantic-graph` is opt-in escape hatch, explicitly not the default kernel (contrast LangGraph where the graph IS the runtime). Multi-agent: composed from 5 primitives (delegation / programmatic handoff / graph orchestration / Deep Agents preset / A2A protocol). v1.x stable, ships A2A via external `fasta2a≥0.6.1`. `[Ref: topics/open-source-agent-frameworks/records/works_json/pydantic-ai.json]`

### Browser / computer-use tripod
**browser-use** (library-shape, MIT, single-agent, CDP three-source DOM fusion + indexed element vocabulary). Vision mode keeps last-1 screenshot only; element indices NOT stable across re-renders (CORRECTION caught in iter 3). **Skyvern** (platform-shape, AGPL-3.0, FastAPI+Postgres+UI+block-DAG workflows + run replay; pluggable engine: in-house / OpenAI CUA / Anthropic CU; intra-task Planner-Agent-Validator triad; published benchmark numbers are self-reported BU Bench V1 only). **OpenManus** (MetaGPT-team general computer-use; `ReActAgent → ToolCallAgent → Manus` inheritance + optional unstable planner-executor flow; ~56k stars but slowing maintenance — last release April 2025, team partly on OpenManus-RL with UIUC). `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/skyvern.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/openmanus.json]`

### Interop protocols
**MCP** (Model Context Protocol) — Anthropic-originated, **transferred to Linux Foundation in 2025** (LF Projects, LLC). Spec 2025-06-18; stdio + Streamable HTTP transports. **A2A** (Agent-to-Agent) — Google-donated to Linux Foundation mid-2025 under the **LF Agentic AI Foundation** (different LF home); spec v1.0.0 (2026-03-12); JSON-RPC/gRPC/HTTP-REST bindings; AgentCard at `/.well-known/agent-card.json` with Signed Agent Cards. **ACP (IBM/BeeAI) merged into A2A in 2026** — there is effectively one inter-agent protocol now. MCP and A2A are **orthogonal**, not competitive. `[Ref: topics/open-source-agent-frameworks/records/works_json/MCP.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/A2A.json]`

---

## Comparison matrix

| Framework | Kernel | Multi-agent style | Tool protocol | MCP role/primitives | A2A | License | Maturity |
|-----------|--------|-------------------|---------------|---------------------|-----|---------|----------|
| langchain | graph-state (LangGraph) | orchestrator (supervisor/swarm/hierarchical/network) | mixed (LC native + provider-native + MCP) | client/tools-only | native | MIT | mature (138k★) |
| llamaindex | event-driven Workflow | handoff-by-name via ctx.store | native + MCP + LlamaHub | client + all 3 primitives + OAuth | native | MIT | mature (49.7k★) |
| autogen | actor-model chat room | GroupChat selector + topology composition | autogen_ext.tools.mcp (3 transports) | client/tools-only | native | MIT | mature, v0.4 rewrite |
| smolagents | code-act | function-call w/ isolated child memory | Python + MCP + LangChain + HF Spaces | client/tools-only | not listed | Apache-2.0 | mature, 27.5k★ |
| crewai | flat role-play | sequential or hierarchical Process | crewai-tools + MCPServerAdapter | client/tools-only | native | MIT | mature, AMP tier |
| metagpt | SOP-prescriptive role-play (Pydantic pub/sub) | typed artifact pub/sub | MCP via official adapter | client/tools-only | not listed | MIT | mature (68k★), Atoms spinoff |
| chatdev | role-play Chat-Chain w/ communicative dehallucination | two-agent atomic chats | MCP added v2.0 | client/tools-only | not listed | Apache-2.0 | active, v2.0 DevAll pivot |
| openai-agents-sdk | loop-primary | tool-call handoff (transfer_to) | hosted tools + custom + MCP | client/tools+prompts | **NOT supported** | MIT | growing |
| pydantic-ai | typed-validation control-flow | composed from 5 primitives | Python + MCP + A2A | client | server via external `fasta2a` | MIT | v1.x stable |
| agno | loop-around-stateless-model (convergent) | Teams primitive | native + MCP | client + server, tools-only | not listed | Apache-2.0 | mature (40k★), AgentOS runtime |
| browser-use | CDP DOM+vision controller | none (single-agent) | typed Pydantic browser actions (NOT MCP) | **NONE** | not listed | MIT | mature (95k★) |
| skyvern | hybrid vision-first Planner-Agent-Validator | intra-task triad | pluggable engine + MCP | client + server, tools-only | not listed | AGPL-3.0 | mature (21.7k★), Cloud-shaped |
| openmanus | ReAct→ToolCall→Manus inheritance | none (single-agent) | broad: browser/terminal/fs/python/Crawl4AI/GUI | client + server, tools-only | not listed | MIT | slowing (56k★, last v0.3.0 Apr 2025) |
| MCP (protocol) | host↔server | n/a | self | n/a | shared_pattern | MIT | LF-stewarded, stable 2025-06-18 |
| A2A (protocol) | agent↔agent | n/a | self | shared_pattern | n/a | Apache-2.0 | LF-stewarded, v1.0.0 2026-03-12 |

---

## Key axes of differentiation

After 15 records, six axes actually distinguish frameworks once marketing is stripped:

### 1. Execution kernel pattern
Most discriminating single field. Visible only in source/architecture docs. Determines debugging shape, trace structure, and which multi-agent topologies are natural. The five kernel-distinct families (graph-state, Workflow, actor-model, code-act, validation-as-control-flow) carry through to runtime behavior in ways no surface API can hide.

### 2. Handoff design
Four mechanically different ways to "swap the active agent": (a) tool-call-shaped (openai-agents-sdk explicit `transfer_to_<agent>`; llamaindex `FunctionTool(return_direct=True)` writing `ctx.store` — mechanically the same family); (b) graph-edge-shaped (LangGraph `Command(goto=)` returned from a node); (c) function-call-shaped with isolated child memory (smolagents managed-agents-as-tools); (d) typed-contract-shaped composed from primitives (pydantic-ai, no single canonical handoff). All four converge on "swap" but produce different traces and observability profiles.

### 3. Tool & memory layer
After iter 6 corrections: memory layers are typically **simpler than docs suggest** — crewai is a *unified* Memory class with hierarchical scopes (not 3-tier), agno has a true 3-layer with cross-session user-fact extraction, langchain has `MemorySaver` (production-warning: NOT for production), llamaindex shares state via `Context`. Tool protocols are converging on MCP (see axis 6).

### 4. Multi-agent topology richness
Productized role-play (CrewAI, MetaGPT, ChatDev, OpenAI Agents SDK handoff) vs library-shaped multi-agent (LangGraph supervisor/swarm/hierarchical/network, AutoGen GroupChat selector). browser-use, openmanus, smolagents-core, pydantic-ai are single-agent at the kernel.

### 5. Deployment envelope
SDK-only (most), SDK+managed-Cloud (CrewAI Enterprise, Skyvern Cloud, browser-use Cloud, MetaGPT Atoms), platform-shape (Skyvern OSS, Agno AgentOS). Choosing an envelope is often more decision-shaping than choosing a kernel.

### 6. Protocol adoption depth — and the headline finding
**The "every framework supports MCP" claim is overstated.** Iter-6 per-framework matrix: 1 framework does NOT implement MCP at all (browser-use, contrary to early audit); 7 ship client-only + tools-only; 1 ships client-only with all 3 server primitives (llamaindex); 3 ship MCP server (skyvern, openmanus, agno). For A2A: 5 frameworks have native support; 2 are explicitly opted-out (openai-agents-sdk Issue #472 open, swarm); the rest aren't on adopter lists. The OpenAI-vs-everyone-else protocol split is structurally visible. `[Source: topics/open-source-agent-frameworks/sources/protocol_notes/mcp_adoption_depth.md]`

---

## Trends & inflection points

**Protocol convergence at the interop layer.** Both MCP and A2A reached LF stewardship in 2025 within 9 months of each other. ACP merged into A2A in 2026 — there is effectively *one* inter-agent protocol now. But adoption depth lags governance: most frameworks ship the minimum client+tools subset.

**Typed-state rewrites of older imperative loops.** LangChain → LangGraph (typed graph-state with reducers). AutoGen v0.2 → v0.4 (actor model with explicit lifecycle, async message passing, topology composition). The 2024-2026 maintainer push is toward typed state machines as the kernel. Pydantic AI takes this further — typed validation IS the control-flow primitive.

**Productization push from the academic-bridge cluster.** FoundationAgents (MetaGPT/OpenManus/ChatDev team) shipped two products in Jan 2026: MetaGPT-MGX → Atoms ($1M ARR in 1 month), ChatDev v1 → DevAll. CrewAI's Enterprise/AMP tier is mature. Skyvern is platform+Cloud-shaped from launch. Agno bundles AgentOS as runtime. The OSS-as-loss-leader pattern is widespread.

**Kernel diversity is NOT decreasing.** Despite shared protocol layer, the kernel layer has actually *gained* variants in 2024-2026: code-act (smolagents) and typed-validation-as-control-flow (pydantic-ai) are new positions, not convergent. Agno's loop-around-stateless-model IS convergent with LangChain/LlamaIndex AgentExecutor — but its envelope differentiation makes the framework still distinguishable.

**Browser/computer-use sub-ecosystem stabilized into a tripod.** Library (browser-use), platform (Skyvern), general computer-use (OpenManus). No fourth open-source shape has emerged.

**The benchmarking layer is broken.** AgentBench / SWE-bench / WebArena rank LLMs and end-to-end agent products — not frameworks. Only 4 of 13 framework records have third-party citable benchmark scores under the framework name. **The field competes on developer ergonomics and ecosystem, not measurable task performance.** `[Source: topics/open-source-agent-frameworks/sources/benchmark_notes/cross_framework_2026_05.md]`

---

## Anti-patterns & dead ends

- **Stars-vs-substance**: LangChain 138k stars carries the most production criticism; agno benchmark claims (~3μs instantiation / ~6.5 KiB cold-instantiation) are not representative of real-run cost — v2 docs already de-emphasized these. Always pair stars with commit cadence and named production users. `[Ref: topics/open-source-agent-frameworks/records/works_json/langchain.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]`
- **Self-published benchmarks**: browser-use's BU Bench V1, Skyvern's marketing numbers — not WebArena/Mind2Web. Cross-framework comparability is limited. `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]`
- **Protocol-support-as-claim**: "framework X supports MCP" almost always means client-side + tools-only (minimum viable). Three frameworks ship servers; one (browser-use) ships nothing. Verify against source, not docs. `[Source: topics/open-source-agent-frameworks/sources/protocol_notes/mcp_adoption_depth.md]`
- **Tracing-on-by-default with PII**: OpenAI Agents SDK `trace_include_sensitive_data=True` default + hardcoded `BackendSpanExporter` endpoint = **ZDR-incompatible**. Compliance trap for non-OpenAI shops. `[Ref: topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json]`
- **SaaS-confused-with-OSS**: browser-use Cloud, Skyvern Cloud, MetaGPT Atoms, CrewAI AMP are all separate from their OSS libraries. Cloud features (anti-bot, parallel fleet, RBAC, run replay) are usually NOT in OSS. `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/skyvern.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/crewai.json]`
- **"Multi-tier memory" claims**: CrewAI's iter-2 record claimed multi-tier memory; iter-6 source-read found a single unified Memory class with hierarchical scopes. Memory architectures are often simpler than marketing implies. `[Ref: topics/open-source-agent-frameworks/records/works_json/crewai.json]`
- **MemorySaver-as-production** (LangGraph): in-memory checkpoint store, explicitly NOT for production. Frequent footgun.
- **Element-index stability assumption** (browser-use): iter-1 record claimed indices are stable across re-renders; iter-3 source-read corrected this — indices are fresh per serialization cycle. Highly dynamic sites will surface this. `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]`
- **OpenAI-only-no-portability** for openai-agents-sdk: LiteLLM bridge is officially "beta / best-effort"; hosted tools, ToolSearchTool, structured outputs, reasoning summaries, Responses API, usage metrics all degrade outside OpenAI. Treat the SDK as model-portable on paper, OpenAI-locked in practice. `[Ref: topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json]`
- **MetaGPT SOP outside software-engineering**: typed pub/sub Role+ActionNode rigidity is dead weight outside the SOP's home vertical. `[Ref: topics/open-source-agent-frameworks/records/works_json/metagpt.json]`
- **OpenManus viral-attention-outpacing-bandwidth**: ~56k stars but last release Apr 2025 + 150+ open issues. Team energy partly diverted to OpenManus-RL. Pick with eyes open. `[Ref: topics/open-source-agent-frameworks/records/works_json/openmanus.json]`

---

## Further reading

The 8 records most worth opening directly:

1. **`langchain.json`** — incumbent baseline; understanding StateGraph + the four topologies is required vocabulary for the rest of the landscape. `[Ref: topics/open-source-agent-frameworks/records/works_json/langchain.json]`
2. **`smolagents.json`** — the CodeAct paper-to-framework lineage is the cleanest academic-to-OSS story in the space. `[Ref: topics/open-source-agent-frameworks/records/works_json/smolagents.json]`
3. **`MCP.json`** + adoption-depth matrix — protocol-convergence story, with corrections. `[Ref: topics/open-source-agent-frameworks/records/works_json/MCP.json]` `[Source: topics/open-source-agent-frameworks/sources/protocol_notes/mcp_adoption_depth.md]`
4. **`A2A.json`** — agent-to-agent protocol + the OpenAI-vs-everyone-else governance split. `[Ref: topics/open-source-agent-frameworks/records/works_json/A2A.json]`
5. **`pydantic-ai.json`** — the only genuinely new kernel position in 2025-2026; typed-validation-as-control-flow. `[Ref: topics/open-source-agent-frameworks/records/works_json/pydantic-ai.json]`
6. **`agno.json`** — counterexample to the kernel-discriminator thesis; envelope-shaped differentiation. `[Ref: topics/open-source-agent-frameworks/records/works_json/agno.json]`
7. **`browser-use.json`** + **`skyvern.json`** — library-shape vs platform-shape contrast in the browser-agent tripod. `[Ref: topics/open-source-agent-frameworks/records/works_json/browser-use.json]` `[Ref: topics/open-source-agent-frameworks/records/works_json/skyvern.json]`
8. **`openai-agents-sdk.json`** — the tracing+lock-in anti-pattern + the swarm-fork story. `[Ref: topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json]`

Curated notes worth reading end-to-end:
- `sources/protocol_notes/mcp_adoption_depth.md`
- `sources/benchmark_notes/cross_framework_2026_05.md`

---

## Open questions

1. **Does the kernel-discriminator thesis hold over time, or does agno's envelope-differentiation pattern spread?** Agno is one data point; if 3-4 more convergent-kernel frameworks emerge with envelope-only differentiation, the synthesis needs reframing. Watch: pydantic-ai's evolution, new entrants in late 2026.

2. **Will OpenAI Agents SDK adopt A2A?** Issue #472 has been open for 7+ months. If it closes against, the OpenAI-vs-LF split is durable; if it closes for, the inter-agent layer fully converges. Read browser-use's role here too — they're another major framework absent from A2A's adopter list.

3. **Does the "MCP server-shipping" group (skyvern, openmanus, agno) stay at three?** Or does the LlamaIndex full-primitive client posture become normative? The "every framework ships MCP" claim becomes accurate only when 8+ frameworks have full server-side primitive coverage.

4. **What's the FoundationAgents team's actual capacity?** They run MetaGPT + Atoms + OpenManus + ChatDev/DevAll + AFlow. Maintenance signals (OpenManus slowing) suggest fragmentation. Pick MetaGPT-cluster tooling with awareness.

5. **Is CrewAI's "LiteLLM as optional dependency" reversible?** They have native paths for the 5 biggest providers; the LiteLLM extra widens to ~15 more. If LiteLLM becomes core, CrewAI moves into a different portability tier — closer to pydantic-ai.

6. **AFlow paper PDF table specifics need verification** — the benchmark survey flagged this as a gap. The synthesis editor at the next synthesis cycle (cycle 14) should fetch and read the AFlow PDF body to extract exact metagpt-vs-autogen-vs-chatdev numbers, replacing the current "claim-based" framing.

7. **The benchmark gap won't close on its own.** Mainstream benchmarks rank LLMs / end-to-end products. A framework-layer benchmark would need to fix LLM + task + harness across frameworks — politically hard, technically modest. Someone will probably build it; until then, framework comparison stays ergonomics-driven.
