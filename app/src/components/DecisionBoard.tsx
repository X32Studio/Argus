import { useEffect, useState } from "react";
import { decisionBoardPath } from "../lib/records";
import { REFRESH_INTERVAL_MS } from "../lib/refresh";
import { useTopic } from "../state/TopicContext";

export type DecisionOption = {
  id: string;
  name: string;
  probability: number;
  status: string;
  summary?: string;
  pros?: string[];
  cons?: string[];
  flip_triggers?: string[];
  evidence_refs?: string[];
};

export type DecisionClaim = {
  id: string;
  option_ids?: string[];
  text: string;
  verdict: string;
  confidence: number;
  conflict?: boolean;
  supporting_refs?: string[];
  refuting_refs?: string[];
  reason?: string;
};

export type NextProbe = {
  claim_id: string;
  priority: string;
  reason: string;
  probe: string;
};

export type DecisionBoardData = {
  schema?: string;
  slug?: string;
  archetype?: string;
  engine_mode?: string;
  updated_at?: string;
  question: string;
  overall_status: string;
  pass_floor?: number;
  jev_telemetry?: {
    model?: string;
    route_drop_below?: number;
    candidates_screened: number;
    candidates_kept: number;
    candidates_dropped: number;
    ambiguous_preserved: number;
    estimated_llm_tokens_saved: number;
  };
  options: DecisionOption[];
  claims: DecisionClaim[];
  next_probes?: NextProbe[];
};

export function DecisionBoard() {
  const { slug } = useTopic();
  const [board, setBoard] = useState<DecisionBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce(isInitial: boolean) {
      try {
        const res = await fetch(decisionBoardPath(slug));
        if (res.status === 404) {
          if (!cancelled) {
            setBoard(null);
            setError("");
          }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as DecisionBoardData;
        if (!cancelled) {
          setBoard(payload);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown error");
        }
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
  }, [slug]);

  if (loading) {
    return <div className="decision-shell"><p className="decision-muted">Loading decision board…</p></div>;
  }

  if (error) {
    return (
      <div className="decision-shell">
        <div className="decision-empty">
          <strong>Could not load decision_board.json</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="decision-shell">
        <div className="decision-empty">
          <h2>No Decision Board Yet</h2>
          <p>
            This topic runs in classic knowledge-tree mode. Add{" "}
            <code>topics/{slug}/decisions/decision_board.json</code> or initialize with{" "}
            <code>archetype: decision</code> + <code>engine_mode: jev-hybrid</code> to enable
            calibrated JEV option probabilities, conflict preservation, and flip triggers.
          </p>
        </div>
      </div>
    );
  }

  const telemetry = board.jev_telemetry;

  return (
    <div className="decision-shell">
      <header className="decision-header">
        <div className="decision-badges">
          <span className="decision-chip is-cyan">
            {(board.archetype ?? "decision").toUpperCase()}
          </span>
          <span className="decision-chip is-accent">
            ENGINE // {(board.engine_mode ?? "jev-hybrid").toUpperCase()}
          </span>
          <span className={`decision-chip ${board.overall_status === "ready_to_decide" ? "is-ok" : "is-warn"}`}>
            {board.overall_status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
        <h1 className="decision-question">{board.question}</h1>
        {telemetry && (
          <div className="decision-telemetry">
            <div><span>JEV Screened</span><strong>{telemetry.candidates_screened}</strong></div>
            <div><span>Kept (Ambiguous Preserved)</span><strong>{telemetry.candidates_kept} ({telemetry.ambiguous_preserved})</strong></div>
            <div><span>Noise Dropped</span><strong>{telemetry.candidates_dropped}</strong></div>
            <div><span>Est. LLM Tokens Saved</span><strong>{telemetry.estimated_llm_tokens_saved.toLocaleString()}</strong></div>
          </div>
        )}
      </header>

      <section className="decision-section">
        <h2>Decision Options &amp; Flip Triggers</h2>
        <div className="decision-options">
          {board.options.map((opt) => {
            const pct = Math.round((opt.probability ?? 0) * 100);
            return (
              <article key={opt.id} className={`decision-card status-${opt.status}`}>
                <div className="decision-card-top">
                  <h3>{opt.name}</h3>
                  <span className={`decision-chip status-${opt.status}`}>
                    {pct}% · {opt.status.toUpperCase()}
                  </span>
                </div>
                <div className="decision-bar-track" aria-label={`${opt.name} probability ${pct}%`}>
                  <div className="decision-bar-fill" style={{ width: `${Math.min(100, Math.max(4, pct))}%` }} />
                </div>
                {opt.summary && <p className="decision-summary">{opt.summary}</p>}
                {opt.flip_triggers && opt.flip_triggers.length > 0 && (
                  <div className="decision-triggers">
                    <span className="decision-label">What would flip this verdict?</span>
                    <ul>
                      {opt.flip_triggers.map((tr) => (
                        <li key={tr}>{tr}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="decision-section">
        <h2>Claims &amp; Contradiction Radar</h2>
        <div className="decision-claims">
          {board.claims.map((cl) => (
            <article key={cl.id} className={`claim-row verdict-${cl.verdict}`}>
              <div className="claim-meta">
                <code>{cl.id}</code>
                <span className={`decision-chip verdict-${cl.verdict}`}>
                  {cl.verdict.toUpperCase()} ({Math.round(cl.confidence * 100)}%)
                </span>
              </div>
              <p className="claim-text">{cl.text}</p>
              {cl.reason && <p className="claim-reason">{cl.reason}</p>}
              <div className="claim-refs">
                <span>Support: {(cl.supporting_refs ?? []).join(", ") || "—"}</span>
                <span>Refute: {(cl.refuting_refs ?? []).join(", ") || "—"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {board.next_probes && board.next_probes.length > 0 && (
        <section className="decision-section">
          <h2>Next High-Value Exploration Probes</h2>
          <ul className="probe-list">
            {board.next_probes.map((p) => (
              <li key={p.claim_id} className="probe-item">
                <span className="decision-chip is-warn">{p.priority.toUpperCase()} · {p.claim_id}</span>
                <strong>{p.probe}</strong>
                <p>{p.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
