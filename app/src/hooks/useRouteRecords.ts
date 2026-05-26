import { useEffect, useState } from "react";

import { workRecordPath, workSlugFromNodeId } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import type { WorkRecord } from "../lib/types";
import { useTopic } from "../state/TopicContext";

/**
 * Batch-loads `works_json` records for the given work-node ids in the active topic.
 * Returns a Map keyed by the full node id (e.g. "work:chronos-ansari-2024")
 * with the parsed record (or null if the record hasn't been fetched yet).
 *
 * Polls every `REFRESH_INTERVAL_MS` so existing records that get upgraded by
 * the researcher loop become visible without page reload. The returned Map's
 * identity changes on every successful refresh — components that depend on
 * specific record fields should react accordingly.
 */
export function useRouteRecords(workNodeIds: string[]) {
  const { slug: topicSlug } = useTopic();
  const [records, setRecords] = useState<Map<string, WorkRecord | null>>(new Map());

  const key = workNodeIds.join("|");

  useEffect(() => {
    let cancelled = false;
    const pending = workNodeIds.filter((id) => id.startsWith("work:"));
    if (pending.length === 0) {
      setRecords(new Map());
      return;
    }

    async function fetchAll() {
      const entries = await Promise.all(
        pending.map(async (id) => {
          try {
            const response = await fetch(workRecordPath(topicSlug, workSlugFromNodeId(id)));
            if (!response.ok) return [id, null] as const;
            const payload = (await response.json()) as WorkRecord;
            return [id, payload] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setRecords(new Map(entries));
    }

    fetchAll();
    const id = window.setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key, topicSlug]);

  return records;
}
