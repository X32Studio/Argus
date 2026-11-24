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
  const stamp = formatTimestamp(props.updatedAt);
  const statusLabel = props.isError ? "offline" : props.isLoading ? "syncing" : "live";

  return (
    <header className="header">
      <div className="header-metrics">
        <div className="metric">
          <span className="metric-label">Indexed works</span>
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalWorks}</span>
            <span className="depth-split" title="Deep / Medium / Shallow">
              <span className="d-deep">{props.depth.deep}d</span>
              <span className="sep">·</span>
              <span className="d-med">{props.depth.medium}m</span>
              <span className="sep">·</span>
              <span className="d-shal">{props.depth.shallow}s</span>
            </span>
          </span>
        </div>

        <div className="metric-divider" aria-hidden="true" />

        <div className="metric">
          <span className="metric-label">Routes</span>
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalRoutes}</span>
            <span className="metric-unit">buckets</span>
          </span>
        </div>

        <div className="metric-divider" aria-hidden="true" />

        <div className="metric">
          <span className="metric-label">Relations</span>
          <span className="metric-value">
            <span className="metric-value-mono">{props.totalEdges}</span>
            <span className="metric-unit">edges</span>
          </span>
        </div>
      </div>

      <div className="header-status">
        <span className={`status-pill ${props.isError ? "is-error" : ""}`}>
          <span className="status-dot" />
          <span>{statusLabel}</span>
        </span>
        <span className="status-ts">{stamp}</span>
      </div>
    </header>
  );
}

function formatTimestamp(raw: string | null) {
  if (!raw) return "awaiting first cycle";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time} UTC`;
}
