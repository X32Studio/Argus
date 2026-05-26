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

### 2. Pick a mode (lazy vs detailed)

Before asking any detailed questions, ask the user **once** via `AskUserQuestion`:

> "Want to answer a few setup questions, or let me infer everything from the description? Either way you'll review one final confirmation before the loop starts."

Options (lazy first, marked recommended so a single keypress accepts):
- `Use my inferred defaults (recommended)` — skip the clarifying-question block. You infer scope, recency, methods, end goal, and anti-patterns from the one-line description alone. Annotate every inferred field in `topic.yaml` with `# UNCERTAIN: <reason>` so the user can revisit later.
- `Walk me through the questions` — proceed to step 2b below.

If user picks `Use my inferred defaults`: **skip to step 3.**
If user picks the detailed path: continue to step 2b.

### 2b. Ask only the questions you actually need (detailed mode)

**Don't fixed-ask 5 questions.** Look at the description first. For each of the five candidate axes below, decide: can I infer this confidently from the description? If yes, skip the question and just use the inferred value (still mark it `# UNCERTAIN:` in yaml if the inference was shaky). If no, ask.

Bundle the kept questions into a single `AskUserQuestion` call (multiple `questions[]` in one block). Aim for 1-3 questions in most cases; 0 is fine if the description is already specific; 5 only if everything is genuinely ambiguous.

**Every question you DO ask: the FIRST option must be your best guess, labeled `<your guess> (recommended)`.** That way the user can rapid-fire the first option to confirm your inference, but with a chance to override.

Candidate axes (only ask if the answer isn't obvious from the description):

1. **Scope boundary** — what's clearly *in* / *out* of scope (multiSelect, "Other" available).
2. **Recency floor** — `last 3y (2023+)` / `last 5y (2021+)` / `last 10y (2016+)` / `no floor`.
3. **Method families to prioritize** (multiSelect).
4. **End goal** — train a model / build a product / write a survey / make a decision (single-select).
5. **Anti-patterns to flag** (multiSelect, only if the description is broad enough to need them).

If the description is **very broad** (under 5 specific technical words OR mentions multiple disjoint subfields), first ask a single `AskUserQuestion`:

> "Your description is broad — I can generate a generic proposal, but it'll need heavy editing. Want to add specifics first?"

Options: `Generate generic and I'll edit (recommended)` · `Add specifics now`. If user picks the second, ask them to type the specifics, then re-evaluate.

### 3. Generate the topic files

**Authoritative spec:** `.claude/skills/argus/docs/frontend-contract.md` defines the schemas the frontend reads. **Conform to that contract literally — every drift breaks dashboard rendering silently.** Re-read sections §3.2 (topic.yaml) and §3.3 (knowledge_graph.json) of the contract before generating.

Generate (initial status `draft`, with `# UNCERTAIN: <reason>` comments next to fields where you had to guess):

- `topics/<slug>/topic.yaml` — full rich schema, conforming exactly to `frontend-contract.md` §3.2. **Every list item with a free-form `name` MUST also carry a machine-friendly `key`** (kebab-case for `concept_layers` / `execution_routes`, snake_case for `graph_edge_types` / `record_fields`).

  Required yaml shape (collapse to one-line maps where descriptions are short, expand for long ones — both are valid YAML):

  ```yaml
  meta:
    slug: <kebab-case-slug>
    name: <Human title>
    description: <one or two sentences>
    status: draft
    created_at: <today YYYY-MM-DD>

  concept_layers:                # 3-5 entries; the ontology used to reason about claims
    - key: <kebab-case>          # required, stable identifier
      name: <Human label>        # required
      description: <one sentence>

  execution_routes:              # 5-10 entries; stable search buckets / memory partitions
    - key: <kebab-case>          # required, stable identifier (the frontend turns this into a route:<key> node in the knowledge graph)
      name: <Human label>        # required
      description: <one sentence>
      anchor_examples: [optional, list, of, seed, work, names]

  scope_in:   [list of strings]
  scope_out:  [list of strings]
  recency_floor: <year int>

  record_fields:                 # 10-30 entries; the per-source record schema
    - {key: <snake_case>, required: true|false, description: <one sentence>}

  graph_edge_types:              # 5-15 entries; controlled edge vocabulary
    - {key: <snake_case>, description: <one sentence>}

  report_sections:               # 6-10 entries; canonical section keys for report/main.md
    - <kebab-case-or-snake_case-key>

  iteration_mix:
    new_min: 1
    deepen_min: 1
    challenge_min: 1
    synthesis_every_n_cycles: 7
  ```

  **Do not** drop `key:` even when `name:` is human-readable — both are required side-by-side. The frontend filters graph nodes by `kind` (a separate node-level field; see knowledge_graph stub below) and looks up routes by `key`.
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

If any `# UNCERTAIN:` markers remain in the yaml, list them once and ask via `AskUserQuestion`: "There are N `UNCERTAIN` markers. Accept and start anyway?" with options `Accept and start (recommended)` · `Stop, I'll fix them first`. The first option is the default so a single keypress proceeds. If the user picks the second option, keep `draft` and stop.

Otherwise: use `Edit` to flip `meta.status` from `draft` to `accepted` and add `accepted_at: <today YYYY-MM-DD>`.

### 5. Write empty stubs (so the frontend doesn't 404)

Write these files with minimal valid content so the dashboard renders an empty-state view rather than a 404 error:

- `topics/<slug>/indexes/knowledge_graph.json` — conform to `frontend-contract.md` §3.3. **Seed the route nodes from `topic.yaml.execution_routes`** so the dashboard's sidebar shows the routes immediately:

  ```json
  {
    "nodes": [
      {"id": "route:<execution_routes[0].key>", "kind": "route", "label": "<execution_routes[0].name>"},
      {"id": "route:<execution_routes[1].key>", "kind": "route", "label": "<execution_routes[1].name>"}
      // ... one per execution_routes[] entry
    ],
    "edges": [],
    "updated_at": "<today ISO timestamp>"
  }
  ```

  **Hard schema rules** (from `frontend-contract.md` §3.3):
  - Every node `id` MUST be `<kind>:<slug>` — `route:`, `work:`, `technique:`, `transferable_idea:`, or `pitfall:` prefix. Bare ids like `langchain` are forbidden and silently break frontend filtering.
  - Every node MUST carry a `kind` field (use `kind`, not `type`).
  - When researcher loop later adds a `kind: work` node for a paper/repo/blog, it **MUST also add a `belongs_to_route` edge** connecting `work:<slug>` ↔ `route:<route-key>` for the work's primary route. Otherwise the work won't appear in any sidebar route's list.
  - Edges connect nodes via `rel` whose value is one of `topic.yaml.graph_edge_types[].key`.
  - `kind: work` node's slug MUST match the filename in `records/works_json/<slug>.json` so the inspector can fetch detail.

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
5. Verify any `# UNCERTAIN:` markers remaining in the yaml. If there are any, print them and ask via `AskUserQuestion`: "There are still N `UNCERTAIN` markers. Accept anyway?" with options `Accept as-is (recommended)` · `Stop, I'll fix them first`. First option is the default.
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
