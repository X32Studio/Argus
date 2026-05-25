import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTopicMeta } from "./parseTopicMeta.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");

const topicsSource = path.join(repoDir, "topics");
const topicsTarget = path.join(appDir, "public", "topics");

// Subdirectories never shipped to the static build (large / dev-only / gitignored).
const SKIP_TOP_LEVEL = new Set(["sources", "logs", "summaries"]);

await fs.rm(topicsTarget, { recursive: true, force: true });
await fs.mkdir(topicsTarget, { recursive: true });

const topicDirs = (
  await pathExists(topicsSource)
    ? (await fs.readdir(topicsSource, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
);

const index = [];

for (const slug of topicDirs) {
  const topicDir = path.join(topicsSource, slug);
  const yamlPath = path.join(topicDir, "topic.yaml");
  if (!(await pathExists(yamlPath))) continue;

  await copySelective(topicDir, path.join(topicsTarget, slug), SKIP_TOP_LEVEL);

  const yamlText = await fs.readFile(yamlPath, "utf8");
  const meta = parseTopicMeta(yamlText);
  index.push({
    slug: meta.slug ?? slug,
    name: meta.name ?? slug,
    description: meta.description ?? "",
    status: meta.status ?? "draft",
    created_at: meta.created_at ?? "",
    accepted_at: meta.accepted_at ?? "",
  });
}

await fs.writeFile(
  path.join(topicsTarget, "_index.json"),
  JSON.stringify({ topics: index }, null, 2) + "\n",
);

console.log(`synced ${index.length} topic(s) → ${path.relative(repoDir, topicsTarget)}`);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copySelective(src, dst, skipTopLevel) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (skipTopLevel.has(e.name)) continue;
    const from = path.join(src, e.name);
    const to = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(from, to);
    else await copyFile(from, to);
  }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(from, to);
    else await copyFile(from, to);
  }
}

async function copyFile(src, dst) {
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(src, dst);
}
