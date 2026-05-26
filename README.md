<div align="center">

<img src="asserts/logo/logo.png" alt="Argus mascot" width="220" />

# Argus

### Deep research that keeps digging after the first answer

<p>
  <a href="README.zh-CN.md">中文</a> · <b>English</b>
</p>

<sub>by X32 Studio</sub>

</div>

---

One-off deep research is a great demo and a weak workflow. It gives you a polished brief, then loses the trail: which sources mattered, what contradicted what, what still looked shallow, and what should be checked next.

Argus is for work that compounds: literature reviews, open-source intelligence, industry maps, regulatory watches, competitive research, and technical landscape tracking. Give it a topic and it keeps going: scouting sources, writing structured records, extending a typed knowledge graph, publishing citation-backed reports, then turning the gaps in those reports into the next search plan.

Everything is packaged as **one Claude Code skill**. If you have Claude Code, you can open one window and let Argus lead: bootstrap, topic design, dashboard launch, iteration loop, validation, and reporting.

Under the hood, Argus uses **data as backend**. Every source record, graph edge, search log, and synthesis brief is stored as plain Markdown / JSON / JSONL / YAML. The frontend reads those files and turns them into an explorable knowledge graph and a living deep-research report. No database. No black-box memory. No cloud lock-in.

**Many eyes. Never asleep.**

<div align="center">
  <video src="asserts/demo.mp4" controls muted width="100%"></video>
  <br />
  <sub>If the video does not render on your platform, <a href="asserts/demo.mp4">open the demo video</a>.</sub>
</div>

## What You Get

Argus is not just a prompt. It gives you a working loop and a visual surface for the knowledge it builds.

<div align="center">
  <img src="asserts/showcase/start.png" alt="Argus start flow in Claude Code" />
  <br />
  <sub><b>Start from one sentence.</b> Argus turns a broad research intent into a scoped topic, asks the right clarifying questions, then guides the run mode.</sub>
</div>

<br />

<div align="center">
  <img src="asserts/showcase/dashborad.png" alt="Argus dashboard knowledge graph" />
  <br />
  <sub><b>Watch the knowledge graph grow.</b> Records, routes, source relationships, and weak spots become navigable instead of disappearing into chat history.</sub>
</div>

<br />

<div align="center">
  <img src="asserts/showcase/report.png" alt="Argus generated deep research report" />
  <br />
  <sub><b>Read the living report.</b> Argus keeps rewriting the synthesis as new evidence arrives, with citations back to structured source records.</sub>
</div>

## Meet Argus

<div align="center">
  <img src="asserts/comic/comic.png" alt="Argus mascot comic showing the research loop" />
</div>

Argus is cute on purpose. The interface should feel approachable, but the loop underneath is stubborn: a hundred little eyes staying open across papers, repos, filings, blogs, news, threads, and anything else the web yields.

Use it when the answer should not be a paragraph. Use it when the answer should become a growing research asset.

## What It Does

- **Scouts** new sources for your topic and writes structured records.
- **Builds a knowledge graph** with typed edges like `contradicts`, `transferable_to`, `risky_for`, `suggests_experiment`, and `belongs_to_route`.
- **Writes a synthesis brief** with citations to exact record paths.
- **Reads its own weak spots** and turns them into the next iteration's search plan.
- **Runs in plain files**: Markdown, JSON, JSONL, and YAML. No database, no cloud lock-in, no opaque vector store.

## Quick Start

You do not need to wire together a crawler, database, vector store, scheduler, and frontend. Install the skill once; after that, Argus can guide the whole flow from one Claude Code window.

### 1. Install Once

```bash
git clone <this-repo> argus
mkdir -p ~/.claude/skills
cp -r argus/.claude/skills/argus ~/.claude/skills/argus
```

After this, Argus is available from any Claude Code session on your machine.

### 2. Create a Watch Directory

```bash
mkdir my-watch && cd my-watch
claude
```

### 3. Run It: Two Ways

#### Way A — One-line Argus start, all in this session

This is the recommended path when you want the simplest experience: one Claude Code window, one sentence, Argus walks you through the rest.

Inside Claude Code, say one line:

> "I want to long-term track open-source agent frameworks"

Argus will:

1. Bootstrap the engine files into the current directory.
2. Ask 3-5 clarifying questions.
3. Create and accept the topic config.
4. Start the dashboard at `http://localhost:5173`.
5. Ask how to run the loop.

Choose **Run in this session**.

Keep that Claude Code session open. Argus will run research iterations right there and write state to `topics/<slug>/`. If you stop the session, the loop stops, but all files remain on disk and you can resume later.

#### Way B — Create the topic, then run `/argus loop` in another terminal

Use this when you want a separate terminal to own the recurring loop, especially for overnight or weekend tracking.

In the first Claude Code session, start the same way:

> "I want to long-term track open-source agent frameworks"

When Argus asks how to run, choose **Hand off to cron via `/argus loop`** or **Just finish topic creation**.

Then open a second terminal in the same watch directory:

```bash
cd path/to/my-watch
claude
```

Inside that second Claude Code session, run:

```text
/argus loop <slug>
```

If there is only one accepted topic, this also works:

```text
/argus loop
```

Stop it with:

```text
/argus loop stop
```

Open the dashboard while it runs:

```text
http://localhost:5173/t/<slug>
```

## How It Works

```text
Skill orchestrator
  -> Iteration Runner subagent
    -> Paper Reader sub-subagents
  -> validator
  -> dashboard refresh
```

Every iteration ends with `validate-contract.sh --fix`, so schema drift is repaired when deterministic and logged when it needs another pass.

The output lives in your topic folder:

```text
topics/<slug>/
├── topic.yaml
├── proposal.md
├── records/{works_json, works_md}/
├── indexes/knowledge_graph.json
├── logs/{search_log.jsonl, research_state.md, cycle.txt, orchestrator.jsonl}
└── report/{main.md, reference_index.md, iteration_log.md}
```

## Repository Layout

```text
.claude/skills/argus/          # canonical engine source
├── SKILL.md                   # front door + orchestration loop
├── docs/                      # schema contract and plans
├── scripts/                   # bootstrap, refresh, validation
└── templates/                 # source templates copied into a watch directory

app/                           # dashboard source
asserts/                       # README images, prompt notes, demo video
```

Edit engine files in `.claude/skills/argus/templates/`, then run `bash .claude/skills/argus/scripts/bootstrap.sh` to sync runtime copies.

## Status

Stable for personal long-running watches. The engine is domain-agnostic; the included examples are showcases, not the point.

Maintained by **k-x32**. Fork the repo and run `/argus init "<your topic>"`.

<div align="center">
  <sub>A hundred eyes. Never asleep.</sub>
</div>
