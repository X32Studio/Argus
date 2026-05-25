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

If confirmed, proceed to Step 2.

## Step 2 — Route

### Flow A — brand-new topic

User signals fresh start ("track X", "set up research on Y", "build a dossier on Z").

1. **Get the one-line topic description.** If the user already supplied it in their original message, use that directly; otherwise ask once: "What's the topic? Give me one line."

2. **Run `/argus init`.** Read `.claude/commands/argus.md` (the live, just-bootstrapped copy) and execute its `init` subcommand with the user's description as the argument. That command handles clarifying questions, file generation, validation, auto-accept, and empty stubs.

3. **Auto-start the dashboard** for the user (you, the skill, do this — not the user). Run these Bash steps in order:

   a. Check whether port 5173 is already in use:
      ```bash
      lsof -iTCP:5173 -sTCP:LISTEN -t 2>/dev/null | head -1
      ```
      If the output is non-empty, a dev server is already running. Skip ahead to step 4; just tell the user "dashboard is already up at http://localhost:5173/t/<slug>". Do **not** kill the existing process — it may be unrelated.

   b. If port 5173 is free, ensure `app/node_modules` exists. If not:
      - Tell the user once: "Installing dashboard dependencies (one-time, ~30s)..."
      - Run `cd app && npm install` synchronously (foreground). If it fails (node not installed, network issue, etc.), fall back to printing the manual command and stop trying to auto-start.

   c. Launch the dev server in the background:
      ```bash
      cd app && npm run dev
      ```
      Use `Bash` with `run_in_background: true`. The server persists for the lifetime of this Claude Code session (i.e., as long as the user keeps Claude Code open — which is the expected mode).

   d. Wait ~3 seconds, then verify:
      ```bash
      curl -sf -o /dev/null -w '%{http_code}' http://localhost:5173/topics/_index.json
      ```
      If it returns `200`, the dashboard is up. If timeout / non-200, the auto-start failed — fall back to printing the manual command (`cd app && npm install && npm run dev`).

4. **Tell the user the URL** to open in their browser:
   - `http://localhost:5173/t/<slug>`
   - The dashboard auto-refreshes every 2 minutes once the loop starts producing records.

5. **Tell the user the ONE command they still need to type** to start the research loop:
   - `/argus loop <slug>` (or just `/argus loop` to auto-pick the most recent accepted topic)
   - This is the only manual step — it schedules a recurring cron task and the user must explicitly invoke it. Behind the scenes `/argus loop` is a thin wrapper around `/loop` with brand-aligned UX and validation; same scheduling behavior.

6. **Do NOT fire the loop on the user's behalf.** Recurring cron deserves explicit consent — the user types `/argus loop` themselves.

### Flow B — resume / view an existing topic

User signals continuation ("show me my X research", "open the dashboard for Y", "what's the status of Z").

1. Execute `/argus list` (read `.claude/commands/argus.md` and follow the `list` subcommand). This prints a table of slug · name · status · dates.
2. If the user's intended topic is in the list:
   - **Auto-start the dashboard** following the same procedure as Flow A step 3 (check port 5173, npm install if needed, npm run dev in background, curl-verify).
   - Print: `View dashboard: http://localhost:5173/t/<slug>` (or note it's already running, if 5173 was busy).
   - Print: `Resume the loop: /argus loop <slug>` (the user manually re-fires the cron).
3. If not in the list, fall back to Flow A.

### Flow C — user wants to understand the engine or install it elsewhere

If they ask "what is this?", "how does it work?", or "how do I install Argus on another machine?", explain in plain terms:

- Argus is a self-iterating intelligence engine, built on Claude Code. Two cooperating loops (scout + synthesis editor) accumulate per-source records and a citation-backed synthesis brief on disk under `topics/<slug>/`.
- To install on another machine, the user copies this skill's directory to their user-global skills folder:
  ```bash
  cp -r <path-to-this-repo>/.claude/skills/argus ~/.claude/skills/argus
  ```
  Or symlink. Then in any empty directory they can open Claude Code and say "I want to track X" — Argus will offer to bootstrap into that directory.
- Engine internals: see `README.md` for vision + quick-start; `docs/plans/2026-05-25-topic-driven-research-engine-design.md` for design rationale.

## Things this skill must NOT do

- Do not write `topic.yaml`, `proposal.md`, loop stubs, or empty stubs directly. `/argus init` (now in the bootstrapped `.claude/commands/argus.md`) does all that.
- Do not invoke `/argus loop` or `/loop` autonomously. The user explicitly starts the research loop by typing `/argus loop` themselves.
- Do not kill an existing dev server on port 5173. If the port is busy, leave it alone and just print the URL — never `kill <pid>` to make room.
- Do not `git commit` or `git push`. The synthesis loop does that.
- Do not trigger on single-shot questions. Step 1 catches ambiguous intent.
- Do not re-bootstrap a directory that already has live engine files unless the user explicitly asks to upgrade (in which case offer to re-run `bootstrap.sh`, noting it will overwrite engine prompts but preserve `topics/` and `.claude/loops/`).
- Do not edit files inside `.claude/skills/argus/templates/` from this skill — those are the canonical source; user only edits them when intentionally modifying the engine.

**Do start** the dev server automatically (when port 5173 is free) so the user only has to type `/loop`. This is the explicit policy as of the 2026-05-25 amendment E — see `docs/plans/2026-05-25-...md`.

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
