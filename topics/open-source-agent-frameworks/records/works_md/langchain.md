# LangChain (+ LangGraph)

Repo: https://github.com/langchain-ai/langchain
LangGraph repo: https://github.com/langchain-ai/langgraph
Maintainer: LangChain Inc (langchain-ai)
License: MIT
Primary language: Python (also a separate JS/TS line)

## 1. What this work actually does

LangChain is positioned as "the agent engineering platform" — a Python (and TS) framework that lets developers compose LLM calls, prompts, tools, retrievers, and memory into chains and agents. Around it sits a commercial stack: **LangSmith** for tracing/evals and **LangGraph Platform** for deployment.

**LangGraph** is the modern agent execution kernel inside that stack. The docs describe it as "a low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents," and as "the orchestration runtime" while LangChain is "the agent framework." Together they form one project family: LangChain provides high-level building blocks and integrations; LangGraph provides the graph-typed runtime that actually executes them.

The combined offering covers: prompt and chat-model abstractions across providers, a Tool/StructuredTool interface, retrieval and vector-store plumbing, a graph-state agent runtime with checkpointing and resumability, multi-agent topologies (supervisor / swarm / hierarchical / network), human-in-the-loop interrupts, streaming, and first-party tracing via LangSmith.

## 2. Technical mechanism

### 2.1 The StateGraph core (from source — `libs/langgraph/langgraph/graph/state.py`)

The kernel is a single class, `StateGraph`. Its docstring is the canonical one-line definition of the entire runtime model:

> *"A graph whose nodes communicate by reading and writing to a shared state. The signature of each node is `State -> Partial<State>`. Each state key can optionally be annotated with a reducer function that will be used to aggregate the values of that key received from multiple nodes."*

Constructor:

```python
StateGraph(
    state_schema: type[StateT],
    context_schema: type[ContextT] | None = None,
    *,
    input_schema: type[InputT] | None = None,
    output_schema: type[OutputT] | None = None,
)
```

The state schema is a `TypedDict` (or Pydantic class) where each key may be annotated with a reducer via `Annotated[type, reducer]`; the reducer has signature `(Value, Value) -> Value` and is invoked whenever multiple nodes write the same key in the same superstep. Internally the compiler translates each key into a `BaseChannel`: `LastValue` by default, a reducer-backed channel when annotated, plus separate `ManagedValueSpec`s for runtime-managed values. Execution is Pregel-style supersteps over those channels.

Nodes and edges are added via three primitives:

```python
add_node(name, action, *, defer=False, metadata=None,
         input_schema=None, retry_policy=None, cache_policy=None,
         error_handler=None, destinations=None, timeout=None)

add_edge(start_key, end_key)                       # start_key may be a list (fan-in)

add_conditional_edges(source, path, path_map=None) # path: Callable | Runnable -> str | seq[str]
```

`path` returns the name (or list of names) of the next node; `path_map` lets you constrain the legal targets, which is the canonical way to type-check a supervisor's routing decisions.

Compiling (`graph.compile(checkpointer=..., store=..., interrupt_before=..., interrupt_after=...)`) returns a `CompiledStateGraph` — a Pregel Runnable that streams, invokes, and persists a checkpoint after every superstep. That checkpoint-per-step is the foundation of every higher-level feature: replay, time-travel, HITL interrupts, and crash-resume.

### 2.2 Agent factory

`create_react_agent(model, tools, prompt=..., checkpointer=...)` is the prebuilt that wraps `StateGraph` into a canonical ReAct-style tool-calling loop and is the modern "give me an agent" entry point. Under the hood it's a two-node graph (`agent` → `tools` → `agent` …) over a `MessagesState`-style schema with an `add_messages` reducer.

### 2.3 Multi-agent — one primitive, four topologies

All four topologies are built on the same StateGraph primitive plus the `Command` handoff primitive. `langgraph.types.Command` is a special return value from a node *or tool* that bundles a state update with a `goto` target, allowing control to jump to a named node without a pre-declared edge.

- **Supervisor.** A router node (often an LLM agent whose tools *are* the workers) inspects the shared state and dispatches to one worker subgraph per superstep. Implemented as `add_conditional_edges(supervisor, route_fn, path_map={...})` with each worker as a node — or as a subgraph node.
- **Swarm.** Peer agents are nodes in one StateGraph; each agent has *handoff tools* whose implementation returns `Command(goto="other_agent", update={...})`. Control jumps to a peer directly; no central router. Packaged as `langgraph-swarm`.
- **Hierarchical.** A worker node is itself a compiled `StateGraph` — supervisor-of-supervisors. Outer and inner state schemas compose via the optional `input_schema` / `output_schema` of the constructor.
- **Network.** Every agent has handoff tools targeting every other agent; a fully-connected swarm. Useful when no clear hierarchy exists.

The maintainers explicitly contrast this with AutoGen's conversation framing:

> *"LangGraph prefers an approach where you explicitly define different agents and transition probabilities, preferring to represent it as a graph. Autogen frames it more as a 'conversation'... this 'graph' framing makes it more intuitive and provides better developer experience for constructing more complex and opinionated workflows."* — LangChain blog, *langgraph-multi-agent-workflows*

### 2.4 Tool protocol

LangChain's `Tool` / `@tool` / `StructuredTool` interface is the native protocol; it adapts cleanly to OpenAI-style tool-calling and to Anthropic / Gemini / Bedrock equivalents. MCP is supported as a *client* through `langchain-mcp-adapters` (MCP servers become LangChain tools). A2A and similar inter-agent protocols are landing through adapters rather than first-class core types.

### 2.5 Memory & durability

Short-term memory is just the graph state, persisted by a `Checkpointer` (Memory, SQLite, Postgres, Redis). Long-term memory is a separate `Store` interface with key/value and semantic search. Because checkpointing runs at every superstep boundary, `interrupt()` can pause the graph and `compile(interrupt_before=[...], interrupt_after=[...])` declares HITL pause points; humans can inspect or mutate state and resume from the last step.

### 2.6 Observability & deployment

LangSmith auto-instruments any LangChain/LangGraph run via env vars and records traces, token usage, latency, tool I/O, and eval scores — first-party. OTel export exists but is secondary. LangGraph Platform (commercial) wraps graphs as long-running services with task queues, persistence, and a streaming HTTP API; OSS users can self-host the same graphs as plain ASGI apps.

## 3. Why it matters for the topic's stated goals

The topic explicitly cares about execution kernels, multi-agent style, tool/memory layers, observability, and deployment portability. LangChain+LangGraph is the most-cited reference point on every one of those axes — it is the **graph-state** representative, it has the most complete **observability** story of any OSS framework via LangSmith, and it ships *one* primitive (StateGraph + Command) from which four named **multi-agent topologies** fall out as direct constructions. Any landscape map of OSS agent frameworks has to treat it as the dominant incumbent and benchmark others against it. The `State -> Partial<State>` node signature with per-key reducers is also notable as a design influence on later frameworks (see the proposed `shared_pattern` edges).

## 4. What is reusable

- **`State -> Partial<State>` node contract with per-key reducers.** A tiny, composable execution primitive that is independently re-implementable.
- **Checkpoint-per-superstep durability model.** "After every step, persist state; resume = re-enter the same step" is a cleanly portable pattern.
- **`Command(goto=..., update=...)` handoff.** A model-agnostic alternative to chat-room coordination — a tool can simultaneously return data *and* redirect control flow.
- **`create_react_agent` shape.** A minimal `(model, tools, prompt) -> Runnable` factory layered on a richer graph runtime is a useful API contract to copy.
- **MCP-adapter approach.** Treating MCP servers as plain Tools at the framework boundary keeps the agent core protocol-agnostic.
- **Auto-instrumentation via env-var-driven tracing** (LangSmith's UX) is a reusable pattern even if you build your own OTel-based collector.

## 5. What is not safely transferable (within this topic's scope)

- **The LangChain ecosystem as a whole** does not transfer — its value is the breadth of integrations, not a single algorithm.
- **LangSmith** is the proprietary observability backend; the OSS framework benefits from it but you cannot just lift it.
- **LangGraph Platform** deployment guarantees (durable queues, replay) are non-trivial infra, not a code snippet.
- **Legacy LangChain memory and chain classes** are an anti-pattern to copy; the project itself is migrating away from them.
- **Marketing-grade claims** ("the agent engineering platform") should not be carried across — comparative claims need third-party benchmarks.

## 6. Evidence quality

- **Primary sources read this iteration:** `libs/langgraph/langgraph/graph/state.py` (StateGraph class docstring, constructor, `add_node`/`add_edge`/`add_conditional_edges` signatures, channel model) and the maintainer blog `langgraph-multi-agent-workflows` (graph-vs-conversation framing quote and topology rationale). Previous-iteration sources retained: LangChain README, LangGraph README, LangGraph overview page.
- **Recency:** release cadence is current — latest visible release `langgraph-sdk==0.3.15` dated 2026-05-22, well past the topic's 2024 recency floor.
- **Quantitative signals:** 138k stars on LangChain, 33k on LangGraph, 1,254 LangChain releases — strong adoption and active maintenance.
- **Remaining gaps:** the canonical multi-agent concepts doc (`/langgraph/concepts/multi_agent/`) still resolves through a redirect chain that returned no body in this session; topology constructions here are reconstructed from the source + blog + Command-primitive knowledge. A first-party benchmark number (latency, success-rate) was still not located — only adoption metrics.
- Overall confidence: **high** on architecture (now grounded in source), **medium-high** on exact 2026 multi-agent helper API surface (e.g. `langgraph-supervisor`, `langgraph-swarm` exact constructor names — the project moves fast).

## 7. Concrete next experiments or hypotheses

1. **Head-to-head with AutoGen on supervisor multi-agent.** Build the same supervisor + 2 worker pattern in LangGraph and AutoGen; compare LOC, observability, and behavior under tool-call failures.
2. **Checkpointer durability test.** Run a long agent, kill the process mid-tool, restart, and measure replay correctness across SQLite / Postgres / Redis checkpointers — does the "durable execution" claim survive non-trivial tool side-effects?
3. **MCP-tool parity.** Wire the same MCP server into LangGraph, OpenAI Agents SDK, and Smolagents; check whether tool semantics (streaming, cancellation, errors) are preserved equivalently.
4. **Code-act vs graph-state on the same task.** Run an identical benchmark (e.g. GAIA subset) with LangGraph's `create_react_agent` and Smolagents' code-act agent, controlling for the same model — does code-act actually win on tool-heavy tasks as its authors claim?
5. **Observability ablation.** Quantify how much LangSmith tracing changes developer iteration time on a fixed bug-fix task vs. the same agent without tracing — is the observability advantage measurable, not just rhetorical?
6. **Reducer-correctness microbench.** Construct a fan-in graph where two parallel nodes write the same state key with vs without a declared `Annotated[..., reducer]`; quantify how often the "untyped overwrite" anti-pattern silently drops data in realistic agent runs.
7. **Command-handoff vs conditional-edge swarms.** Build the same 3-peer swarm with (a) handoff tools returning `Command(goto=...)` and (b) explicit `add_conditional_edges` from each peer; compare graph analyzability (can you statically enumerate reachable states?) and routing-error rates.
