# smolagents

- Repo: https://github.com/huggingface/smolagents
- Docs: https://huggingface.co/docs/smolagents
- Maintainer: Hugging Face
- License: Apache-2.0
- Language: Python
- Last release captured: v1.25.0 (2026-05-14)
- Stars at capture: ~27.5k

## 1. What this work actually does

smolagents is a deliberately minimal (~1,000 LOC of core logic) Python library for building LLM agents that act by writing Python code. Its headline abstraction is the `CodeAgent`: at each ReAct step the LLM emits a Python code block, the library executes it (in a local interpreter or a sandbox), captures stdout/return as the observation, and feeds it back into the next prompt. A complementary `ToolCallingAgent` is offered for users who prefer the classical JSON/text tool-call paradigm. The framework is model-agnostic (Hugging Face Inference, Transformers, Ollama, LiteLLM, OpenAI, Bedrock, Azure), tool-agnostic (MCP servers, LangChain tools, Hugging Face Spaces as tools), and modality-agnostic (text, vision, audio, video). It ships CLI entry points (`smolagent`, `webagent`) and integrates with the Hub for sharing agents/tools.

## 2. Technical mechanism

- **ReAct loop (canonical form)**: from the conceptual docs, every multi-step agent runs:
  ```python
  memory = [user_defined_task]
  while llm_should_continue(memory):
      action = llm_get_next_action(memory)
      observations = execute_action(action)
      memory += [action, observations]
  ```
  CodeAgent and ToolCallingAgent differ only in what `action` is (a Python code blob vs. a parsed JSON/text tool call) and how it is parsed and executed.
- **Execution kernel — code-act**: the CodeAgent system prompt instructs the LLM to produce `Thought → Code → Observation` triplets. The code is real Python — composable, nestable, capable of variable reuse across steps because the executor maintains state.
- **CodeAgent vs ToolCallingAgent — maintainer guidance**: the multi-agent docs themselves draw the line: ToolCallingAgent for "single-timeline tasks that does not require parallel tool calls" (their example: a web-search subagent), CodeAgent for tasks where "advanced reasoning will be beneficial" (their example: the manager that plans and coordinates). The conceptual docs phrase the broader argument as: code is preferable for *composability* (you can define and reuse functions, you can nest calls), *object management* (you can hold a returned image in a variable), *generality* (anything a computer can do), and *training corpus representation* (LLMs have seen vastly more Python than your bespoke tool JSON). The implicit corollary: when the task fits in one tool-per-step, JSON tool-calling is fine; when it benefits from variable reuse, loops, or function composition across steps, CodeAgent dominates.
- **Sandbox** (pluggable executors, in order of increasing security cost):
  - `LocalPythonExecutor` — *in-process AST walker*. Imports are deny-by-default and require an explicit `additional_authorized_imports` list; submodule re-export tricks like `random._os.system(...)` are blocked at the AST level; operation count is capped (default 1,000,000) to interrupt infinite loops; any opcode not explicitly defined raises `InterpreterError`. The docs flag this as a "first layer of security" — **NOT a security boundary**. Verbatim warning: *"It's important to understand that no local python sandbox can ever be completely secure... The only way to run LLM-generated code with truly robust security isolation is to use remote execution options like E2B or Docker."*
  - `BlaxelExecutor` — `executor_type="blaxel"`. Fast-launch VMs from hibernation in <25ms, scale-to-zero. Remote.
  - `E2BExecutor` — `executor_type="e2b"`. Remote sandbox-as-a-service; model calls stay local, only code execution is shipped to the sandbox.
  - `ModalExecutor` — `executor_type="modal"`. Modal-hosted sandbox; same shape as E2B.
  - `DockerExecutor` — `executor_type="docker"`. Local Docker container with `mem_limit`, `pids_limit`, `cap_drop=ALL`, `no-new-privileges`, run as `nobody`; user-extensible via Dockerfile.
  - `WasmExecutor` — `executor_type="wasm"`. Pyodide-on-Deno; runs Python in a Wasm sandbox.
- **Two sandbox topologies (security comparison)**:
  - *Approach 1 — sandbox the code snippet only*: agent + model + tools stay local, only generated code is shipped to E2B/Modal/Docker/Blaxel. Easy (`executor_type="..."`). **Does not support managed-agents** — because credentials aren't transferred to the remote sandbox, a child agent's model call inside the sandbox would lack auth. Best for single-agent setups.
  - *Approach 2 — sandbox the whole agent system*: spin up E2B/Docker yourself, install smolagents inside it, run the entire manager+child stack from inside. Supports multi-agent. Cost: must pass `HF_TOKEN` (or equivalent) into the sandbox.
- **Multi-agent — hierarchical managed-agents**: a child agent is given mandatory `name` and `description` attributes; a parent CodeAgent receives it via `managed_agents=[child]` at init. The parent calls the child as if it were a tool from inside its emitted Python (`web_search_agent(task="...")`). State-passing ABI: task-string in, final-text out. The child runs its own internal ReAct loop with its own memory; the parent never sees the child's intermediate observations. This is *function composition between agents*, not group chat, not role-play, not voting. Concrete example from the docs: manager CodeAgent with `additional_authorized_imports=["time","numpy","pandas"]` orchestrates a web_search_agent (a ToolCallingAgent with `WebSearchTool` + `visit_webpage`) to answer "what would the electric power required for LLM training runs by 2030 be?" — the manager invokes the searcher inside Python, then does the numpy arithmetic itself.
- **Memory**: a linear list of `(action, observation)` steps re-serialized into the LLM context each iteration. Long-term memory is a user-supplied tool, not a built-in. Each managed agent has its own isolated memory.
- **Tool protocol**: a `@tool` decorator turns a typed Python function into an agent-callable tool. `ToolCollection.from_mcp(...)` ingests Model Context Protocol servers. `Tool.from_langchain` and `Tool.from_space` bridge other ecosystems.
- **Observability**: OpenTelemetry instrumentation; documented integrations with Langfuse, Arize Phoenix, and any OTEL backend. Each step (thought, code, observation, errors) is a span.

## 3. Why it matters for the topic's stated goals

For a comparative landscape of open-source agent frameworks, smolagents is the clean reference implementation of the *code-act execution kernel* axis — and uniquely, of the *managed-agents-as-function-composition* multi-agent style. It is the foil to LangChain's chain/graph kernel and to AutoGen's conversational kernel. Because it is small and well-documented, it doubles as a teaching scaffold: the source can be read end-to-end to understand the ReAct loop, prompt structure, and parser without wading through framework cruft. It also represents the "Hugging Face house style" datapoint — tight Hub/Spaces/MCP integration, Apache-2.0, model-agnostic — and lets us benchmark how the broader OSS code-act lineage (descending from OpenInterpreter, grounded in the CodeAct paper) has matured into a library shape with a serious production sandbox story.

## 4. What is reusable

- **CodeAct paper grounding (paradigm provenance)**: the CodeAgent design isn't a heuristic; it is the productized version of *Executable Code Actions Elicit Better LLM Agents* (Wang et al., arXiv:2402.01030, 2024). Paper's headline number: **up to 20% higher success rate** vs JSON/text tool-calls across **17 LLMs** on API-Bank and a new curated benchmark, with the released **CodeActInstruct** dataset (~7k multi-turn interactions) for instruction tuning. The four reasons it works (composability, object management, generality, training-corpus representation) are listed verbatim in the smolagents conceptual docs. Any code-act framework can borrow this argument and the empirical anchor.
- **The Thought → Code → Observation prompt template**: directly liftable, made explicit in the framework source.
- **The managed-agent-as-tool pattern**: lightweight multi-agent primitive that avoids the complexity of group-chat orchestration. The clean ABI is task-string-in / final-text-out, which translates to other frameworks with minimal change. Two-attribute interface (`name`, `description`) doubles as the LLM-facing tool schema.
- **The two-axis sandbox abstraction**: pluggable executor backends (`LocalPython | Blaxel | E2B | Modal | Docker | Wasm`) behind a single `executor_type=` interface, plus the explicit "sandbox-snippet vs sandbox-whole-system" topological choice. This is a design others could and should copy.
- **OTEL-first observability** as an instrumentation contract.
- **Tool interop adapters** (MCP, LangChain, Spaces) — a useful template for ecosystem bridging.

## 5. What is not safely transferable (within this topic's scope)

- The "core fits in ~1k LOC" claim is honest about the core only; the productionizing surface (sandboxes, OTEL, tool adapters, CLI, model providers) is much larger. Treat the LOC figure as design ethos, not a portability metric.
- `LocalPythonExecutor` is explicitly **not** a security boundary; any cross-project transfer must replace it with E2B/Modal/Docker/Blaxel/Wasm before production use. The AST-walker is a useful defense-in-depth layer (blocks obvious mistakes and casual prompt injection) but the docs warn even `Pillow` access lets an attacker fill the disk.
- The code-act advantage is conditional on the model being a strong code generator. On weaker models the composability gain inverts into error-prone code. Avoid generalizing benchmark wins to all model classes.
- Hub/Spaces tool ingestion presumes Hugging Face-hosted artifacts; not a transferable feature outside that ecosystem.
- Sandbox-snippet mode + managed-agents is **explicitly broken** (no creds inside the remote sandbox for the child's model call) — anyone copying the multi-agent pattern must either keep it local or commit to Approach 2 (whole-system-in-sandbox) with credential injection.

## 6. Evidence quality

- Primary sources: official GitHub repo, Hugging Face docs site (conceptual guides + secure-code-execution tutorial + multi-agent example) — all authoritative and current (release v1.25.0, 2026-05-14).
- Academic grounding is now direct: the CodeAct paper's abstract was read this iteration; the 20% / 17-LLM / 7k-CodeActInstruct numbers are confirmed at source.
- Sandbox security claims are verbatim from the docs, including the "not a security boundary" framing and the "no local python sandbox can ever be completely secure" warning.
- Multi-agent mechanism is grounded in the docs' worked example (manager CodeAgent + web_search ToolCallingAgent answering an LLM-power-2030 question).
- Star count (~27.5k) and release cadence corroborate the "growing" maturity signal.
- Caveat: independent benchmark numbers comparing smolagents (not the CodeAct paper) to LangChain/AutoGen/CrewAI on shared tasks were not captured in this pass; the maintainers' own blog posts have published GAIA / agent-benchmark comparisons but those are first-party and should be replicated.

## 7. Concrete next experiments or hypotheses

- **H1 — code-act vs tool-call wash on frontier models**: on GPT-class and Claude-class frontier models, the CodeAgent vs ToolCallingAgent gap shrinks because the providers' native tool-calling is now very strong. The CodeAct paper's 20% advantage was measured across 17 LLMs in 2024 — does it survive on 2025/2026 frontier tool-calling models? Test by running both modes on GAIA or a custom multi-step benchmark.
- **H2 — sandbox tax**: measure latency and cost overhead of E2B/Modal/Blaxel/Docker/Wasm executors vs `LocalPythonExecutor` on a multi-step web-research task. Blaxel's claim of <25ms startup makes it the natural baseline. Characterize the "security tax" of code-act in production.
- **H3 — code-act ceiling on small models**: re-run the same agent loop with 7B-class open models (Qwen, Llama) and verify whether the CodeAct paper's claim of composability advantages survives at small scale, or whether ToolCallingAgent dominates there. Cross-reference with the CodeActInstruct fine-tuning recipe.
- **H4 — managed-agent hierarchies vs AutoGen group chat**: on a planner/executor task, compare smolagents' hierarchical managed-agents (function-call ABI, isolated memory) to AutoGen's group-chat orchestration (shared transcript) for solution quality and token cost. Hypothesis: smolagents wins on token cost (no transcript bloat), AutoGen wins on tasks requiring negotiation/debate.
- **H5 — MCP tool surface**: profile how many MCP server tools a CodeAgent can ingest before context bloat degrades planning quality vs a ToolCallingAgent on the same toolset.
- **H6 — Approach 1 vs Approach 2 sandbox topology**: build the same multi-agent system both ways (single-agent + sandbox-snippet vs whole-system-in-sandbox) and measure latency, credential surface area, and engineer-hours to set up.
