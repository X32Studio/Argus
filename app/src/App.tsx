import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";

import { ActivityRail } from "./components/ActivityRail";
import { EmptyTopicView } from "./components/EmptyTopicView";
import { GraphCanvas } from "./components/GraphCanvas";
import { Hero } from "./components/Hero";
import { Inspector } from "./components/Inspector";
import { Legend } from "./components/Legend";
import { ReportView } from "./components/ReportView";
import { RoutePane } from "./components/RoutePane";
import { Sidebar } from "./components/Sidebar";
import { TopicPicker } from "./components/TopicPicker";
import { useGraphData } from "./hooks/useGraphData";
import { useRouteRecords } from "./hooks/useRouteRecords";
import { useWorkMarkdown } from "./hooks/useWorkMarkdown";
import { useWorkRecord } from "./hooks/useWorkRecord";
import { summarizeGraph } from "./lib/graph";
import { computeVisibleGraph } from "./lib/graphView";
import type { GraphData, GraphNode, WorkRecord } from "./lib/types";
import { createInitialUiState, selectNode } from "./state/uiState";
import { TopicProvider } from "./state/TopicContext";

export default function App() {
  return (
    <>
      <ActivityRail />
      <Routes>
        <Route path="/" element={<TopicPicker />} />
        <Route path="/t/:slug" element={<TopicDashboard />} />
        <Route path="/t/:slug/report" element={<TopicReport />} />
        <Route path="*" element={<TopicPicker />} />
      </Routes>
    </>
  );
}

function TopicNav({ slug, current }: { slug: string; current: "dashboard" | "report" }) {
  return (
    <nav className="topic-nav">
      <Link to="/" className="topic-nav-back">
        ← Topics
      </Link>
      <span className="topic-nav-slug">
        <code>{slug}</code>
      </span>
      <span className="topic-nav-sep">·</span>
      <Link
        to={`/t/${slug}`}
        className={`topic-nav-link ${current === "dashboard" ? "is-active" : ""}`}
      >
        Dashboard
      </Link>
      <Link
        to={`/t/${slug}/report`}
        className={`topic-nav-link ${current === "report" ? "is-active" : ""}`}
      >
        Report
      </Link>
    </nav>
  );
}

function TopicDashboard() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <TopicPicker />;
  return (
    <TopicProvider slug={slug}>
      <TopicNav slug={slug} current="dashboard" />
      <DashboardApp />
    </TopicProvider>
  );
}

function TopicReport() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <TopicPicker />;
  return (
    <TopicProvider slug={slug}>
      <TopicNav slug={slug} current="report" />
      <ReportView />
    </TopicProvider>
  );
}

function DashboardApp() {
  // liveGraph: latest data from /topics/<slug>/indexes/knowledge_graph.json, polled silently.
  // graphToRender: the snapshot the d3 SVG is locked to until the user clicks "apply" on
  // the refresh badge. Everything else (lists, filters, inspector lookups) uses liveGraph
  // so the user sees fresh data — but the visualization's node positions and zoom stay put.
  const { graph: liveGraph, isLoading, error } = useGraphData();
  const [graphToRender, setGraphToRender] = useState<GraphData | null>(null);
  const [viewMode, setViewMode] = useState<"route" | "full">("route");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set());
  const [relationFilter, setRelationFilter] = useState<Set<string>>(new Set());
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [recordTab, setRecordTab] = useState<"summary" | "markdown" | "json">("summary");

  // Initial seed of graphToRender from the first successful liveGraph fetch.
  // Also auto-sync during the bootstrapping window — i.e. while the topic is
  // still empty (just-accepted topic, researcher hasn't produced records yet).
  // Once graphToRender has real content, the user must click the refresh badge
  // explicitly to reflow the d3 layout for new data.
  useEffect(() => {
    if (!liveGraph) return;
    if (!graphToRender || graphToRender.nodes.length === 0) {
      setGraphToRender(liveGraph);
    }
  }, [liveGraph, graphToRender]);

  // Diff between the latest live graph and the snapshot the SVG is currently showing.
  // Null when there is nothing new — used to suppress the refresh badge entirely.
  const graphDiff = useMemo(() => {
    if (!liveGraph || !graphToRender || liveGraph === graphToRender) return null;
    const renderedNodeIds = new Set(graphToRender.nodes.map((n) => n.id));
    const renderedEdgeKeys = new Set(graphToRender.edges.map((e) => `${e.src}|${e.dst}|${e.rel}`));
    const newNodes = liveGraph.nodes.filter((n) => !renderedNodeIds.has(n.id));
    const newEdges = liveGraph.edges.filter((e) => !renderedEdgeKeys.has(`${e.src}|${e.dst}|${e.rel}`));
    if (newNodes.length === 0 && newEdges.length === 0) return null;
    return {
      newWorks: newNodes.filter((n) => n.kind === "work").length,
      newNodes: newNodes.length,
      newEdges: newEdges.length,
    };
  }, [liveGraph, graphToRender]);

  function applyGraphRefresh() {
    if (liveGraph) setGraphToRender(liveGraph);
  }

  const [middleWidth, setMiddleWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 420;
    try {
      const raw = window.localStorage.getItem("ks-middle-width");
      const n = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(n) && n >= 280 && n <= 900) return n;
    } catch {
      /* ignore */
    }
    return 420;
  });
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem("ks-middle-width", String(middleWidth));
    } catch {
      /* ignore */
    }
  }, [middleWidth]);

  const handleDividerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: event.clientX, w: middleWidth };
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleDividerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const next = Math.max(280, Math.min(900, dragStart.current.w + dx));
    setMiddleWidth(next);
  };
  const handleDividerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;
    setIsResizing(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!liveGraph || activeRouteId) return;
    const firstRoute = liveGraph.nodes.find((node) => node.kind === "route")?.id ?? null;
    const initial = createInitialUiState(firstRoute);
    setActiveRouteId(initial.activeRouteId);
    setSelectedNodeId(initial.selectedNodeId);
    setKindFilter(new Set(liveGraph.nodes.map((node) => node.kind)));
    setRelationFilter(new Set(liveGraph.edges.map((edge) => edge.rel)));
  }, [liveGraph, activeRouteId]);

  const selectedNode = useMemo(
    () => liveGraph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [liveGraph, selectedNodeId],
  );

  const activeRoute = useMemo(
    () => liveGraph?.nodes.find((node) => node.id === activeRouteId) ?? null,
    [liveGraph, activeRouteId],
  );

  const { record, isLoading: recordLoading, error: recordError } = useWorkRecord(selectedNodeId);
  const {
    markdown,
    isLoading: markdownLoading,
    error: markdownError,
  } = useWorkMarkdown(selectedNodeId, recordTab === "markdown");

  // visibleGraph drives the d3 SVG — locked to graphToRender so node positions stay put.
  const visibleGraph = useMemo(() => {
    if (!graphToRender) return { nodes: [], edges: [], routeLabel: null };
    return computeVisibleGraph({
      graph: graphToRender,
      activeRouteId,
      selectedNodeId,
      viewMode,
      search,
      activeKinds: kindFilter.size
        ? kindFilter
        : new Set(graphToRender.nodes.map((node) => node.kind)),
      activeRelations: relationFilter.size
        ? relationFilter
        : new Set(graphToRender.edges.map((edge) => edge.rel)),
    });
  }, [activeRouteId, graphToRender, kindFilter, relationFilter, search, selectedNodeId, viewMode]);

  // Route counts come from liveGraph so the sidebar reflects new works immediately.
  const routeMeta = useMemo(() => {
    if (!liveGraph) return {};
    const meta: Record<string, { works: number; techniques: number }> = {};
    liveGraph.nodes
      .filter((node) => node.kind === "route")
      .forEach((route) => {
        const local = computeVisibleGraph({
          graph: liveGraph,
          activeRouteId: route.id,
          selectedNodeId: route.id,
          viewMode: "route",
          search: "",
          activeKinds: new Set(liveGraph.nodes.map((node) => node.kind)),
          activeRelations: new Set(liveGraph.edges.map((edge) => edge.rel)),
        }).nodes;
        meta[route.id] = {
          works: local.filter((node) => node.kind === "work").length,
          techniques: local.filter((node) => node.kind === "technique").length,
        };
      });
    return meta;
  }, [liveGraph]);

  const routeWorkIds = useMemo(
    () => routeWorkIdsFor(liveGraph, activeRouteId),
    [liveGraph, activeRouteId],
  );
  const routeRecords = useRouteRecords(routeWorkIds);

  const routes = useMemo(
    () => liveGraph?.nodes.filter((node) => node.kind === "route") ?? [],
    [liveGraph],
  );

  const summary = liveGraph
    ? summarizeGraph(liveGraph)
    : { routeCount: 0, workCount: 0, techniqueCount: 0 };

  const depthTally = useMemo<{ deep: number; medium: number; shallow: number }>(() => {
    const tally = { deep: 0, medium: 0, shallow: 0 };
    routeRecords.forEach((rec) => {
      const d = typeof rec?.analysis_depth === "string" ? rec.analysis_depth : null;
      if (d === "deep") tally.deep += 1;
      else if (d === "medium") tally.medium += 1;
      else if (d === "shallow") tally.shallow += 1;
    });
    return tally;
  }, [routeRecords]);

  function handleNodeSelect(node: GraphNode) {
    const next = selectNode({ activeRouteId, selectedNodeId }, node);
    setActiveRouteId(next.activeRouteId);
    setSelectedNodeId(next.selectedNodeId);
  }

  function handleToggleKind(kind: string) {
    setKindFilter((prev) => toggleInSet(prev, kind));
  }

  function handleToggleRelation(relation: string) {
    setRelationFilter((prev) => toggleInSet(prev, relation));
  }

  function handleReset() {
    if (!liveGraph) return;
    const firstRoute = liveGraph.nodes.find((node) => node.kind === "route")?.id ?? null;
    const initial = createInitialUiState(firstRoute);
    setViewMode("route");
    setSearch("");
    setActiveRouteId(initial.activeRouteId);
    setSelectedNodeId(initial.selectedNodeId);
    setKindFilter(new Set(liveGraph.nodes.map((node) => node.kind)));
    setRelationFilter(new Set(liveGraph.edges.map((edge) => edge.rel)));
    setRecordTab("summary");
  }

  if (!liveGraph && isLoading) {
    return (
      <div className="boot-shell">
        <div className="boot-card">
          <h1 className="boot-title">Warming up the terminal…</h1>
          <p className="boot-body">Loading the knowledge graph payload and per-work records.</p>
        </div>
      </div>
    );
  }

  if (!liveGraph) {
    return (
      <div className="boot-shell">
        <div className="boot-card">
          <h1 className="boot-title">Graph unavailable</h1>
          <p className="boot-body">
            Unable to load the knowledge graph. Confirm that <code>npm run sync-data</code>
            has completed and that <code>public/topics/&lt;slug&gt;/indexes/knowledge_graph.json</code> exists.
            {error ? <> — {error}</> : null}
          </p>
        </div>
      </div>
    );
  }

  // Topic is accepted but no records have been written yet (just-initialized topic).
  // Show a friendly empty state with the command to start the loop. This view
  // disappears automatically as soon as the researcher writes the first nodes
  // into knowledge_graph.json — no refresh needed thanks to background polling.
  if (liveGraph.nodes.length === 0) {
    return <EmptyTopicView />;
  }

  return (
    <div className="app-shell">
      <Hero
        totalWorks={summary.workCount}
        totalRoutes={summary.routeCount}
        totalEdges={liveGraph.edges.length}
        depth={depthTally}
        updatedAt={liveGraph.updated_at ?? null}
        isLoading={isLoading}
        isError={Boolean(error)}
      />

      <div
        className={`workspace ${isResizing ? "is-resizing" : ""}`}
        style={{ ["--middle-width" as unknown as string]: `${middleWidth}px` } as React.CSSProperties}
      >
        <Sidebar
          routes={routes}
          activeRouteId={activeRouteId}
          routeMeta={routeMeta}
          onSelectRoute={(routeId) => {
            const node = liveGraph.nodes.find((n) => n.id === routeId);
            if (node) handleNodeSelect(node);
          }}
        />

        <div className="middle-stack">
          <RoutePane
            graph={liveGraph}
            activeRoute={activeRoute}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleNodeSelect}
            records={routeRecords}
          />

          <Inspector
            graph={liveGraph}
            selectedNode={selectedNode}
            activeRoute={activeRoute}
            record={record as WorkRecord | null}
            recordLoading={recordLoading}
            recordError={recordError}
            markdown={markdown}
            markdownLoading={markdownLoading}
            markdownError={markdownError}
            recordTab={recordTab}
            onTabChange={setRecordTab}
            onSelectNode={handleNodeSelect}
          />
        </div>

        <div
          className="col-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize middle and graph columns"
          onPointerDown={handleDividerDown}
          onPointerMove={handleDividerMove}
          onPointerUp={handleDividerUp}
          onPointerCancel={handleDividerUp}
        />

        <div className="pane graph-pane">
          <div className="pane-header">
            <p className="pane-title">Knowledge Graph</p>
            <span className="pane-aux">
              {visibleGraph.nodes.length} nodes · {visibleGraph.edges.length} edges
            </span>
            {graphDiff && (
              <button
                type="button"
                className="graph-refresh-badge"
                onClick={applyGraphRefresh}
                title="Reflow the graph to include new works and edges"
              >
                <span className="graph-refresh-badge-dot" />
                <span className="graph-refresh-badge-text">
                  {graphDiff.newWorks > 0 && (
                    <>
                      <strong>{graphDiff.newWorks}</strong> new {graphDiff.newWorks === 1 ? "work" : "works"}
                    </>
                  )}
                  {graphDiff.newWorks > 0 && graphDiff.newEdges > 0 && " · "}
                  {graphDiff.newEdges > 0 && (
                    <>
                      <strong>{graphDiff.newEdges}</strong> new {graphDiff.newEdges === 1 ? "edge" : "edges"}
                    </>
                  )}
                </span>
                <span className="graph-refresh-badge-action">apply</span>
              </button>
            )}
          </div>
          <div className="pane-body pane-body-flush">
            {graphToRender && (
              <GraphCanvas
                graph={{ ...graphToRender, nodes: visibleGraph.nodes, edges: visibleGraph.edges }}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleNodeSelect}
              />
            )}
            <Legend />
          </div>
        </div>
      </div>

      <FilterStrip
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        kinds={[...new Set(liveGraph.nodes.map((node) => node.kind))]}
        activeKinds={kindFilter}
        onToggleKind={handleToggleKind}
        relations={[...new Set(liveGraph.edges.map((edge) => edge.rel))]}
        activeRelations={relationFilter}
        onToggleRelation={handleToggleRelation}
        onReset={handleReset}
      />
    </div>
  );
}

function FilterStrip({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  kinds,
  activeKinds,
  onToggleKind,
  relations,
  activeRelations,
  onToggleRelation,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: "route" | "full";
  onViewModeChange: (mode: "route" | "full") => void;
  kinds: string[];
  activeKinds: Set<string>;
  onToggleKind: (kind: string) => void;
  relations: string[];
  activeRelations: Set<string>;
  onToggleRelation: (rel: string) => void;
  onReset: () => void;
}) {
  return (
    <footer className="filter-strip">
      <div className="search-box">
        <span className="search-icon">/</span>
        <input
          className="search-input"
          type="search"
          placeholder="search nodes, labels, relations"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="filter-chips">
        <div className="filter-chip-group">
          <span className="filter-group-label">Kinds</span>
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`filter-chip ${activeKinds.has(kind) ? "is-active" : ""}`}
              onClick={() => onToggleKind(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <div className="filter-chip-group">
          <span className="filter-group-label">Edges</span>
          {relations.slice(0, 8).map((rel) => (
            <button
              key={rel}
              type="button"
              className={`filter-chip ${activeRelations.has(rel) ? "is-active" : ""}`}
              onClick={() => onToggleRelation(rel)}
            >
              {rel.replace(/_/g, " ")}
            </button>
          ))}
          {relations.length > 8 && (
            <span className="filter-chip" style={{ color: "var(--faint)", borderColor: "transparent" }}>
              +{relations.length - 8} more
            </span>
          )}
        </div>
      </div>

      <div className="filter-actions">
        <div className="mode-toggle">
          <button
            type="button"
            className={viewMode === "route" ? "is-active" : ""}
            onClick={() => onViewModeChange("route")}
          >
            Route
          </button>
          <button
            type="button"
            className={viewMode === "full" ? "is-active" : ""}
            onClick={() => onViewModeChange("full")}
          >
            Full
          </button>
        </div>
        <button type="button" className="reset-button" onClick={onReset}>
          Reset
        </button>
      </div>
    </footer>
  );
}

function routeWorkIdsFor(graph: GraphData | null | undefined, routeId: string | null): string[] {
  if (!graph || !routeId) return [];
  const ids = new Set<string>();
  graph.edges.forEach((edge) => {
    if (edge.src === routeId && edge.dst.startsWith("work:")) ids.add(edge.dst);
    else if (edge.dst === routeId && edge.src.startsWith("work:")) ids.add(edge.src);
  });
  return [...ids].sort();
}

function toggleInSet(set: Set<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
