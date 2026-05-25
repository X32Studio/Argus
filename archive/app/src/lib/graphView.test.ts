import { describe, expect, it } from "vitest";

import { computeVisibleGraph } from "./graphView";

const graph = {
  nodes: [
    { id: "route:a", kind: "route", label: "Route A" },
    { id: "work:b", kind: "work", label: "Work B" },
    { id: "technique:c", kind: "technique", label: "Technique C" },
    { id: "pitfall:d", kind: "pitfall", label: "Pitfall D" },
  ],
  edges: [
    { src: "route:a", dst: "work:b", rel: "belongs_to_route" },
    { src: "work:b", dst: "technique:c", rel: "uses_technique" },
    { src: "technique:c", dst: "pitfall:d", rel: "has_pitfall" },
  ],
};

describe("computeVisibleGraph", () => {
  it("keeps a route and its two-hop neighbors in route focus mode", () => {
    const visible = computeVisibleGraph({
      graph,
      activeRouteId: "route:a",
      selectedNodeId: "route:a",
      viewMode: "route",
      search: "",
      activeKinds: new Set(["route", "work", "technique", "pitfall"]),
      activeRelations: new Set(["belongs_to_route", "uses_technique", "has_pitfall"]),
    });

    expect(visible.nodes.map((node) => node.id)).toEqual([
      "route:a",
      "work:b",
      "technique:c",
    ]);
  });
});
