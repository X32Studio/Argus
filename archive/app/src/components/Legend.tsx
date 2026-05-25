import { KIND_COLORS } from "./GraphCanvas";

const LEGEND_ORDER = ["route", "work", "technique", "transferable_idea", "pitfall"];

export function Legend() {
  return (
    <div className="graph-legend">
      {LEGEND_ORDER.map((kind) => (
        <div key={kind} className="graph-legend-row">
          <span
            className="graph-legend-swatch"
            style={{ background: KIND_COLORS[kind] }}
          />
          {kind.replace(/_/g, " ")}
        </div>
      ))}
    </div>
  );
}
