# Argus iteration dispatch — `shanghai-food-watch`

This stub is invoked by `/loop` (cron path) on each tick. It reads the topic's
counter, decides whether this cycle is RESEARCH or SYNTHESIS, then reads the
universal methodology and executes one iteration.

The skill-as-orchestrator path (in-session mode) bypasses this stub and
dispatches iteration-runner subagents directly — but those runners receive
the same `TOPIC_SLUG` / `TOPIC_DIR` / `mode` values that this stub would set,
so the methodology files are the single source of truth.

## Variables for this iteration

- `TOPIC_SLUG = shanghai-food-watch`
- `TOPIC_DIR = topics/shanghai-food-watch`

## Gate — only run if the topic is accepted

1. Read `${TOPIC_DIR}/topic.yaml`. If `meta.status` is not `accepted`, stop
   immediately and print: "Topic `shanghai-food-watch` is not accepted yet.
   Run `/argus accept shanghai-food-watch` to enable the loop."

## Mode selection

2. Read `${TOPIC_DIR}/logs/cycle.txt` as integer `N` (single-line int; create
   with `0` if missing).
3. Compute `next_cycle = N + 1`.
4. Read `topic.yaml.iteration_mix.synthesis_every_n_cycles` (default `7`).
5. If `next_cycle % synthesis_every_n_cycles == 0` AND `next_cycle > 0`, set
   `mode = SYNTHESIS`; otherwise `mode = RESEARCH`.

## Execute

6. If `mode == RESEARCH`: read `.claude/loop.md` and execute exactly ONE
   research iteration following its instructions, substituting `TOPIC_SLUG`
   and `TOPIC_DIR` above for the placeholders in that file. Never read
   `.claude/loop-summary.md` in a RESEARCH iteration.

7. If `mode == SYNTHESIS`: read `.claude/loop-summary.md` and execute exactly
   ONE synthesis iteration following its instructions, same substitution
   rules. Never read `.claude/loop.md` in a SYNTHESIS iteration.

## After the iteration

8. Overwrite `${TOPIC_DIR}/logs/cycle.txt` with `next_cycle` and a trailing
   newline. (This stub is the canonical cron-path writer of `cycle.txt`. The
   in-session orchestrator owns this file when the skill drives iterations
   directly; never both paths active at once for the same topic.)

9. Append one line to `${TOPIC_DIR}/logs/orchestrator.jsonl`:
   ```json
   {"ts": "<ISO timestamp>", "cycle": <next_cycle>, "mode": "RESEARCH|SYNTHESIS", "via": "cron-stub"}
   ```

10. As the final step, run the contract validator and append any residual
    violations to `${TOPIC_DIR}/logs/research_state.md` under the heading
    `## contract_violations`:
    ```bash
    bash .claude/skills/argus/scripts/validate-contract.sh --fix shanghai-food-watch
    ```

## Stop conditions (cron path)

- This stub does NOT carry its own saturation detector. Run `/argus loop stop`
  (or `/loop stop`) to halt the cron schedule when the user decides the
  topic is done or paused.
- If `topic.yaml.meta.status` flips to `paused` or `archived` mid-loop, the
  gate at step 1 stops further iterations on the next tick.
