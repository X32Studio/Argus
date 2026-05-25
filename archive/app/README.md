# Argus — App

React + Vite frontend for the Argus topic-driven research engine. Renders
the knowledge graph, per-work records, and synthesis report for any
accepted topic under `topics/<slug>/`.

## Routes

- `/` — topic picker (lists `topics/*/topic.yaml` with `status: accepted`)
- `/t/:slug` — dashboard for one topic (graph, route pane, inspector)
- `/t/:slug/report` — synthesis report (`report/main.md`, `reference_index.md`, `iteration_log.md`)

## Commands

```bash
cd app
npm install
npm run dev -- --host 0.0.0.0
npm run build
npm run preview -- --host 0.0.0.0
```

`npm run sync-data` (also run by `npm run build`) copies every topic's
`topic.yaml`, `records/`, `indexes/`, `report/`, and `proposal.md` into
`app/public/topics/<slug>/`, and writes a `_index.json` listing them.

`sources/`, `logs/`, and `summaries/` directories under each topic are
intentionally **not** copied (large / dev-only / gitignored).

## Dev Server Asset Serving

In dev mode, `vite.config.ts` adds a middleware that:

- serves any `/topics/<slug>/<path>` request directly from `repo/topics/<slug>/<path>` (skipping `sources/`, `logs/`, `summaries/`)
- generates `/topics/_index.json` on the fly by scanning `repo/topics/*/topic.yaml`

So you don't need to re-run `sync-data` while iterating in dev — Vite just
reads from the live `topics/` tree.

## Remote Server Access

Typical workflow:

1. Run `npm run dev -- --host 0.0.0.0` on the server
2. Use SSH port forwarding from your local machine
3. Open the forwarded port in your local browser

Vite may choose another port if the requested one is occupied.
