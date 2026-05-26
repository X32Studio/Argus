# Reference Index

Guide to the 15 records — which to open first and why.

## Must Read

- **LangChain (+ LangGraph)** — `topics/open-source-agent-frameworks/records/works_json/langchain.json` — deep — `Official docs & whitepaper read` — incumbent baseline; StateGraph + supervisor/swarm/hierarchical/network topologies are required vocabulary.
- **smolagents** — `topics/open-source-agent-frameworks/records/works_json/smolagents.json` — deep — `Official docs & whitepaper read` — cleanest academic-to-OSS lineage (CodeAct → smolagents, arXiv:2402.01030). Sandbox security matrix worth memorizing.
- **MCP (Model Context Protocol)** — `topics/open-source-agent-frameworks/records/works_json/MCP.json` — deep — `Interop & protocol tracking` — governance story (Anthropic → LF Projects LLC, 2025); adoption-depth nuance lives in the matrix below.
- **A2A (Agent-to-Agent protocol)** — `topics/open-source-agent-frameworks/records/works_json/A2A.json` — deep — `Interop & protocol tracking` — Google → LF Agentic AI Foundation; OpenAI-vs-everyone-else split; ACP merger.
- **pydantic-ai** — `topics/open-source-agent-frameworks/records/works_json/pydantic-ai.json` — deep — `Official docs & whitepaper read` — only genuinely new kernel position in 2025-2026 (typed-validation-as-control-flow); good contrast vs openai-agents-sdk.
- **agno** — `topics/open-source-agent-frameworks/records/works_json/agno.json` — deep — `Official docs & whitepaper read` — counterexample to kernel-discriminator thesis; envelope-shaped differentiation; pressure-tests the synthesis.

## Important Supporting Reads

- **AutoGen** — `topics/open-source-agent-frameworks/records/works_json/autogen.json` — deep — `Official docs & whitepaper read` — actor-model rewrite rationale; Core/AgentChat/Ext/Studio four-layer architecture; GroupChat selector mechanics.
- **LlamaIndex (agents)** — `topics/open-source-agent-frameworks/records/works_json/llamaindex.json` — deep — `Official docs & whitepaper read` — event-driven Workflow kernel (tick-buffer + pure reducer, NOT asyncio.Queue/gather); full MCP server-side primitive coverage; handoff comparison anchor.
- **browser-use** — `topics/open-source-agent-frameworks/records/works_json/browser-use.json` — deep — `Browser / computer-use agent thread` — CDP three-source DOM fusion; element-index instability correction; vision-mode last-1 screenshot rule.
- **Skyvern** — `topics/open-source-agent-frameworks/records/works_json/skyvern.json` — deep — `Browser / computer-use agent thread` — platform-shape vs library-shape contrast with browser-use; pluggable vision engine.
- **OpenManus** — `topics/open-source-agent-frameworks/records/works_json/openmanus.json` — deep — `Browser / computer-use agent thread` — general computer-use leg of the tripod; MetaGPT team maintainer overlap; viral-attention-outpacing-bandwidth anti-pattern.
- **OpenAI Agents SDK** — `topics/open-source-agent-frameworks/records/works_json/openai-agents-sdk.json` — deep — `Official docs & whitepaper read` — swarm successor; tool-call-shaped handoff; tracing data-governance footgun.
- **MetaGPT** — `topics/open-source-agent-frameworks/records/works_json/metagpt.json` — deep — `Academic agent literature` — SOP-prescriptive role-play, Pydantic Role + ActionNode + typed pub/sub; AFlow paper; Atoms commercial spinoff.
- **ChatDev (DevAll v2)** — `topics/open-source-agent-frameworks/records/works_json/chatdev.json` — deep — `Academic agent literature` — communicative dehallucination + Chat-Chain of two-agent atomic chats; v1→v2 pivot to DevAll platform.
- **CrewAI** — `topics/open-source-agent-frameworks/records/works_json/crewai.json` — deep — `Official docs & whitepaper read` — flat role-play; LiteLLM optional; unified Memory class (not 3-tier); Enterprise/AMP tier delta.

## Shallow But Strategic

None — all 15 records are at `deep` analysis_depth as of cycle 6.

## Lower Priority

(Referenced-only nodes — not recorded as standalone works; mentioned in differentiator context within other records.)

- **swarm** (archived) — referenced in `openai-agents-sdk.json` as `fork_or_rebrand_of` target.
- **openinterpreter** — referenced in `smolagents.json` and `openmanus.json` as `shared_pattern` (code-act predecessor).
- **openai-computer-use** (closed) — referenced in browser/computer-use tripod records as the closed reference design.

## Curated synthesis-input notes

- **MCP adoption-depth matrix** — `topics/open-source-agent-frameworks/sources/protocol_notes/mcp_adoption_depth.md` — per-framework MCP role + primitives; 3 corrections to iter-4 headline.
- **Cross-framework benchmark survey** — `topics/open-source-agent-frameworks/sources/benchmark_notes/cross_framework_2026_05.md` — only 4 of 13 frameworks have third-party citable scores; AFlow PDF still needs manual read.
