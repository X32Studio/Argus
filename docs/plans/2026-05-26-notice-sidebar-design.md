# Notice sidebar + URL front-loading — design

**Status:** approved by user 2026-05-26
**Scope:** Argus skill + `.claude/loop.md` + `app/` (frontend)

## Goal

Turn the dashboard into a live status surface that's useful *before* any research output exists. Achieves three things:

1. The dashboard URL is visible to the user almost immediately after they confirm intent.
2. While the loop is producing nothing visible (early cycles, init clarifying questions), the agent pushes short status lines the user can watch.
3. The dashboard signals "come back to Claude Code" when the orchestrator is blocked waiting on user input.

## File protocol

### Per-topic notices

Path: `topics/<slug>/logs/notices.jsonl`

Append-only JSONL. One event per line:

```json
{"ts":"2026-05-26T12:34:56Z","level":"info|attention|blocked","source":"orchestrator|runner","cycle":3,"text":"one-line status"}
```

- `cycle` is null when not applicable (e.g., during init).
- `text` ≤ 140 chars. No multi-line.
- Writers append only; never rewrite. File rotation deferred to YAGNI.

### Pre-topic bootstrap notices

Path: `.claude/loops/_bootstrap_notices.jsonl`

Same schema. Used between Step 1 (intent confirmed) and the moment `/argus init` writes a slug. Once the slug exists, future events go to per-topic file; bootstrap file is left in place (not migrated).

### Levels

- `info` — passive progress ("starting cycle 3", "depth upgrade complete")
- `attention` — user should glance ("topic ready", "saturated after 12 cycles")
- `blocked` — orchestrator is paused waiting on user response in CC (AskUserQuestion outstanding, or a STOP condition is awaiting confirmation)

## Skill changes (`.claude/skills/argus/SKILL.md`)

### 1. Start dashboard earlier

Move dashboard-start logic out of Flow A Step 3 into a new **Step 1.5**: immediately after intent is confirmed in Step 1, start the dev server (if port 5173 free) and print:

```
Dashboard: http://localhost:5173/
(URL will become /t/<slug> once the topic is set up.)
```

### 2. Emit points (orchestrator)

The orchestrator appends to the right file at these moments:

| Trigger | File | Level | Example text |
|---|---|---|---|
| After Step 1 confirm | bootstrap | info | "Setting up topic '<one-line>'…" |
| Before each AskUserQuestion in init | bootstrap | blocked | "Waiting on you in Claude Code: <question gist>" |
| After AskUserQuestion answered | bootstrap | info | "Got it. Continuing." |
| Right after `/argus init` succeeds | per-topic | attention | "Topic <slug> ready. Loop options waiting in CC." |
| Before starting each cycle | per-topic | info | "Cycle N starting (mode=<RESEARCH\|SYNTHESIS>)" |
| After parsing runner return | per-topic | info | "Cycle N done: +<new_works> works, +<depth_upgrades> upgrades" |
| Runner unnotified after watchdog | per-topic | attention | "Cycle N runner: no response after 7m. Continuing." |
| STOP_SATURATED / STOP_CONTEXT / STOP_BLOCKER | per-topic | blocked | "Stopped: <reason>. Action needed in CC." |

### 3. Emit points (runner)

The orchestrator's runner-dispatch prompt now includes a section:

> Append a single line to `${TOPIC_DIR}/logs/notices.jsonl` at these moments:
> - When you start the iteration: `info`, text "Cycle N: scouting <n> candidate sources"
> - When you finish parallel deep-read: `info`, text "Cycle N: deep-read complete (<k> upgrades)"
> - When you finish the iteration: `info`, text "Cycle N: <new_works> new works"
>
> Use the bash form:
> ```bash
> printf '%s\n' "$(jq -nc --arg ts "$(date -u +%FT%TZ)" --arg lv info --arg src runner --argjson cyc N --arg txt 'one line' '{ts:$ts,level:$lv,source:$src,cycle:$cyc,text:$txt}')" >> ${TOPIC_DIR}/logs/notices.jsonl
> ```
> Do not write more than ~3 lines per iteration.

(Reader sub-subagents never write — too noisy.)

### 4. `.claude/loop.md` template

Add a short "Notice emission" section that the runner reads, mirroring the three emit points above. This keeps notice behavior consistent regardless of whether the runner was dispatched by the skill or by `/argus loop` cron.

## Frontend changes (`app/`)

### New component: `ActivityRail`

Path: `app/src/components/ActivityRail.tsx`

A collapsible left rail, always mounted (lives in `App.tsx` root, outside `<Routes>`).

- Collapsed by default; toggle via icon button.
- When collapsed: shows a thin vertical strip with a count badge and a pulsing dot if there's an unread `blocked` event.
- When expanded: shows the latest ~50 notices, newest on top, with timestamp, level color, source tag, cycle.
- Click on a `blocked` event flashes the page title `[!] Argus needs you` to draw attention if user is in another tab.

### New hook: `useNotices`

Path: `app/src/hooks/useNotices.ts`

Polls every 3 seconds. Source depends on route:

- On `/` (TopicPicker): fetches `/loops/_bootstrap_notices.jsonl` (served via Vite dev as a static path; sync-data script copies it into `public/loops/`).
- On `/t/<slug>`: fetches `/topics/<slug>/logs/notices.jsonl` *and* the bootstrap file, merges by timestamp. Once per-topic events exist, bootstrap file becomes lower priority but still visible until user dismisses.

Polling uses simple `fetch` + parse-line. New entries detected by line count diff; nothing fancy.

### Sync-data script

`app/scripts/syncResearchData.mjs`:

- Copy `topics/<slug>/logs/notices.jsonl` if present (currently `logs/` is in SKIP_TOP_LEVEL — exception needed for this file).
- Copy `.claude/loops/_bootstrap_notices.jsonl` if present → `public/loops/_bootstrap_notices.jsonl`.

In dev mode (`npm run dev`), notices files are read live via static serving; in production build, the script's last sync wins. Documentation: this feature is dev-only useful, build-time snapshot is acceptable degraded state.

### Empty state

`EmptyTopicView` stays as-is but the `ActivityRail` next to it gives the user something live to watch — which addresses the "blank time" problem directly.

## "Come back to CC" UX

Two layers:

1. **Sidebar badge** — always visible. Unread `blocked` event = red dot + count.
2. **Title-bar flash** — when a new `blocked` event arrives, page title cycles between original and `[!] Argus needs you` for ~30 seconds (so user notices in another browser tab).

No desktop notifications (permission prompt is intrusive — YAGNI).

## Non-goals

- No filtering / search inside the rail.
- No file rotation, retention, or archive.
- No per-user dismiss state persistence (refresh = re-show).
- No write-from-frontend (rail is read-only).
- No SSE / websocket. Polling is fine at 3s cadence.

## Build order

1. File protocol + sync-data exception (smallest blast radius, unblocks everything).
2. Skill emit points (orchestrator) + bootstrap notices file.
3. `useNotices` hook + `ActivityRail` component.
4. Runner emit instructions in `.claude/loop.md` template + skill's runner prompt.
5. Title-flash polish.

Each layer is independently testable: 1+3 alone makes the rail show static data; +2 makes it live in skill; +4 makes it live during runner.
