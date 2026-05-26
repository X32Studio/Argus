# Pydantic AI (PydanticAI)

- Repo: https://github.com/pydantic/pydantic-ai
- Docs: https://ai.pydantic.dev/ (redirects to https://pydantic.dev/docs/ai/overview/)
- Maintainer: Pydantic (the team behind `pydantic` + Logfire)
- License: MIT  Stars: ~17.3k  Latest: v1.102.0 (2026-05-23)

## 1 What this work actually does

Pydantic AI is a Python agent framework whose central thesis is that **every boundary inside an agent loop should be a Pydantic-validated typed contract**: tool arguments, tool returns, agent outputs, dependencies, even retry-feedback. The Agent object is generic in two type parameters — `Agent[DepsType, OutputType]` — and the runtime guarantees that the value handed back from `agent.run()` conforms to `OutputType`, retrying the LLM with structured error feedback when validation fails. It targets production Python backends that need agents to produce machine-parseable, downstream-safe outputs (typed schemas, not free-form text), and ships first-class support for 17+ model providers, MCP, streaming, Logfire tracing, durable execution, and human-in-the-loop tool approval.

## 2 Technical mechanism

**Kernel shape.** Standard `Agent.run()` is a conventional model<->tool while-loop: send messages -> LLM responds with text or tool calls -> dispatch tools -> append results -> repeat until a final output appears that validates against `OutputType`. Tools are async Python functions decorated with `@agent.tool` (typed, gets `RunContext`) or `@agent.tool_plain` (no context); their signature is converted to JSON schema by Pydantic, and every invocation re-validates the LLM's args against that schema. A validation failure isn't a crash — it's structured feedback the kernel sends back to the LLM as a retry prompt. This auto-retry-on-typed-error loop is the single most distinctive kernel behavior.

**State / DI.** There is no global state. Instead, a per-run `deps` object (any dataclass/Pydantic model) is passed to `agent.run(deps=...)` and is reachable inside tools and dynamic instructions via `ctx.deps`. This is plain dependency injection, type-checked end-to-end, and gives concurrent runs their own isolated state without thread-locals.

**Multi-agent.** Five layered patterns (in order of binding tightness): (1) **agent delegation** — call a child agent from inside a parent's tool body, threading `ctx.usage` so token costs accumulate; (2) **programmatic hand-off** — app code sequences agents (parallel to openai-agents-sdk handoffs but explicit in user code, not kernel-baked); (3) **graph-based orchestration** via the sibling `pydantic-graph` package for state machines; (4) **Deep Agents** preset bundling planning + file ops + sandboxed code + durable execution; (5) **A2A** (Agent2Agent) protocol support for cross-process agent calls.

**pydantic-graph.** A separate typed DAG / state-machine DSL. It is NOT the default kernel — it is offered for cases where "standard control flow can degrade to spaghetti code" (nodes, joins, reducers, decisions, parallel branches). This is a deliberate scope cut: unlike LangGraph where the graph IS the runtime, Pydantic AI keeps the conversational loop as the default and treats the graph as opt-in.

**MCP / tools.** First-class MCP client; an agent can consume any MCP server as a tool provider. Native tools also support approval workflows (human-in-the-loop gating), dynamic instructions, and streaming structured output.

**Durable execution.** A kernel-level feature that persists in-flight runs across API failures so a multi-step run can resume from a checkpoint. This is execution-resumption, not semantic long-term memory.

**Observability.** Logfire (same vendor) is treated as a kernel-level concern, one-line instrumentation, OpenTelemetry under the hood; traces span delegation chains, validation retries, and token usage per agent.

## 3 Why it matters for the topic's stated goals

For a kernel-discriminator catalog of open-source agent frameworks, Pydantic AI is a critical data point because it occupies a kernel position that *could* have been redundant with openai-agents-sdk but isn't. Both are minimalist Python-native decorator loops with handoffs/MCP/streaming/tracing. The difference is the axis they optimize: openai-agents-sdk treats the **loop** as primary and typing as best-effort; Pydantic AI treats the **typed contract** as primary and elevates validation-failure to a first-class control-flow event. That's a real kernel-level distinction — different invariants, different debugger affordances, different failure modes. It also clarifies that "typed-first" is a coherent design axis, not a marketing veneer.

## 4 What is reusable

- **Auto-retry-on-validation-error pattern.** Any agent kernel could adopt this: when the LLM emits tool args that fail a schema check, feed the validation message back as a retry rather than crashing.
- **Generic-typed agent signature `Agent[DepsType, OutputType]`.** Makes the agent's contract checkable by mypy/pyright at usage sites.
- **Per-run typed `deps` DI** as the alternative to global state or thread-locals — clean, testable, concurrent-safe.
- **Graph as opt-in escape hatch.** A useful scope-cut: don't force every workflow into a DAG; keep the loop as default and offer a state machine only when control flow genuinely demands it.
- **Vendor-aligned observability** (Logfire) as kernel-level — argues that tracing should be part of the framework contract, not a third-party plugin.

## 5 What is not safely transferable

- **The "everything must be Pydantic-typed" stance** assumes a Python-typed culture and pydantic availability — it doesn't translate to TypeScript/Rust/Go ports without an equivalent runtime-validation library.
- **Logfire-as-canonical-tracing** is a commercial coupling; OSS users can use OTel, but the smoothest path leads to a paid SaaS.
- **No built-in long-term memory.** Episodic/vector memory is the caller's job — copying the kernel doesn't give you memory primitives.
- **Durable execution semantics** depend on the kernel checkpointing message state; porting requires the same checkpoint discipline.

## 6 Evidence quality

Three primary sources read: the GitHub README (v1.102.0, 17.3k stars, MIT, May 2026), the official overview docs (architecture, RunContext, deps DI, graph relationship), and the multi-agent guide (five-pattern taxonomy). Vendor is reputable (Pydantic team, same group as Logfire). Stable 1.x release line with weekly cadence is a strong maturity signal — most agent frameworks in 2026 still ship 0.x. Limitations: no independent benchmark numbers reviewed in this pass; production-grade claims are vendor-stated rather than third-party validated. No hello-world-only material in the sources sampled. Recency floor (2024) easily satisfied — repo is actively maintained in 2026.

## 7 Concrete next experiments or hypotheses

- **H1 (kernel-distinctness):** Build the same support-bot in openai-agents-sdk and pydantic-ai. Measure (a) lines of code to enforce a typed output schema, (b) number of LLM round-trips eaten by malformed-args retries, (c) developer time to add a new typed tool. Expectation: Pydantic AI wins on (a) and (b), parity on (c).
- **H2 (graph necessity):** Take a workflow that LangGraph models as a graph and re-express it in plain Pydantic AI Agent with delegation. Hypothesis: ~70% of LangGraph workflows collapse to a flat agent + delegation, and only the rest justify pydantic-graph.
- **H3 (MCP parity):** Run the same MCP server through openai-agents-sdk, Pydantic AI, and LangChain. Hypothesis: behavior is interchangeable up to tracing fidelity; the differentiator is observability, not protocol support.
- **H4 (typed-contract failure modes):** Inject adversarial LLM outputs (malformed JSON, schema-violating args). Measure recovery rate. Hypothesis: Pydantic AI's auto-retry-on-validation gives a measurable robustness edge over loops that surface raw exceptions.
- **H5 (durable execution real-world value):** Kill the process mid-run during a multi-tool agent. Measure whether the resumed run produces equivalent output. Confirms whether durable execution is a marketing tagline or a real reliability primitive.

```json
{
  "slug": "pydantic-ai",
  "title": "Pydantic AI",
  "year": 2026,
  "analysis_depth": "doc-deep",
  "proposed_graph_edges": [
    {"src": "pydantic-ai", "dst": "openai-agents-sdk", "rel": "competes_in_niche"},
    {"src": "pydantic-ai", "dst": "MCP", "rel": "protocol_supports"},
    {"src": "pydantic-ai", "dst": "langchain", "rel": "competes_in_niche"},
    {"src": "pydantic-ai", "dst": "smolagents", "rel": "competes_in_niche"},
    {"src": "pydantic-ai", "dst": "openai-agents-sdk", "rel": "shared_pattern"}
  ],
  "proposed_route_index_updates": {
    "Official docs & whitepaper read": {"add_to_representative_works": ["pydantic-ai"], "search_count_delta": 1}
  },
  "proposed_search_log_entry": {
    "iteration_id": 5,
    "new_direction": true,
    "query": "Pydantic AI framework deep-read",
    "source": "https://github.com/pydantic/pydantic-ai",
    "result_status": "ok",
    "works_found": ["pydantic-ai"],
    "why_new": "iteration 5 - kernel-discriminator stress test on a newer typed-first entrant"
  }
}
```
