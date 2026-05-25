# Argus — A self-iterating intelligence engine for any topic

> In Greek myth, Argus had a hundred eyes and never closed them all at once.
>
> Most "deep research" tools answer one question and forget. Argus runs a **closed-loop watch on a topic for weeks** — papers, repos, news, blogs, regulatory filings, threads, anything findable on the web. It builds a typed knowledge graph, writes a citation-backed synthesis brief, then reads its own brief to find the next thing worth digging into. Many eyes, never asleep.
>
> Works for academic research, market and competitive intelligence, regulatory tracking, open-source ecosystem watching, OSINT, deep personal-interest dives — anything that gets sharper with persistent structured memory.
>
> You define a topic in one line. Claude does the rest.

Built on [Claude Code](https://claude.com/claude-code). All state lives in plain files — markdown, JSON, JSONL, YAML. No database, no cloud lock-in, no opaque vector store. Forkable, resumable, git-able.

## Why it exists

You ask Perplexity / OpenAI / Gemini "deep research" a question. It runs five minutes, hands you a brief, and forgets everything. Tomorrow you ask the follow-up — it starts from zero.

That works for "what is X." It breaks when **you're trying to track, understand, or build a sharp view of a topic over weeks** — a memory that knows what it's already concluded, flags its own shallow claims, watches the same beat with a hundred eyes, and you can fork to a new topic without rewriting anything.

## What it does

Two cooperating loops alternate inside one Claude Code cron:

- **Scout** (most iterations) — finds new sources for your topic (papers, repos, blogs, news, filings, threads, product pages — whatever the web yields); writes structured per-source records; extends a typed knowledge graph; logs every search.
- **Synthesis editor** (every Nth iteration) — reads everything the scout has produced; distils it into a synthesis brief with citations to specific records; explicitly flags what's still shallow, contradictory, or risky.

The brief's "what's still weak" becomes the scout's next to-do list. That's the self-iterating part.

## How it's different

Other deep-research tools are single-shot. Argus is persistent. Other agents accumulate chat. Argus accumulates a **typed knowledge graph** with a controlled vocabulary of edges — `contradicts`, `transferable_to`, `risky_for`, `suggests_experiment`, etc. — plus a JSON record schema, both declared per topic so the structure matches *your* domain (academic, market, regulatory, ecosystem). Other workflows make you drive. Argus drives itself overnight.

Output is plain files: per-source JSON records under `topics/<slug>/records/works_json/`, a typed knowledge graph at `topics/<slug>/indexes/knowledge_graph.json`, and a synthesis brief at `topics/<slug>/report/main.md` whose every substantive claim cites a specific JSON record path. Open the dashboard at `/t/<slug>` to browse it.

---

## Install (one-time)

Argus ships as a **self-contained Claude Code skill** under `.claude/skills/argus/`. The skill bundles everything — the universal scout/synthesis prompts, the `/topic` command, the React + Vite dashboard source, and a `bootstrap.sh` script that scaffolds a fresh install into any directory.

```bash
# Clone this repo, then drop the skill into your user-global Claude Code skills folder
git clone <this-repo> argus
mkdir -p ~/.claude/skills
cp -r argus/.claude/skills/argus ~/.claude/skills/argus
```

After this, the skill is discoverable from any Claude Code session on your machine. To start a fresh watch in any empty directory:

```bash
mkdir my-watch && cd my-watch
claude          # opens a Claude Code session here
> I want to long-term track X
# → skill auto-bootstraps engine files into ./.claude/ and ./app/
# → routes you into /argus init
```

You don't need to keep the clone of this repo around — once the skill is installed at `~/.claude/skills/argus/`, it's portable.

## Repository layout

```
.claude/skills/argus/         # the skill (canonical engine source)
├── SKILL.md                  # front-door for the skill (intent + bootstrap routing)
├── scripts/                  # bootstrap.sh, refresh-app.sh
└── templates/                # claude/ + app/ engine source — DO NOT edit live, edit here
archive/                      # previous live snapshot + an example finished topic
docs/plans/                   # design doc
README.md, .gitignore
```

Live engine files (`.claude/loop.md`, `app/`) are **not** committed at the repo root anymore — they're bootstrap output. To use Argus directly inside this repo, run `bash .claude/skills/argus/scripts/bootstrap.sh` once and the live runtime appears alongside the skill. Editing engine logic means editing `templates/` and re-running bootstrap (live files get overwritten — never edit them directly).

## 傻瓜操作 — get Argus watching a topic in five minutes

Already in a bootstrapped directory (i.e., `.claude/loop.md` exists)? Skip to step 1. Otherwise the skill will offer to bootstrap on first trigger; accept it. Then:

**1. Spin up a topic.**

```
/argus init "your one-line topic description"
```

Claude asks 3-5 quick questions (scope boundary, recency floor, must-include directions or sources, end goal), generates the topic config, the prose framing, the dispatch stub, and empty stubs for the data files; validates everything; auto-accepts. (If validation fails or you want to edit before accepting, `/argus accept <slug>` is the manual re-validation path.)

Examples that work:
- `/argus init "Cancer immunotherapy CAR-T techniques 2022 onward"` (academic)
- `/argus init "Stablecoin regulation across major jurisdictions"` (regulatory)
- `/argus init "Open-source agent framework landscape and how they differ"` (tech ecosystem)
- `/argus init "How major LLM labs are positioning long-context offerings"` (competitive intel)
- `/argus init "AR optics waveguide design — papers, patents, product teardowns"` (mixed sources)

**2. The skill auto-starts the dashboard.**

After `/argus init` finishes, the skill checks port 5173, runs `npm install` if needed, and starts `npm run dev` in the background. It then prints a URL like `http://localhost:5173/t/<slug>`. Open it in your browser — the dashboard auto-refreshes every 2 minutes once records start landing.

(If you triggered `/argus init` directly without going through the natural-language skill flow, the dashboard isn't auto-started. Run `cd app && npm install && npm run dev` yourself in that case.)

**3. Fire the loop.**

This is the ONE command you still type:

```
/argus loop <slug>
```

(Or just `/argus loop` with no slug — if you have one accepted topic, it picks that.) One cron, one command. The loop alternates between **scouting** and **synthesis** automatically — every Nth iteration runs the synthesis editor instead of the scout (tunable via `iteration_mix.synthesis_every_n_cycles` in `topic.yaml`, default 7). Records and a synthesis brief populate under `topics/<slug>/` while the dashboard quietly updates.

Stop with `/argus loop stop`; resume by re-firing — state persists on disk between iterations. Multiple topics? Fire one loop per topic, all independent.

(`/argus loop` is a thin wrapper around Claude Code's built-in `/loop` skill — same scheduling, brand-aligned interface, with topic validation. The raw `/loop 2m loops/<slug>` still works if you prefer it.)

That's the entire workflow: say what you want to track, answer 3-5 questions, type one `/argus loop`.

---

## Status

Stable for personal long-running watching. Used for in-house financial foundation-model research, but the engine itself is domain-agnostic — point it at any topic that benefits from persistent structured memory.

Roadmap: cross-topic comparison view (graph overlay across two topics); regenerate a topic's proposal from accumulated records when your initial framing turns out wrong; `pause` / `archive` / `delete` commands.

## Maintainer

kang.ruiyuan — open to questions, use-case stories, and topic-config templates for new fields.

Fork the repo and run `/argus init "<your topic>"`. The included example is a showcase, not the point.
