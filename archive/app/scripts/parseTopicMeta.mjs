// Tiny meta-block parser for topic.yaml. Extracts only the `meta:` block
// (slug/name/description/status/created_at/accepted_at) — enough for the topic picker.
// Full yaml parsing happens in the React app via a real yaml dep.

export function parseTopicMeta(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const meta = {};
  let inMeta = false;
  let lastKey = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (/^meta:\s*$/.test(line)) {
      inMeta = true;
      continue;
    }
    if (!inMeta) continue;
    if (/^\S/.test(line) && line.length > 0) break; // exited meta block

    // Continuation line of a folded scalar (starts with at least 4 spaces, no `key:`).
    if (lastKey && /^ {4,}\S/.test(line) && !/^\s+\w[\w-]*:/.test(line)) {
      meta[lastKey] = (meta[lastKey] + " " + line.trim()).trim();
      continue;
    }
    const m = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim();
    if (val === "" || val === ">") {
      meta[key] = "";
      lastKey = key;
    } else {
      meta[key] = val.replace(/^['"]|['"]$/g, "");
      lastKey = null;
    }
  }
  return meta;
}
