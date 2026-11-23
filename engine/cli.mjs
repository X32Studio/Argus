#!/usr/bin/env node
/**
 * Argus 2.0 CLI
 *
 * Commands:
 *   node engine/cli.mjs archetypes
 *   node engine/cli.mjs query --topic <slug-or-dir> --task "<question>" [--mode gather|search] [--format json|md] [--limit N]
 */

import fs from "node:fs";
import path from "node:path";
import { listArchetypes } from "./archetypes.mjs";
import { createSystemOneClient } from "./jev.mjs";
import { formatBundleMarkdown, queryTopic } from "./query.mjs";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
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

function maybeSystemOneClient() {
  const endpoint = process.env.ARGUS_JEV_ENDPOINT;
  const model = process.env.ARGUS_JEV_MODEL_ID;
  const keyFile = process.env.ARGUS_JEV_KEY_FILE;
  if (!endpoint || !model) return null;
  return createSystemOneClient({ endpoint, model, keyFile });
}

function resolveTopicDir(topicArg) {
  if (!topicArg) throw new Error("--topic <slug-or-path> is required");
  if (fs.existsSync(topicArg) && fs.statSync(topicArg).isDirectory()) {
    return path.resolve(topicArg);
  }
  const underTopics = path.resolve(process.cwd(), "topics", topicArg);
  if (fs.existsSync(underTopics)) return underTopics;
  throw new Error(`topic not found: ${topicArg}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (!cmd || cmd === "help" || args.help) {
    console.log(
      [
        "Argus 2.0 CLI — Universal Deep Exploration & JEV Decision Engine",
        "",
        "Usage:",
        "  node engine/cli.mjs archetypes",
        '  node engine/cli.mjs query --topic <slug|dir> --task "<goal>" [--mode gather|search] [--format json|md] [--limit N]',
        "",
        "Optional live JEV env vars (defaults to offline deterministic baseline):",
        "  ARGUS_JEV_ENDPOINT=http://127.0.0.1:8001/v1/systemone",
        "  ARGUS_JEV_MODEL_ID=d3-mini",
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

  if (cmd === "query") {
    const topicDir = resolveTopicDir(args.topic);
    const mode = args.mode === "search" ? "search" : "gather";
    const limit = args.limit ? Number(args.limit) : undefined;
    const client = maybeSystemOneClient();
    const bundle = await queryTopic({
      topicDir,
      task: args.task,
      mode,
      limit,
      client,
    });
    if (args.format === "md") {
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
