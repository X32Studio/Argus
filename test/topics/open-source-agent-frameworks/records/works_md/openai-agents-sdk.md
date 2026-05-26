# OpenAI Agents SDK (openai-agents-python)

- Repo: https://github.com/openai/openai-agents-python
- Docs: https://openai.github.io/openai-agents-python/
- Maintainer: OpenAI
- License: MIT
- Primary language: Python (~99.7%)
- Stars at capture: ~26.7k (4.1k forks, 212 watchers)
- Last release observed: v0.17.3 (2026-05-19); ~100 releases, ~1,583 commits on main

## 1. What this work actually does

The OpenAI Agents SDK is a small Python library for building agentic workflows on top of the OpenAI Responses API (and, via bridges, ~100 other model providers). It is positioned by OpenAI as "a production-ready upgrade of our previous experimentation for agents, Swarm" — the *successor* to the archived Swarm cookbook framework, not a parallel project.

The library exposes a deliberately small set of primitives:

- **Agent** — an LLM with instructions, a set of tools, optional guardrails, and a list of agents it is allowed to hand off to.
- **Handoff** — a typed delegation from one agent to another, surfaced to the model as a synthetic tool call.
- **Guardrail** — input/output validation that can short-circuit a run via a "tripwire."
- **Runner** — the agentic loop that executes an Agent against an input and returns a final result, mediating tool calls and handoffs in between.
- **Sessions** — pluggable persistent stores for conversation history across Runner invocations.
- **Tracing** — built-in span-tree instrumentation, on by default, viewable in OpenAI's Traces UI and exportable to third-party observability stacks.

Newer modules layered on the same core add **Realtime Agents** (voice via `gpt-realtime`), **Sandbox Agents** (container-isolated filesystem ops), and human-in-the-loop checkpoints.

## 2. Technical mechanism

**Execution kernel.** A `Runner.run(agent, input)` call enters a loop:

1. Call the active agent's model with the current input + history.
2. If the model returns a final output (no tool calls, type-checked against `output_type` if specified), return it.
3. If the model returns one or more tool calls:
   - If a call is a *handoff* (synthetic `transfer_to_<other_agent>` tool), swap the active agent and re-loop with (by default) the full prior history.
   - Otherwise execute the tool, append the result, and re-loop.
4. Guardrails run in parallel; a tripwire aborts the loop with a `GuardrailTripwireTriggered` exception.
5. The loop terminates on final output, `max_turns`, or tripwire.

There is **no graph compilation, no actor runtime, no message bus**. Orchestration emerges from the model's tool-call choices inside a single process. This is the deliberate minimal-abstraction stance OpenAI took after Swarm.

**Handoffs.** This is the canonical multi-agent abstraction and the design choice most worth understanding. A handoff is *not* a separate runtime mechanism — it is a tool call. When agent A declares `handoffs=[B]`, the SDK injects a `transfer_to_b` tool into A's tool schema. The model, observing this in its tool list, may choose to call it; the Runner intercepts the call, switches the active agent to B, and (by default) passes the entire conversation history. An `input_filter` can strip tool calls, summarize, or transform that history. There is also `agent.as_tool()` which lets B run as a *sub-call* of A (manager pattern) — control returns to A after B's output, in contrast to handoff which transfers control entirely.

Contrast with LangGraph's `Command(goto="b", update={...})`: LangGraph's transition is a *graph-level* edge inside a compiled `StateGraph` with typed channels and explicit reducers; the framework — not the model — performs the dispatch, and replay/persistence work at the graph-state granularity. OpenAI's handoff is a *runtime tool call* observed by the Runner; the model is the dispatcher. The trade is determinism/replayability (LangGraph) vs. minimal surface area + native LLM-driven flow (OpenAI). Neither is strictly better; they target different deployment styles.

**Tool layer.** Three modes coexist:

- **Function tools** — any Python callable decorated with `@function_tool`; Pydantic generates the JSON schema and validates arguments automatically.
- **Hosted tools** — first-class wrappers for OpenAI's hosted web-search, file-search, code-interpreter, image-generation, and computer-use tools (these only work with OpenAI models).
- **MCP tools** — Model Context Protocol *client* support; an MCP server's tools are surfaced like any other.
- **Agent-as-tool** — `agent.as_tool(tool_name=..., tool_description=...)` exposes a whole agent as a tool.

**MCP integration depth (mid-2026).** Worth being precise about — the SDK is an MCP *client only*; Agents themselves cannot be exposed as MCP servers (contrast with frameworks like FastMCP or building one's own server). On the client side, four transports ship: `MCPServerStdio` (local subprocess), `MCPServerSse` (legacy SSE), `MCPServerStreamableHttp` (the current canonical HTTP transport), and `HostedMCPTool` (offloaded into OpenAI's Responses API server-side). Two MCP primitives are wired in: **tools** (full support across all transports) and **prompts** (via `list_prompts()` / `get_prompt()` for dynamic templates). **Resources and sampling are not in the documented surface** — they may be addable via raw MCP client calls, but they're not first-class. All MCP server classes expose `cache_tools_list=True` plus `invalidate_tools_cache()` to amortize the list-tools round-trip — important because remote MCP servers add per-turn latency that single-process tool calls don't.

**Memory.** A `Session` interface persists conversation messages across `Runner.run` calls. Backends ship for SQLite, SQLAlchemy, Redis, MongoDB, and Dapr. There is **no first-class vector/semantic long-term memory** — RAG is left to user-defined tools (or the hosted file-search tool on OpenAI).

**Model providers and LiteLLM bridge fidelity (mid-2026).** Default is OpenAI via the Responses API (streaming, structured outputs, hosted tools all first-class). The `Model` and `ModelProvider` abstractions plus an `extensions/litellm` bridge expose ~100 providers (Anthropic, Gemini, Mistral, Bedrock, local OpenAI-compatible servers). The official docs are blunt about the trade-off: LiteLLM support is **"included on a best-effort, beta basis"** and explicitly recommends "validate the exact provider backend you plan to deploy if you depend on structured outputs, tool calling, usage reporting, or adapter-specific routing behavior." Concrete degradations documented:

- **Hosted tools** (web-search, file-search, computer-use, image-generation, `ToolSearchTool`, deferred-loading tools) — vanish; these are OpenAI-only.
- **Structured outputs** — "some model providers don't have support for structured outputs" and may return invalid JSON.
- **Responses API** — "many other LLM providers still do not support it"; you're on Chat Completions semantics through the bridge.
- **Usage metrics** — "some LiteLLM-backed providers do not populate SDK usage metrics by default."
- **Reasoning summaries** (the `reasoning` field in Responses API output) — OpenAI-specific, lost on non-OpenAI providers.

On **handoffs through LiteLLM**: because a handoff is just a `transfer_to_<x>` tool call, it works on any provider that supports function calling — Claude and Gemini both do, so handoffs *theoretically* portable. But the docs ship no portability test matrix and no first-party guarantee that handoff tool-choice fidelity matches OpenAI's. In practice, expect Claude/Gemini to honor the tool calls but to occasionally fail to call `transfer_to_*` when an OpenAI model would — the SDK gives you no instrumentation to detect this regression beyond comparing traces.

**Observability and the tracing data-governance footgun.** Tracing is on by default. Every Runner run produces a trace with agent spans, `generation_span()` (with LLM inputs/outputs), `function_span()` (with tool args/results), handoff spans, guardrail spans, and audio spans. The default destination is **OpenAI's backend, via `BackendSpanExporter`, in batches** — to the Traces dashboard that also feeds OpenAI's evals/fine-tuning/distillation pipeline. The endpoint is *not* user-configurable. Three things matter mechanically for any non-OpenAI or regulated deployment:

1. **Default sensitivity flag.** `trace_include_sensitive_data=True` by default — your system prompts, user messages, model responses, and every tool input/output are captured and shipped. To narrow: `OPENAI_AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false` (env), `RunConfig.trace_include_sensitive_data=False` (per-run), or `VoicePipelineConfig.trace_include_sensitive_audio_data` for voice.
2. **Three off-switches.** Environment: `OPENAI_AGENTS_DISABLE_TRACING=1`. Global: `set_tracing_disabled(True)`. Per-run: `RunConfig.tracing_disabled=True`.
3. **ZDR is incompatible.** OpenAI's own docs state: "For organizations operating under a Zero Data Retention (ZDR) policy using OpenAI's APIs, tracing is unavailable." Meaning: if you're a regulated customer who negotiated ZDR with OpenAI for your API usage, you cannot use the SDK's built-in tracing at all — you must disable it and route to a third-party exporter (Langfuse, Logfire, Braintrust, etc.) via the trace processor hooks.

Net: this is the strongest first-party observability story of any general-purpose Python agent framework in this study, *and* the strongest default-data-egress posture. The trade is conscious; it should be made consciously.

**Guardrails (mechanics).** Guardrails are pluggable validators decorated with `@input_guardrail` / `@output_guardrail` (plus newer `@tool_input_guardrail` / `@tool_output_guardrail` for per-tool checks). Each returns a `GuardrailFunctionOutput` dataclass with two fields: `output_info` (free-form structured payload, e.g. a classification label) and `tripwire_triggered` (bool). Tripping raises `GuardrailTripwireTriggered`, which the Runner surfaces to the caller. Mechanically important:

- **Input guardrails run only for the *first* agent in a chain.** Handoff-receiving agents do not re-fire input guardrails. (You re-attach if you want them.)
- **Output guardrails run only for the agent that produces the final output.** Intermediate agents in a handoff chain don't trigger output guardrails.
- **Default is parallel.** With `run_in_parallel=True` (default), an input guardrail runs concurrently with the agent; **tokens may be billed and tools may have already executed before a tripwire cancels the run.** For true pre-flight blocking, set `run_in_parallel=False` — the guardrail completes before the agent starts. Output guardrails are always sequential (they can't pre-empt; they fire after final output is produced).
- **Guardrails can themselves invoke models.** The canonical pattern is a cheap classifier model (e.g. `gpt-4o-mini`) gating an expensive flagship — the guardrail body just calls `Runner.run(guardrail_agent, input)` and inspects the result.

Compare across this study's corpus:

- **LangChain `StructuredOutputParser` / output parsers** — schema-validation of a single LLM response; no separate validator model, no tripwire-cancel semantics, no parallel/blocking distinction. Closer in spirit to Pydantic + `response_format`.
- **Pydantic AI validators** — type-driven on the response, with optional retry logic via `ModelRetry` exceptions; runs strictly *after* the model call, sequentially. No parallel pre-flight mode.
- **Smolagents safety checks** — primarily about restricting Python code execution (an `additional_authorized_imports` allowlist and a sandboxed `LocalPythonInterpreter` or `E2BExecutor`); a *runtime sandbox*, not a validator pluggable into a loop. Different category entirely.

OpenAI's guardrail is the most *agent-shaped* of these: it runs at the loop boundary, can short-circuit the run, and is symmetrical input vs. output — which neither LangChain validators nor Pydantic AI validators offer cleanly.

## 3. Provenance and lineage

OpenAI Agents SDK is the explicit, documented successor to **Swarm**, OpenAI's experimental multi-agent cookbook framework released in late 2024. Swarm introduced two ideas the SDK kept: (a) handoffs as the multi-agent primitive, and (b) a context object that travels through the loop. The SDK industrializes both, adds guardrails/tracing/sessions/realtime, and ships as a versioned, installable PyPI package with semver releases — not a cookbook. Swarm itself is archived; OpenAI's official guidance is to use the Agents SDK.

The naming and timing matter: OpenAI shipped the SDK around the same window as Anthropic's MCP push and the broader "framework consolidation" wave (early-to-mid 2025). It is OpenAI's answer to LangGraph and CrewAI for OpenAI-native deployments.

## 4. What it changes

The SDK normalizes a *minimal-abstractions* school of agent design in the OpenAI ecosystem:

- **Handoffs-as-tool-calls** is now a canonical pattern other frameworks have to react to. AutoGen v0.4's `Swarm` team primitive and several CrewAI extensions implement variations of the same idea.
- **First-class tracing as a default** raises the bar — competing frameworks (LangGraph + LangSmith, AutoGen) have observability stories but rarely with the same out-of-the-box polish.
- **Guardrails as parallel-running pluggable validators** is a cleaner formulation than ad-hoc "before/after" hooks in older frameworks.
- The SDK also legitimizes **MCP** as a tool protocol on the OpenAI side — significant because OpenAI was not the originator of MCP, yet ships first-class client support.

It does *not* attempt to compete on graph determinism, distributed runtimes, role-based team templates, or being-an-MCP-server.

## 5. Anti-patterns / things to watch

- **OpenAI-first design.** Hosted tools, Traces dashboard, and Responses-API-specific features are best-in-class only on OpenAI. LiteLLM bridge is officially beta/best-effort — adopting the SDK is implicitly a bet on OpenAI's model stack.
- **Tracing-on-by-default ships sensitive data to OpenAI.** `trace_include_sensitive_data=True` is the default; the trace endpoint is hardcoded; ZDR customers can't use built-in tracing at all. Three off-switches exist (env var, global setter, per-run config) — *use them*, or route to a third-party trace processor.
- **Default-parallel input guardrails are not pre-flight blocking.** A tripwire can fire after billed tokens and executed tools. Set `run_in_parallel=False` for true gating semantics.
- **Routing safety is the model's responsibility.** Because handoffs are tool calls, a poorly prompted triage agent can hand off in loops or skip required validations. There is no graph-level invariant that "billing → refund handoff cannot occur without auth check" — must be encoded in prompts and guardrails.
- **No persistent long-term memory primitive.** Sessions store raw history; semantic memory must be DIY.
- **MCP support is client-only and limited to tools + prompts.** Resources and sampling are not first-class. Agents-as-MCP-servers is not supported — you cannot publish an SDK Agent through an MCP transport without writing your own server wrapper.
- **Single-process Runner.** No native distributed or cross-language runtime (contrast AutoGen Core's host-servicer + workers model).
- **Swarm-era confusion.** Old Swarm tutorials and Stack Overflow answers leak; APIs are similar enough to mislead newcomers.

## 6. Relation to other works in this study

- **swarm** — `fork_or_rebrand_of`. The SDK is explicitly the production successor; Swarm is archived "experimentation."
- **langchain / LangGraph** — `competes_in_niche`. Both target production agent orchestration in Python; the SDK chose minimal abstractions over LangGraph's typed-state-graph determinism. The handoff vs. `Command(goto=...)` axis is the cleanest framework-design contrast in this corpus.
- **autogen** — `competes_in_niche` and `shared_pattern`. AutoGen v0.4 has a `Swarm` team primitive that mirrors handoff semantics inside a group-chat substrate.
- **crewai** — `competes_in_niche`. CrewAI optimizes for role/process taxonomies; the SDK rejects that abstraction layer.
- **MCP** — `protocol_supports`. The SDK ships first-class MCP *client* support (tools + prompts, four transports including a hosted variant); not an MCP server.
- **openai-computer-use** — `shared_pattern`. The SDK is the canonical client for OpenAI's hosted computer-use tool; computer-use agents in production typically run inside an Agents SDK Runner.
- **smolagents** — `shared_pattern` (minimal-abstractions school). Different execution model (code-as-action vs. tool-call) and different safety story (sandboxed code execution vs. guardrail validators), but both stake out the "small library, not a framework" position.

## 7. Confidence / open questions

- **Confidence:** high on architecture (handoffs-as-tools, Runner loop, tracing, guardrails — all confirmed from official docs); high on tracing data-governance behavior (default-on, sensitive-by-default, ZDR-incompatible, hardcoded endpoint — confirmed from tracing docs); high on guardrail semantics (parallel-by-default, scoped to first/last agent in chain — confirmed from guardrails docs); high on MCP scope (client-only, tools + prompts, four transports, no resources/sampling — confirmed from MCP docs); medium-to-high on LiteLLM degradation (the docs themselves call the bridge "beta / best-effort" and enumerate specific gaps, but no third-party feature-parity table exists).
- **Open question:** how do handoffs *actually* behave on Claude/Gemini through LiteLLM in production — do those models reliably call `transfer_to_*` tools, or do they regress to inline answering? No first-party test matrix. Worth a hands-on iteration.
- **Open question:** are there public production case studies (named customer deployments) beyond OpenAI's own demos? Not surfaced.
- **Open question:** is there any official roadmap toward a distributed/multi-process Runner, or is the single-process design a permanent stance?
- **Open question:** will MCP support expand to resources and sampling, and will Agents-as-MCP-server ever ship?
