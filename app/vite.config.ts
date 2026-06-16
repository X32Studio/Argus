import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

import { parseTopicMeta } from "./scripts/parseTopicMeta.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const topicsRoot = path.join(repoRoot, "topics");

const MIME: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
};

// Subdirectories never served (large / dev-only / gitignored).
const SKIP_TOP_LEVEL = new Set(["sources", "logs", "summaries"]);

function serveTopicAssets(): Plugin {
  return {
    name: "serve-topic-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split("?")[0] : "";

        // Pre-topic activity feed lives at repo's .claude/loops/_bootstrap_notices.jsonl.
        if (url === "/loops/_bootstrap_notices.jsonl") {
          const bootstrapPath = path.join(repoRoot, ".claude", "loops", "_bootstrap_notices.jsonl");
          fs.stat(bootstrapPath, (err, stat) => {
            if (err || !stat.isFile()) {
              res.statusCode = 404;
              res.end("");
              return;
            }
            res.setHeader("Content-Type", MIME[".jsonl"]);
            fs.createReadStream(bootstrapPath).pipe(res);
          });
          return;
        }

        if (!url.startsWith("/topics/")) return next();

        // Special: /topics/_index.json — generated on the fly.
        if (url === "/topics/_index.json") {
          const index: Array<Record<string, string>> = [];
          if (fs.existsSync(topicsRoot)) {
            for (const dirent of fs.readdirSync(topicsRoot, { withFileTypes: true })) {
              if (!dirent.isDirectory()) continue;
              const yamlPath = path.join(topicsRoot, dirent.name, "topic.yaml");
              if (!fs.existsSync(yamlPath)) continue;
              const meta = parseTopicMeta(fs.readFileSync(yamlPath, "utf8"));
              index.push({
                slug: meta.slug ?? dirent.name,
                name: meta.name ?? dirent.name,
                description: meta.description ?? "",
                status: meta.status ?? "draft",
                created_at: meta.created_at ?? "",
                accepted_at: meta.accepted_at ?? "",
              });
            }
          }
          res.setHeader("Content-Type", MIME[".json"]);
          res.end(JSON.stringify({ topics: index }));
          return;
        }

        // Otherwise: serve /topics/<slug>/<rest> from repoRoot/topics/<slug>/<rest>,
        // refusing requests into SKIP_TOP_LEVEL directories. Exception:
        // /topics/<slug>/logs/notices.jsonl is allowed (live activity feed).
        const decoded = decodeURIComponent(url);
        const parts = decoded.split("/").filter(Boolean); // ["topics", "<slug>", ...]
        const isNoticesFile =
          parts.length === 4 && parts[2] === "logs" && parts[3] === "notices.jsonl";
        if (parts.length >= 3 && SKIP_TOP_LEVEL.has(parts[2]) && !isNoticesFile) return next();

        const filePath = path.normalize(path.join(repoRoot, decoded));
        if (!filePath.startsWith(topicsRoot + path.sep)) return next();
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          const type = MIME[path.extname(filePath)];
          if (type) res.setHeader("Content-Type", type);
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveTopicAssets()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
