# OpenManus

- Repo: https://github.com/FoundationAgents/OpenManus (canonical, FoundationAgents org)
- Alt: https://github.com/mannaandpoem/OpenManus (original author fork)
- Stars at capture: ~56.4k
- Last release: v0.3.0, 2025-04-10
- License: MIT
- Primary language: Python (97.8%)
- Maintainers: MetaGPT core team — Xinbin Liang (@mannaandpoem), Jinyu Xiang (@XiangJinyu), Zhaoyang Yu, Jiayi Zhang, Sirui Hong

## 1. What this work actually does

OpenManus is an open-source **general computer-use agent**, built in the open by the MetaGPT team as a direct response to the closed-source Manus.im product that went viral in early 2025. A user gives a natural-language task; the agent loops through reasoning, tool-calling, and observation, with access to a browser (Playwright), a terminal sandbox, a Python execution environment, a filesystem, web search/scraping (Crawl4AI), and computer-vision-driven GUI interaction. Three entry points: `main.py` (single agent), `run_flow.py` (planner-executor multi-agent, marked unstable), `run_mcp.py` (MCP server/client).

## 2. Technical mechanism

The execution kernel is a **layered ReAct -> ToolCall -> Manus** inheritance under `app/agent/`:

- `base.py` — `BaseAgent` lifecycle (state, memory, run loop)
- `react.py` — `ReActAgent`: think -> act -> observe loop
- `toolcall.py` — `ToolCallAgent`: ReAct specialized to OpenAI function-calling (the LLM emits structured tool calls rather than parsed scratchpad)
- `manus.py` — the general `Manus` agent composing the full toolbox
- Specialized subclasses: `browser.py`, `data_analysis.py`, `swe.py`, `mcp.py`, `sandbox_agent.py`

On top of this, `run_flow.py` exposes a **Planning flow** — an outer planner decomposes the task into steps and dispatches each step to the appropriate specialized agent. This is the planner-executor pattern, but explicitly labeled "unstable multi-agent version."

Tools are registered via OpenAI function-calling schemas, but the project also ships an MCP server (`run_mcp_server.py`) exposing its tools to other MCP-aware clients, and an MCP client mode for consuming external MCP tools. Model providers: configured via `config.toml` with `base_url` override; default GPT-4o, but extensible to any OpenAI-compatible endpoint (Azure, DeepSeek, Ollama, vLLM). Vision models supported for browser/GUI screenshots.

Memory is conversational (message history in the ReAct loop); no first-class long-term memory store.

## 3. Why it matters for the topic's stated goals

OpenManus is the **third leg of the 2025 computer-use tripod**:

- **browser-use** — browser-only, DOM-first, lean
- **Skyvern** — browser-only, vision-first, enterprise
- **OpenManus** — general computer-use (browser + terminal + filesystem + GUI)

For an OSS-agent-framework landscape watch, OpenManus is the canonical OSS answer to OpenAI Computer Use and Anthropic Computer Use. It is also the cleanest example of how a 2025-era OSS framework layers **ReAct -> tool-calling -> MCP** in a single inheritance chain, making it a reference architecture for studying execution-kernel patterns. Its lineage from MetaGPT also makes it a useful contrast: same authors, but a deliberately *single-agent* design rather than role-based multi-agent SDLC.

## 4. What is reusable

- **The `ReActAgent -> ToolCallAgent -> Manus` inheritance pattern** is a clean separation worth borrowing: keep ReAct as the abstract loop, specialize for tool-calling, then compose tools at the top.
- **The tri-mode entry point design** (`main.py` / `run_flow.py` / `run_mcp.py`) is a useful pattern for shipping an agent that is simultaneously a CLI app, a multi-agent system, and an MCP server.
- **MCP-both-sides**: OpenManus both consumes MCP tools and exposes itself as an MCP server — a good template for interop.
- **Sandbox-as-tool**: terminal/Python execution sandboxed and exposed as a first-class tool.
- **Config-driven LLM provider abstraction** via `base_url` override — minimal but effective.

## 5. What is not safely transferable (within this topic's scope)

- The **planner-executor flow** is self-labeled unstable; don't lift it as a production reference.
- **No long-term memory** layer — if the use case requires persistent agent memory, OpenManus is not the template.
- **No benchmark numbers** in the README; reusable patterns yes, claims of capability no.
- **GUI / computer-vision actions** depend on screenshot + vision-model parsing; brittleness comparable to Skyvern, not a solved problem.
- **Multi-agent semantics** are thin compared to MetaGPT or AutoGen — don't borrow OpenManus's flow if the real need is role-based debate or hierarchical orchestration.

## 6. Evidence quality

Direct GitHub repo read (README, agent directory listing) confirms architecture and tool surface. Star count and release cadence are observable. **Gaps**: no published benchmarks; no academic paper; multi-agent flow stability is self-disclosed but not externally evaluated. Maintenance signal is mixed — 56k stars but 353 open issues and 199 open PRs at capture, with last release in April 2025, suggesting community demand has outrun maintainer bandwidth. The OpenManus-RL spinoff (GRPO RL tuning with UIUC) indicates the team is still investing, but in the research direction rather than productization.

## 7. Concrete next experiments or hypotheses

1. **Measure execution-kernel drift across the tripod**: run the same task ("research X and produce a 1-page report with citations") through browser-use, Skyvern, and OpenManus. Compare action vocabularies, failure modes, and whether terminal/filesystem access actually helps over a browser-only agent.
2. **Probe MCP interop maturity**: connect OpenManus (as MCP client) to an external MCP server, then expose OpenManus itself as an MCP server consumed by Claude Desktop or another OpenAI-Agents-SDK agent. Test latency + tool-schema fidelity in both directions.
3. **Track maintenance trajectory** over the next 2 iterations: is the issue/PR backlog shrinking? Is v0.4 shipped? Is OpenManus-RL absorbing all the team energy? This determines whether OpenManus is the right OSS reference 6 months out or a 2025 viral moment.
4. **Compare planner-executor implementations**: OpenManus `run_flow.py` vs. CrewAI flows vs. LangGraph state machines vs. MetaGPT's role-graph — which abstraction is easiest to reason about for a general computer-use task?
