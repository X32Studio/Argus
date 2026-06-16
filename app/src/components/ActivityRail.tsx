import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useNotices } from "../hooks/useNotices";
import { NOTICE_RENDER_LIMIT, type NoticeEntry, type NoticeLevel } from "../lib/notices";

function slugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/t\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(11, 19);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  } catch {
    return iso;
  }
}

const LEVEL_LABEL: Record<NoticeLevel, string> = {
  info: "info",
  attention: "attention",
  blocked: "blocked",
};

const COLLAPSED_KEY = "argus-activity-rail-collapsed";
const SEEN_KEY = "argus-activity-rail-seen-count";
const ORIGINAL_TITLE = typeof document !== "undefined" ? document.title : "";

export function ActivityRail() {
  const { pathname } = useLocation();
  const slug = useMemo(() => slugFromPath(pathname), [pathname]);
  const entries = useNotices(slug);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem(COLLAPSED_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const [seenCount, setSeenCount] = useState<number>(() => {
    try {
      const v = window.localStorage.getItem(SEEN_KEY);
      const n = v ? parseInt(v, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!collapsed) {
      setSeenCount(entries.length);
      try {
        window.localStorage.setItem(SEEN_KEY, String(entries.length));
      } catch {
        /* ignore */
      }
    }
  }, [collapsed, entries.length]);

  const unread = Math.max(0, entries.length - seenCount);
  const unreadBlocked = useMemo(
    () => entries.slice(seenCount).filter((e) => e.level === "blocked").length,
    [entries, seenCount],
  );

  // Title-flash when new blocked event arrives and tab is hidden / collapsed.
  const lastBlockedSeenRef = useRef<number>(seenCount);
  useEffect(() => {
    const blockedTotal = entries.filter((e) => e.level === "blocked").length;
    const newBlockedAppeared = blockedTotal > 0 && unreadBlocked > 0;
    if (!newBlockedAppeared) return;
    if (lastBlockedSeenRef.current === blockedTotal) return;
    lastBlockedSeenRef.current = blockedTotal;

    let toggled = false;
    const id = window.setInterval(() => {
      document.title = toggled ? ORIGINAL_TITLE : "[!] Argus needs you";
      toggled = !toggled;
    }, 1000);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
      document.title = ORIGINAL_TITLE;
    }, 30000);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
      document.title = ORIGINAL_TITLE;
    };
  }, [entries, unreadBlocked]);

  const rendered = useMemo(() => entries.slice(-NOTICE_RENDER_LIMIT).reverse(), [entries]);

  if (collapsed) {
    return (
      <button
        type="button"
        className={`activity-rail-strip ${unreadBlocked > 0 ? "is-blocked" : unread > 0 ? "is-unread" : ""}`}
        onClick={() => setCollapsed(false)}
        title={unread > 0 ? `${unread} new notice${unread === 1 ? "" : "s"}` : "Activity"}
      >
        <span className="activity-rail-strip-label">activity</span>
        {unread > 0 && (
          <span className={`activity-rail-strip-badge ${unreadBlocked > 0 ? "is-blocked" : ""}`}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className="activity-rail-panel" aria-label="Argus activity feed">
      <header className="activity-rail-header">
        <span className="activity-rail-title">activity</span>
        <span className="activity-rail-count">{entries.length}</span>
        <button
          type="button"
          className="activity-rail-collapse"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse activity rail"
        >
          ‹
        </button>
      </header>
      <div className="activity-rail-body">
        {rendered.length === 0 ? (
          <p className="activity-rail-empty">
            No activity yet. Argus will stream status here as soon as the loop or skill emits anything.
          </p>
        ) : (
          <ul className="activity-rail-list">
            {rendered.map((e, idx) => (
              <NoticeItem key={`${e.ts}-${idx}`} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function NoticeItem({ entry }: { entry: NoticeEntry }) {
  return (
    <li className={`activity-rail-item is-${entry.level}`}>
      <div className="activity-rail-meta">
        <span className="activity-rail-time">{formatTime(entry.ts)}</span>
        <span className={`activity-rail-level is-${entry.level}`}>{LEVEL_LABEL[entry.level]}</span>
        <span className="activity-rail-source">{entry.source}</span>
        {entry.cycle !== null && <span className="activity-rail-cycle">c{entry.cycle}</span>}
      </div>
      <p className="activity-rail-text">{entry.text}</p>
    </li>
  );
}
