export type NoticeLevel = "info" | "attention" | "blocked";
export type NoticeSource = "orchestrator" | "runner";

export interface NoticeEntry {
  ts: string;
  level: NoticeLevel;
  source: NoticeSource;
  cycle: number | null;
  text: string;
}

export function parseNoticesJsonl(text: string): NoticeEntry[] {
  const out: NoticeEntry[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (!obj || typeof obj.ts !== "string" || typeof obj.text !== "string") continue;
      const level: NoticeLevel = obj.level === "attention" || obj.level === "blocked" ? obj.level : "info";
      const source: NoticeSource = obj.source === "runner" ? "runner" : "orchestrator";
      const cycle = typeof obj.cycle === "number" ? obj.cycle : null;
      out.push({ ts: obj.ts, level, source, cycle, text: obj.text });
    } catch {
      // skip malformed line
    }
  }
  return out;
}

export function mergeAndSort(...feeds: NoticeEntry[][]): NoticeEntry[] {
  const merged = feeds.flat();
  merged.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return merged;
}

export const NOTICE_POLL_INTERVAL_MS = 3000;
export const NOTICE_RENDER_LIMIT = 80;
