import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { useSearchParams } from "react-router-dom";

import { reportPath, type ReportDoc } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import { useTopic } from "../state/TopicContext";

type ReportFile = {
  id: ReportDoc;
  label: string;
};

const REPORTS: ReportFile[] = [
  { id: "main", label: "Synthesis Report" },
  { id: "reference_index", label: "Reference Index" },
  { id: "iteration_log", label: "Iteration Log" },
];

marked.setOptions({
  gfm: true,
  breaks: false,
});

type TocEntry = {
  id: string;
  level: number;
  text: string;
};

export function ReportView() {
  const { slug } = useTopic();
  const [params, setParams] = useSearchParams();
  const activeFromUrl = (params.get("doc") ?? "main") as ReportDoc;
  const file = REPORTS.find((r) => r.id === activeFromUrl) ?? REPORTS[0];
  const active = file.id;

  const [markdown, setMarkdown] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const res = await fetch(reportPath(slug, active));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        setMarkdown(text);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "unknown error");
        if (isInitial) setMarkdown("");
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    }

    setLoading(true);
    fetchOnce(true);
    const id = window.setInterval(() => fetchOnce(false), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, slug]);

  const { html, toc } = useMemo(() => renderMarkdown(markdown), [markdown]);

  function switchDoc(id: ReportDoc) {
    setParams({ doc: id });
  }

  return (
    <div className="report-shell">
      <header className="report-header">
        <div className="report-brand">
          <span className="brand-mark"><em>Argus</em></span>
          <span className="brand-sub">Synthesis Report — {slug}</span>
        </div>
        <nav className="report-doc-switch">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`report-doc-button ${r.id === active ? "is-active" : ""}`}
              onClick={() => switchDoc(r.id)}
            >
              {r.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="report-layout">
        <aside className="report-toc">
          <p className="report-toc-title">Contents</p>
          <ol className="report-toc-list">
            {toc.map((entry) => (
              <li key={entry.id} className={`report-toc-item lvl-${entry.level}`}>
                <a href={`#${entry.id}`}>{entry.text}</a>
              </li>
            ))}
          </ol>
        </aside>

        <main className="report-main">
          {loading && <div className="report-loading">Loading report…</div>}
          {error && (
            <div className="report-error">
              <strong>Couldn't load {reportPath(slug, active)}</strong>
              <span>{error}</span>
              <span className="report-hint">
                Run <code>npm run sync-data</code> in the app directory, then refresh.
              </span>
            </div>
          )}
          {!loading && !error && (
            <article
              className="report-article"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-龥\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "section";
}

function renderMarkdown(raw: string): { html: string; toc: TocEntry[] } {
  if (!raw) return { html: "", toc: [] };

  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();
  const renderer = new marked.Renderer();
  const baseHeading = renderer.heading.bind(renderer);

  renderer.heading = (token) => {
    const text =
      typeof token === "object" && token !== null && "text" in token
        ? String((token as { text: string }).text)
        : String(token);
    const depth =
      typeof token === "object" && token !== null && "depth" in token
        ? Number((token as { depth: number }).depth)
        : 1;

    let id = slugify(text);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;

    if (depth <= 3) toc.push({ id, level: depth, text });

    const defaultHtml = baseHeading(token as Parameters<typeof baseHeading>[0]);
    return defaultHtml.replace(/<h(\d)/, `<h$1 id="${id}"`);
  };

  const html = marked.parse(raw, { renderer }) as string;
  return { html, toc };
}
