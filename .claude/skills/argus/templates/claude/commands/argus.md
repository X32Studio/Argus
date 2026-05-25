---
description: Argus — manage research topics (init / accept / list). Subcommand goes in the first arg.
---

You are handling an `/argus` command. The user's full argument string is:

```
$ARGUMENTS
```

Parse the first whitespace-separated word as the subcommand. The remaining text (if any) is the subcommand argument.

Supported subcommands: `init` · `accept` · `list` · `loop`. Anything else: print the supported list and stop.

---

## Subcommand: `init`

Usage: `/argus init <one-line description or short name>`

If no argument is provided after `init`, ask the user once: "What's the topic? Give me one line." Use `AskUserQuestion` for this.

Steps:

### 1. Derive a slug

From the description, derive a kebab-case slug (lower, ASCII, words joined by `-`, max 40 chars; strip stopwords if needed). If `topics/<slug>/` already exists, append `-2`, `-3`, ... until free.

### 2. Ask 3-5 clarifying questions via `AskUserQuestion`

Ask these in a single `AskUserQuestion` call (multiple questions in one block), tailored to the description:

1. **Scope boundary** — what's clearly *in* scope? what's clearly *out*? (multiSelect over reasonable defaults inferred from the description, with "Other" for custom).
2. **Recency floor** — how old can the most-cited works be? Options like `last 3 years (2023+)`, `last 5 years (2021+)`, `last 10 years (2016+)`, `no floor (include classical)`.
3. **Known method families to prioritize** — multiSelect over candidates you propose based on the description.
4. **End goal** — is this for training a model / building a product / writing a survey / making a decision? (single-select).
5. *(Optional, only if the description is broad)* **Anti-patterns to flag** — which kinds of works to explicitly down-rank (multiSelect; e.g., "marketing/survey w/o mechanism", "benchmarks with no real-world validation", etc.).

If the description is **very broad** (under 5 specific technical words OR mentions multiple disjoint subfields), first ask a single `AskUserQuestion`:

> "Your description is broad — I can generate a generic proposal, but it'll need heavy editing. Want to add specifics first?"

Options: `Generate generic and I'll edit` · `Add specifics now`. If user picks the second, ask them to type the specifics, then re-evaluate.

### 3. Generate the topic files

Generate (initial status `draft`, with `# UNCERTAIN: <reason>` comments next to fields where you had to guess):

- `topics/<slug>/topic.yaml` — full rich schema. If another topic already exists under `topics/`, use it as a shape reference; otherwise generate from spec. Include `meta` (with `slug`, `name`, `description`, `status: draft`, `created_at: <today YYYY-MM-DD>`), `concept_layers[]` (3-5), `execution_routes[]` (5-10), `scope_in[]`, `scope_out[]`, `recency_floor`, `record_fields[]`, `graph_edge_types[]`, `report_sections[]`, `iteration_mix: {new_min: 1, deepen_min: 1, challenge_min: 1, synthesis_every_n_cycles: 7}`.
- `topics/<slug>/proposal.md` — prose framing: why these concept layers, why this scope, where contradictions usually come from, reading order, anti-patterns. If another topic's `proposal.md` already exists, use it as a structural reference. Keep it to roughly one screen — not exhaustive.
- `.claude/loops/<slug>.md` — **single merged dispatch stub** (researcher + synthesis in one). If another `.claude/loops/*.md` already exists, copy its structure and only swap the slug/path strings; otherwise write a stub that (a) sets `TOPIC_SLUG` and `TOPIC_DIR`, (b) reads `topic.yaml` and stops if `meta.status` is not `accepted`, (c) reads `logs/cycle.txt`, (d) computes mode by `next_cycle % synthesis_every_n_cycles`, (e) reads either `.claude/loop.md` or `.claude/loop-summary.md` (never both in one iteration), (f) writes `next_cycle` back. Do not generate a separate `-summary.md` stub.

Also create:

- The empty directory tree: `topics/<slug>/{records/works_json,records/works_md,indexes,sources/papers,sources/blogs,sources/repo_notes,logs,summaries,report}/`.
- The cycle counter file: `topics/<slug>/logs/cycle.txt` with the single line `0\n`.

### 4. Validate and auto-accept

Run the full acceptance validation (the same checks that `/argus accept` runs):

- `meta`: `slug`, `name`, `description`, `status`, `created_at` are all non-empty
- `concept_layers` has ≥ 1 entry
- `execution_routes` has ≥ 1 entry
- `scope_in` and `scope_out` each have ≥ 1 entry
- `recency_floor` is an integer
- `record_fields` has ≥ 1 required field
- `graph_edge_types` has ≥ 1 entry
- `report_sections` has ≥ 1 entry
- `iteration_mix` has all keys: `new_min`, `deepen_min`, `challenge_min`, `synthesis_every_n_cycles`
- `.claude/loops/<slug>.md` exists
- `topics/<slug>/logs/cycle.txt` exists

If anything fails: keep `status: draft`, print the list of failures, and skip step 5. Tell the user to fix and then run `/argus accept <slug>`.

If any `# UNCERTAIN:` markers remain in the yaml, list them once and ask via `AskUserQuestion`: "There are N `UNCERTAIN` markers. Accept and start anyway?" with options `Accept and start` · `Stop, I'll fix them first`. If the user picks the second option, keep `draft` and stop.

Otherwise: use `Edit` to flip `meta.status` from `draft` to `accepted` and add `accepted_at: <today YYYY-MM-DD>`.

### 5. Write empty stubs (so the frontend doesn't 404)

Write these files with minimal valid content so the dashboard renders an empty-state view rather than a 404 error:

- `topics/<slug>/indexes/knowledge_graph.json` = `{"nodes":[],"edges":[],"updated_at":"<today ISO timestamp>"}`
- `topics/<slug>/indexes/master_index.jsonl` = empty file (zero bytes)
- `topics/<slug>/indexes/route_index.json` = `{}`
- `topics/<slug>/logs/search_log.jsonl` = empty file
- `topics/<slug>/logs/research_state.md` = `# Research state\n\nIteration 0. No records yet. Run \`/argus loop <slug>\` in Claude Code to begin.\n`
- `topics/<slug>/report/main.md` = `# <name>\n\nResearch has not started yet.\n\nRun \`/argus loop <slug>\` in Claude Code to begin. This file will be rewritten by the synthesis editor after the first few research cycles.\n`
- `topics/<slug>/report/reference_index.md` = `# Reference Index\n\nResearch has not started yet.\n`
- `topics/<slug>/report/iteration_log.md` = empty file

### 6. Report

Output a short summary listing the created files plus the count of fields marked `UNCERTAIN`. Then:

> Topic `<slug>` is ready (status: `accepted`).
>
> To start research, run this in Claude Code:
>
>     /argus loop <slug>
>
> To watch progress in the dashboard:
>
>     cd app && npm run dev
>
> then open `http://localhost:5173/t/<slug>`. The dashboard auto-refreshes every 2 minutes — new records and report updates appear silently as the loop runs.

---

## Subcommand: `accept`

Usage: `/argus accept <slug>`

Steps:

1. Verify `topics/<slug>/topic.yaml` exists. If not: error and list known slugs via `ls topics/`.
2. Read it. If `meta.status` is already `accepted`, print a no-op message and stop.
3. Validate required fields are non-empty:
   - `meta`: `slug`, `name`, `description`, `status`, `created_at`
   - `concept_layers` (≥ 1 entry)
   - `execution_routes` (≥ 1 entry)
   - `scope_in` and `scope_out` (≥ 1 entry each)
   - `recency_floor` (integer)
   - `record_fields` (≥ 1 required field)
   - `graph_edge_types` (≥ 1 entry)
   - `report_sections` (≥ 1 entry)
   - `iteration_mix` with keys `new_min`, `deepen_min`, `challenge_min`, `synthesis_every_n_cycles`
   If any are missing: print the list of missing fields and stop. Do not flip status.
4. Verify `.claude/loops/<slug>.md` exists (the single merged stub). If missing: explain and offer to regenerate.
   If a legacy `.claude/loops/<slug>-summary.md` exists from a prior split-stub topic, delete it (the merged stub handles synthesis internally).
   If `topics/<slug>/logs/cycle.txt` does not exist, create it with the content `0\n`.
5. Verify any `# UNCERTAIN:` markers remaining in the yaml. If there are any, print them and ask via `AskUserQuestion`: "There are still N `UNCERTAIN` markers. Accept anyway?" with options `Accept as-is` · `Stop, I'll fix them first`.
6. If all good: update `meta.status` to `accepted` and set `meta.accepted_at` to today's `YYYY-MM-DD`. Use `Edit` to make the change (preserve all other yaml).
7. Print:

   > Topic `<slug>` is now accepted. Run:
   > - `/argus loop <slug>`
   >
   > The single merged loop alternates research and synthesis automatically based on `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default: 1 synthesis per 7 iterations).

---

## Subcommand: `list`

Usage: `/argus list`

Steps:

1. Find all `topics/*/topic.yaml` files via `Bash: ls -1 topics/*/topic.yaml 2>/dev/null`.
2. For each, read just the `meta:` block (use `Read` with a small `limit`, e.g., 30 lines).
3. Print a compact table with columns: `slug` · `name` · `status` · `created_at` · `accepted_at` (blank if not accepted).
4. Print total count at the bottom.

If no topics exist: print "No topics yet. Run `/argus init \"<description>\"` to create one."

---

## Subcommand: `loop`

Usage: `/argus loop [<slug>]` (start a research loop) · `/argus loop stop` (stop all running loops)

This is a **thin wrapper** around Claude Code's built-in `/loop` skill — it adds validation and brand consistency. The actual cron scheduling is delegated to the `loop` skill via the `Skill` tool.

### Start: `/argus loop` or `/argus loop <slug>`

**Resolve slug:**

- If user supplied a slug, use it directly.
- If no slug given:
  - Run `ls -1 topics/*/topic.yaml 2>/dev/null` and parse each file's `meta.status`.
  - Filter to `status: accepted`.
  - **Zero accepted topics:** print "No accepted topics. Run `/argus init \"<description>\"` first." and stop.
  - **Exactly one accepted topic:** ask the user once via `AskUserQuestion`: "Start the research loop for `<slug>`? (It will run every ~2 minutes until stopped.)" Options: `Yes, start` · `No, cancel`.
  - **Multiple accepted topics:** ask via `AskUserQuestion` which one to start (one option per slug, plus a `Cancel` option).

**Validate the chosen slug:**

1. `topics/<slug>/topic.yaml` exists → else: "Topic `<slug>` not found. Try `/argus list`." Stop.
2. `meta.status == accepted` → else: "Topic `<slug>` is `<status>`. Run `/argus accept <slug>` first." Stop.
3. `.claude/loops/<slug>.md` (dispatch stub) exists → else: "Dispatch stub missing for `<slug>`. Re-run `/argus init` or `bash .claude/skills/argus/scripts/bootstrap.sh`." Stop.

**Fire the loop:**

Use the `Skill` tool with `skill: "loop"` and `args: "2m loops/<slug>"`. This is equivalent to the user typing `/loop 2m loops/<slug>` directly — same cron, same merged-stub behavior — just brand-consistent and pre-validated.

If the `Skill` tool is unavailable or fails to invoke the `loop` skill nested, fall back: print the exact equivalent command for the user to type manually:

> `/loop 2m loops/<slug>`

Either way, after the loop is scheduled (or instruction printed), print a short confirmation:

> Research loop is now running for `<slug>`. Iterations alternate between scout and synthesis (~7:1 ratio). Stop any time with `/argus loop stop`. View progress at `http://localhost:5173/t/<slug>`.

### Stop: `/argus loop stop`

Use the `Skill` tool with `skill: "loop"` and `args: "stop"`. This stops **all** `/loop` cron tasks in the current Claude Code project (not just Argus ones — that's how the underlying `/loop stop` works). If the user wants finer-grained control (stop one specific scheduled task), point them at the `/schedule list` and `/schedule delete <id>` commands.

If the `Skill` tool fails, fall back to: print `/loop stop` for the user to type manually.

After stop, print: "Stopped all loops. State persists on disk — re-fire with `/argus loop <slug>` to resume."

---

## General rules

- Do not invent new subcommands. If user types one that doesn't match, print the supported list.
- `init` / `accept` / `list` subcommands only write config and stubs — never fire loops, never commit, never push.
- The `loop` subcommand is a wrapper around the existing `loop` skill (`/loop`) — never reimplement cron scheduling here, always delegate via the `Skill` tool. If that fails, fall back to printing the equivalent raw `/loop` command for the user to run.
- When using `AskUserQuestion`, batch questions into a single call when possible (multiple `questions[]` entries). Do not have a long back-and-forth.
- Today's date for any timestamp: use the current calendar date in `YYYY-MM-DD` form. If you can't determine it, ask the user once.
