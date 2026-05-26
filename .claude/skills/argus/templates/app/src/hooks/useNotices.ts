import { useEffect, useRef, useState } from "react";

import {
  mergeAndSort,
  NOTICE_POLL_INTERVAL_MS,
  parseNoticesJsonl,
  type NoticeEntry,
} from "../lib/notices";

const BOOTSTRAP_PATH = "/loops/_bootstrap_notices.jsonl";

function topicNoticesPath(slug: string) {
  return `/topics/${slug}/logs/notices.jsonl`;
}

async function fetchFeed(url: string): Promise<NoticeEntry[]> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const text = await r.text();
    return parseNoticesJsonl(text);
  } catch {
    return [];
  }
}

export function useNotices(slug: string | null) {
  const [entries, setEntries] = useState<NoticeEntry[]>([]);
  const lastCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      const feeds: NoticeEntry[][] = [];
      feeds.push(await fetchFeed(BOOTSTRAP_PATH));
      if (slug) feeds.push(await fetchFeed(topicNoticesPath(slug)));
      if (cancelled) return;
      const merged = mergeAndSort(...feeds);
      setEntries((prev) => {
        if (prev.length === merged.length) {
          // Same length: trust new content but skip identity churn
          return merged;
        }
        return merged;
      });
      lastCount.current = merged.length;
    }

    pull();
    const id = window.setInterval(pull, NOTICE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug]);

  return entries;
}
