import type { GraphData, GraphEdge, GraphNode } from "./types";

type VisibleGraphInput = {
  graph: GraphData;
  activeRouteId: string | null;
  selectedNodeId: string | null;
  viewMode: "route" | "full";
  search: string;
  activeKinds: Set<string>;
  activeRelations: Set<string>;
};

type VisibleGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  routeLabel: string | null;
};

export function computeVisibleGraph(input: VisibleGraphInput): VisibleGraph {
  const nodeById = new Map(input.graph.nodes.map((node) => [node.id, node]));
  const neighbors = new Map<string, Set<string>>();

  input.graph.nodes.forEach((node) => neighbors.set(node.id, new Set()));
  input.graph.edges.forEach((edge) => {
    neighbors.get(edge.src)?.add(edge.dst);
    neighbors.get(edge.dst)?.add(edge.src);
  });

  const baseIds =
    input.viewMode === "route" && input.activeRouteId
      ? neighborhood(input.activeRouteId, 2, neighbors)
      : new Set(input.graph.nodes.map((node) => node.id));

  const matchedIds = buildSearchSet(input.search, input.graph, neighbors);

  const visibleIds = [...baseIds].filter((id) => {
    const node = nodeById.get(id);
    if (!node) return false;
    if (!input.activeKinds.has(node.kind)) return false;
    if (matchedIds && !matchedIds.has(id)) return false;
    return true;
  });

  const visibleSet = new Set(visibleIds);
  const edges = input.graph.edges.filter(
    (edge) =>
      input.activeRelations.has(edge.rel) &&
      visibleSet.has(edge.src) &&
      visibleSet.has(edge.dst),
  );

  const connected = new Set(edges.flatMap((edge) => [edge.src, edge.dst]));
  const nodes = visibleIds
    .filter(
      (id) =>
        connected.has(id) ||
        id === input.activeRouteId ||
        id === input.selectedNodeId,
    )
    .map((id) => nodeById.get(id))
    .filter((node): node is GraphNode => Boolean(node));

  return {
    nodes,
    edges,
    routeLabel: input.activeRouteId ? nodeById.get(input.activeRouteId)?.label ?? null : null,
  };
}

function buildSearchSet(
  rawSearch: string,
  graph: GraphData,
  neighbors: Map<string, Set<string>>,
) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return null;

  const hits = new Set<string>();
  graph.nodes.forEach((node) => {
    const haystack = `${node.id} ${node.label} ${node.kind}`.toLowerCase();
    if (!haystack.includes(search)) return;
    neighborhood(node.id, 1, neighbors).forEach((id) => hits.add(id));
  });

  graph.edges.forEach((edge) => {
    if (edge.rel.toLowerCase().includes(search)) {
      hits.add(edge.src);
      hits.add(edge.dst);
    }
  });

  return hits;
}

function neighborhood(
  startId: string,
  depth: number,
  neighbors: Map<string, Set<string>>,
) {
  const seen = new Set([startId]);
  const queue = [{ id: startId, depth: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= depth) continue;

    neighbors.get(current.id)?.forEach((near) => {
      if (seen.has(near)) return;
      seen.add(near);
      queue.push({ id: near, depth: current.depth + 1 });
    });
  }

  return seen;
}
