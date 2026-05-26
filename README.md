<div align="center">

<img src="asserts/logo/logo.png" alt="Argus mascot" width="220" />

# Argus

### For research you need to keep coming back to

<p>
  <a href="README.zh-CN.md">中文</a> · <b>English</b>
</p>

<sub>by X32 Studio</sub>

</div>

---

Most research tools are good at answering one question. But many real projects are not one question. You keep coming back: new papers appear, new repos launch, policies change, competitors move, and yesterday's answer already feels incomplete.

Use Argus when you need to keep watching a topic over days or weeks:

- You are reading papers for a survey, thesis, investment memo, or product decision.
- You are tracking an open-source ecosystem and want to know which projects matter.
- You are following a market, regulation, company, or fast-moving technical area.
- You keep asking "what changed?", "what did we miss?", and "what should we check next?"

You give Argus the topic in one sentence. It asks a few questions to understand what you care about, then keeps collecting useful sources, remembering what it found, and updating a dashboard for you.

When you come back, you do not start from zero. You see what Argus found, how the pieces relate, what the current story is, and what still needs digging.

Everything is packaged as **one Claude Code skill**. If you have Claude Code, you can open one window and let Argus lead you through setup, dashboard launch, research loop, and report updates.

**Many eyes. Never asleep.**

<div align="center">
  <video src="asserts/demo.mp4" controls muted width="100%"></video>
  <br />
  <sub>If the video does not render on your platform, <a href="asserts/demo.mp4">open the demo video</a>.</sub>
</div>

## Meet Argus

<div align="center">
  <img src="asserts/comic/comic.png" alt="Argus mascot comic showing the research loop" />
</div>

## What You Get

Argus is not just a prompt. It gives you a working research loop and a place to see the work accumulate.

<table>
  <tr>
    <td width="33%" align="center">
      <img src="asserts/showcase/start.png" alt="Argus start flow in Claude Code" />
      <br />
      <sub><b>Start from one sentence.</b><br />Tell Argus what you want to follow. It asks a few questions and sets up the watch.</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/dashborad.png" alt="Argus dashboard knowledge graph" />
      <br />
      <sub><b>See the field take shape.</b><br />Sources stop being a pile of links and become a map you can explore.</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/report.png" alt="Argus generated deep research report" />
      <br />
      <sub><b>Read the living report.</b><br />The report keeps improving as new evidence arrives, with citations you can check.</sub>
    </td>
  </tr>
</table>

Argus is cute on purpose. The interface should feel approachable, but the loop underneath is stubborn: a hundred little eyes staying open across papers, repos, filings, blogs, news, threads, and anything else the web yields.

Use it when the answer should not be a paragraph. Use it when the answer should become a place you can return to.

## In Plain English

- Argus keeps looking for useful material on your topic.
- It saves what it finds instead of leaving everything inside a chat.
- It shows you a map of the important ideas, projects, sources, and relationships.
- It writes a report that explains the current picture and points back to the sources.
- It notices weak or missing parts of the report and uses them to decide what to look for next.

## Quick Start

You do not need to assemble a crawler, database, vector store, scheduler, and frontend. Install the skill once; after that, Argus guides the whole flow from Claude Code.

### What You Need

- **Claude Code** installed and logged in.
- **Git**, to clone this repository.
- **Node.js / npm**, only for the local dashboard. Argus will run `npm install` for the dashboard when needed.

### Step 1 — Install Argus Once

Run this in your normal terminal:

```bash
git clone https://github.com/X32Studio/Argus.git argus
mkdir -p ~/.claude/skills
cp -r argus/.claude/skills/argus ~/.claude/skills/argus
```

After this, every Claude Code session on your machine can discover the Argus skill.

### Step 2 — Make a Folder for One Research Watch

Each long-running research topic should live in its own folder. Create one and open Claude Code there:

```bash
mkdir my-watch
cd my-watch
claude
```

### Step 3 — Tell Argus What to Track

Type this inside the Claude Code chat, not in the shell:

```text
I want to long-term track open-source agent frameworks
```

Argus will ask a few simple questions, create the topic files, start the dashboard, and ask how you want to run the loop.

If you are not sure what to choose, choose:

```text
Run it here in this session
```

That is the beginner path. Keep this Claude Code window open, and Argus will keep running iterations. You can watch the dashboard at:

```text
http://localhost:5173/t/<slug>
```

`<slug>` is the folder-friendly topic name Argus creates, such as `open-source-agent-frameworks`.

### Optional — Run the Loop in a Separate Terminal

Use this only if you want the recurring loop to live in its own Claude Code session, for example overnight.

In your first Claude Code session, choose **Hand off to cron via `/argus loop`** or **Just finish topic creation**.

Then open another terminal in the same watch folder:

```bash
cd path/to/my-watch
claude
```

Inside that second Claude Code chat, type:

```text
/argus loop <slug>
```

If there is only one accepted topic in the folder, this shorter command also works:

```text
/argus loop
```

To stop the recurring loop:

```text
/argus loop stop
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
