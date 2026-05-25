import { useEffect, useState } from "react";

import { workMarkdownPath, workSlugFromNodeId } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import { useTopic } from "../state/TopicContext";

export function useWorkMarkdown(selectedNodeId: string | null, enabled: boolean) {
  const { slug: topicSlug } = useTopic();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !selectedNodeId?.startsWith("work:")) {
      setMarkdown(null);
      setIsLoading(false);
      setError("");
      return;
    }

    const workSlug = workSlugFromNodeId(selectedNodeId);
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const response = await fetch(workMarkdownPath(topicSlug, workSlug));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (cancelled) return;
        setMarkdown(text);
        setError("");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown markdown load error";
        setError(msg);
        if (isInitial) setMarkdown(null);
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
  }, [enabled, selectedNodeId, topicSlug]);

  return { markdown, isLoading, error };
}
