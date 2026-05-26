import type { GraphData } from "./types";

export function summarizeGraph(graph: GraphData) {
  const counts = graph.nodes.reduce(
    (acc, node) => {
      if (node.kind === "route") acc.routeCount += 1;
      if (node.kind === "work") acc.workCount += 1;
      if (node.kind === "technique") acc.techniqueCount += 1;
      return acc;
    },
    { routeCount: 0, workCount: 0, techniqueCount: 0 },
  );

  return counts;
}
