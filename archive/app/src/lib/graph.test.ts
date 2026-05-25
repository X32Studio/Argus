import { describe, expect, it } from "vitest";

import { summarizeGraph } from "./graph";

describe("summarizeGraph", () => {
  it("counts route and work nodes from the graph payload", () => {
    const summary = summarizeGraph({
      nodes: [
        { id: "route:a", kind: "route", label: "Route A" },
        { id: "work:b", kind: "work", label: "Work B" },
        { id: "technique:c", kind: "technique", label: "Technique C" },
      ],
      edges: [],
    });

    expect(summary.routeCount).toBe(1);
    expect(summary.workCount).toBe(1);
    expect(summary.techniqueCount).toBe(1);
  });
});
