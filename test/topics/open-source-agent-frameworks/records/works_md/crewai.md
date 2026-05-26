# CrewAI

- Repo: https://github.com/crewAIInc/crewAI
- Docs: https://docs.crewai.com/
- Maintainer: crewAIInc (commercial OSS company)
- License: MIT  |  Primary language: Python
- Stars (capture): ~52.2k  |  Latest release: 1.14.5 (2026-05-18)
- analysis_depth: deep (upgraded from medium at iteration 6)

## 1. What this work actually does

CrewAI is an open-source Python framework for orchestrating teams of role-playing LLM agents. The developer declares **Agents** (each with `role`, `goal`, `backstory`), **Tasks** (with descriptions, expected output, and an assigned agent), and groups them into a **Crew**. A **Process** governs how the Crew executes. The monorepo is split into `crewai-core`, `crewai-cli`, `crewai-tools`, `crewai-files`, and the main `crewai` package; `crewai[litellm]` and `crewai[bedrock]` etc. are optional extras. A newer **Flows** layer adds event-driven, deterministic workflow control on top of (or beside) Crews. The stack is positioned as "design agents, orchestrate crews, and automate flows with guardrails, memory, knowledge, and observability baked in."

## 2. Technical mechanism

**Execution kernel.** Imperative tool-loop. The `Process` class is a `str, Enum` with exactly two values today:

```python
class Process(str, Enum):
    sequential = "sequential"
    hierarchical = "hierarchical"
    # TODO: consensual = 'consensual'
```

- `Process.sequential`: Crew iterates tasks in declared list order; output of task N is appended to context for task N+1; `executing_agent = task.agent` for every task.
- `Process.hierarchical`: `executing_agent = self.manager_agent` for every task; the manager plans, delegates to workers based on agent capability, and validates outputs.

**Manager construction** (verified in `crew.py::_create_manager_agent`):
- If `manager_agent` is provided by user: it is used directly, `allow_delegation=True` is forced.
- Else if `manager_llm` is provided: CrewAI constructs an internal `Agent` whose `role`, `goal`, `backstory` are pulled from the i18n bundle `hierarchical_manager_agent`, and whose LLM is `manager_llm` (run through `create_llm`).
- A pydantic validator `check_manager_llm` raises if neither is set when hierarchical is selected, and also refuses a `manager_agent` that also appears in the workers list.

**LiteLLM bridge.** LiteLLM is an *optional extra* (`crewai[litellm]`), not a forced core dependency (verified in `lib/crewai/pyproject.toml`: `litellm = [ "litellm>=1.83.7,<1.84" ]` under `[project.optional-dependencies]`). Native paths exist for OpenAI, Anthropic, Google, Azure OpenAI, Bedrock with their own extras. LiteLLM widens coverage to Meta-Llama, Mistral, Groq, Ollama, Fireworks, Perplexity, HuggingFace, SambaNova, Cerebras, OpenRouter, Nebius, SageMaker, watsonx.ai, Nvidia NIM, LM Studio. This is broader than LangChain-coupled frameworks that bottleneck on `langchain-<provider>` packages, but the architecture is "LiteLLM-as-bridge" not "LiteLLM-as-spine".

**Independence from LangChain.** The 2024 rewrite removed all LangChain primitives; CrewAI now owns its own `Agent`, `BaseTool`, `LLM` (in `crewai/llm.py`), and `BaseLLM` (in `crewai/llms/base_llm.py`) hierarchies.

**Memory layer.** Source confirms a *unified* Memory class (`crewai/memory/unified_memory.py`) replacing the legacy short-term / long-term / entity / external split. Architecture:
- **Hierarchical scopes** (filesystem-like paths: `/`, `/project/alpha`, `/agent/researcher`); see `memory/memory_scope.py`.
- **Composite scoring**: weighted blend of semantic similarity, exponential-decay recency (default half-life 30 days), and importance.
- **LLM-powered analysis** (`analyze.py`) handles scope inference and consolidation, default model `gpt-4o-mini`.
- **Storage backends** present in source: `lancedb_storage.py` (default), `qdrant_edge_storage.py`. Persisted under `./.crewai/memory` (override via `CREWAI_STORAGE_DIR`). **Mem0 is NOT used in OSS**; CrewAI ships its own vector layer. Configurable embedder (OpenAI default; Ollama / Azure / Google / Cohere supported).

**Tools.** Native `Tool` / `BaseTool` Python classes (`SerperDevTool`, etc.). LLM-side invocation is OpenAI-style tool-calling abstracted via the `LLM` wrapper.

**MCP.** Client-only. Two integration paths: (a) high-level DSL on Agent (`mcps=["https://mcp.example.com/api", "snowflake"]`), tools auto-discovered; (b) explicit `MCPServerAdapter` from `crewai-tools`. Transports: stdio, SSE, streamable HTTPS. **Primitives covered: tools only**. Prompts and resources are explicitly *not* integrated as CrewAI components.

**Enterprise (AMP) delta vs OSS.** Closed AMP tier adds: managed-infra one-click deployment of crews; REST API endpoints to invoke deployed crews; detailed execution traces & logs UI; webhook streaming of crew events; published Tool Repository; Crew Studio no-code/low-code builder; multiple deployment paths (GitHub integration, CLI, Studio). The OSS framework alone does not ship a managed runtime, a deployed-crew REST surface, or a no-code builder.

## 3. Why it matters for the topic's stated goals

For a landscape map of open-source agent frameworks, CrewAI is the canonical reference point on the **role-play multi-agent axis**. The deep read confirms what the medium pass guessed: Process is genuinely only two-valued today (sequential/hierarchical), the manager is just an `Agent` either user-supplied or i18n-templated around `manager_llm`, LiteLLM is a *bridge* not the *spine*, and the memory layer is a first-party scoped LanceDB store rather than a Mem0 wrapper. The axis taxonomy must record CrewAI as: (axis-execution-kernel) declarative Crew/Process not graph DSL; (axis-multi-agent) task-centric role-play; (axis-tool-protocol) native + MCP-client-tools-only; (axis-memory) first-party unified scoped store on LanceDB; (axis-deployment) OSS = library only, managed runtime is paywalled.

## 4. What is reusable

- **role / goal / backstory** Agent schema as a stealable pattern for any role-play orchestration.
- **Process abstraction**: business logic stays in Tasks while orchestration policy is a one-line change (`sequential` <-> `hierarchical`).
- **Manager-by-LLM-or-Agent indirection**: the auto-construct-from-LLM-with-i18n-template trick lets users avoid writing a manager agent for prototyping but upgrade to a domain-tuned one later without changing the Crew wiring.
- **LiteLLM-as-optional-extra**: gives broad provider coverage without forcing the dependency on users with a single provider — worth copying for any new framework.
- **Crew + Flows split**: autonomous role-play crews for exploration, deterministic Flows for production.
- **Unified scoped memory with composite scoring (semantic + recency + importance)**: better default than a flat ChromaDB collection.

## 5. What is not safely transferable (within this topic's scope)

- Hierarchical Process effectiveness is highly dependent on `manager_llm` quality — the auto-constructed manager uses *generic i18n role/goal/backstory*, not domain-tuned text. A small/cheap `manager_llm` will tank the run even with strong workers. Treat "hierarchical" as a dependent, not free, capability.
- "Consensual" Process is documented as future work but the source still has it as a TODO comment — do not list CrewAI as supporting consensus-style coordination.
- "Memory baked in" is opt-in per Crew, not a default. Comparisons that read CrewAI as having durable memory by default will be wrong.
- The OSS/AMP delta is widening: managed deployment, REST API, traces, no-code Studio, Tool Repository, webhook streaming are AMP-only. Do not equate "CrewAI deployment story" with the OSS framework alone.
- MCP support is client-only and covers only the `tools` primitive; prompts/resources are not surfaced as CrewAI components.

## 6. Evidence quality

Direct primary sources inspected in this depth pass:
- `lib/crewai/src/crewai/process.py` (raw GitHub) — enum values and TODO consensual.
- `lib/crewai/src/crewai/crew.py` (line refs ~167, 248, 455-466, 688-704, 1015-1018, 1470-1491) — `_create_manager_agent`, `check_manager_llm` validator, executing-agent dispatch.
- `lib/crewai/pyproject.toml` — `litellm` lives under `[project.optional-dependencies]`, confirming bridge-not-spine.
- `lib/crewai/src/crewai/memory/` tree (unified_memory.py, memory_scope.py, lancedb_storage.py, qdrant_edge_storage.py, analyze.py) — architecture confirmed in code, not just docs.
- Docs pages: `/concepts/processes`, `/concepts/memory`, `/concepts/llms`, `/mcp/overview`, `/enterprise/introduction`.

All five explicit gaps closed with primary evidence; analysis_depth promoted from medium to deep. Remaining gap: independent third-party benchmark of Crew hierarchical vs sequential vs LangGraph on a fixed task is still not found in primary sources — H1/H2/H3 below remain hypotheses.

## 7. Concrete next experiments or hypotheses

- **H1**: For tasks with deterministic dependency structure, CrewAI `Process.sequential` will match or beat LangGraph at lower developer cost; for tasks with branching state, LangGraph wins.
- **H2**: `Process.hierarchical` with auto-constructed manager (i18n role/goal/backstory + small `manager_llm`) underperforms a hand-written planner-executor by a measurable margin even when workers are large. Ablate across `manager_llm` sizes and manager_agent customization.
- **H3**: Crews emit more tokens per resolved task than AutoGen group-chat for equivalent role decompositions due to verbose role-play traces. Measure tokens-per-resolved-task on a shared benchmark.
- **H4**: After the LangChain-removal rewrite, CrewAI's import surface and cold-start time are materially smaller than LangChain-based equivalents. Worth measuring as a deployment-axis data point.
- **H5**: The unified scoped LanceDB memory + composite scoring should outperform a flat ChromaDB collection on multi-session continuity tasks; verify against a shared session-recall benchmark.
- **Next read**: an independent engineering write-up benchmarking Crew vs AutoGen vs LangGraph on identical tasks (token + latency + success rate).
