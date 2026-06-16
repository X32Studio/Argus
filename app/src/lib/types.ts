export type GraphNode = {
  id: string;
  kind: string;
  label: string;
  recency?: string;
  degree?: number;
};

export type GraphEdge = {
  src: string;
  dst: string;
  rel: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  updated_at?: string;
  iteration?: number;
};

export type WorkRecord = Record<string, unknown>;
