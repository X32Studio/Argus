# Argus dispatch stub — complex-feature-tokenization

This is the single merged loop stub for the `complex-feature-tokenization` topic.
It is invoked once per cron tick by `/argus loop complex-feature-tokenization`
(equivalently `/loop 2m loops/complex-feature-tokenization`). It dispatches exactly
ONE iteration — either a RESEARCH cycle or a SYNTHESIS cycle — then returns.

## Fixed identifiers

- `TOPIC_SLUG = complex-feature-tokenization`
- `TOPIC_DIR  = topics/complex-feature-tokenization`

## Pre-flight (do this first, in order)

1. Read `topics/complex-feature-tokenization/topic.yaml`. If `meta.status` is **not**
   `accepted`, STOP immediately and print: "Topic complex-feature-tokenization is
   `<status>`, not accepted. Run `/argus accept complex-feature-tokenization` first."
   Do not run any cycle.

2. Read `topics/complex-feature-tokenization/logs/cycle.txt` → integer `N` (the last
   completed cycle; file holds a single line). `next_cycle = N + 1`.

3. Read `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default 7). Compute:
   `mode = (next_cycle % synthesis_every_n_cycles == 0 && next_cycle > 0) ? "SYNTHESIS" : "RESEARCH"`.

## Run exactly one cycle

- **RESEARCH** → read `.claude/loop.md` (the universal scout methodology) and execute
  exactly ONE research iteration for this topic, passing `TOPIC_SLUG`, `TOPIC_DIR`,
  `mode = RESEARCH`, and `next_cycle`. Do NOT also read `.claude/loop-summary.md`.

- **SYNTHESIS** → read `.claude/loop-summary.md` (the universal synthesis methodology)
  and execute exactly ONE synthesis iteration, passing `TOPIC_SLUG`, `TOPIC_DIR`,
  `mode = SYNTHESIS`, and `next_cycle`. Do NOT also read `.claude/loop.md`.

Read only ONE of the two methodology files per tick — never both.

## Post-flight (single-writer rule)

4. On a successful cycle return, overwrite `topics/complex-feature-tokenization/logs/cycle.txt`
   with `next_cycle` followed by a newline. This stub (the orchestrator) is the ONLY writer
   of `cycle.txt`. Iteration runner subagents and paper-reader sub-subagents are forbidden
   from touching it. If the cycle errored, leave `cycle.txt` unchanged so the next tick
   re-fires the same `next_cycle` idempotently.

## Notes

- This stub never commits or pushes; the synthesis methodology handles git internally if a
  repo is detected.
- When run in-session via the Argus skill's per-cycle Workflow instead of cron, the workflow
  drives the RESEARCH fan-out and the skill orchestrator owns `cycle.txt`; this stub is the
  cron-path equivalent.
