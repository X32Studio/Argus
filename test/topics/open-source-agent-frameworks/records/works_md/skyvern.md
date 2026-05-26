# Skyvern

Repo: https://github.com/Skyvern-AI/skyvern
Maintainer: Skyvern-AI (commercial company, AGPL-3.0 OSS + Skyvern Cloud)
Stars / last commit: 21.7k / 2026-05-10 (v1.0.36)
Primary language: Python

## 1. What this work actually does

Skyvern automates browser workflows by driving a real Chromium via Playwright while a vision LLM reads each rendered page from screenshots and decides the next action (click at (x,y), type into element, scroll, navigate, extract). It is shipped not as a library but as a deployable service: FastAPI server + Postgres + React dashboard. Users define either a "Task" (one natural-language goal, e.g. "download my last 3 invoices from this portal") or a "Workflow" — a typed DAG of blocks (browser task, validator, loop, HTTP request, file-parse, email send, custom code). Each run produces a recorded video, screenshots, an action log with the model's reasoning, and a structured JSON output. There is a managed Skyvern Cloud (proxies, anti-bot, parallel browser fleet) that the OSS does not include.

## 2. Technical mechanism

- **Execution kernel.** Hybrid vision-first. Playwright opens a real browser; on each step Skyvern takes a screenshot, ships it to a vision LLM (OpenAI / Anthropic / Gemini / Bedrock / Azure / Ollama / OpenRouter), and the model proposes the next action grounded on visible elements. DOM is read as a secondary signal (for accessible names, form structure) but is not the primary planning surface. This is the architectural opposite of pre-2025 browser-use, which leaned heavily on accessibility-tree / DOM serialisation.
- **Agent topology.** Internal "Planner–Agent–Validator" triad: Planner decomposes the goal into sub-steps, Agent executes against the browser, Validator confirms each step's success before advancing. It is multi-agent only in the intra-task-roles sense; it is *not* a peer-to-peer collaboration framework like AutoGen or MetaGPT.
- **Engine abstraction.** Skyvern exposes a pluggable "engine" — the action policy can be Skyvern's own vision loop *or* OpenAI Computer Use *or* (community) Anthropic computer-use. The workflow / replay surface stays constant across engines.
- **Tool surface.** Native MCP support (Skyvern can be wrapped as an MCP server, and as a client can consume MCP tools); REST API; Python SDK. Workflows can call HTTP endpoints and run custom Python blocks.
- **State.** Postgres-backed run history; persistent browser contexts; built-in credentials vault.
- **Observability.** This is the headline feature. Every run is replayable as video + step-screenshots + structured action log with model rationale.

## 3. Why it matters for the topic's stated goals

The topic tracks the OSS-agent-framework landscape, and Skyvern is the clearest *productised* point on the browser/computer-use axis. It illustrates a real fork in the design space: library-first thin wrapper (browser-use) versus platform-first vertical stack (Skyvern). It also makes the engine-abstraction pattern concrete — the same workflow can run on three different action backbones (in-house vision loop, OpenAI CUA, Anthropic computer-use), which is exactly the kind of pluggable-kernel pattern the topic is mapping. Finally, it is one of the few agent frameworks with non-toy observability built in.

## 4. What is reusable

- **Planner–Agent–Validator triad** as a default shape for any tool-use loop where actions are not idempotent and recovery matters (browser, RPA, CLI agents).
- **Engine abstraction** — typing the action policy as a swappable interface so OpenAI CUA / Claude computer-use / in-house vision policies are interchangeable behind a stable workflow surface. Directly transferable to any vertical agent that may want to track frontier vendor action models.
- **Block-based workflow DAG** (browser-task + validator + loop + HTTP + file-parse + email) as a middle ground between "one giant prompt" and "fully hand-coded RPA." The validator-after-each-block discipline is the part most worth borrowing.
- **Run-recording-by-default** (video + screenshots + structured action log with rationale) as table stakes for any production agent.

## 5. What is not safely transferable (within this topic's scope)

- **AGPL-3.0.** Hard blocker for embedding Skyvern code into closed-source products. Skyvern Cloud sidesteps this for them but not for downstream adopters.
- **The OSS-vs-Cloud capability gap.** In real-world deployments the differentiator is not the agent loop but the anti-bot infra (residential proxies, fingerprint rotation, parallel browser fleet) — and that is Cloud-only. A naive read of the repo overstates what self-hosted Skyvern will do against a hardened target site.
- **Vision-first cost profile.** Per-action token cost is non-trivial; without head-to-head benchmarks vs browser-use it is unsafe to assume the vision-first kernel is the right default for every task. DOM-first remains cheaper where the site is well-structured.
- **No published benchmark numbers.** Despite the marketing posture, the repo and docs do not report WebVoyager / WebArena / WebBench scores — claims of "resistant to layout changes" are qualitative.

## 6. Evidence quality

- GitHub repo read directly: stars, license, language, release cadence, README architecture claims, model-provider list, MCP support, telemetry env var, OSS/Cloud split. High confidence.
- Docs landing page confirmed Planner–Agent–Validator architecture, hybrid vision approach, and engine concept. Medium-high confidence; deeper architecture pages were not all reachable in this pass.
- Benchmark numbers: **absent** in available sources. Comparative claims vs browser-use / OpenManus / OpenAI CUA in this record are structural (capability/architecture-level), not numeric.
- No academic paper.

## 7. Concrete next experiments or hypotheses

1. **Engine-shootout on one workflow.** Take a single Skyvern workflow (e.g. invoice download) and run it under (a) Skyvern's own vision loop, (b) OpenAI Computer Use engine, (c) Anthropic computer-use. Compare steps-to-success, wall-clock, and token cost. Tests the "engine abstraction is real" claim.
2. **Skyvern vs browser-use head-to-head** on a fixed task list (3 login-walled sites, 3 form-fill sites, 3 e-commerce flows). Measure success rate, cost per task, time per task. This is the comparison the topic specifically needs and that no public source provides.
3. **Self-hosted Cloudflare/Akamai test.** Run self-hosted Skyvern (no Cloud proxies) against 5 commonly-bot-blocked sites to quantify the OSS-vs-Cloud capability gap. Decides whether OSS-Skyvern is usable for production or is effectively a demo.
4. **Validator ablation.** Disable the Validator role and measure success-rate delta. Tests whether the Planner–Agent–Validator triad is load-bearing or marketing.
5. **MCP integration depth.** Verify Skyvern can both expose itself as an MCP server (giving a Claude / Cursor / generic agent a "browse-the-web" tool) and consume external MCP tools mid-workflow. If yes, Skyvern becomes a natural "browser tool" primitive for other agents in this topic graph.
