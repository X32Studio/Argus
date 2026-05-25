import { useEffect, useState } from "react";

import { workRecordPath, workSlugFromNodeId } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import type { WorkRecord } from "../lib/types";
import { useTopic } from "../state/TopicContext";

export function useWorkRecord(selectedNodeId: string | null) {
  const { slug: topicSlug } = useTopic();
  const [record, setRecord] = useState<WorkRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedNodeId?.startsWith("work:")) {
      setRecord(null);
      setIsLoading(false);
      setError("");
      return;
    }

    const workSlug = workSlugFromNodeId(selectedNodeId);
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const response = await fetch(workRecordPath(topicSlug, workSlug));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as WorkRecord;
        if (cancelled) return;
        setRecord(payload);
        setError("");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown record load error";
        setError(msg);
        if (isInitial) setRecord(null);
      } finally {
        if (!cancelled && isInitial) setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchOnce(true);
    const id = window.setInterval(() => fetchOnce(false), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [selectedNodeId, topicSlug]);

  return { record, isLoading, error };
}
