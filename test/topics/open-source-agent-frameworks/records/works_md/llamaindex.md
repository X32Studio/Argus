# LlamaIndex (agents — Workflows / AgentWorkflow)

- Repo: https://github.com/run-llama/llama_index
- Workflows kernel (extracted package): https://github.com/run-llama/llama-agents → `packages/llama-index-workflows/src/workflows/`
- Docs: https://developers.llamaindex.ai/python/framework/module_guides/workflow/
- Maintainer: run-llama / LlamaIndex Inc.
- License: MIT  |  Language: Python  |  Stars: ~49.7k  |  Last commit: 2026-05-20
- Iteration 4 depth upgrade: medium → deep (4/4 gaps closed against source).

## 1. What this work actually does

LlamaIndex began as a retrieval/indexing library ("GPT Index") but its current in-scope surface for this topic is the **Workflows** runtime and the **AgentWorkflow** layer built on top. Workflows let a developer compose an LLM application as a set of async `@step` functions that consume and emit typed `Event` objects, sharing a `Context` for state. `AgentWorkflow` is a concrete `Workflow` subclass that orchestrates one or more configured `FunctionAgent` / `ReActAgent` instances and supports name-based handoff between them. Pure-RAG features (indices, query engines, ingestion) are intentionally out of scope per the topic's `scope_out`.

Architecturally significant: the workflow primitive has been **extracted out of `llama_index.core.workflow` into a standalone `workflows` package** (in the `run-llama/llama-agents` repo, `packages/llama-index-workflows`). `llama_index.core.workflow.*` now re-exports thin shims (`from workflows.workflow import Workflow`, `from workflows.context import Context`). This signals run-llama treats Workflows as a reusable runtime independent of the indexing library.

## 2. Technical mechanism (source-verified, iteration 4)

### 2.1 Workflow execution kernel — what actually runs

- **Class:** `class Workflow(metaclass=WorkflowMeta)` (in `workflows/workflow.py`). `WorkflowMeta` collects `@step`-decorated methods at class creation.
- **`@step` decorator:** delegates to `_apply_step_decorator` → `make_step_function`. `make_step_function` calls `inspect_signature(func)` and `validate_step_signature(spec)` to extract the **accepted event types from the function's parameter type hints** and the **return event types** from the return annotation. The result is a `StepConfig` dataclass attached as `func._step_config`. Fields include `accepted_events`, `return_types`, `context_parameter`, `num_workers`, `retry_policy`, `resources`, `context_state_type`, `role`, `catch_error_for_steps`.
- **Dispatch validation:** before invoking a step, `_validate_valid_step_message` raises `WorkflowRuntimeError` if `type(message) not in step_config.accepted_events`. Type safety is enforced at dispatch time.
- **Control loop — NOT asyncio.Queue + gather.** The runtime (`workflows/runtime/control_loop.py`) is a `_ControlLoopRunner` with:
  - `tick_buffer: list[WorkflowTick]` — drained sequentially in `while self.tick_buffer: tick = self.tick_buffer.pop(0)`
  - `worker_tasks: set[asyncio.Task[TickStepResult]]` — each step invocation runs as its own asyncio.Task
  - `scheduled_wakeups` — a heapq for timed events
  - `_reduce_tick(state, tick) -> commands` — a **pure reducer** that yields commands like `CommandRunWorker`, `CommandQueueEvent`. This is the elm/redux pattern, deliberately deterministic.
- **Entry point:** `Workflow.run()` returns a `WorkflowHandler` (future-like, streamable) and delegates to `ctx._workflow_run(workflow=self, start_event=..., run_id=...)`. The handler is what user code awaits or iterates.

Implication: replay, time-travel debugging, and durable resume are structurally possible because state transitions are pure reductions over an event log, not side effects of fire-and-forget tasks. This is a stronger architectural foundation for observability than a naive asyncio.Queue dispatcher.

### 2.2 Agent class hierarchy — what is a Workflow and what isn't

Source-verified hierarchy:

- `class AgentWorkflow(Workflow, PromptMixin, metaclass=AgentWorkflowMeta)` — **IS** a `Workflow` subclass. This is the orchestrator.
- `class FunctionAgent(BaseWorkflowAgent)` — **is NOT** a `Workflow` subclass. It is a **config object composed inside** an `AgentWorkflow`. Methods like `handle_tool_call_results(ctx: Context, ...)` take a `Context` rather than owning a workflow runtime.
- `class ReActAgent(BaseWorkflowAgent)` — same composition pattern; differs in prompting (text ReAct vs native function-calling).
- Events emitted by `FunctionAgent`: `AgentInput`, `AgentOutput`, `AgentStream`. Event consumed: `ToolCallResult`.

So the model is two-level: `Workflow` is the runtime primitive (event-driven). `BaseWorkflowAgent` subclasses are *data* (LLM + system prompt + tools + handoff config) that the parent `AgentWorkflow`'s steps drive. This is materially different from a framework where each agent is its own runtime.

### 2.3 Multi-agent handoff — mechanically how it works

The handoff mechanism in `agent/workflow/multi_agent_workflow.py`:

1. **Tool generation.** `AgentWorkflow._get_handoff_tool()` returns
   ```python
   FunctionTool.from_defaults(async_fn=handoff, description=fn_tool_prompt, return_direct=True)
   ```
   The tool's description is built from each agent's `can_handoff_to` list — so the LLM is told what handoffs are legal in the prompt.
2. **Tool body.** When the LLM emits the handoff tool call, the `handoff(ctx, to_agent, reason)` async function runs and does:
   ```python
   await ctx.store.set("next_agent", to_agent)
   ```
   It also validates `to_agent in can_handoff_to.get(current_agent_name, [])` — invalid targets get an error string (LLM can self-correct).
3. **`return_direct=True`** means the tool result short-circuits the agent's tool loop — the active agent doesn't get a chance to "see" the tool result and keep reasoning.
4. **Agent switch.** In the `aggregate_tool_results` step (the workflow's reducer step) the runtime reads `next_agent_name = await ctx.store.get("next_agent")`, and if set:
   ```python
   await ctx.store.set("current_agent_name", next_agent_name)
   await ctx.store.set("next_agent", None)
   ```
   The next iteration picks up the new active agent.

Routing is **data in Context**, not topology in code. The graph of "who can hand off to whom" is just a dict in workflow state.

### 2.4 Handoff comparison: LlamaIndex vs LangGraph vs OpenAI Agents SDK

| Aspect | LlamaIndex AgentWorkflow | LangGraph | OpenAI Agents SDK |
|---|---|---|---|
| Trigger | LLM emits handoff tool call | Node returns `Command(goto="X")` | LLM emits auto-generated `transfer_to_X` tool call |
| Mechanism | `FunctionTool(return_direct=True)` writes `next_agent` to `ctx.store` | Compiled StateGraph reads `Command.goto`; routes to that node | SDK runtime intercepts the transfer tool, swaps active Agent |
| Where routing lives | Workflow state (data) | Graph topology + Command values (code) | SDK runtime (implicit) |
| Constraint encoding | `can_handoff_to` dict + tool description text | Edges declared at graph build time | `handoffs=[Agent, ...]` list |
| Static checkability | Low (data) | High (typed edges) | Medium |
| Visualization | None first-class | Native graph render | None first-class |

**Takeaway:** LlamaIndex and OpenAI Agents SDK share the *tool-call-as-handoff* mental model. LangGraph is the outlier with topology-based handoff via `Command(goto=)`. The tool-call style has less ceremony and lets the LLM "decide" handoff naturally; the topology style gives static analysis and explicit routing. (Iteration 4 gap 3 closed.)

### 2.5 MCP integration depth (BasicMCPClient, source-verified)

`llama-index-tools-mcp` package, `client.py`:

- `class BasicMCPClient(ClientSession)` — extends the MCP Python SDK's `ClientSession`.
- **Transports:** stdio (command + args + env), HTTP, SSE — all three official MCP transports.
- **Full primitive coverage** (not tools-only):
  - Tools: `call_tool()`, `list_tools()`
  - Resources: `list_resources()`, `list_resource_templates()`, `read_resource()`
  - Prompts: `list_prompts()`, `get_prompt()`
- **Auth:** `BasicMCPClient.with_oauth(...)` classmethod for OAuth flows to remote MCP servers.
- **Agent glue:** `McpToolSpec` converts MCP `list_tools()` output into LlamaIndex `ToolSpec` entries — MCP tools sit alongside native `FunctionTool`s with no special handling at the agent layer.
- **Direction:** CLIENT-ONLY in this integration. LlamaIndex consumes MCP servers; it does not expose Workflows / AgentWorkflow as an MCP server out of this package. (Server exposure would require a separate wrapper, e.g. via fastmcp.)

This is notably broader than "tools-only" MCP integrations in other frameworks — all three MCP primitives are wired, plus OAuth, plus all three transports. (Iteration 4 gap 4 closed.)

## 3. Why it matters for the topic's stated goals

LlamaIndex occupies a distinctive cell in the open-source agent-framework matrix: a Python-native event-driven kernel with a **deterministic tick-buffer + pure-reducer control loop** (architecturally similar in spirit to LangGraph's reducer story, but at the runtime layer rather than the user API). Multi-agent is handled by tool-call handoff (shared mental model with OpenAI Agents SDK), not by graph topology (LangGraph) and not by chat-room broadcast (AutoGen). MCP support is first-class and full-coverage. Without LlamaIndex in the comparison set, the "general-purpose framework with native retrieval" axis is empty.

## 4. What is reusable

- The **tick-buffer + pure-reducer control loop** pattern (in `runtime/control_loop.py`) is borrowable for any in-house agent runtime that needs deterministic replay and durable resume without coupling to LangGraph.
- **Type-hint-driven step registration** (`accepted_events` inferred from parameter annotations) is a clean way to keep wiring in Python without a separate DSL.
- **Handoff-as-tool-call with return_direct=True** is the minimal-surface multi-agent pattern. Reusable when you don't need topology-level static checks.
- **MCP-as-first-class tool source** with all three primitives wired (`McpToolSpec`) is a reusable adapter shape — small surface, big leverage.
- **Two-level abstraction (Workflow = runtime, BaseWorkflowAgent = config)** keeps agents lightweight and the runtime single-purpose; reusable when you need to add more agent shapes without rewriting the kernel.

## 5. What is not safely transferable (within this topic's scope)

- The retrieval/indexing layer (indices, query engines, vector store glue) is out of scope per `scope_out.pure_RAG_libraries`.
- Legacy agent classes (`OpenAIAgent`, the pre-Workflow `ReActAgent` in `llama_index.agent`) are deprecated; do not pattern off them.
- `llama-deploy` couples to LlamaCloud-style assumptions (control plane, message queues, llamactl) — borrow the durable-Context idea, not the deployment topology.
- The MCP client integration is *client-only*; do not assume LlamaIndex auto-exposes workflows as MCP servers — that requires extra work.

## 6. Evidence quality

Iteration 4 closed all four targeted gaps against primary source:

1. **Workflow kernel** — verified via `packages/llama-index-workflows/src/workflows/workflow.py`, `decorators.py`, `runtime/control_loop.py`. Class/metaclass names, `StepConfig` dataclass, `_ControlLoopRunner` internals, `_reduce_tick` reducer pattern, `WorkflowHandler` return type, `tick_buffer` + `worker_tasks` mechanism all source-verified.
2. **AgentWorkflow / FunctionAgent / ReActAgent hierarchy** — verified via `agent/workflow/multi_agent_workflow.py` and `function_agent.py`. `AgentWorkflow` IS a `Workflow` subclass; `FunctionAgent` / `ReActAgent` are `BaseWorkflowAgent` subclasses composed inside, NOT workflows themselves.
3. **Handoff comparison** — LlamaIndex `FunctionTool(return_direct=True)` + `ctx.store.set("next_agent", ...)` + `aggregate_tool_results` switch step verified line-for-line; LangGraph `Command(goto=)` and OpenAI Agents SDK transfer-tool patterns cross-referenced from existing topic records.
4. **MCP** — `BasicMCPClient(ClientSession)` verified; tools + resources + prompts + OAuth + stdio/HTTP/SSE all confirmed; client-only direction confirmed.

Remaining residual: did not exhaustively read every step in `aggregate_tool_results` (looked at the relevant lines only) or the `WorkflowHandler` stream protocol. These are not load-bearing for the upgrade.

## 7. Concrete next experiments or hypotheses

- **Hypothesis A:** Because routing lives in Context state and tool descriptions rather than typed edges, AgentWorkflow's handoff style degrades faster than LangGraph past ~5 agents. Test: build 5-agent supervisor in both, measure misrouted-handoff rate over 100 runs.
- **Hypothesis B:** The tick-buffer + pure-reducer control loop gives Workflows replay parity with LangGraph checkpointers, but the user-facing ergonomics for time-travel are weaker. Test: implement "rewind 3 ticks and replay" against both runtimes; compare line-count and API clarity.
- **Hypothesis C:** Workflows + full-coverage MCP (tools + resources + prompts) is a faster on-ramp than LangChain or OpenAI Agents SDK for "agent over an existing MCP toolkit" use cases where prompts or resources matter (e.g. wrapping an MCP server that exposes prompt templates). Test: time-to-first-working-agent for a fixed task.
- **Experiment D:** Confirm whether `instrumentation` events flow into OpenTelemetry without Arize/Langfuse SDKs in between. If yes, that's a real observability differentiator vs. CrewAI/AutoGen.
- **Experiment E:** Verify `context_serializers.py` actually round-trips a mid-flight workflow (durable resume claim). The tick-buffer architecture suggests yes, but the user-facing API for "pause + serialize + restore + resume" needs concrete test.
