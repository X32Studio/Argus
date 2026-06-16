import { marked } from "marked";

import type { GraphData, GraphNode, WorkRecord } from "../lib/types";

type RecordTab = "summary" | "markdown" | "json";

type InspectorProps = {
  graph: GraphData;
  selectedNode: GraphNode | null;
  activeRoute: GraphNode | null;
  record: WorkRecord | null;
  recordLoading: boolean;
  recordError: string;
  markdown: string | null;
  markdownLoading: boolean;
  markdownError: string;
  recordTab: RecordTab;
  onTabChange: (tab: RecordTab) => void;
  onSelectNode: (node: GraphNode) => void;
};

export function Inspector(props: InspectorProps) {
  const selected = props.selectedNode;
  const isWork = selected?.kind === "work";

  return (
    <section className="pane detail-pane">
      <div className="pane-header">
        <p className="pane-title">Inspector</p>
        <span className="pane-aux">
          {selected ? (isWork ? "work record" : selected.kind) : "nothing selected"}
        </span>
      </div>

      {isWork && (
        <div className="detail-tabs">
          <button
            type="button"
            className={`tab-button ${props.recordTab === "summary" ? "is-active" : ""}`}
            onClick={() => props.onTabChange("summary")}
          >
            Summary
          </button>
          <button
            type="button"
            className={`tab-button ${props.recordTab === "markdown" ? "is-active" : ""}`}
            onClick={() => props.onTabChange("markdown")}
          >
            Markdown
          </button>
          <button
            type="button"
            className={`tab-button ${props.recordTab === "json" ? "is-active" : ""}`}
            onClick={() => props.onTabChange("json")}
          >
            Raw JSON
          </button>
        </div>
      )}

      <div className="detail-body">
        {!selected ? (
          <p className="detail-placeholder">
            Select a node in the graph or the works table to inspect its record and neighbors.
          </p>
        ) : isWork ? (
          <WorkDetail
            node={selected}
            record={props.record}
            loading={props.recordLoading}
            error={props.recordError}
            markdown={props.markdown}
            markdownLoading={props.markdownLoading}
            markdownError={props.markdownError}
            tab={props.recordTab}
            graph={props.graph}
            onSelectNode={props.onSelectNode}
          />
        ) : (
          <GenericNodeDetail graph={props.graph} node={selected} onSelectNode={props.onSelectNode} />
        )}
      </div>
    </section>
  );
}

/* ─── work detail ─── */

function WorkDetail({
  node,
  record,
  loading,
  error,
  markdown,
  markdownLoading,
  markdownError,
  tab,
  graph,
  onSelectNode,
}: {
  node: GraphNode;
  record: WorkRecord | null;
  loading: boolean;
  error: string;
  markdown: string | null;
  markdownLoading: boolean;
  markdownError: string;
  tab: RecordTab;
  graph: GraphData;
  onSelectNode: (node: GraphNode) => void;
}) {
  const slug = node.id.replace(/^work:/, "");

  if (tab === "json") {
    if (loading) return <p className="detail-placeholder">Loading record…</p>;
    if (error) return <p className="detail-placeholder">Record load failed: {error}</p>;
    if (!record) return <p className="detail-placeholder">No record content was found.</p>;
    return (
      <pre
        className="json-view"
        dangerouslySetInnerHTML={{ __html: highlightJson(record) }}
      />
    );
  }

  if (tab === "markdown") {
    if (markdownLoading) return <p className="detail-placeholder">Loading markdown…</p>;
    if (markdownError) {
      return (
        <p className="detail-placeholder">
          No markdown file for <code>{slug}</code> ({markdownError}).
        </p>
      );
    }
    if (!markdown) return <p className="detail-placeholder">No markdown content available.</p>;
    return (
      <div
        className="work-markdown"
        dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { gfm: true, breaks: false }) as string }}
      />
    );
  }

  const title = stringField(record?.title) ?? node.label;
  const year = stringField(record?.year);
  const method = stringField(record?.method_family);
  const depth = stringField(record?.analysis_depth);
  const potential = stringField(record?.foundation_model_potential);
  const frequency = stringField(record?.frequency_bucket);
  const asset = stringField(record?.asset_class);
  const region = stringField(record?.market_region);

  const claim = stringField(record?.key_empirical_claim);
  const mechanism = stringField(record?.core_mechanism);
  const trainingObj = stringField(record?.training_objective);
  const trainingRecipe = stringField(record?.training_recipe);
  const whyRelevant = stringField(record?.why_it_is_relevant_for_stronger_foundation_model);
  const benchmarks = stringField(record?.benchmark_and_metrics);
  const ablation = stringField(record?.ablation_or_evidence_notes);
  const inputRep = stringField(record?.input_representation);

  const takeaways = arrayField(record?.implementation_takeaways);
  const hypotheses = arrayField(record?.must_test_hypotheses);
  const openQuestions = arrayField(record?.open_questions);
  const limitations = arrayField(record?.main_limitations);
  const risks = arrayField(record?.transfer_risks_to_HF_MF);
  const related = arrayField(record?.related_works);

  const urlPrimary = stringField(record?.url_primary);
  const urlPdf = stringField(record?.url_pdf);
  const urlCode = stringField(record?.url_code);

  return (
    <>
      <header className="detail-head">
        <span className="detail-eyebrow">{node.kind}</span>
        <h2 className="detail-title">{title}</h2>
        <span className="detail-sub">{slug}</span>
        {(urlPrimary || urlPdf || urlCode) && (
          <div className="link-row">
            {urlPrimary && <a href={urlPrimary} target="_blank" rel="noreferrer" className="ext-link">primary ↗</a>}
            {urlPdf && <a href={urlPdf} target="_blank" rel="noreferrer" className="ext-link">pdf ↗</a>}
            {urlCode && <a href={urlCode} target="_blank" rel="noreferrer" className="ext-link">code ↗</a>}
          </div>
        )}
      </header>

      {loading && <p className="detail-placeholder">Loading record…</p>}
      {error && <p className="detail-placeholder">Record load failed: {error}</p>}

      <div className="detail-fact-grid">
        <Fact label="Year" value={year} />
        <Fact label="Depth" value={depth} accent={depthAccent(depth)} />
        <Fact label="Method" value={method} />
        <Fact label="Frequency" value={frequency} />
        <Fact
          label="FM Fit"
          value={potential}
          accent={potential?.toLowerCase().includes("high") ? "sage" : undefined}
        />
        <Fact label="Source" value={stringField(record?.source_type)} />
        <Fact label="Asset" value={asset} />
        <Fact label="Region" value={region} />
      </div>

      {claim && (
        <div className="claim-block">
          <div className="claim-label">Key Empirical Claim</div>
          <div className="claim-body">{claim}</div>
        </div>
      )}

      {mechanism && (
        <div className="claim-block" style={{ borderLeftColor: "var(--mist)" }}>
          <div className="claim-label" style={{ color: "var(--mist)" }}>Core Mechanism</div>
          <div className="claim-body">{mechanism}</div>
        </div>
      )}

      {inputRep && (
        <ProseSection label="Input Representation" body={inputRep} />
      )}

      {trainingObj && (
        <ProseSection label="Training Objective" body={trainingObj} />
      )}

      {trainingRecipe && (
        <ProseSection label="Training Recipe" body={trainingRecipe} />
      )}

      {benchmarks && (
        <ProseSection label="Benchmarks & Metrics" body={benchmarks} />
      )}

      {ablation && (
        <ProseSection label="Ablation / Evidence Notes" body={ablation} />
      )}

      {whyRelevant && (
        <div className="claim-block" style={{ borderLeftColor: "var(--sage)" }}>
          <div className="claim-label" style={{ color: "var(--sage)" }}>Why It Matters For A Stronger FM</div>
          <div className="claim-body">{whyRelevant}</div>
        </div>
      )}

      {takeaways.length > 0 && (
        <ListSection label="Implementation Takeaways" items={takeaways} pipColor="var(--amber)" />
      )}

      {hypotheses.length > 0 && (
        <ListSection label="Must-Test Hypotheses" items={hypotheses} pipColor="var(--mist)" />
      )}

      {limitations.length > 0 && (
        <ListSection label="Main Limitations" items={limitations} pipColor="var(--rust)" />
      )}

      {risks.length > 0 && (
        <ListSection label="Transfer Risks to HF/MF" items={risks} pipColor="var(--rose)" />
      )}

      {openQuestions.length > 0 && (
        <ListSection label="Open Questions" items={openQuestions} pipColor="var(--lavender)" />
      )}

      {related.length > 0 && (
        <section className="relation-section">
          <div className="relation-header">
            <span className="relation-rel">Related Works (from record)</span>
            <span className="relation-count">{related.length}</span>
          </div>
          <div className="chip-row">
            {related.slice(0, 18).map((r, i) => (
              <span key={i} className="chip">{r}</span>
            ))}
            {related.length > 18 && (
              <span className="chip" style={{ color: "var(--faint)" }}>+{related.length - 18}</span>
            )}
          </div>
        </section>
      )}

      <RelationGroups graph={graph} nodeId={node.id} onSelectNode={onSelectNode} />
    </>
  );
}

function ProseSection({ label, body }: { label: string; body: string }) {
  return (
    <section className="prose-section">
      <div className="prose-label">{label}</div>
      <p className="prose-body">{body}</p>
    </section>
  );
}

function ListSection({ label, items, pipColor }: { label: string; items: string[]; pipColor: string }) {
  return (
    <section className="relation-section">
      <div className="relation-header">
        <span className="relation-rel">{label}</span>
        <span className="relation-count">{items.length}</span>
      </div>
      <ul className="takeaway-list" style={{ ["--pip-color" as string]: pipColor }}>
        {items.slice(0, 10).map((t, i) => (
          <li key={i} className="takeaway-item">{t}</li>
        ))}
        {items.length > 10 && (
          <li className="takeaway-item" style={{ color: "var(--faint)", fontStyle: "italic" }}>
            … {items.length - 10} more in the record
          </li>
        )}
      </ul>
    </section>
  );
}

/* ─── non-work node detail ─── */

function GenericNodeDetail({
  graph,
  node,
  onSelectNode,
}: {
  graph: GraphData;
  node: GraphNode;
  onSelectNode: (node: GraphNode) => void;
}) {
  return (
    <>
      <div className="detail-compact-head">
        <span className="detail-eyebrow">{node.kind}</span>
        <span className="detail-compact-label">{node.label}</span>
      </div>

      <div className="detail-fact-grid">
        <Fact label="Kind" value={node.kind} />
        <Fact label="Degree" value={String(countDegree(graph, node.id))} />
      </div>

      <RelationGroups graph={graph} nodeId={node.id} onSelectNode={onSelectNode} />
    </>
  );
}

/* ─── relation groups ─── */

function RelationGroups({
  graph,
  nodeId,
  onSelectNode,
}: {
  graph: GraphData;
  nodeId: string;
  onSelectNode: (node: GraphNode) => void;
}) {
  const grouped = new Map<string, GraphNode[]>();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  graph.edges.forEach((edge) => {
    if (edge.src !== nodeId && edge.dst !== nodeId) return;
    const otherId = edge.src === nodeId ? edge.dst : edge.src;
    const other = nodeById.get(otherId);
    if (!other) return;
    if (!grouped.has(edge.rel)) grouped.set(edge.rel, []);
    grouped.get(edge.rel)!.push(other);
  });

  if (grouped.size === 0) return null;

  const orderedRels = [...grouped.keys()].sort(relationSortKey);

  return (
    <>
      {orderedRels.map((rel) => {
        const nodes = grouped.get(rel)!;
        return (
          <section key={rel} className="relation-section">
            <div className="relation-header">
              <span className="relation-rel">{rel.replace(/_/g, " ")}</span>
              <span className="relation-count">{nodes.length}</span>
            </div>
            <div className="chip-row">
              {nodes.slice(0, 14).map((other) => (
                <button
                  key={other.id}
                  type="button"
                  className="chip"
                  onClick={() => onSelectNode(other)}
                >
                  {other.label}
                </button>
              ))}
              {nodes.length > 14 && (
                <span className="chip" style={{ color: "var(--faint)" }}>
                  +{nodes.length - 14}
                </span>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}

/* ─── tiny helpers ─── */

function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | null | undefined;
  accent?: "amber" | "sage" | "rust";
}) {
  const cls = accent ? `fact accent-${accent}` : "fact";
  return (
    <div className={cls}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value ?? "—"}</span>
    </div>
  );
}

function depthAccent(depth: string | null): "sage" | "amber" | "rust" | undefined {
  if (!depth) return undefined;
  if (depth === "deep") return "sage";
  if (depth === "medium") return "amber";
  if (depth === "shallow") return "rust";
  return undefined;
}

function stringField(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function arrayField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

function countDegree(graph: GraphData, id: string) {
  return graph.edges.filter((edge) => edge.src === id || edge.dst === id).length;
}

const RELATION_PRIORITY = [
  "belongs_to_route",
  "transferable_to",
  "supports",
  "uses_technique",
  "uses_representation",
  "uses_objective",
  "extends",
  "suggests_experiment",
  "compares_against",
  "contradicts",
  "risky_for",
];

function relationSortKey(a: string, b: string) {
  const ia = RELATION_PRIORITY.indexOf(a);
  const ib = RELATION_PRIORITY.indexOf(b);
  const ra = ia === -1 ? RELATION_PRIORITY.length : ia;
  const rb = ib === -1 ? RELATION_PRIORITY.length : ib;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

function highlightJson(record: WorkRecord) {
  const json = escapeHtml(JSON.stringify(record, null, 2));
  return json.replace(
    /(&quot;.*?&quot;)(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false)\b|\bnull\b/g,
    (_match: string, str?: string, key?: string, num?: string, bool?: string) => {
      if (str) return `<span class="${key ? "json-key" : "json-string"}">${str}</span>${key || ""}`;
      if (num) return `<span class="json-number">${num}</span>`;
      if (bool) return `<span class="json-boolean">${bool}</span>`;
      return `<span class="json-null">null</span>`;
    },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
