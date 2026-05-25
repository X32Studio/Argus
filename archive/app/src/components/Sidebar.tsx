import type { GraphNode } from "../lib/types";

type SidebarProps = {
  routes: GraphNode[];
  activeRouteId: string | null;
  routeMeta: Record<string, { works: number; techniques: number }>;
  onSelectRoute: (routeId: string) => void;
};

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="pane">
      <div className="pane-header">
        <p className="pane-title">Routes</p>
        <span className="pane-aux">{props.routes.length} buckets</span>
      </div>
      <div className="pane-body">
        <div className="routes-list">
          {props.routes.map((route, idx) => {
            const meta = props.routeMeta[route.id] ?? { works: 0, techniques: 0 };
            const isActive = route.id === props.activeRouteId;
            return (
              <button
                key={route.id}
                type="button"
                className={`route-row ${isActive ? "is-active" : ""}`}
                onClick={() => props.onSelectRoute(route.id)}
              >
                <span className="route-index">{String(idx + 1).padStart(2, "0")}</span>
                <span className="route-body">
                  <span className="route-name">{stripRoutePrefix(route.label)}</span>
                  <span className="route-meta">
                    {meta.techniques} technique{meta.techniques === 1 ? "" : "s"} linked
                  </span>
                </span>
                <span className="route-count">{meta.works}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function stripRoutePrefix(label: string) {
  // Route labels often arrive as "Route N: name" or just the name. Show the name without the index (the index is already rendered separately).
  return label.replace(/^\s*route\s*\d+\s*[:\-–]\s*/i, "").trim();
}
