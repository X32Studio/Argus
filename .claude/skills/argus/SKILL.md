---
name: argus
description: Use when the user wants to start, resume, or view a long-running multi-week autonomous **watch / tracking / research / intelligence** program on a topic — one that builds per-source records, a typed knowledge graph, and a citation-backed synthesis brief that refines itself over time. Covers academic research, market and competitive intelligence, regulatory tracking, open-source ecosystem watching, OSINT, deep personal-interest dives — anything that benefits from persistent structured memory across weeks. Trigger on phrases like "set up long-term research on X", "track X over weeks", "build a knowledge base on Y", "monitor regulatory developments in Z", "watch the competitive landscape for …", "keep an eye on …", "build me a dossier on …", "set up an intelligence loop on …", "我想长期研究 X", "帮我对 X 做持续 deep research", "持续跟踪 X 这个领域", "竞品/政策/生态情报 on …", "我要建一个 X 的知识库/资料库". Also handles the meta-questions "what is Argus / how does it work / how do I install it?" Do NOT trigger on one-shot questions ("what is X?", "summarize this paper") or single-session inquiries — only when the user signals an intent for *continuous, multi-iteration* tracking with persistent memory.
---

# Argus — front door + bootstrapper

This skill is the **whole front door** to the Argus intelligence engine. It both (1) routes the user through the correct workflow and (2) scaffolds the engine into the current working directory from the skill's bundled templates when the user is in a fresh repo. The skill is self-contained: it ships with the universal methodology prompts, the `/topic` slash command, and the React + Vite dashboard source. Nothing else needs to be cloned or installed for Argus to run.

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
| After parsing runner return (step 8d/e) | per-topic | `info` | "Cycle <N> done: +<new_works> works, +<depth_upgrades> upgrades" |
| Runner unnotified after watchdog (step 8d) | per-topic | `attention` | "Cycle <N> runner: no response after 7m. Continuing." |
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
   - `Run it here in this session (recommended)` — skill orchestrates, no further typing needed; loop dies when you close Claude Code, but state persists on disk and you can resume any time by re-triggering this skill
   - `Hand off to cron via /argus loop` — survives Claude Code restart; you'll type `/argus loop <slug>` manually
   - `Just finish topic creation, no loop yet`

6. **If user picks `/argus loop` cron path:** print the command (`/argus loop <slug>`) and stop using this skill.

7. **If user picks "no loop yet":** print the slug for future reference and stop.

8. **If user picks "in-session" (default path):** enter the orchestration loop. The skill itself drives iterations, dispatching one fresh subagent per iteration. Three layers of context isolation: Skill (orchestrator) → Iteration Runner subagent (per cycle) → Paper Reader sub-subagents (parallel deep-read inside one iteration, see `.claude/loop.md` Parallel Deep-Read section).

   **Loop body — repeat until a stop condition (step 9) fires:**

   a. Read `topics/<slug>/logs/cycle.txt` (single integer N). Compute `next_cycle = N + 1`. Read `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default 7). Decide `mode = (next_cycle % synthesis_every_n_cycles == 0 && next_cycle > 0) ? "SYNTHESIS" : "RESEARCH"`. **Emit notice:** `info`, "Cycle <next_cycle> starting (mode=<mode>)".

   b. **Dispatch ONE iteration runner subagent.** Use the `Agent` tool — `subagent_type: "general-purpose"`, `run_in_background: true`, `description: "Argus iteration #<next_cycle> (<mode>) for <slug>"`. The `prompt` field MUST be self-contained — runner cannot see this skill's context. Include:
      - Literal `TOPIC_SLUG` and `TOPIC_DIR` values
      - `mode = <RESEARCH|SYNTHESIS>` and `next_cycle = <N>` (so runner doesn't recompute)
      - Instruction: "Read `.claude/loop.md` (if RESEARCH) or `.claude/loop-summary.md` (if SYNTHESIS) and execute exactly ONE iteration in that mode."
      - Hard rule: "Do NOT touch `${TOPIC_DIR}/logs/cycle.txt` — the orchestrating parent manages it. You are forbidden from writing that file."
      - The full per-work isolation rule (copy verbatim from `.claude/loop.md` "Parallel Deep-Read" section). Runner may itself dispatch sub-subagents for parallel paper reading per that section.
      - Return-format schema (runner must return this):
        ```json
        {
          "mode": "...",
          "cycle": <N>,
          "candidates_processed": <int>,
          "new_works_added": <int>,
          "depth_upgrades": <int>,
          "saturation_signal": <bool>,
          "narrative": "<~3 sentence summary of this iteration>"
        }
        ```

   c. **Watchdog:** call `Bash` with `command: "sleep 420"`, `run_in_background: false`, `timeout: 450000`. Foreground 7-min block. While the parent is blocked, the runner's completion notification (if any) queues into parent context.

   d. After `sleep` returns, parse the runner's return value. If notification arrived, you have the summary; if not, append a line under `## iteration_runner_unnotified` heading in `${TOPIC_DIR}/logs/research_state.md` (with timestamp + task_id + presumed_hung), and emit notice: `attention`, "Cycle <N> runner: no response after 7m. Continuing." Otherwise emit `info`, "Cycle <N> done: +<new_works_added> works, +<depth_upgrades> upgrades".

   e. **Parent updates `cycle.txt`** (the ONE shared file the orchestrator writes directly): overwrite with `next_cycle` + newline. Runner is forbidden from this file.

   f. **Append orchestrator log** to `${TOPIC_DIR}/logs/orchestrator.jsonl`:
      ```json
      {"ts": "<ISO>", "cycle": <N>, "mode": "...", "runner_returned": <bool>, "summary": "<brief>"}
      ```
      Create the file if missing.

   g. **Saturation counter** (in-memory only, no disk):
      - If `mode == SYNTHESIS` and `saturation_signal == true`: `saturation_count++`
      - Else if `mode == RESEARCH` and `new_works_added > 0`: `saturation_count = 0`
      - If `saturation_count >= 3`: trigger STOP_SATURATED (see step 9).

   h. **Inter-iteration pause:** `Bash sleep 30` (foreground), lets filesystem caches settle and any trailing background notification land.

   i. **Context-exhaustion self-check** (every ~10 iterations): if your own context appears to be approaching ~80% of capacity (heuristic: orchestrator log already past ~5000 tokens of iteration summaries), trigger STOP_CONTEXT.

   j. Loop back to step (a) for the next iteration.

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
- Do not write `${TOPIC_DIR}/logs/cycle.txt` from any place except the orchestrator parent's loop body (step 8e). Runner subagents are forbidden from this file.
- Do not kill an existing dev server on port 5173. If the port is busy, leave it alone and just print the URL — never `kill <pid>` to make room.
- Do not kill iteration runner subagents. There's no Agent kill primitive; the watchdog is the `Bash sleep` budget, not active termination. Hung runners die with the Claude Code session.
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
