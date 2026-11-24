---
name: argus
description: Universal persistent deep-exploration & decision-intelligence engine (Argus 2.0) — covers rare needle hunts (`hunt`), broad competitive & market landscape synthesis (`intel`), high-stakes decisions under uncertainty with JEV two-layer routing & conflict preservation (`decision`), and multi-week field research trees (`research`), plus `gather`/`search` agent context assembly. Trigger on phrases like "find rare source/benchmark on X", "competitive analysis of Y", "help me decide between A and B with evidence", "track X over weeks", "build a knowledge base on Y", "做竞品分析", "深度探索/稀缺资源检索", "决策推演", "帮我对 X 做持续 deep research". Do NOT trigger on trivial one-shot lookup questions.
---

# Argus 2.0 — Universal Deep Exploration & JEV Decision Engine

This skill is the **front door** to the Argus 2.0 intelligence engine (compatible with **T3 Code**, Claude Code, Codex, and Antigravity harnesses). It supports **four native exploration archetypes** (`hunt` · `intel` · `decision` · `research`), **two engine modes** (`llm` and `jev-hybrid` using two-layer JEV routing + conflict preservation, auto-detecting a local loopback JEV endpoint at `http://127.0.0.1:8001/v1/jev`), and a **dual-entry `gather` / `search` CLI** (`node engine/cli.mjs query`) plus a **crash-resilient T3 native runtime** (`status` / `queue` / `collate` / `decide`).

## T3 Code Native Runtime (MANDATORY when running inside T3 Code)

When running inside **T3 Code** (Antigravity, Codex, or multi-provider T3 threads), **do NOT** use Claude Code's JS `Workflow` tool (`.claude/workflows/argus-cycle.js`), Claude's `/loop` cron skill, or giant all-or-nothing `run_workflow parallel()` fan-outs (where 1 failed agent or an ACP restart cancels the whole batch and loses all collation).

Instead, use Argus's **crash-resilient T3 Native Runtime**:

1. **Bootstrap includes `engine/`**: `bootstrap.sh` copies `.claude/`, `engine/` (`cli.mjs`, `t3.mjs`, `jev.mjs`, `query.mjs`, `archetypes.mjs`), `.claude/scripts/validate-contract.sh`, and `app/`.
2. **Check live state in 1 call**:
   ```bash
   node engine/cli.mjs status --topic <slug>
   ```
   This reports current cycle, collated vs uncollated works, pending queue, dashboard `:5173` status, and local loopback `:8001/v1/jev` readiness.
3. **Start dashboard as a persistent `systemd --user` service** (survives T3 turns, cancellations, and ACP restarts; do NOT rely on an ephemeral shell background process):
   ```bash
   systemctl --user enable --now argus-dashboard.service
   ```
   Verify with `curl -sf http://127.0.0.1:5173/topics/_index.json`.
4. **Durable work queue (`logs/t3_queue.json`)**:
   Seed candidate works once with:
   ```bash
   node engine/cli.mjs queue --topic <slug> --action add --file <candidates.json>
   node engine/cli.mjs queue --topic <slug> --action next --batch 3
   ```
5. **Micro-batch execution + immediate deterministic collation** (NEVER lose progress):
   - Process **2–3 works per batch** (either directly with parallel `read_file` + `write_file`, or independent `invoke_subagent` / `delegate_task` calls — never an 8-way all-or-nothing `parallel()`).
   - Each work writes `topics/<slug>/records/works_json/<work-slug>.json` (including optional `proposed_nodes` and `proposed_edges` arrays) and `topics/<slug>/records/works_md/<work-slug>.md`.
   - Immediately after **every batch**, run deterministic collation + contract validation:
     ```bash
     node engine/cli.mjs collate --topic <slug> --advance-cycle
     bash .claude/scripts/validate-contract.sh --fix <slug>
     ```
   - Because `collate` reads directly from `records/works_json/*.json` on disk, every finished work immediately appears on the dashboard (`knowledge_graph.json`, `master_index.jsonl`, `route_index.json`, `research_state.md`, `notices.jsonl`).
6. **Live Local JEV Decision Board & Context Query**:
   - Write/update `topics/<slug>/decisions/decision_input.json` (options, claims, evidenceByClaim) and run:
     ```bash
     node engine/cli.mjs decide --topic <slug> --jev auto
     ```
     This auto-connects to a local loopback JEV endpoint (`ARGUS_JEV_ENDPOINT`, default `http://127.0.0.1:8001/v1/jev` + `~/.config/argus/jev-api-key`), runs Layer-1 screening + Layer-2 calibrated `choice` adjudication with conflict preservation, and writes `decisions/decision_board.json`.
   - Downstream agents query provenance-stamped context with:
     ```bash
     node engine/cli.mjs query --topic <slug> --task "<question>" --mode gather --jev auto --format md
     ```
7. **Continuous unattended looping in T3 (replaces Claude `/loop`)**:
   Use T3 Code's native `schedule_task` tool (`schedule: { type: "interval", everyMs: 600000 }`, `freshSession: true`, `bindToCurrentThread: true`) with a self-contained prompt that runs `status` -> `queue next --batch 2` -> deep-read 2 works -> `collate --advance-cycle` -> `validate-contract.sh --fix` -> synthesize on every `synthesis_every_n_cycles` -> `decide --jev auto`. Because each tick runs in a fresh session and checkpoints to disk, Argus survives restarts and never exhausts context!

Argus is **not just for academic research.** It works equally well for market / competitive intelligence, regulatory tracking, ecosystem watching, OSINT, journalist-beat work, and any deep personal-interest topic that benefits from a memory that gets sharper over weeks. The word "research" in this skill is shorthand for "structured, continuous information gathering and synthesis."

## Step 0 — Is this directory bootstrapped?

Argus needs three things at minimum to run in the current working directory:
- `.claude/loop.md` (universal scout methodology)
- `.claude/loop-summary.md` (universal synthesis methodology)
- `.claude/commands/argus.md` (the `/argus` slash command)

Plus, for the dashboard:
- `app/` with at least `package.json`, `vite.config.ts`, and `src/`

**Check:** does `${CWD}/.claude/loop.md` exist?

- **Yes** → skip to Step 1.
- **No** → this is a fresh directory. Tell the user once:

  > "This directory isn't bootstrapped with Argus yet. I'll copy the engine here — `.claude/` engine files plus the dashboard source under `app/`. Your existing files won't be touched. OK to proceed?"

  Use `AskUserQuestion` with options `Bootstrap here` · `Pick a different directory` · `Cancel`. If they pick `Bootstrap here`, run the bootstrap script via `Bash`:

  ```bash
  bash <path-to-this-skill>/scripts/bootstrap.sh
  ```

  The script is idempotent and prints what it copied. After it finishes, proceed to Step 1.

## Step 1 — Confirm intent (avoid false triggers)

The skill description triggers on broad intent phrases that sometimes overlap with one-shot questions. Send ONE `AskUserQuestion` to confirm:

> "Sounds like you want to set up a long-running watch on this topic — Argus will keep mining sources (papers, repos, news, filings, anywhere on the web) and refining a synthesis brief on its own, for weeks. Confirm: is that what you want, or just a one-time question?"

Options:
- `Set up the long-running watch`
- `Actually just a one-time question`

If the user picks the second option, **stop using this skill**. Answer their question normally.

If confirmed, proceed to Step 1.5.

## Step 1.5 — Start the dashboard NOW (front-loaded)

The dashboard URL is the user's only window into what Argus is doing — and is also the activity rail that surfaces "I need you back in Claude Code" signals. So start it BEFORE collecting the one-line topic description, so by the time the user has answered init's clarifying questions they can already see the rail filling up.

Run these Bash steps in order:

a. Check whether port 5173 is already in use:
   ```bash
   lsof -iTCP:5173 -sTCP:LISTEN -t 2>/dev/null | head -1
   ```
   If non-empty, a dev server is already running. Skip to step (e) below. Do NOT kill it.

b. If port 5173 is free, ensure `app/node_modules` exists. If not:
   - Tell the user once: "Installing dashboard dependencies (one-time, ~30s)..."
   - Run `cd app && npm install` synchronously. If it fails, print the manual command (`cd app && npm install && npm run dev`) and skip to Step 2 anyway — the rest of the skill still works without the dashboard.

c. Launch the dev server in the background using `Bash` with `run_in_background: true`:
   ```bash
   cd app && npm run dev
   ```
   It persists for the lifetime of this Claude Code session.

d. Wait ~3 seconds then verify:
   ```bash
   curl -sf -o /dev/null -w '%{http_code}' http://localhost:5173/topics/_index.json
   ```
   If not `200`, fall back to printing the manual command.

e. **Print the URL to the user, prominently:**
   > Dashboard: http://localhost:5173/
   > (URL will become /t/<slug> once the topic is set up. Open it now — you'll see Argus's progress streaming in the left rail.)

f. **Append the first bootstrap notice** so the rail isn't empty when the user opens it:
   ```bash
   mkdir -p .claude/loops
   TS=$(date -u +%FT%TZ)
   printf '{"ts":"%s","level":"info","source":"orchestrator","cycle":null,"text":"%s"}\n' \
     "$TS" "Argus is starting. Gathering your topic details next." \
     >> .claude/loops/_bootstrap_notices.jsonl
   ```

Then proceed to Step 2.

## Notice emission — how the skill talks to the dashboard

Throughout the rest of this skill, you (the orchestrator) append JSON lines to one of two files so the user can watch progress and "come back to CC" signals in the activity rail:

- **Before any topic slug exists** → write to `.claude/loops/_bootstrap_notices.jsonl`
- **After `/argus init` produces a slug** → write to `topics/<slug>/logs/notices.jsonl`

Schema (one per line):
```json
{"ts":"<ISO-8601 Z>","level":"info|attention|blocked","source":"orchestrator","cycle":<N|null>,"text":"<one line ≤140 chars>"}
```

Levels:
- `info` — passive progress ("starting cycle 3").
- `attention` — user should glance ("topic ready", "saturated").
- `blocked` — orchestrator is paused waiting on user response in CC. **Always emit a `blocked` line BEFORE every `AskUserQuestion` call** so the rail can flash the page title.

Bash helper to keep emits short:
```bash
notice() {
  local file="$1" level="$2" cycle="$3" text="$4"
  local ts=$(date -u +%FT%TZ)
  mkdir -p "$(dirname "$file")"
  if [ "$cycle" = "null" ]; then cycle_field=null; else cycle_field=$cycle; fi
  printf '{"ts":"%s","level":"%s","source":"orchestrator","cycle":%s,"text":"%s"}\n' \
    "$ts" "$level" "$cycle_field" "$text" >> "$file"
}
```

**Required emit points** (the rest of the skill assumes these fire):

| When | File | Level | Text template |
|---|---|---|---|
| Right before `AskUserQuestion` in init flow | bootstrap | `blocked` | "Waiting on you in CC: <question gist>" |
| Right after that AskUserQuestion answered | bootstrap | `info` | "Got it. Continuing." |
| Immediately after `/argus init` succeeds | per-topic | `attention` | "Topic <slug> ready. Loop options waiting in CC." |
| Right before "how to run the loop" AskUserQuestion | per-topic | `blocked` | "Waiting on you in CC: pick a loop mode" |
| At each cycle start (Flow A step 8a) | per-topic | `info` | "Cycle <N> starting (mode=<RESEARCH\|SYNTHESIS>)" |
| After parsing cycle return (step 8g) | per-topic | `info` | "Cycle <N> done: +<new_works> works, +<depth_upgrades> upgrades" |
| STOP_SATURATED / STOP_CONTEXT / STOP_BLOCKER | per-topic | `blocked` | "Stopped: <reason>. Action needed in CC." |

Runner subagents emit their own `source:"runner"` lines directly (per `.claude/loop.md` "Notice Emission" section). You do not need to forward those.

## Step 2 — Route

### Flow A — brand-new topic

User signals fresh start ("track X", "set up research on Y", "build a dossier on Z").

1. **Get the one-line topic description.** If the user already supplied it in their original message, use that directly; otherwise ask once: "What's the topic? Give me one line."

2. **Run `/argus init`.** Read `.claude/commands/argus.md` (the live, just-bootstrapped copy) and execute its `init` subcommand with the user's description as the argument. That command handles clarifying questions, file generation, validation, auto-accept, and empty stubs.

   Before EACH `AskUserQuestion` that `/argus init` triggers, emit a `blocked` bootstrap notice (see "Notice emission" above). After it's answered, emit an `info` notice ("Got it. Continuing.").

3. **Dashboard is already up** from Step 1.5. As soon as `/argus init` produces the slug, switch your future notices to `topics/<slug>/logs/notices.jsonl` and emit:
   - `attention`: "Topic <slug> ready. Loop options waiting in CC."

4. **Print the per-topic URL:**
   - `http://localhost:5173/t/<slug>`
   - The dashboard auto-refreshes every 2 minutes once the loop starts producing records; the activity rail polls every 3 seconds.

5. **Ask the user once how to run the loop.** Emit a `blocked` notice first ("Waiting on you in CC: pick a loop mode"), then call `AskUserQuestion`:

   > "Topic ready. How should I run the research loop?"

   Options:
   - `Run it here in this session — workflow engine (recommended)` — skill orchestrates via the per-cycle Workflow (`.claude/workflows/argus-cycle.js`), no further typing needed. Each research cycle fans out deep-reads and (when you set a token budget) adversarial claim verification. Loop dies when you close Claude Code, but state persists on disk and you can resume any time by re-triggering this skill. Tip: prefix your request with a token budget like `+800k` to scale fan-out depth and enable verification.
   - `Hand off to cron via /argus loop` — survives Claude Code restart; you'll type `/argus loop <slug>` manually
   - `Just finish topic creation, no loop yet`

6. **If user picks `/argus loop` cron path:** print the command (`/argus loop <slug>`) and stop using this skill.

7. **If user picks "no loop yet":** print the slug for future reference and stop.

8. **If user picks "in-session" (default path):** enter the orchestration loop. The skill itself drives iterations, dispatching one fresh subagent per iteration. Three layers of context isolation: Skill (orchestrator) → Iteration Runner subagent (per cycle) → Paper Reader sub-subagents (parallel deep-read inside one iteration, see `.claude/loop.md` Parallel Deep-Read section).

   **Loop body — repeat until a stop condition (step 9) fires:**

   a. Read `topics/<slug>/logs/cycle.txt` once at loop entry into an in-memory `N` (single integer). Each pass: `next_cycle = N + 1`. Read `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default 7). Decide `mode = (next_cycle % synthesis_every_n_cycles == 0 && next_cycle > 0) ? "SYNTHESIS" : "RESEARCH"`. **Emit notice:** `info`, "Cycle <next_cycle> starting (mode=<mode>)".

   b. **Run the cycle.**

      - **RESEARCH** → call the **Workflow** tool with `scriptPath: ".claude/workflows/argus-cycle.js"` and `args: { "slug": "<slug>", "dir": "topics/<slug>", "cycle": <next_cycle>, "today": "<YYYY-MM-DD>" }`. The workflow runs plan → parallel deep-read → (budget-gated) adversarial verify → single-writer collate → `validate-contract.sh --fix`, and returns a structured summary: `{mode, cycle, candidates_processed, new_works_added, depth_upgrades, flagged_claims, saturation_signal, narrative}`. Do NOT pass a fan-out count — the workflow derives it from the turn's token budget (`+Nk` directive). The Workflow tool returns when every agent has joined or failed; you do not poll or sleep.

      - **SYNTHESIS** → dispatch ONE synthesis agent with the `Agent` tool (`subagent_type: "general-purpose"`, `run_in_background: true`). Synthesis is single-threaded — do NOT use the workflow here. The prompt MUST be self-contained: literal `TOPIC_SLUG`/`TOPIC_DIR`, `mode = SYNTHESIS`, `next_cycle = <N>`, the instruction "Read `.claude/loop-summary.md` and execute exactly ONE synthesis iteration", the hard rule "Do NOT touch `topics/<slug>/logs/cycle.txt`", and this return schema: `{mode, cycle, saturation_signal, narrative}`.

   c. **Collect the result.** For RESEARCH, the Workflow tool result is the structured summary. For SYNTHESIS, parse the agent's returned summary. There is no watchdog and no inter-cycle sleep — the workflow/agent has fully completed (all sub-agents joined; collation and file writes are done) before control returns to you.

   d. **Parent updates `cycle.txt`** (the ONE shared file the orchestrator writes directly): overwrite with `next_cycle` + newline, then set in-memory `N = next_cycle`. Runner/synthesis agents are forbidden from this file. Only advance `cycle.txt` on a successful return; if the cycle errored (see step 9 STOP_BLOCKER), leave it so a re-fire is idempotent.

   e. **Append orchestrator log** to `topics/<slug>/logs/orchestrator.jsonl` (create if missing):
      ```json
      {"ts": "<ISO>", "cycle": <next_cycle>, "mode": "...", "summary": "<narrative>", "new_works": <int>, "flagged_claims": <int>}
      ```

   f. **Counters** (in-memory only):
      - RESEARCH & `new_works_added == 0` → `dry_rounds++`. If `dry_rounds >= 2` → trigger STOP_SATURATED.
      - RESEARCH & `new_works_added > 0` → `dry_rounds = 0`.
      - SYNTHESIS & `saturation_signal == true` → `saturation_count++`. If `saturation_count >= 3` → trigger STOP_SATURATED.
      - SYNTHESIS & `saturation_signal == false` → `saturation_count = 0`.

   g. **Emit notice:** `info`, "Cycle <next_cycle> done: +<new_works_added> works, +<depth_upgrades> upgrades, <flagged_claims> flagged".

   h. **Context-exhaustion self-check** (every ~10 cycles): the orchestrator now holds only per-cycle summaries (the fan-out context lives inside each workflow, not here), so the ceiling is high — but if your own context still approaches ~80% of capacity, trigger STOP_CONTEXT.

   i. Loop back to step (a) for the next cycle.

9. **Stop conditions:** for each, emit `blocked` notice "Stopped: <reason>. Action needed in CC." before printing the message in CC.
   - **STOP_USER**: user explicitly says "stop" / interrupts / closes the session → loop dies naturally; state on disk is current.
   - **STOP_SATURATED**: three consecutive SYNTHESIS iterations report `saturation_signal: true`. Print: "Topic appears saturated after N iterations. State preserved at `${TOPIC_DIR}/`. Re-trigger this skill any time to resume; new sources will reset the counter."
   - **STOP_CONTEXT**: parent's own context budget is near limit. Write a resume hint to `${TOPIC_DIR}/logs/research_state.md` under `## orchestrator_pause` (timestamp + last cycle + saturation_count). Print: "I've run N iterations. My context is filling up. Close and reopen Claude Code, then say 'resume `<slug>`' or trigger this skill again — I'll pick up from cycle `<N+1>`. (Or use `/argus loop <slug>` to switch to cron, which survives Claude Code restart.)"
   - **STOP_BLOCKER**: any runaway failure mode the parent can't recover from → log to `research_state.md`, print a clear message, stop.

### Flow B — resume / view an existing topic

User signals continuation ("show me my X research", "open the dashboard for Y", "resume <slug>").

1. Execute `/argus list` (read `.claude/commands/argus.md` and follow the `list` subcommand).
2. If the user's intended topic is in the list:
   - **Auto-start the dashboard** following Step 1.5 (check port 5173, npm install if needed, npm run dev in background, curl-verify). Note: bootstrap notices file is unnecessary in Flow B — slug is known, so emit directly to `topics/<slug>/logs/notices.jsonl`.
   - Emit notice: `attention`, "Resuming <slug>. Dashboard ready."
   - Print: `View dashboard: http://localhost:5173/t/<slug>` (or note already running).
   - Emit `blocked` notice, then ask via `AskUserQuestion`: "Resume the loop in this session, or hand off to cron?" (same options as Flow A step 5). Then follow Flow A step 6-9 accordingly.
3. If not in the list, fall back to Flow A.

### Flow C — user wants to understand the engine or install it elsewhere

If they ask "what is this?", "how does it work?", or "how do I install Argus on another machine?", explain in plain terms:

- Argus is a self-iterating intelligence engine, built on Claude Code. Two cooperating loops (scout + synthesis editor) accumulate per-source records and a citation-backed synthesis brief on disk under `topics/<slug>/`.
- To install on another machine, the user copies this skill's directory to their user-global skills folder:
  ```bash
  cp -r <path-to-this-repo>/.claude/skills/argus ~/.claude/skills/argus
  ```
  Or symlink. Then in any empty directory they can open Claude Code and say "I want to track X" — Argus will offer to bootstrap into that directory.
- Engine internals: see `README.md` for vision + quick-start; `.claude/skills/argus/docs/plans/2026-05-25-topic-driven-research-engine-design.md` for design rationale.

## Things this skill must NOT do

- Do not write `topic.yaml`, `proposal.md`, loop stubs, or empty stubs directly. `/argus init` (now in the bootstrapped `.claude/commands/argus.md`) does all that.
- Do not invoke `/argus loop` (cron path) autonomously — that's a user choice in Flow A step 5. **In-session loop is the default once the user explicitly picks it** in that AskUserQuestion; that explicit consent is what authorizes the skill to drive iterations directly.
- Do not write `${TOPIC_DIR}/logs/cycle.txt` from any place except the orchestrator parent's loop body (step 8d). Runner subagents are forbidden from this file.
- Do not kill an existing dev server on port 5173. If the port is busy, leave it alone and just print the URL — never `kill <pid>` to make room.
- Do not hand-roll subagent watchdogs. The RESEARCH cycle runs as a Workflow (`.claude/workflows/argus-cycle.js`), which joins or fails its agents natively — no `Bash sleep` budget, no manual "presumed hung" bookkeeping. The SYNTHESIS cycle is a single `Agent` dispatch.
- Do not `git commit` or `git push`. The synthesis loop methodology handles that internally if a git repo is detected.
- Do not trigger on single-shot questions. Step 1 catches ambiguous intent.
- Do not re-bootstrap a directory that already has live engine files unless the user explicitly asks to upgrade (in which case offer to re-run `bootstrap.sh`, noting it will overwrite engine prompts but preserve `topics/` and `.claude/loops/`).
- Do not edit files inside `.claude/skills/argus/templates/` from this skill — those are the canonical source; user only edits them when intentionally modifying the engine.

**Do start** the dev server automatically (when port 5173 is free) so the user doesn't need to. **Do start** the in-session research loop once the user explicitly opts into that path in Flow A step 5. These are explicit policies (amendments E + J) — see `.claude/skills/argus/docs/plans/2026-05-25-...md`.

## Mental model — when this skill applies

| User says | Use this skill? |
|---|---|
| "What is differential privacy?" | No — one-shot |
| "Summarize the LLaMA-3 paper" | No — one-shot |
| "Set up long-term research on differential privacy" | Yes — Flow A |
| "Track stablecoin regulation across jurisdictions" | Yes — Flow A |
| "Build me a dossier on Anthropic's product strategy" | Yes — Flow A |
| "我想长期研究蛋白质结构预测" | Yes — Flow A |
| "Show me my AR optics research" | Yes — Flow B |
| "How does Argus work?" / "How do I install it elsewhere?" | Yes — Flow C |
| "Fix this typo in the README" | No — unrelated |

When in doubt, Step 1 resolves it without bothering the user too much.
