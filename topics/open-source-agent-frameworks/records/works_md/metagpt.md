# MetaGPT

- Repo: https://github.com/FoundationAgents/MetaGPT (redirected from https://github.com/geekan/MetaGPT)
- Paper: arXiv:2308.00352 ("MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework"), ICLR 2024 oral
- Follow-on: AFlow (arXiv:2410.10762, ICLR 2025 oral), SPO, AOT
- Stars: ~68.3k | License: MIT | Language: Python (97.5%)
- Last commit observed: 2026-01-21
- Maintainer: FoundationAgents org (rebrand of geekan personal org). Commercial arm: DeepWisdom -> MGX (launched 2025-02-19) -> rebranded to Atoms on 2026-01-13.

## 1. What this work actually does

MetaGPT turns a one-line natural-language requirement into a small-to-medium software project by running it through a simulated software company: a Product Manager agent writes the PRD, an Architect writes the design doc, a Project Manager decomposes tasks, Engineers write code, and a QA agent reviews. Each role is an LLM-driven actor with a fixed prompt template and a structured artifact schema; the artifacts (PRD.md, design.md, task_list.md, code files, test reports) are the medium of inter-agent communication, not free-form chat. A more recent addition, Data Interpreter, applies the same philosophy to data-analysis pipelines. The commercial productization MGX (rebranded Atoms 2026-01) exposes the same multi-role SOP as a SaaS — chat with an AI team-lead, PM, architect, engineer, and analyst 24/7 to build websites, blogs, shops, analytics, or games. MGX hit 500k users and $1M ARR within one month of its Feb 2025 launch with zero ad spend; the 2026 Atoms rebrand reframes the product from "AI dev team" to "build complete businesses."

## 2. Technical mechanism (deep, source-verified)

The orchestration primitive is the **Standard Operating Procedure (SOP)** — but SOPs are not YAML configs, they are **Python class hierarchies + Pydantic-typed artifact schemas + prompt templates wired through a typed pub/sub message bus**. Concretely:

- **Role** is a Pydantic `BaseModel` (`metagpt/roles/role.py`) with attributes `name`, `profile`, `goal`, `constraints`, `actions`, `states`. Each subclass — `ProductManager`, `Architect`, `ProjectManager`, `Engineer`, `QAEngineer`, `Researcher`, `DataInterpreter`, `Sales`, `Teacher`, etc. — declares its `_actions` list and a `_watch` set (the action types whose outputs it consumes).
- **RoleContext** holds runtime state: `msg_buffer` (incoming message queue), `memory`, `state` (index into the `states` list), `todo` (current Action), `watch` (subscription filter).
- **Reaction modes** control state-transition logic:
  - `REACT` — LLM picks the next state by reading a `STATE_TEMPLATE` prompt ("Just answer a number between 0-{n_states}, choose the most suitable stage").
  - `BY_ORDER` — actions execute in fixed sequence regardless of observations (the classic SOP path).
  - `PLAN_AND_ACT` — a planner generates a task sequence, then executes (used by Data Interpreter).
- **Actions** subclass `Action` and emit typed artifacts via `ActionNode` (e.g., `WRITE_PRD_NODE`, `REFINED_PRD_NODE`). The `ActionNode.fill()` method runs the LLM and produces an `instruct_content` payload which is a Pydantic model serialized to JSON; the Action then writes that as a `Document` to disk (PRD.md, design.md, etc.).
- **Environment** is the message bus: `publish_message()` -> downstream roles' `msg_buffer` -> `_observe()` filters by `rc.watch` -> stores in `rc.memory` -> the role reacts when its bound action type appears.
- **Verification** is enforced by the Pydantic schemas themselves: a downstream role can only consume an artifact whose schema matches what it expects, which gives MetaGPT a stronger "typed handoff" guarantee than ChatDev's free-form natural-language dialogue.
- **LLM layer** is provider-agnostic via `config2.yaml`: OpenAI, Azure, Anthropic, Gemini, DeepSeek, Ollama, Groq, Llama API, Moonshot, Zhipu, and any OpenAI-compatible endpoint.
- **Tools** are Action classes wired per-role; MCP Registry integration was announced in 2025 but remains a shim, not the primary tool pathway.

### AFlow — the research trajectory toward self-discovered SOPs

AFlow (arXiv:2410.10762, ICLR 2025 oral) is the team's answer to the "hand-coded SOPs are rigid" critique. It represents a workflow as **code-represented graph**: nodes are LLM invocations (each Node controls temperature, format, prompt, model), edges are control flow. Reusable **Operators** (Generate, Format, Review, Revise, Ensemble, Test, Programmer) are predefined combinations of Nodes that accelerate search. AFlow runs **Monte Carlo Tree Search over the workflow code space**, mutating workflows via code modification using LLMs, guided by tree-structured experience and execution feedback. Across six benchmarks (HumanEval, MBPP, GSM8K, MATH, HotpotQA, DROP) it averages **+5.7% over SOTA hand-coded baselines** and enables small models to match GPT-4o at **4.55% of inference cost**. This is the same team trying to automate what MetaGPT v1 had hard-coded — strong signal the framework is migrating from "ship one good SOP" to "search for the optimal SOP per task."

### MetaGPT vs ChatDev — mechanical comparison

Both are academic role-play frameworks for a virtual software company; mechanically they diverge:

- **Coordination unit**. MetaGPT: N specialized roles running concurrently, communicating via a typed pub/sub message bus with on-disk Pydantic artifacts. ChatDev: a linear **Chat-Chain** of phases (Design, Coding, Testing, Documenting), each phase decomposed into **atomic chats** between exactly two agents.
- **Communication primitive**. MetaGPT: typed Message objects carrying Pydantic-serialized artifacts; consumers declared via `_watch`. ChatDev: free-form natural-language dialogue inside each atomic chat, with **instructor / assistant** roles using **inception prompting** to prevent role-flip, instruction-repeat, and fake-reply failures. Solutions emerge from **multi-turn dialogue**, not typed artifact handoffs.
- **Hallucination control**. MetaGPT: schema validation at handoff (Pydantic ActionNode). ChatDev: **communicative dehallucination** — agents are prompted to seek clarification from each other before committing.
- **Scope**. MetaGPT covers PRD through QA in one run with the artifact pipeline. ChatDev decomposes more finely (e.g., coding into "code writing" + "code completion"; testing into "code review" static + "system testing" dynamic) but each sub-task is a two-agent chat.
- **Trajectory**. ChatDev v2 (DevAll, 2025) pivoted toward a DAG-based zero-code platform with **MacNet** (Multi-Agent Collaboration Networks) supporting 1000+ agents, configured via YAML. MetaGPT instead pushed up the abstraction ladder with AFlow's automated workflow discovery. Both teams have concluded that hand-coded role choreography does not scale; they are converging on graph-based representations from different starting points.

## 3. Why it matters for the topic's stated goals

For a survey of OSS agent frameworks, MetaGPT is the canonical example of **prescriptive, workflow-first multi-agent orchestration** — the opposite end of the design axis from generic conversation-graph frameworks (AutoGen) or thin role+task DSLs (CrewAI). It is also the cleanest academic-to-OSS bridge in the space: ICLR 2024 oral, ICLR 2025 oral (AFlow), commercial spinoff (MGX/Atoms with measurable ARR), and a sustained publication record (SPO, AOT, AFlow in 2025). Whatever architecture decision a topic-level synthesis lands on, MetaGPT's "typed artifact handoff over pub/sub" pattern is the most-cited rebuttal to the "let agents figure out coordination at runtime" school, and AFlow is the most-cited rebuttal to "we always need humans to design the SOP."

## 4. What is reusable

- **Typed-artifact pub/sub pattern**: even outside MetaGPT, encoding inter-agent messages as Pydantic models with declarative `_watch` subscriptions is a transferable robustness primitive. Schema validation at handoff prevents a whole class of cascade failures that ChatDev-style free-form dialogue cannot.
- **ActionNode abstraction**: separating the LLM call (`ActionNode.fill()`) from the Action's I/O (read upstream Document, write downstream Document) is a clean composition; the same idea recurs in LangGraph's Send and AutoGen's GroupChat but is more explicit here.
- **Role + Actions + Environment triple**: a clean pedagogical decomposition. CrewAI's later DSL is arguably a lighter-weight rediscovery.
- **Multi-provider config layer**: the YAML-driven `config2.yaml` pattern for swapping LLM backends is mature and worth copying.
- **AFlow's Operator library** (Generate, Format, Review, Revise, Ensemble, Test, Programmer): these reusable Nodes are a credible building-block layer for *any* automated-workflow system, not just MetaGPT's runtime.

## 5. What is not safely transferable (within this topic's scope)

- **Hardcoded software-company SOP**: only useful if you're building software. For research, customer support, browser automation, etc., the PRD→design→code skeleton is dead weight — and the AFlow paper effectively admits this by proposing automated discovery instead.
- **Toy-project benchmark culture**: published evals focus on 2048, snake, blackjack — these do not generalize to production-scale codebase synthesis, so do not lift MetaGPT's "we beat ChatDev on SoftwareDev" framing without scrutiny.
- **Heavy role-class inheritance**: per-role customization requires Python subclassing (`Role` + `Action` + `ActionNode`); invasive compared to CrewAI's data-class DSL or AutoGen's conversation patterns.
- **Self-corrective loop**: schema validation prevents *malformed* handoffs but not *semantically wrong* ones; a bad PRD still cascades. Do not over-trust the verification story.
- **MGX/Atoms commercial signal does not validate the open-source runtime**: MGX runs on heavily customized internals, not stock MetaGPT. Adoption of the SaaS product is not evidence the OSS framework is production-ready.

## 6. Evidence quality

**High (source-verified for this iteration).** Strong signals: 68k stars, MIT, ICLR 2024 oral + ICLR 2025 oral (AFlow, arXiv:2410.10762), latest commit 2026-01-21, MGX/Atoms commercial traction with named investors (Ant Group, Cathay Capital, Jinqiu). This pass also source-read `metagpt/roles/role.py` (Pydantic Role + RoleContext + REACT/BY_ORDER/PLAN_AND_ACT modes) and `metagpt/actions/write_prd.py` (ActionNode-based Pydantic schema + on-disk Document serialization), confirming the SOP-encoding mechanism. AFlow operators and MCTS-over-code-graph mechanism verified from FoundationAgents/AFlow repo. ChatDev mechanical comparison verified from arXiv:2307.07924 + ChatDev README (Chat-Chain, atomic chats, instructor/assistant inception prompting, communicative dehallucination, v2 MacNet DAG pivot). Weak signals: commit cadence slowed in H2 2025; benchmarks remain toy-scale; observability is logs-only with no OTel; MCP integration is shim-level.

## 7. Concrete next experiments or hypotheses

1. **Run AFlow on a non-software domain** (e.g., scientific lit-review pipeline) — the paper benchmarks code/math/QA. Hypothesis: the Operator library generalizes but reward signal design is the bottleneck.
2. **Compare typed pub/sub vs free-form dialogue under noise**: inject corrupted upstream artifacts into MetaGPT and ChatDev and measure how each propagates the error. Hypothesis: MetaGPT's Pydantic validation catches structural noise but neither catches semantic drift.
3. **Extract the SOP pattern, drop the framework**: prototype "MetaGPT-style typed-artifact handoffs" inside LangGraph or OpenAI Agents SDK; measure whether the orchestration benefit survives outside MetaGPT's runtime.
4. **MCP integration depth audit**: verify whether the 2025 MCP Registry integration is a thin shim or a first-class tool pathway. Determines whether MetaGPT is viable as an MCP-tool-heavy host.
5. **AFlow vs SPO vs AOT comparison**: the same team is publishing 3+ workflow-optimization methods. Map their differences (search algorithm? representation? reward?) and pick the one most likely to converge with the OSS runtime.
6. **Atoms (post-rebrand) product positioning**: does the 2026-01 Atoms pivot toward "build a business, not just code" imply new role classes (CFO? Marketing?) will land in the OSS repo? Track upstream.
