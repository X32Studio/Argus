import { useEffect, useState } from "react";

import { graphPath } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import type { GraphData } from "../lib/types";
import { useTopic } from "../state/TopicContext";

export function useGraphData() {
  const { slug } = useTopic();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const response = await fetch(graphPath(slug));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as GraphData;
        if (cancelled) return;
        setGraph(payload);
        setError("");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown graph load error";
        setError(msg);
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
  }, [slug]);

  return { graph, isLoading, error };
}
