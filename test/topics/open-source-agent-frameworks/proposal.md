# Open-source agent framework landscape

## Why this topic, why now

The open-source agent framework space has gone from "a handful of demos" to "dozens of overlapping libraries, each claiming to be the obvious choice" in roughly eighteen months. Maintainer marketing, community hype, and stars-as-quality-signal all conspire to make a clear comparison hard. The point of this watch is to build, over weeks, a stable map of what's actually different across frameworks — not just what their landing pages say.

The end goal is a landscape map for general orientation, not a tooling decision. That shapes the bias: prefer breadth and conceptual clarity over picking a winner.

## Concept layers — why these five

Agent frameworks compete on overlapping but distinguishable layers:

1. **Execution kernel** is the most underrated discriminator. ReAct, code-act, planner-executor, graph state-machine, and supervisor/worker are genuinely different programming models with different failure modes. Marketing rarely emphasizes this; engineering blog posts do. This layer is where the synthesis brief will spend the most ink.
2. **Tool & memory layer** is where frameworks borrow from each other most aggressively (everyone has Pydantic-typed tools now). Worth tracking less for differentiation and more to spot convergence trends.
3. **Multi-agent coordination** is where the genuine new design space lives in 2024–2026. Orchestrator vs mesh vs handoff vs role-play patterns are not interchangeable.
4. **Observability & evaluation** is where most frameworks are weakest. Recording this layer well separates the "demo-ware" from "production-ready" verdicts.
5. **Deployment & portability** is the one layer where closed platforms (OpenAI Agents, Bedrock) compete directly with open frameworks — relevant for the "scope_out" boundary.

## Scope choices — what's deliberately excluded

- **Closed-source agent platforms** as platforms are out — but their open *protocol* spec (MCP, OpenAI Agents protocol, A2A) is in. The protocols are where open and closed worlds meet.
- **Workflow / graph engines** without LLM-agent specialization are out. LangGraph is the borderline case: in-scope as LangChain's agent execution kernel; out-of-scope as a generic DSL. Treat it as scope-in by default and call out the ambiguity in the differentiator paragraph.
- **Pure RAG libraries** and **LLM serving stacks** are out — both are upstream of the agent layer.
- **Hello-world tutorial repos** are out (no production-usage evidence).
- **Abandoned / rebranded** frameworks: captured once, not re-deepened.

## Where contradictions will come from

Three predictable sources of disagreement in the literature:

1. **Stars-vs-substance.** LangChain has the most stars but the most criticism in production. Down-rank star count as a maturity proxy; up-rank engineering post-mortems.
2. **Maintainer claims vs benchmark results.** Frameworks claim "multi-agent support" that means very different things in practice. Treat the maintainer's own description as a hypothesis to verify against benchmark studies and independent write-ups.
3. **Vibe shift over time.** The "obvious choice" framework changes every six months (LangChain → AutoGen → CrewAI → Smolagents → ...). The synthesis editor should explicitly track when prior records' "maturity signal" judgments stop aging well, and rewrite them.

## Reading order — for a fresh reader of the report

1. Start with the TL;DR and taxonomy.
2. Skim the comparison matrix.
3. Read the "Key axes of differentiation" — that's where the brief earns its keep.
4. Drop into "Major framework families" only for the families that matter to the reader's use case.
5. Use "Trends" and "Anti-patterns" as the navigation aids for follow-up reading.

## Anti-patterns to flag aggressively

- **Marketing comparison posts without benchmarks.** Down-rank to "reference only — see source for vibes."
- **"Production-ready" claims with no production users named.** Note as unverified.
- **Frameworks gone quiet** (no commits in 6 months, no recent releases, maintainer org pivoted): capture once with `maturity_signal: abandoned` and stop spending cycles on them.
- **Tutorial-shaped repos** with stars but no real-world usage: capture once, do not deepen.

## What "done" looks like for this watch

This is a continuous landscape map, not a one-shot survey. The brief is "done enough" when:

- Every actively-maintained in-scope framework has a record.
- The differentiator paragraph for each framework survives a re-read after two cycles without major rewrites.
- The "Key axes of differentiation" section converges on 4-6 stable axes that don't keep flipping cycle-to-cycle.
- New entrants are integrated within one synthesis cycle of their appearance.

Then the watch shifts into maintenance mode — picking up new entrants, retiring abandoned ones, and noting trend shifts.
