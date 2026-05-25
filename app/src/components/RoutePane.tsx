import type { GraphData, GraphNode, WorkRecord } from "../lib/types";

type RoutePaneProps = {
  graph: GraphData;
  activeRoute: GraphNode | null;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode) => void;
  /** lazily-loaded summary records keyed by `work:<slug>` id */
  records: Map<string, WorkRecord | null>;
};

type WorkRow = {
  node: GraphNode;
  year: string | null;
  depth: string | null;
  potential: string | null;
};

export function RoutePane(props: RoutePaneProps) {
  const route = props.activeRoute;

  if (!route) {
    return (
      <section className="pane">
        <div className="pane-header">
          <p className="pane-title">Active Route</p>
        </div>
        <div className="route-empty">
          Pick a research route on the left to see the works that live in its execution bucket.
        </div>
      </section>
    );
  }

  const works = collectRouteWorks(props.graph, route.id).map<WorkRow>((node) => ({
    node,
    year: stringField(props.records.get(node.id)?.year) ?? null,
    depth: stringField(props.records.get(node.id)?.analysis_depth) ?? null,
    potential: stringField(props.records.get(node.id)?.foundation_model_potential) ?? null,
  }));

  const deepCount = works.filter((w) => w.depth === "deep").length;
  const medCount = works.filter((w) => w.depth === "medium").length;
  const shallowCount = works.filter((w) => w.depth === "shallow").length;
  const naCount = works.length - deepCount - medCount - shallowCount;

  return (
    <section className="pane">
      <div className="pane-header">
        <p className="pane-title">Active Route</p>
        <span className="pane-aux">
          {works.length} work{works.length === 1 ? "" : "s"} · click to inspect
        </span>
      </div>

      <div className="route-overview">
        <div className="route-stats">
          <span className="route-stat">
            <strong>{works.length}</strong> works
          </span>
          <span className="route-stat">
            <strong style={{ color: "var(--sage)" }}>{deepCount}</strong> deep
          </span>
          <span className="route-stat">
            <strong style={{ color: "var(--amber)" }}>{medCount}</strong> medium
          </span>
          <span className="route-stat">
            <strong style={{ color: "var(--rust)" }}>{shallowCount}</strong> shallow
          </span>
          {naCount > 0 && (
            <span className="route-stat">
              <strong style={{ color: "var(--faint)" }}>{naCount}</strong> unrated
            </span>
          )}
        </div>

        <div className="works-table">
          <div className="works-table-header">
            <span>Work</span>
            <span>Year</span>
            <span>Depth</span>
            <span>FM fit</span>
          </div>
          {works.length === 0 ? (
            <div className="route-empty" style={{ padding: "18px" }}>
              No works are currently linked to this route in the knowledge graph.
            </div>
          ) : (
            works.map((row) => {
              const slug = row.node.id.replace(/^work:/, "");
              const isSelected = row.node.id === props.selectedNodeId;
              return (
                <button
                  key={row.node.id}
                  type="button"
                  className={`work-row ${isSelected ? "is-selected" : ""}`}
                  onClick={() => props.onSelectNode(row.node)}
                >
                  <span className="work-cell-title">
                    <span className="work-title">{row.node.label}</span>
                    <span className="work-slug">{slug}</span>
                  </span>
                  <span className="work-cell-year">{row.year ?? "—"}</span>
                  <span className="work-cell-depth">
                    {row.depth ? (
                      <span className={`depth-tag depth-${row.depth}`}>{row.depth}</span>
                    ) : (
                      <span className="depth-tag depth-na">n/a</span>
                    )}
                  </span>
                  <span className="work-cell-potential">{renderPotential(row.potential)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function collectRouteWorks(graph: GraphData, routeId: string): GraphNode[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const touched = new Set<string>();
  graph.edges.forEach((edge) => {
    if (edge.src === routeId) touched.add(edge.dst);
    else if (edge.dst === routeId) touched.add(edge.src);
  });
  return [...touched]
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphNode => Boolean(n) && n?.kind === "work");
}

function stringField(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function renderPotential(value: string | null) {
  const score = potentialScore(value);
  if (score == null) return <span style={{ color: "var(--faint)" }}>—</span>;
  const pips = [0, 1, 2, 3];
  return (
    <span className="potential-bar" aria-label={value ?? "unknown"} title={value ?? ""}>
      {pips.map((i) => (
        <span key={i} className={i < score ? (score >= 3 ? "on-hi" : "on") : ""} />
      ))}
    </span>
  );
}

function potentialScore(raw: string | null): number | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("high") || v.includes("strong")) return 3;
  if (v.includes("medium") || v.includes("moderate")) return 2;
  if (v.includes("low") || v.includes("weak")) return 1;
  if (v.includes("none") || v.includes("n/a")) return 0;
  return null;
}
