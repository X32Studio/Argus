#!/usr/bin/env node
/**
 * Argus 2.0 CLI (Claude Code, Codex, and T3 Native Runtime)
 *
 * Commands:
 *   node engine/cli.mjs archetypes
 *   node engine/cli.mjs query --topic <slug-or-dir> --task "<question>" [--mode gather|search] [--format json|md] [--limit N] [--jev auto|live|offline]
 *   node engine/cli.mjs status --topic <slug-or-dir> [--no-services]
 *   node engine/cli.mjs queue --topic <slug-or-dir> --action <list|next|add|done> [--batch N] [--file <json>] [--slug <work-slug>]
 *   node engine/cli.mjs collate --topic <slug-or-dir> [--advance-cycle] [--notice "<text>"]
 *   node engine/cli.mjs decide --topic <slug-or-dir> [--input <path>] [--jev auto|live|offline]
 *   node engine/cli.mjs jev-check
 */

import fs from "node:fs";
import path from "node:path";
import { listArchetypes } from "./archetypes.mjs";
import { createJevClient, resolveJevClient } from "./jev.mjs";
import { formatBundleMarkdown, queryTopic } from "./query.mjs";
import { buildDecisionBoard, collateTopic, getTopicStatus, manageQueue } from "./t3.mjs";

const VALUE_FLAGS = new Set(["topic", "task", "mode", "format", "limit", "jev", "action", "batch", "file", "slug", "notice", "input"]);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (VALUE_FLAGS.has(key)) {
        if (next === undefined || next.startsWith("--")) {
          throw new Error(`--${key} requires a value`);
        }
        out[key] = next;
        i += 1;
      } else if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

async function resolveQueryClient(jevFlag) {
  if (jevFlag) {
    if (!["auto", "live", "offline"].includes(jevFlag)) {
      throw new Error(`--jev must be "auto", "live", or "offline", got "${String(jevFlag)}"`);
    }
    const resolved = await resolveJevClient({ mode: jevFlag });
    return resolved.client;
  }
  const endpoint = process.env.ARGUS_JEV_ENDPOINT;
  const model = process.env.ARGUS_JEV_MODEL_ID;
  const keyFile = process.env.ARGUS_JEV_KEY_FILE;
  if (!endpoint || !model) return null;
  return createJevClient({ endpoint, model, keyFile });
}

function resolveTopicDir(topicArg) {
  if (!topicArg || typeof topicArg !== "string") {
    throw new Error("--topic <slug-or-path> is required");
  }
  if (fs.existsSync(topicArg) && fs.statSync(topicArg).isDirectory()) {
    return path.resolve(topicArg);
  }
  const underTopics = path.resolve(process.cwd(), "topics", topicArg);
  if (fs.existsSync(underTopics)) return underTopics;
  throw new Error(`topic not found: ${topicArg}`);
}

function parsePositiveInt(raw, name) {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) {
    throw new Error(`--${name} must be a positive integer >= 1, got "${String(raw)}"`);
  }
  const n = Number(raw.trim());
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new Error(`--${name} must be a positive integer >= 1, got "${String(raw)}"`);
  }
  return n;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (!cmd || cmd === "help" || args.help) {
    console.log(
      [
        "Argus 2.0 CLI — Universal Deep Exploration, T3 Runtime & JEV Decision Engine",
        "",
        "Usage:",
        "  node engine/cli.mjs archetypes",
        '  node engine/cli.mjs query --topic <slug|dir> --task "<goal>" [--mode gather|search] [--format json|md] [--limit N] [--jev auto|live|offline]',
        "  node engine/cli.mjs status --topic <slug|dir> [--no-services]",
        "  node engine/cli.mjs queue --topic <slug|dir> --action <list|next|add|done> [--batch N] [--file <json>] [--slug <work-slug>]",
        '  node engine/cli.mjs collate --topic <slug|dir> [--advance-cycle] [--notice "<text>"]',
        "  node engine/cli.mjs decide --topic <slug|dir> [--input <path>] [--jev auto|live|offline]",
        "  node engine/cli.mjs jev-check",
        "",
        "Optional live JEV env vars (or pass --jev auto to auto-detect a local loopback JEV server at 127.0.0.1:8001):",
        "  ARGUS_JEV_ENDPOINT=http://127.0.0.1:8001/v1/jev",
        "  ARGUS_JEV_MODEL_ID=jev-router-v1",
        "  ARGUS_JEV_KEY_FILE=/path/to/bearer.key",
      ].join("\n"),
    );
    return;
  }

  if (cmd === "archetypes") {
    for (const a of listArchetypes()) {
      console.log(`${a.id.padEnd(10)} | ${a.label} (${a.zhLabel}) — ${a.tagline}`);
    }
    return;
  }

  if (cmd === "jev-check") {
    const resolved = await resolveJevClient({ mode: "auto", probeTimeoutMs: 3000 });
    process.stdout.write(JSON.stringify(resolved.meta, null, 2) + "\n");
    return;
  }

  if (cmd === "status") {
    const topicDir = resolveTopicDir(args.topic);
    const status = await getTopicStatus(topicDir, { checkServices: !args["no-services"] });
    process.stdout.write(JSON.stringify(status, null, 2) + "\n");
    return;
  }

  if (cmd === "queue") {
    const topicDir = resolveTopicDir(args.topic);
    const action = args.action ?? "list";
    if (!["list", "next", "add", "done"].includes(action)) {
      throw new Error(`--action must be list|next|add|done, got "${String(action)}"`);
    }
    const batch = parsePositiveInt(args.batch, "batch") ?? 2;
    let items = [];
    if (action === "add") {
      if (!args.file) throw new Error("--file <candidates.json> is required for --action add");
      const raw = JSON.parse(fs.readFileSync(path.resolve(args.file), "utf8"));
      items = Array.isArray(raw) ? raw : raw.items ?? [];
    }
    const res = manageQueue(topicDir, action, { items, batch, slug: args.slug ?? null });
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    return;
  }

  if (cmd === "collate") {
    const topicDir = resolveTopicDir(args.topic);
    const res = collateTopic({
      topicDir,
      advanceCycle: Boolean(args["advance-cycle"]),
      noticeText: typeof args.notice === "string" ? args.notice : null,
    });
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    return;
  }

  if (cmd === "decide") {
    const topicDir = resolveTopicDir(args.topic);
    const jevMode = args.jev ?? "auto";
    if (!["auto", "live", "offline"].includes(jevMode)) {
      throw new Error(`--jev must be "auto", "live", or "offline", got "${String(jevMode)}"`);
    }
    const board = await buildDecisionBoard({
      topicDir,
      inputPath: args.input ?? null,
      jevMode,
    });
    process.stdout.write(JSON.stringify(board, null, 2) + "\n");
    return;
  }

  if (cmd === "query") {
    const topicDir = resolveTopicDir(args.topic);
    if (typeof args.task !== "string" || !args.task.trim()) {
      throw new Error('--task "<question>" is required');
    }
    const mode = args.mode ?? "gather";
    if (mode !== "gather" && mode !== "search") {
      throw new Error(`--mode must be "gather" or "search", got "${String(mode)}"`);
    }
    const format = args.format ?? "json";
    if (format !== "json" && format !== "md") {
      throw new Error(`--format must be "json" or "md", got "${String(format)}"`);
    }
    const limit = parsePositiveInt(args.limit, "limit");
    const client = await resolveQueryClient(args.jev);
    const bundle = await queryTopic({
      topicDir,
      task: args.task,
      mode,
      limit,
      client,
    });
    if (format === "md") {
      process.stdout.write(formatBundleMarkdown(bundle));
    } else {
      process.stdout.write(JSON.stringify(bundle, null, 2) + "\n");
    }
    return;
  }

  throw new Error(`unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(`argus error: ${err.message}`);
  process.exit(1);
});
