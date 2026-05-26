# Research state

## Iteration 1 — seed (2026-05-26)

Seed iteration. No prior records to deepen or challenge; all 5 slots went to new directions, one per major axis of the topic's scope.

### Works deeply analyzed (medium depth, all 5)

- `langchain` — incumbent general-purpose; **execution kernel: graph-state** via LangGraph (with prebuilt ReAct wrapper); multi-agent style: orchestrator (supervisor + handoff); tool protocol: mixed (native LC + provider-native + MCP via langchain-mcp-adapters). Maturity: mature (138k stars, active 2026 releases). Anti-pattern flagged: two-mental-model confusion (legacy LangChain vs LangGraph).
- `autogen` — Microsoft canonical multi-agent; **execution kernel: orchestrator/actor model** (v0.4 rewrite); MCP support; competes with both LangChain and CrewAI. Maturity: mature.
- `crewai` — **role-play multi-agent** with Agent/Task/Crew/Process abstractions (sequential vs hierarchical); post-2024 LangChain-independent rewrite via LiteLLM; mature 1.x line with commercial Enterprise tier.
- `smolagents` — **code-act exemplar** (HF). CodeAgent emits Python code per step; ToolCallingAgent retained. Sandboxes via E2B/Modal/Docker; explicit ref to CodeAct paper (arXiv:2402.01030).
- `browser-use` — **DOM + vision loop driving Playwright** (Chromium via CDP). Single-agent. Typed Pydantic action registry. Mature (~95.5k stars).

---

## Iteration 2 — deepen + extend (2026-05-26)

Mix: 1 deepen (langchain) + 3 new (llamaindex, metagpt, skyvern). All 4 subagents returned.

### Works analyzed

- **`langchain` — depth-upgraded medium → DEEP.** Closed iter1 gaps: StateGraph source skimmed (`libs/langgraph/langgraph/graph/state.py`); maintainer multi-agent blog read; supervisor/swarm/hierarchical/network topologies mapped to specific API constructs.
- **`llamaindex` (agents) — new, medium.** **Execution kernel: event-driven step-based async Workflow.** Multi-agent: handoff-by-name (`can_handoff_to=[...]`), shared `Context` for state. First-class MCP via `BasicMCPClient`/`McpToolSpec`.
- **`metagpt` — new, medium.** **Execution kernel: SOP-driven role-play.** Most prescriptive multi-agent in the OSS landscape. ICLR 2024 + ICLR 2025 orals. Rebrand to FoundationAgents is UPWARD, not abandoned.
- **`skyvern` — new, DEEP.** **Execution kernel: hybrid vision-first.** Platform-shape (FastAPI + Postgres + UI + block-DAG workflows) vs browser-use library-shape. AGPL-3.0 (adoption barrier). Pluggable engine abstraction.

### Strongest iter 2 findings

1. **General-purpose triad = three distinct kernels.** langchain (typed graph-state); llamaindex (event-driven Workflow); autogen (actor-model chat room). Not interchangeable.
2. **MCP convergence is the iter-2 confirmed trend.** 5 frameworks → MCP.
3. **Browser/computer-use splits library-shape vs platform-shape.**

---

## Iteration 3 — close tripod + close gaps (2026-05-26)

Mix: 2 deepens (smolagents, browser-use) + 2 new (openmanus, openai-agents-sdk). All 4 subagents returned.

### Works analyzed

- **`smolagents` → DEEP.** All 4 gaps closed: CodeAct paper (arXiv:2402.01030, Wang et al.) confirmed as the design root — **20% absolute success-rate improvement across 17 LLMs on API-Bank** vs JSON tool-calls. Sandbox security matrix captured (LocalPython explicitly NOT a boundary; E2B/Modal/Blaxel/Docker/Wasm are). Multi-agent: function-call ABI (task-string in / final-text out, isolated child memory). Maintainer rubric: **ToolCallingAgent for single-timeline browsing; CodeAgent for planning/orchestration**.
- **`browser-use` → DEEP (with CORRECTION).** DOM construction verified: **CDP three-source fusion** (DOMSnapshot + DOM.getDocument(pierce=True) + accessibility tree, joined on backendDOMNodeId). NOT JS-walking. **CORRECTION to iter-1**: indices are NOT stable across re-renders — fresh per serialization cycle. Vision mode keeps **last-1 screenshot only** (not last-N). No first-party WebArena/Mind2Web numbers. Awesomeagents.ai cites browser-use+GPT-4o as "strongest open-source baseline."
- **`openmanus` — new, DEEP.** **General computer-use leg** of the OSS tripod (vs browser-only browser-use and Skyvern). Built by **MetaGPT core team** — first `maintainer_overlap` edge in the graph. Execution kernel: clean `ReActAgent → ToolCallAgent → Manus` inheritance, plus optional planner-executor flow (self-labeled unstable). Tools: browser (Playwright), terminal sandbox, filesystem, Python, Crawl4AI, GUI vision. MCP client+server. ~56.4k stars but slowing maintenance (v0.3.0 April 2025, ~150 issue backlog, team partly on OpenManus-RL with UIUC).
- **`openai-agents-sdk` — new, medium.** **Successor to Swarm** (first `fork_or_rebrand_of` edge in the graph). MIT, IN scope. Canonical primitive: **handoff-as-tool-call** (Runner observes model's `transfer_to_<agent>` choice) — sharply contrasts LangGraph's `Command(goto=...)` graph-level edge. Same intent, different implementation layer. Anti-patterns flagged: **soft OpenAI lock-in** (hosted tools, Traces, Responses-API features degrade outside OpenAI); **tracing-on-by-default** ships data to OpenAI unless disabled (data-governance footgun).

### Strongest iter 3 findings

1. **Browser/computer-use tripod is closed and confirmed.** Library (browser-use, MIT) vs platform (Skyvern, AGPL) vs general computer-use (openmanus, MIT). Three distinct shapes, all deep records.
2. **MCP convergence is now overdetermined.** Connected from **8 frameworks** (autogen, langchain, llamaindex, metagpt, skyvern, smolagents, openmanus, openai-agents-sdk). Every recorded framework with tool-use supports it. The protocol-convergence thesis is the dominant 2026 finding.
3. **Handoff has two competing designs.** Tool-call-shaped (OpenAI Agents SDK, smolagents managed-agents) vs graph-edge-shaped (LangGraph `Command(goto=)`). Both work; the choice carries trace-shape and observability implications.
4. **First fork/rebrand edge** (openai-agents-sdk ← swarm); **first maintainer_overlap edge** (openmanus ↔ metagpt). The graph is gaining cross-cluster structure.
5. **Iter-3 also produced a CORRECTION**: browser-use element indices were claimed stable in iter 1 — source-verified false. This is exactly the kind of error the deepen-pass is supposed to catch.

### Records still medium

autogen, crewai, llamaindex, metagpt, openai-agents-sdk. The general-purpose triad's 2 medium records (autogen, llamaindex) are the highest-value next deepens.

### Best next directions for iteration 4

Per iteration_mix minimums:
- **Deepen: autogen** — close the gap on v0.2 → v0.4 actor-model rewrite design rationale.
- **Deepen: llamaindex** — source-verify the AgentWorkflow event-driven kernel claim.
- **New: chatdev** — completes the role-play subgraph (CrewAI + MetaGPT + ChatDev).
- **Challenge: MCP spec deep-read** — pressure-test the "every framework supports MCP" claim by reading the spec and checking adoption depth (client only? server only? tools? prompts? resources?). MCP is the highest-leverage protocol node; promote to recorded.
- **Optional new: agno OR bee OR magentic OR pydantic-ai** — smaller typed-agent entrants test whether the "execution kernel = discriminator" thesis holds for newcomers.

### Report conclusions (still no synthesis report — first synthesis at cycle 7)

The "execution kernel is the main discriminator" hypothesis is now strongly supported across 10 records — every framework's distinguishing feature lands in this concept layer. **5 of 10 records are now deep**; the synthesis editor at cycle 7 will have a strong base.

### Operational notes (iter 3)

- 2-3 cron ticks fired mid-iter-3; all correctly skipped.
- All 4 subagents returned envelopes within the watchdog window.
- Conversation overhead from 2-min cron remains high; user has been alerted to the option of `/loop stop` + `/loop 10m loops/open-source-agent-frameworks` for slower cadence.
- 1 graph correction (browser-use element-index stability) was caught by the deepen pass — exactly what the protocol is designed for.

---

## Iteration 4 — close general-purpose triad + role-play subgraph + MCP protocol (2026-05-26)

Mix: 2 deepens (autogen, llamaindex) + 2 new (chatdev, MCP). All 4 subagents returned.

### Works analyzed

- **`autogen` → DEEP.** v0.2 → v0.4 rationale captured verbatim from MSR blog: "architectural constraints, inefficient API, limited debugging and intervention functionality" → fixed via actor model with explicit lifecycle, async message passing, and topology composition. Four-layer architecture: **Core / AgentChat / Ext / Studio**. SelectorGroupChat prompt template uses `{participants}`/`{roles}`/`{history}` variables; three override knobs (`selector_func`, `candidate_func`, `allow_repeated_speaker`). MCP via `autogen_ext.tools.mcp` — all 3 transports, `mcp_server_tools()` factory, `McpWorkbench` context manager, `pip install -U 'autogen-ext[mcp]'`.
- **`llamaindex` (agents) → DEEP.** Workflow kernel verified against source: `Workflow(metaclass=WorkflowMeta)`, `@step` → `StepConfig`, control loop is **tick_buffer + pure `_reduce_tick` reducer + worker_tasks set + heapq scheduled_wakeups** (NOT asyncio.Queue/gather). `AgentWorkflow(Workflow, PromptMixin)` IS a Workflow subclass; `FunctionAgent`/`ReActAgent` extend `BaseWorkflowAgent` and are composed inside (NOT Workflows themselves). **Handoff mechanism comparison (3 frameworks):** llamaindex uses `FunctionTool(return_direct=True)` writing to `ctx.store` + `aggregate_tool_results` step does swap → mechanically closer to OpenAI Agents SDK's `transfer_to_<agent>` tool-call than to LangGraph's `Command(goto=)` graph-edge. MCP via `BasicMCPClient(ClientSession)` — full primitive coverage (tools + resources + prompts + OAuth via `with_oauth()`), broader than typical tools-only.
- **`chatdev` — new, DEEP.** NOT abandoned (refuted the suspicion). **Jan 2026 v1 → v2 pivot from "virtual software company" to DevAll**, a general-purpose zero-code multi-agent orchestration platform. Same lab (OpenBMB / Tsinghua THUNLP), same name, same repo, 33.2k stars, NeurIPS 2025 follow-up paper. v1.x preserved on legacy branch. **Communicative dehallucination** is the actual technical contribution — forces a clarification-question turn from assistant back to instructor before action, generalizable beyond software-engineering vertical. v2.0 adds MCP, visual DAG editor, YAML workflows, Blender/Manim/OpenClaw connectors. Anti-pattern: v2.0 zero-code claims currently marketing-heavy and unbenchmarked third-party.
- **`MCP` — new, DEEP. Protocol-shaped record, not framework.** Spec version 2025-06-18 (next dated revision 2025-11-25 in repo). **Two current transports**: stdio + Streamable HTTP; HTTP+SSE (2024-11-05) deprecated. **GOVERNANCE BOMBSHELL**: MCP transferred from Anthropic to **Linux Foundation** in 2025 — "Model Context Protocol — A Series of LF Projects, LLC". Most consequential governance event in agent-protocol land in 2025. **ADOPTION-CLAIM PRESSURE-TEST (HEADLINE FINDING)**: the "every framework supports MCP" claim is true in name only. Of 10 framework records, **9 implement client-only + tools-only** (minimal subset). Only **browser-use** ships both client AND server. Only **OpenAI Agents SDK** adds prompts on top of tools. **Resources, Sampling, Roots, Elicitation are essentially unimplemented** across the framework set. The existing `protocol_supports` edges OVERSTATE uniformity — schema should carry `{role, primitives}` depth metadata in a future iteration.

### Strongest iter 4 findings

1. **The MCP adoption-depth correction is the biggest synthesis-relevant finding of the watch so far.** "Protocol convergence" is real at the schema level but illusory at the capability level. The synthesis brief should lead with this nuance.
2. **General-purpose triad is now ALL DEEP.** langchain (graph-state, deep), llamaindex (event-driven Workflow, deep), autogen (actor-model, deep). Three distinct kernels, each source-verified.
3. **Role-play subgraph is now closed and deep on the academic side.** CrewAI (medium, flat role-play, commercial lean) + MetaGPT (medium, SOP-prescriptive) + ChatDev (deep, communicative dehallucination + v2 pivot). The depth asymmetry (academic ones deep, commercial CrewAI medium) is intentional — CrewAI is the productization line; its docs are stable, value is in benchmark not source.
4. **Handoff has THREE designs, not two** (correcting iter 3's two-design framing): (a) tool-call-shaped (OpenAI Agents SDK explicitly, llamaindex mechanically), (b) graph-edge-shaped (LangGraph `Command(goto=)`), (c) function-call-shaped with isolated child memory (smolagents managed-agents). All three converge on "swap the active agent" but with different observability profiles.
5. **First influenced_by-and-competes-in-niche pair** in the same dyad (metagpt ↔ chatdev): they influenced each other AND compete in the same niche. The graph now expresses "evolved together as rivals."

### Records still medium

crewai, metagpt, openai-agents-sdk. The latter two are highest-value next deepens.

### Best next directions for iteration 5

- **Deepen openai-agents-sdk** — Tracing data-governance write-up + guardrails primitive comparison vs LangChain validators.
- **Deepen metagpt** — AFlow paper (ICLR 2025 oral) + DevAll-vs-MGX productization comparison.
- **New: agno OR pydantic-ai** — small typed-agent entrant to test the kernel-discriminator thesis on newer entries.
- **Challenge: write up a per-framework MCP adoption-depth matrix** as a sources/protocol_notes/mcp_adoption_depth.md — verify the 9-of-10-claim-but-shallow finding by re-checking each framework's MCP implementation.

### Report conclusions (still 2 iterations from synthesis at cycle 7)

The "execution kernel is the main discriminator" thesis is **maximally supported**: 12 records, every one's distinguishing field lands in this layer. The MCP adoption-depth nuance is the synthesis brief's most important callout. The browser/computer-use tripod (library / platform / general-cu) and the role-play subgraph (CrewAI flat / MetaGPT SOP / ChatDev communicative-dehallucination) both look stable enough to put in the comparison matrix.

### Operational notes (iter 4)

- 2 cron ticks fired mid-iter-4; all correctly skipped.
- All 4 subagents returned envelopes (longest was MCP at ~4 min, longest llamaindex at ~5 min).
- The MCP record was the first protocol-shaped record; schema accommodated with descriptive N/A overrides. Future iterations may want a dedicated protocol schema if A2A/ACP get recorded.

---

## Iteration 5 — deepen typed-multi-agent + small-entrant stress test (2026-05-26)

Mix: 2 deepens (openai-agents-sdk, metagpt) + 2 new (pydantic-ai, agno). All 4 subagents returned.

### Works analyzed

- **`openai-agents-sdk` → DEEP.** All 4 gaps closed. **Tracing default `trace_include_sensitive_data=True`**, hardcoded `BackendSpanExporter` endpoint, **ZDR-incompatible** (data-governance footgun). Guardrails: parallel-by-default (tokens may be billed before tripwire), scoped to first/last agent in chain. **LiteLLM bridge is officially "beta / best-effort"** — hosted tools / `ToolSearchTool` / structured outputs / reasoning summaries / Responses API / usage metrics ALL degrade outside OpenAI. MCP: client-only, tools+prompts (no resources, no sampling), four transports incl. `HostedMCPTool`.
- **`metagpt` → DEEP.** All 4 gaps closed. **AFlow** (arXiv 2410.10762, ICLR 2025 oral) = MCTS over code-represented workflow graphs with typed Operators. **SOP encoding source-verified**: Pydantic `Role` + `ActionNode` + **typed pub/sub Environment** (NOT YAML — the assumption from iter 2 was wrong). **MGX rebranded to Atoms 2026-01-13** — 500k users / $1M ARR in 1 month (productization signal). ChatDev mechanical contrast: ChatDev is **Chat-Chain of two-agent atomic chats with inception prompting**, MetaGPT is typed pub/sub with role artifacts — different orchestration shapes despite same niche.
- **`pydantic-ai` — new, DEEP.** **KERNEL POSITION: typed-contract-primary with validation-failure as first-class control-flow event.** Auto-retry-on-validation is a kernel feature. `pydantic-graph` is **opt-in escape hatch, NOT default kernel** — explicit differentiation from LangGraph (where graph IS the runtime). Multi-agent: 5-pattern taxonomy (delegation, programmatic handoff, graph, Deep Agents preset, A2A protocol) composed from primitives — no first-class "swarm" object. v1.x stable (v1.102.0, MIT, 17.3k stars). **Validates the kernel-discriminator thesis with a NEW kernel position.**
- **`agno` (formerly Phidata) — new, DEEP. COUNTEREXAMPLE.** Kernel verdict: **convergent kernel, distinct envelope**. Same family as LangChain `AgentExecutor` / LlamaIndex `AgentRunner`. Differentiation lives ABOVE the kernel: (1) three-layer memory model with cross-session user-fact extraction, (2) eval-as-first-class with four orthogonal modes (accuracy / agent-as-judge / performance / reliability), (3) bundled AgentOS runtime (REST/SSE/WS, RBAC, cron, OTel) — moves Agno out of pure-SDK niche into "platform". 5-levels taxonomy (L1 tools → L5 workflows) is curriculum scaffold, not authoritative. **Anti-pattern**: 2024 benchmark claims (~3μs instantiation / ~6.5 KiB) are cold-instantiation-only and NOT representative; v2 docs have de-emphasized them. First `benchmark_pair` edge in graph: agno ↔ langchain.

### Strongest iter 5 findings

1. **The kernel-discriminator thesis is BOTH validated and partially refuted.**
   - **Validated** by pydantic-ai: introduces a genuinely new kernel position (typed-validation-as-control-flow).
   - **Partially refuted** by agno: convergent kernel with langchain/llamaindex, but differentiation moves UP into memory + eval + runtime envelope. So the thesis should be reframed: "execution kernel is the dominant discriminator for kernel-distinct frameworks; for convergent-kernel frameworks, the envelope (memory model + eval + runtime) becomes the discriminator." The synthesis brief should call this out.
2. **OpenAI Agents SDK has a non-trivial data-governance footgun.** Default-on tracing + sensitive-data default + hardcoded OpenAI endpoint + ZDR-incompatibility = compliance trap for non-OpenAI shops. This is worth its own anti-pattern callout in the report.
3. **FoundationAgents team is heavily productizing.** MGX → Atoms in Jan 2026 ($1M ARR in a month), ChatDev v1 → DevAll in Jan 2026, MetaGPT framework still active. This is a real commercialization signal across the academic-bridge cluster.
4. **Handoff designs (from iter 4) refined to a 4-design taxonomy.** (a) tool-call-shaped (openai-agents-sdk, llamaindex), (b) graph-edge-shaped (langgraph), (c) function-call-shaped with isolated child memory (smolagents managed-agents), (d) typed-contract-shaped with delegation+programmatic handoff (pydantic-ai composes from primitives, no single canonical primitive).
5. **First `benchmark_pair` edge** (agno ↔ langchain). The Agno team has historically published Agno-vs-LangGraph cold-instantiation numbers — even though those numbers are misleading, the comparison is a real benchmark posture.

### Records still medium

Only **crewai**. By design — CrewAI is the most productized of the role-play frameworks; its docs are stable but value-add is in benchmark not source. Deepening it would mostly involve LiteLLM bridge depth + Enterprise tier feature comparison. Deferring as low-priority.

### Best next directions for iteration 6 (last before synthesis at cycle 7)

- **New: write a per-framework MCP adoption-depth matrix** (sources/protocol_notes/mcp_adoption_depth.md). The iter-4 headline finding needs receipts. Source: re-read each framework's record + verify against MCP spec primitive coverage (tools / resources / prompts / sampling / roots / elicitation; client / server).
- **New: A2A protocol record** (analog to MCP for agent-to-agent) — completes the interop layer.
- **Challenge: cross-framework benchmark survey** — enumerate AgentBench, GAIA, SWE-bench, WebArena, VisualWebArena, Mind2Web cross-framework scores. The benchmark route has been untouched at search_count=0.
- **Optional new: CodeAct paper** (arXiv:2402.01030) — academic anchor for smolagents already referenced 3+ times in records.

### Report conclusions (1 iteration to synthesis at cycle 7)

The report will likely organize around:
- TL;DR: 14 frameworks across general-purpose / multi-agent / browser-computer-use / typed-first niches; tripod-shape in browser/computer-use; triad in general-purpose; subgraph in role-play; protocol convergence (MCP) overstated at the capability level.
- Taxonomy: execution kernel × multi-agent style × deployment envelope (NEW axis after agno).
- Comparison matrix: 14 rows × ~10 columns.
- Key axes of differentiation: 6 axes (kernel, multi-agent style, tool/memory, observability, deployment envelope, MCP-adoption-depth).
- Anti-patterns section: marketing benchmarks (agno cold-instantiation), data-governance traps (openai-agents-sdk tracing), stars-vs-substance (langchain), claim-vs-implementation drift (MCP across frameworks).

### Operational notes (iter 5)

- 4 cron ticks fired mid-iter-5; all correctly skipped.
- All 4 subagents returned envelopes; longest was agno at ~3.7 min duration (likely longest because of the rebrand-trail research).
- 14 records on disk; **13 of 14 are deep**. crewai is the only medium-depth one — and deliberately so.

---

## Iteration 6 — final pre-synthesis cycle (2026-05-26)

Mix: 1 deepen (crewai) + 1 new (A2A protocol) + 2 curated notes (MCP adoption-depth matrix, cross-framework benchmark survey). All 4 returned.

### Works analyzed

- **`crewai` → DEEP.** Last medium → deep. All 5 gaps closed. **Process** is `str, Enum` with literally only `sequential` and `hierarchical` (`# TODO: consensual` reserved); hierarchical's `_create_manager_agent()` either wraps user's `manager_agent` (forcing `allow_delegation=True`) or builds one from i18n template wrapping `manager_llm`. **LiteLLM is optional dependency**, not core (`crewai[litellm]`) — bridge-not-spine; native paths exist for OpenAI/Anthropic/Google/Azure/Bedrock; LiteLLM widens to ~15 more providers. **Memory: UNIFIED Memory class** (CORRECTION to iter-2 record's "multi-tier"), hierarchical scopes, composite scoring (semantic + recency-decay + importance), default LanceDB at `./.crewai/memory`. **Mem0 is NOT used in OSS.** Enterprise/AMP delta: managed deployment, REST API, traces, Crew Studio, Tool Repo, webhook streaming all closed. MCP: client-only, tools-only, transports stdio/SSE/streamable HTTPS.
- **`A2A` (Agent-to-Agent protocol) — new, DEEP.** Protocol-shaped record (second one, after MCP). **Spec v1.0.0 (2026-03-12)**, three bindings (JSON-RPC 2.0 / gRPC / HTTP+REST), SSE streaming + webhook push, Apache-2.0. **Governance: Google donated to Linux Foundation mid-2025**, launched at OSS NA 23 June 2025 under the **LF Agentic AI Foundation** (different LF home from MCP's LF Projects, LLC). 8-seat TSC: Google, Microsoft, Cisco, AWS, Salesforce, ServiceNow, SAP, IBM Research. **AgentCard** = JSON document at `/.well-known/agent-card.json` (RFC 8615); v1.0 added Signed Agent Cards for impersonation defense. Adoption splits along OpenAI/non-OpenAI axis: native (langchain/LangGraph, crewai, autogen, llamaindex, Google ADK, Semantic Kernel); server-only (pydantic-ai via external fasta2a); NO native support (openai-agents-sdk Issue #472 open, swarm). **ACP (IBM/BeeAI) merged into A2A in 2026** — effectively one inter-agent protocol now. **A2A and MCP are orthogonal/complementary, NOT competitive** (host↔server vs agent↔agent).

### Curated notes (sources/)

- **`sources/protocol_notes/mcp_adoption_depth.md`** — per-framework MCP adoption-depth matrix. THREE CORRECTIONS to iter-4's headline finding:
  1. **browser-use does NOT implement MCP** at all (iter-4 audit row was wrong).
  2. **llamaindex** has CLIENT-only but with **all 3 server primitives + OAuth** (tools+resources+prompts) — materially deeper than iter-4 said.
  3. **3 frameworks ship MCP SERVERS** (skyvern, openmanus, agno) — iter-4 missed this.
  
  Revised distribution across 13 framework records:
  - 1 no-MCP (browser-use)
  - 7 client-only + tools-only (langchain, autogen, crewai, smolagents, metagpt, chatdev, pydantic-ai)
  - 1 client-only with tools+prompts (openai-agents-sdk)
  - 1 client-only with all 3 server-side primitives + OAuth (llamaindex)
  - 3 client + server, tools-only (skyvern, openmanus, agno)
  
  **Revised aggregate verdict**: tools-only axis holds; client-only axis cracks. "Every framework supports MCP" is overstated AND the depth of support varies significantly — exactly the nuance the synthesis brief should lead with.

- **`sources/benchmark_notes/cross_framework_2026_05.md`** — cross-framework benchmark survey. HEADLINE: **only 4 of 13 frameworks have third-party citable benchmark scores** (smolagents, autogen, metagpt, chatdev). 7 have ZERO citable scores. AgentBench / SWE-bench / WebArena rank LLMs and end-to-end agent products, NOT frameworks — a load-bearing distinction. **The field competes on developer ergonomics and ecosystem, not measurable task performance.** Caveat: AFlow paper table specifics need a manual PDF read at synthesis time.

### Strongest iter 6 findings

1. **The MCP adoption-depth claim from iter 4 needed sharpening.** The headline survives directionally but had 3 specific errors. This is exactly what the "challenge" iteration is for — pressure-test prior conclusions.
2. **A2A vs MCP governance landscape**: BOTH protocols at LF in 2025, but at different LF homes (Agentic AI Foundation vs LF Projects, LLC) — a real institutional split. ACP merged into A2A — protocol consolidation.
3. **Benchmarking the framework layer is currently broken.** Mainstream benchmarks rank LLMs or products, not libraries. This makes "framework X is best on benchmark Y" claims nearly always misleading. The synthesis brief must lead with this caveat for the comparison section.
4. **OpenAI vs everyone-else split is now structurally visible**: openai-agents-sdk and swarm are the ONLY frameworks without native A2A support. The OpenAI handoff protocol is proprietary; everyone else converged on A2A.
5. **Three corrections** to prior records caught in iter 6 alone (browser-use MCP, llamaindex MCP depth, crewai memory not multi-tier). The depth-upgrade + challenge protocol is consistently surfacing prior errors — high-value pattern.

### Records inventory

**15 records, ALL DEEP.** 13 frameworks (langchain, autogen, crewai, smolagents, browser-use, llamaindex, metagpt, skyvern, openmanus, openai-agents-sdk, chatdev, pydantic-ai, agno) + 2 protocols (MCP, A2A).

Graph: 17 entity nodes (15 recorded + swarm, openinterpreter, openai-computer-use referenced) + 9 route nodes; **~88 edges** with all 7 edge types now present (`benchmark_pair` was the last unlocked in iter 5).

Curated notes (sources/): 2 (MCP adoption-depth matrix, benchmark survey).

### Best next directions — these become the SYNTHESIS plan (cycle 7)

Iteration 7 will be `synthesis` mode per `iteration_mix.synthesis_every_n_cycles=7`. The synthesis editor should:

1. Lead with the **kernel-discriminator-with-envelope-caveat** thesis (from iter 5's agno finding).
2. Lead with the **MCP adoption-depth nuance** (from iter 4 + iter 6 corrections).
3. Lead with the **benchmark-grounding gap** (from iter 6 survey).
4. Section structure per `topic.yaml.report_sections`: tldr, taxonomy, families, comparison, differentiators, trends, anti_patterns, further_reading, open_questions.
5. Use the MCP adoption matrix and benchmark survey notes as direct inputs.
6. Note: AFlow PDF table values still need a verification fetch (flagged in benchmark survey caveat).

### Report conclusions (cycle 7 incoming)

The synthesis editor at iter 7 has very strong material: 15 deep records + 2 curated notes + ~88 edges + 5 iterations of refined `research_state.md`. The brief will be detailed and benchmarked-where-possible.

### Operational notes (iter 6)

- 2 cron ticks fired mid-iter-6; correctly skipped.
- All 4 subagents returned envelopes; longest was benchmark survey at ~3 min (network-limited).
- First iteration with 2 of 4 subagents writing to `sources/` instead of `records/` — schema accommodation worked cleanly; per-work isolation held.
- Iter 6 caught 3 prior-iteration errors (browser-use MCP, llamaindex MCP depth, crewai memory tiers). The deepen/challenge protocol is paying off.

---

## Iteration 7 — synthesis cycle (2026-05-26)

First synthesis. Mode: SYNTHESIS (cycle 7 % synthesis_every_n_cycles=7 == 0). Read all 15 records + 2 curated notes + this research_state. Wrote three report files:

- `report/main.md` — 9 sections per topic.yaml.report_sections[]: tldr, taxonomy, families, comparison, differentiators, trends, anti_patterns, further_reading, open_questions.
- `report/reference_index.md` — 6 must-reads / 9 important supporting / 0 shallow / 3 referenced-only / 2 curated notes.
- `report/iteration_log.md` — first entry.

**Two reframings the synthesis settled:**
1. Kernel-discriminator thesis is dominant for kernel-distinct frameworks; for kernel-convergent frameworks (agno), the envelope (memory + eval + runtime) becomes the discriminator.
2. Protocol convergence is real at governance/schema level, illusory at capability level.

**Commit/push: SKIPPED.** The synthesis spec says to commit + push at end of synthesis loop, but the working tree has unrelated WIP changes (`.claude/loop.md`, `.claude/skills/argus/SKILL.md`, `README.md`) that the user did not authorize for commit. Per no-autonomous-commit policy + the synthesis spec's "investigate unexpected files rather than blindly stage" directive, report files written, commit deferred to user.

---

## Iteration 8 — papers + a load-bearing correction (2026-05-26)

Mix: 2 new paper records (codeact-paper, aflow-paper). User stopped the cron (`/argus loop stop`) mid-iter-8 dispatch; both subagents completed anyway and iter-8 collation finished as final consolidation.

### Works analyzed

- **`codeact-paper` — new, DEEP.** Wang et al., ICML 2024 (arXiv:2402.01030, v4 2024-06-07, CC BY 4.0), UIUC + Apple. PDF saved to `sources/papers/codeact_arxiv_2402.01030.pdf` (4.3 MB). Mechanism: single unified action space = Python source code via stateful interpreter; multi-turn loop; agent/user/environment trio formalization. **CodeActInstruct**: 7,000 multi-turn trajectories at `huggingface.co/datasets/xingyaoww/code-act`. Limitations the authors flag: hallucination persists, self-improvement "limited," no sandboxing in the paper (smolagents/openinterpreter fill that downstream). **CORRECTION** to iter-3 smolagents record: the "20% absolute improvement on 17 LLMs" is on **M3ToolEval** (new 82-task benchmark introduced in this paper), NOT API-Bank.
- **`aflow-paper` — new, DEEP.** Tang et al., ICLR 2025 oral (arXiv:2410.10762). PDF saved to `sources/papers/aflow_arxiv_2410.10762.pdf` (1.34 MB). Mechanism: **MCTS over code-represented workflow graphs** with 7 typed Operators; soft mixed-probability selection (lambda=0.2, alpha=0.4); Claude-3.5-Sonnet code rewrite; 20 iters × 5 validation runs. **Headline**: 80.3% avg vs CoT-SC 76.0% (+4.3 abs); beats ADAS +13.1pp average. **Pareto-cost claim verified**: DeepSeek-V2.5 running an AFlow-searched workflow matches GPT-4o IO at **4.55% of cost** on HumanEval.

### MAJOR CORRECTION FROM ITER 8

**The cycle-7 synthesis brief's claim that AFlow is "the single most useful head-to-head source" for MetaGPT vs AutoGen vs ChatDev was wrong.** Direct PDF read shows AFlow baselines are prompting techniques (IO, CoT, CoT-SC, MedPrompt, MultiPersona Debate, Self-Refine) + ADAS — NOT MetaGPT/AutoGen/ChatDev. Those names appear 1/0/0 times in the paper, all in references.

Consequences:
1. **`sources/benchmark_notes/cross_framework_2026_05.md`** has been corrected at iter 8 with a prominent correction notice at top.
2. The cycle-7 "**4 of 13 frameworks have third-party citable scores**" drops to **2 of 13** (smolagents via GAIA; browser-use via awesomeagents.ai cross-tracker). autogen has community GAIA submissions but no first-party leaderboard entry.
3. **The cycle-7 `report/main.md` benchmark-related claims need revision at the next synthesis (cycle 14)** — specifically the TL;DR's "only 4 frameworks have third-party citable benchmarks", the "self-published benchmarks" Anti-patterns entry, and the "benchmarking layer is broken" Trends paragraph (spirit correct, count needs update).
4. **Iter-3 smolagents record's API-Bank attribution should be specified as M3ToolEval** — minor citation cleanup.

This is the **second time** the deepen/verify protocol has caught a load-bearing factual error in a prior iteration (iter 6 caught 3; iter 8 caught 2). Pattern: **indexes and curated notes drift faster than per-work records; deepening papers occasionally invalidates summarized claims about them.** Prior bold claims should be assumed provisional until cross-validated.

### Records inventory

**17 records, all DEEP.** 13 frameworks + 2 protocols + 2 papers. Knowledge graph: 19 entity nodes (17 recorded + 3 referenced — swarm, openinterpreter, openai-computer-use) + 9 route nodes; ~92 edges across all 7 edge types. Curated notes: 2 (MCP adoption-depth matrix; cross-framework benchmark survey, REVISED iter 8). PDFs saved: 2 (codeact, aflow) in `sources/papers/`.

### Operational notes (iter 8)

- User typed `/argus loop stop` after iter-8 dispatch. Cron job 02e7d7b5 cancelled. No more recurring ticks.
- Both subagents returned envelopes during/after stop. Collation completed by parent as final consolidation.
- Iter 8 was a lighter cycle (2 subagents vs 4) — appropriate post-synthesis.
- The 2-min cron cadence produced significant conversation overhead (each iter saw 2-4 cron-tick interruptions). Future runs may benefit from longer cadence (`/loop 10m`).

### Resume notes (when user re-fires)

- `topics/open-source-agent-frameworks/logs/cycle.txt` is at **8**.
- Re-fire with `/argus loop open-source-agent-frameworks` to continue.
- Cycle 14 is next synthesis — should re-process benchmark + count claims using iter-8 corrections.
- Next research angles (cycle 9+): Independent engineering write-ups route (untouched), Example apps & cookbook inspection route (untouched), OpenAI Agents SDK Issue #472 status, A2A adoption velocity, OpenManus maintenance signal mid-2026, ChatDev DevAll v2 third-party benchmarks.
