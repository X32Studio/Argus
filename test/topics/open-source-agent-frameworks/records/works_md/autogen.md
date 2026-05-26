# AutoGen (Microsoft AutoGen)

- Repo: https://github.com/microsoft/autogen
- Docs: https://microsoft.github.io/autogen/stable/
- Maintainer: Microsoft (community-managed going forward; AutoGen ↔ Semantic Kernel runtime convergence announced for early 2025)
- License: MIT (code) / CC-BY-4.0 (docs)
- Primary language: Python (61.7%), C# (25.1%), TypeScript (12.4%)
- Stars at capture: ~58.4k
- Last release observed: python-v0.7.5 (2025-09-30)

## 1. What this work actually does

AutoGen is a framework for building applications in which multiple LLM-powered agents collaborate by exchanging messages. The user defines agents (each with a role/system prompt, tools, and optionally a model client), groups them into a *team*, and runs the team against a task; the framework drives the turn-taking loop, mediates tool calls, and broadcasts messages until a termination condition fires. It is the canonical multi-agent framework against which CrewAI, LangGraph, and OpenAI Swarm are usually benchmarked.

The v0.4 codebase is explicitly layered into four packages, per Microsoft Research's own architecture description:

- **autogen-core** — the kernel. Event-driven Actor-model runtime: addressable agents, asynchronous message passing, lifecycle management, built-in metric tracking and message tracing. In-process (`SingleThreadedAgentRuntime`) and distributed (gRPC host-servicer + workers, cross-language Python ↔ .NET) modes.
- **autogen-agentchat** — the high-level task-driven API. Ships team primitives (`RoundRobinGroupChat`, `SelectorGroupChat`, `Swarm`, `MagenticOneGroupChat`, `GraphFlow`) on top of Core. Microsoft Research describes its API surface as "similar to v0.2 for easier migration".
- **autogen-ext** — first- and third-party integrations against Core's interfaces: OpenAI/Anthropic/Ollama model clients, MCP (`autogen_ext.tools.mcp`), Docker code execution, distributed runtime adapters.
- **Developer Tools** — AutoGen Studio (low-code prototyping UI), AutoGen Bench (benchmarking), and Magentic-One (the shipped generalist multi-agent app).

## 2. Technical mechanism

### Execution kernel — the v0.2 → v0.4 actor rewrite

v0.2 was a synchronous conversation library: a user instantiated `ConversableAgent` objects and called `initiate_chat()`; turn-taking, message delivery, and lifecycle all ran inside that synchronous call stack. The Microsoft Research v0.4 launch blog states that this design left users "struggl[ing] with architectural constraints, an inefficient API compounded by rapid growth, and limited debugging and intervention functionality" and lists three concrete needs the rewrite targeted: **stronger observability and control**, **more flexible multi-agent collaboration patterns**, and **reusable components**.

v0.4's Core fixes this mechanically by separating three concerns v0.2 conflated:

1. **Agent identity & lifecycle** — Agents are no longer Python objects the application owns. They are registered with the runtime via a factory: `await MyAgent.register(runtime, "my_agent", lambda: MyAgent())`. The runtime creates instances lazily when a message arrives for that type. Quoting the Core agent-runtime doc: *"Agents are not directly instantiated and managed by application code. Instead, they are created by the runtime when needed and managed by the runtime."*
2. **Message passing** — Asynchronous events on the runtime, supporting both event-driven (fire-and-forget pub/sub) and request/response patterns. The `SingleThreadedAgentRuntime` exposes `start()`, `stop()`, `stop_when_idle()`, `close()` — explicit lifecycle for the *runtime*, not the agents.
3. **Topology** — Team primitives in AgentChat are now configurable strategies layered on top of the substrate, instead of hard-coded inside `initiate_chat`.

The Microsoft Research blog frames this as "an asynchronous, event-driven architecture" enabling proactive long-running agents, observable metric/trace pipelines, and distributed agent networks across organizational boundaries. Cross-language Python+.NET interop runs through the same gRPC distributed runtime.

### Multi-agent coordination — team primitives

All four team primitives sit on the same shared-broadcast substrate (every agent sees every message by default):

- **`RoundRobinGroupChat`** — deterministic cycle through participants.
- **`SelectorGroupChat`** — after every message, an LLM speaker-picker is invoked. The default selector prompt is a template with three variables: `{participants}` (candidate names), `{roles}` (name + description pairs), `{history}` (formatted conversation). The model outputs a single agent name. Three knobs control behavior:
  - `selector_func(messages) -> str | None` — user code can override the LLM. Return a name to force the next speaker; return `None` to fall back to the LLM. Used for deterministic rules like "Planner always speaks after specialists".
  - `candidate_func(messages) -> list[str]` — narrows the pool before the LLM decides; the LLM still picks, but only from the filtered list.
  - `allow_repeated_speaker` — default `False`; the same agent can't speak back-to-back unless they're the only candidate.
  
  Docs explicitly note that small models (Phi-4) need simple selector prompts while reasoning models (o3-mini, GPT-4o) tolerate more detail. Termination uses composable `TerminationCondition`s like `TextMentionTermination("TERMINATE") | MaxMessageTermination(20)`.
- **`Swarm`** — handoff via explicit `HandoffMessage`, layered on the group-chat substrate (OpenAI-Swarm-style semantics inside an AutoGen team).
- **`MagenticOneGroupChat`** — generalist orchestrator with a task ledger + progress ledger that replans on stalls and dispatches to WebSurfer / FileSurfer / Coder / ComputerTerminal specialists.

A typed-graph alternative (`GraphFlow`) was added for users who want LangGraph-style explicit state machines instead of emergent conversation.

### Tool layer — MCP integration is first-party

MCP support ships in `autogen-ext` under `autogen_ext.tools.mcp` (install with `pip install -U 'autogen-ext[mcp]'`). The module exports a complete MCP client stack:

- **Transport params**: `StdioServerParams` (command-line MCP servers), `SseServerParams` (SSE), `StreamableHttpServerParams` (HTTP streaming).
- **Tool adapters**: `StdioMcpToolAdapter`, `SseMcpToolAdapter`, `StreamableHttpMcpToolAdapter`.
- **Factory**: `mcp_server_tools(server_params)` returns a list of tool adapters usable as AutoGen tools — pass them directly to an agent's `tools=` parameter.
- **Session helper**: `create_mcp_server_session()` for low-level control.
- **Workbench**: `McpWorkbench` — a context-managed wrapper that holds an MCP session open for the duration of a team's run.

This makes AutoGen one of the most thoroughly MCP-integrated frameworks: all three official MCP transports are supported, both as raw tool adapters and via a workbench abstraction, and the integration is shipped first-party rather than as a community extension. The framework can also act as an MCP *server* (exposing AutoGen agents as MCP tools), though that path is less prominent in the docs.

In addition to MCP, AutoGen accepts native Python callables (auto-wrapped) and OpenAI JSON-schema tools. `AgentTool` lets an entire agent be invoked as a tool by another agent — composable sub-agents.

### Memory & model providers

No first-party long-term memory store. Per-agent message history plus a pluggable `Memory` interface in AgentChat; vector-store backings (ChromaDB and others) live in `autogen-ext`. OpenAI and Azure OpenAI are first-class; Anthropic, Ollama, and OpenAI-compatible endpoints are wrapped in `autogen-ext`.

### Observability

A documented v0.4 design goal. Core ships built-in metric tracking and message tracing; a dedicated *Tracing and Observability* tutorial covers OpenTelemetry export. No hosted trace UI ships first-party; production traces go to OTel-compatible backends, and AutoGen Studio surfaces traces interactively during development. Still narrower than LangSmith for full ops workflows but materially closer than v0.2 was.

## 3. Why it matters for the topic's stated goals

The topic asks how open-source agent frameworks differ across execution kernel, multi-agent coordination, tool/memory layer, observability, and portability. AutoGen is now the strongest data point on four of those axes:

- **Execution kernel** — the v0.2 → v0.4 actor-runtime rewrite is the canonical case study in the field's shift away from synchronous conversation libraries toward event-driven addressable-agent runtimes. The Microsoft Research blog's own statement of what was wrong (architectural constraints + inefficient API + limited debugging/intervention) is the cleanest external articulation of why the whole field moved this way.
- **Multi-agent coordination** — widest variety of team topologies under one roof (RoundRobin, Selector with `selector_func`/`candidate_func`/`allow_repeated_speaker`, Swarm, Magentic-One, GraphFlow).
- **Portability** — only major framework with a documented distributed, *cross-language* runtime (Python + .NET via gRPC host-servicer + workers).
- **Tool protocol** — MCP is first-party with all three transports (stdio / SSE / streamable HTTP) and a workbench abstraction.

It remains comparatively weaker on opinionated "production paths" — which sharpens what CrewAI and LangGraph differentiate on.

## 4. What is reusable

- The Core runtime's separation of (a) agent identity / lifecycle, (b) message passing, (c) topology is a clean architectural template — and a directly transferable rebuttal to synchronous "agent-as-object" designs.
- Lazy agent instantiation via `register(runtime, name, factory)` is a reusable pattern for any framework that wants runtime-owned agent lifecycle.
- Team primitives (`RoundRobinGroupChat`, `SelectorGroupChat`, `Swarm`) are clean abstractions and can be adopted as design vocabulary even when implementing from scratch.
- The SelectorGroupChat prompt template (`{participants}` / `{roles}` / `{history}`) + override knobs (`selector_func`, `candidate_func`, `allow_repeated_speaker`) is a directly portable design recipe for any LLM-driven orchestrator.
- The Magentic-One orchestrator pattern — task ledger + progress ledger + replan-on-stall — is a transferable design recipe for generalist agent teams.
- MCP-as-tool-protocol integration via `autogen_ext.tools.mcp` (Stdio/SSE/StreamableHttp adapters + `mcp_server_tools()` factory + `McpWorkbench` context manager) is the most complete MCP client reference in the open-source agent ecosystem.
- `AgentTool` (agent-as-tool) is a useful composability primitive worth borrowing.

## 5. What is not safely transferable (within this topic's scope)

- The shared-broadcast group-chat substrate is **expensive at scale**: token cost grows roughly with agents × turns × shared context. Frameworks targeting cheaper/typed coordination (LangGraph state graphs, CrewAI role pipelines) deliberately avoid this.
- Distributed cross-language runtime is impressive but probably overkill for most agent applications; copying it without a use case adds operational complexity without payoff.
- v0.2 conversational programming idioms (e.g. `ConversableAgent.initiate_chat`) are deprecated and should *not* be ported to new frameworks — they reflect a synchronous mental model the v0.4 rewrite explicitly abandoned because it had "architectural constraints" and "limited debugging and intervention functionality".
- The LLM-driven `SelectorGroupChat` speaker-picker is non-trivial to make robust — naive copying causes loops/stalls without a careful `selector_func` override and tight termination conditions.
- The four-package split (Core / AgentChat / Ext / Studio) is appropriate at AutoGen's surface area but is over-engineering for smaller frameworks.

## 6. Evidence quality

- Primary sources for the v0.4 architecture rationale: Microsoft Research blog "AutoGen v0.4: Reimagining the foundation of agentic AI for scale, extensibility, and robustness" (direct quotes used) and the DevBlogs announcement on AutoGen ↔ Semantic Kernel convergence.
- SelectorGroupChat mechanics (prompt template variables, `selector_func` / `candidate_func` / `allow_repeated_speaker`) sourced directly from the AgentChat user-guide page.
- MCP integration details (`autogen_ext.tools.mcp`, three transports, `mcp_server_tools`, `McpWorkbench`) sourced from the autogen-ext reference page.
- Agent runtime lifecycle quote ("Agents are not directly instantiated and managed by application code") sourced directly from the Core agent-and-agent-runtime page.
- Star count, license, last commit date taken from the GitHub repo page on the day of capture.
- Magentic-One internals (task ledger / progress ledger) come from the Magentic-One paper and tutorial, not from a fresh fetch in this session.

Depth: **deep** — four of four targeted gaps closed (v0.2→v0.4 rationale with direct quotes; explicit Core/AgentChat/Ext/Studio layering; SelectorGroupChat mechanics with prompt template + override knobs; MCP integration verified at module-path level).

## 7. Concrete next experiments or hypotheses

1. **Coordination-cost benchmark**: run the same 5-agent task on `RoundRobinGroupChat` vs `SelectorGroupChat` vs `Swarm` vs `GraphFlow` and measure tokens, latency, and success rate. Hypothesis: Swarm wins on cost, Selector wins on success, GraphFlow wins on determinism, RoundRobin is a baseline.
2. **Selector robustness study**: compare LLM-only selection vs `selector_func`+LLM-fallback vs `candidate_func`-narrowed selection on the same task. Hypothesis: a thin deterministic `selector_func` for "first-speaker" and "after-tool-call" cases removes most loops without sacrificing flexibility.
3. **Magentic-One vs LangGraph supervisor**: re-implement a GAIA-style web task in both and compare. Hypothesis: Magentic-One's replanning loop generalises better; LangGraph wins on debuggability.
4. **Distributed runtime stress test**: confirm whether the cross-language Python+.NET gRPC runtime is production-ready or research-grade by deploying a non-trivial team across processes — and measure whether the host-servicer becomes a coordination bottleneck.
5. **MCP coverage matrix**: catalogue which MCP servers `autogen_ext.tools.mcp` can drive end-to-end across all three transports (Stdio / SSE / StreamableHttp) vs which break — this is a moving target across the ecosystem.
6. **OTel parity with LangSmith**: prototype an OpenTelemetry-based trace exporter on the now-first-party Core hooks and measure whether it closes the gap with LangSmith for debugging.
7. **Maintenance-mode signal**: track commit cadence and PR merge latency over 90 days post-capture to test whether "community-managed going forward" plus Semantic-Kernel convergence implies a real velocity drop versus LangGraph and CrewAI.
