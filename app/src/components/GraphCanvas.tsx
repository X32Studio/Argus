import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

import type { GraphData, GraphNode } from "../lib/types";

type GraphCanvasProps = {
  graph: GraphData;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode) => void;
};

export const KIND_COLORS: Record<string, string> = {
  route: "#dafa9c",              // signature lime
  work: "#7cc4fa",               // steel sky
  technique: "#f4c163",          // warm gold
  transferable_idea: "#7ce0a3",  // emerald mint
  pitfall: "#f07c7c",            // coral red
  model_family: "#9ad6c8",       // muted teal
  objective: "#7cc4fa",          // steel sky
  representation: "#b5bcc7",     // silver ink
  asset: "#e5c07b",              // muted gold
  frequency: "#8d96a5",          // slate
  benchmark: "#f07c7c",          // coral red
};

export function GraphCanvas({ graph, selectedNodeId, onSelectNode }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const nodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        radius: node.kind === "route" ? 13 : node.kind === "work" ? 8 : 5,
      })),
    [graph.nodes],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 320;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => root.attr("transform", event.transform)),
    );

    type GraphVisNode = GraphNode &
      d3.SimulationNodeDatum & {
        radius: number;
      };

    const nodeMap = new Map<string, GraphVisNode>(
      nodes.map((node) => [node.id, { ...node }]),
    );
    const links = graph.edges
      .map((edge) => ({
        ...edge,
        source: nodeMap.get(edge.src),
        target: nodeMap.get(edge.dst),
      }))
      .filter(
        (edge): edge is {
          src: string;
          dst: string;
          rel: string;
          source: GraphVisNode;
          target: GraphVisNode;
        } => Boolean(edge.source && edge.target),
      );

    const simulation = d3
      .forceSimulation<GraphVisNode>([...nodeMap.values()])
      .force(
        "link",
        d3.forceLink<GraphVisNode, (typeof links)[number]>(links)
          .id((node) => node.id)
          .distance((link) => (link.source.kind === "route" ? 80 : 52))
          .strength(0.28),
      )
      .force(
        "charge",
        d3.forceManyBody<GraphVisNode>().strength((node) => (node.kind === "route" ? -280 : -140)),
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphVisNode>().radius((node) => node.radius + 4));

    const linkLayer = root.append("g");
    const nodeLayer = root.append("g");
    const labelLayer = root.append("g");

    const linkSelection = linkLayer
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link-line")
      .attr("stroke", (link) => relationColor(link.rel))
      .attr("stroke-width", (link) => relationWeight(link.rel));

    const nodeSelection = nodeLayer
      .selectAll<SVGCircleElement, GraphVisNode>("circle")
      .data([...nodeMap.values()])
      .join("circle")
      .attr("class", "node-circle")
      .attr("r", (node) => node.radius)
      .attr("fill", (node) => KIND_COLORS[node.kind] ?? "#c8c1af")
      .classed("is-selected", (node) => node.id === selectedNodeId)
      .on("click", (_, node) => onSelectNode(node))
      .call(
        d3
          .drag<SVGCircleElement, GraphVisNode>()
          .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.25).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }),
      );

    const labelSelection = labelLayer
      .selectAll("text")
      .data([...nodeMap.values()])
      .join("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .text((node) => {
        if (node.kind === "route" || node.id === selectedNodeId) return truncateLabel(node.label, 34);
        if (node.kind === "work") return truncateLabel(node.label, 24);
        return "";
      });

    simulation.on("tick", () => {
      linkSelection
        .attr("x1", (link) => link.source.x ?? 0)
        .attr("y1", (link) => link.source.y ?? 0)
        .attr("x2", (link) => link.target.x ?? 0)
        .attr("y2", (link) => link.target.y ?? 0);

      nodeSelection
        .attr("cx", (node) => node.x ?? 0)
        .attr("cy", (node) => node.y ?? 0)
        .classed("is-selected", (node) => node.id === selectedNodeId);

      labelSelection
        .attr("x", (node) => node.x ?? 0)
        .attr("y", (node) => (node.y ?? 0) - node.radius - 6);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, nodes, onSelectNode, selectedNodeId]);

  return (
    <div className="graph-frame">
      {graph.nodes.length === 0 && (
        <div className="empty-state">No nodes match the current filters.</div>
      )}
      <svg ref={svgRef} id="graph-svg" aria-label="knowledge graph canvas" />
    </div>
  );
}

function truncateLabel(text: string, max: number) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function relationWeight(rel: string) {
  if (["belongs_to_route", "belongs_to_family", "uses_technique"].includes(rel)) return 1.4;
  if (["supports", "transferable_to", "implements_idea", "informs"].includes(rel)) return 1.15;
  return 0.9;
}

function relationColor(rel: string) {
  if (rel.includes("pitfall") || rel.includes("risky") || rel.includes("warns")) return "rgba(240, 124, 124, 0.55)";
  if (rel.includes("supports") || rel.includes("transfer") || rel.includes("implements")) return "rgba(124, 224, 163, 0.52)";
  if (rel.includes("contradict") || rel.includes("refute")) return "rgba(240, 124, 124, 0.72)";
  if (rel.includes("compare") || rel.includes("extend") || rel.includes("depends")) return "rgba(244, 193, 99, 0.50)";
  return "rgba(243, 244, 246, 0.22)";
}
