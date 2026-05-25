import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { REFRESH_INTERVAL_MS } from "../lib/refresh";

type TopicMeta = {
  slug: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  accepted_at: string;
};

export function TopicPicker() {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const res = await fetch("/topics/_index.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as { topics: TopicMeta[] };
        if (cancelled) return;
        setTopics(payload.topics);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "unknown error");
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    }

    fetchOnce(true);
    const id = window.setInterval(() => fetchOnce(false), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const accepted = topics.filter((t) => t.status === "accepted");
  const drafts = topics.filter((t) => t.status !== "accepted");

  return (
    <div className="topic-picker">
      <header className="topic-picker-header">
        <h1 className="topic-picker-title">
          <em>Argus</em>
        </h1>
        <p className="topic-picker-sub">
          Topic-driven research engine. A hundred eyes, never asleep. Pick a topic to enter its dashboard.
        </p>
      </header>

      {loading && <div className="topic-picker-loading">Loading topics…</div>}
      {error && (
        <div className="topic-picker-error">
          <strong>Couldn't load /topics/_index.json</strong>
          <span>{error}</span>
          <span className="topic-picker-hint">
            Run <code>npm run sync-data</code>, or confirm at least one topic exists under <code>topics/</code>.
          </span>
        </div>
      )}

      {!loading && !error && accepted.length === 0 && drafts.length === 0 && (
        <div className="topic-picker-empty">
          <p>No topics yet.</p>
          <p className="topic-picker-hint">
            In Claude Code, run <code>/topic init "&lt;your topic description&gt;"</code>, then{" "}
            <code>/topic accept &lt;slug&gt;</code>.
          </p>
        </div>
      )}

      {!loading && !error && accepted.length > 0 && (
        <section className="topic-picker-section">
          <h2 className="topic-picker-section-title">Accepted</h2>
          <ul className="topic-picker-list">
            {accepted.map((topic) => (
              <li key={topic.slug} className="topic-card">
                <Link className="topic-card-link" to={`/t/${topic.slug}`}>
                  <h3 className="topic-card-name">{topic.name}</h3>
                  <p className="topic-card-slug">
                    <code>{topic.slug}</code>
                  </p>
                  {topic.description && <p className="topic-card-desc">{topic.description}</p>}
                  <p className="topic-card-meta">
                    accepted {topic.accepted_at || "—"} · created {topic.created_at || "—"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && !error && drafts.length > 0 && (
        <section className="topic-picker-section">
          <h2 className="topic-picker-section-title">Drafts (not yet accepted)</h2>
          <ul className="topic-picker-list">
            {drafts.map((topic) => (
              <li key={topic.slug} className="topic-card is-draft">
                <div className="topic-card-link">
                  <h3 className="topic-card-name">{topic.name}</h3>
                  <p className="topic-card-slug">
                    <code>{topic.slug}</code> · status: {topic.status}
                  </p>
                  {topic.description && <p className="topic-card-desc">{topic.description}</p>}
                  <p className="topic-card-meta">
                    Run <code>/topic accept {topic.slug}</code> to enable loops and dashboard.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
