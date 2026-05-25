import { describe, expect, it } from "vitest";

import { createInitialUiState, selectNode } from "./uiState";

describe("uiState", () => {
  it("switches the active route when a route node is selected", () => {
    const next = selectNode(createInitialUiState("route:a"), {
      id: "route:b",
      kind: "route",
      label: "Route B",
    });

    expect(next.selectedNodeId).toBe("route:b");
    expect(next.activeRouteId).toBe("route:b");
  });

  it("keeps the current route when a work node is selected", () => {
    const next = selectNode(createInitialUiState("route:a"), {
      id: "work:chronos-ansari-2024",
      kind: "work",
      label: "Chronos",
    });

    expect(next.selectedNodeId).toBe("work:chronos-ansari-2024");
    expect(next.activeRouteId).toBe("route:a");
  });
});
