import { useState } from "react";
import { Link } from "react-router-dom";

import { useTopic } from "../state/TopicContext";

/**
 * Shown when a topic is `accepted` but no records have been written yet
 * (knowledge_graph.json has zero nodes). Tells the user to start the
 * researcher loop from a Claude Code session; this view will disappear
 * automatically once records start populating, because liveGraph is
 * polled every 2 minutes.
 */
export function EmptyTopicView() {
  const { slug } = useTopic();
  const command = `/loop 2m loops/${slug}`;
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied; user can still select-copy manually */
    }
  }

  return (
    <div className="empty-topic-shell">
      <div className="empty-topic-card">
        <p className="empty-topic-eyebrow">Topic ready</p>
        <h1 className="empty-topic-title">
          <code>{slug}</code>
        </h1>
        <p className="empty-topic-body">
          No records yet. To start watching, open a Claude Code session in this repo and run:
        </p>

        <div className="empty-topic-command" onClick={copyCommand}>
          <code>{command}</code>
          <button type="button" className="empty-topic-copy" onClick={copyCommand}>
            {copied ? "copied" : "copy"}
          </button>
        </div>

        <p className="empty-topic-hint">
          The scout loop will populate <code>topics/{slug}/records/</code> with sources from the web
          (papers, repos, news, blogs, filings — whatever fits this topic) within a couple of
          minutes; the synthesis editor takes over every 7 iterations to write{" "}
          <code>report/main.md</code>. This page polls every 2 minutes and updates silently — leave
          it open, no refresh needed.
        </p>

        <p className="empty-topic-secondary">
          <Link to="/" className="empty-topic-back">
            ← All topics
          </Link>
        </p>
      </div>
    </div>
  );
}
