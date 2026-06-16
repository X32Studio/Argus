import { useTopic } from "../state/TopicContext";

type HeroProps = {
  totalWorks: number;
  totalRoutes: number;
  totalEdges: number;
  depth: { deep: number; medium: number; shallow: number };
  updatedAt: string | null;
  isLoading: boolean;
  isError: boolean;
};

export function Hero(props: HeroProps) {
  const { slug } = useTopic();
  const stamp = formatTimestamp(props.updatedAt);
  const statusLabel = props.isError ? "offline" : props.isLoading ? "syncing" : "live";

  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-mark">
          <em>Argus</em>
        </span>
        <span className="brand-sub">Research Terminal</span>
      </div>

      <div className="header-metrics">
        <div className="metric">
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalWorks}</span>
            <span className="metric-unit">works</span>
          </span>
          <span className="depth-split">
            <span className="d-deep">{props.depth.deep}</span>
            <span className="sep">/</span>
            <span className="d-med">{props.depth.medium}</span>
            <span className="sep">/</span>
            <span className="d-shal">{props.depth.shallow}</span>
            <span className="metric-label" style={{ marginLeft: 4 }}>deep · med · shal</span>
          </span>
        </div>

        <div className="metric">
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalRoutes}</span>
            <span className="metric-unit">routes</span>
          </span>
          <span className="metric-label">execution buckets</span>
        </div>

        <div className="metric">
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalEdges}</span>
            <span className="metric-unit">edges</span>
          </span>
          <span className="metric-label">typed relations</span>
        </div>
      </div>

      <div className="header-status">
        <button
          type="button"
          className="open-report-button"
          onClick={() => window.open(`/t/${slug}/report`, "_blank")}
        >
          Open Report ↗
        </button>
        <span className="status-line">
          <span className="status-dot" />
          {statusLabel}
          <span className="status-ts">{stamp}</span>
        </span>
      </div>
    </header>
  );
}

function formatTimestamp(raw: string | null) {
  if (!raw) return "no timestamp";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} · ${time} UTC`;
}
