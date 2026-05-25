# Dispatch stub — cancer-immunotherapy-car-t

This file is read by `/loop`. Its only job is to (1) check the topic is accepted,
(2) advance the cycle counter, (3) decide whether this iteration is `research`
or `synthesis`, and (4) hand off to the right universal methodology file.

## Constants

- `TOPIC_SLUG`: `cancer-immunotherapy-car-t`
- `TOPIC_DIR`: `topics/cancer-immunotherapy-car-t`

Substitute these wherever they appear in `.claude/loop.md` or `.claude/loop-summary.md`.

## Step 1 — Gate on acceptance

Read `topics/cancer-immunotherapy-car-t/topic.yaml`. If `meta.status` is not
`accepted`, stop immediately and print:

> Topic `cancer-immunotherapy-car-t` is not accepted. Run `/argus accept cancer-immunotherapy-car-t` first.

Do not proceed.

## Step 2 — Read cycle counter

Read `topics/cancer-immunotherapy-car-t/logs/cycle.txt`. It contains a single
non-negative integer. If the file is missing or empty, treat the current cycle
as `0`. Let `current_cycle = <that integer>` and `next_cycle = current_cycle + 1`.

## Step 3 — Pick mode

Read `meta.iteration_mix.synthesis_every_n_cycles` from `topic.yaml`
(default `7` if absent). Let `N = synthesis_every_n_cycles`.

- If `next_cycle % N == 0` **and** `next_cycle > 0`: this is a **synthesis** iteration.
- Otherwise: this is a **research** iteration.

State which mode you picked, the value of `next_cycle`, and `N`.

## Step 4 — Hand off

- **research mode** → read and execute `.claude/loop.md` in full. Treat
  `${TOPIC_SLUG}` and `${TOPIC_DIR}` as the constants above wherever they
  appear in that file.
- **synthesis mode** → read and execute `.claude/loop-summary.md` in full,
  with the same substitution.

Never read both files in the same iteration.

## Step 5 — Write cycle counter

After the chosen methodology file finishes (or hits a stop condition it
documents), overwrite `topics/cancer-immunotherapy-car-t/logs/cycle.txt`
with `next_cycle` followed by a newline. This makes `next_cycle` the
`current_cycle` for the following `/loop` tick.

If the methodology aborted before producing any record / report mutation
(e.g. because the network was unreachable), do NOT advance the counter —
leave `cycle.txt` unchanged so the next tick retries the same cycle.

## Step 6 — Quiet by default

This stub itself should print only:

- the chosen mode and `next_cycle`,
- any abort message from Step 1,
- a one-line "advanced to cycle N" or "did not advance" footer.

The methodology files handle their own logging.
