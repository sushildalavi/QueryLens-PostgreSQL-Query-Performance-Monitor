import { Activity, AlertOctagon, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { QuerySummary, RegressionListItem } from "../types";
import { regressionMeta } from "./RegressionTypeIcon";

interface Props {
  queries: QuerySummary[];
  regressions: RegressionListItem[];
  limit?: number;
  onRegressionClick: (fid: string) => void;
}

interface Event {
  id: string;
  at: string;
  kind: "regression" | "snapshot";
  message: React.ReactNode;
  hint: string;
  icon: LucideIcon;
  tone: string;
  onClick?: () => void;
}

function relTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

export function ActivityFeed({
  queries,
  regressions,
  limit = 12,
  onRegressionClick,
}: Props) {
  const events: Event[] = [];

  for (const r of regressions) {
    const meta = regressionMeta(r.regression_type);
    events.push({
      id: `r:${r.id}`,
      at: r.created_at,
      kind: "regression",
      icon:
        r.regression_type === "index_scan_to_seq_scan"
          ? ArrowDownRight
          : r.severity === "high"
          ? AlertOctagon
          : Activity,
      tone:
        r.severity === "high"
          ? "text-bad"
          : r.severity === "medium"
          ? "text-warn"
          : "text-secondary",
      message: (
        <span>
          <span className="text-secondary text-2xs font-mono uppercase tracking-wider">
            {meta.label}
          </span>{" "}
          <span className="text-primary">{r.message}</span>
        </span>
      ),
      hint: r.normalized_query.slice(0, 70),
      onClick: () => onRegressionClick(r.fingerprint_id),
    });
  }

  // also include "snapshot recorded" pseudo-events for the most recent queries
  const recentSnapshots = queries
    .slice()
    .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))
    .slice(0, 4);
  for (const q of recentSnapshots) {
    events.push({
      id: `s:${q.id}`,
      at: q.last_seen_at,
      kind: "snapshot",
      icon: Activity,
      tone: "text-secondary",
      message: (
        <span className="text-secondary">
          metric snapshot stored for{" "}
          <span className="font-mono text-primary">
            {q.normalized_query.slice(0, 50)}
            {q.normalized_query.length > 50 ? "…" : ""}
          </span>
        </span>
      ),
      hint:
        (q.latest_mean_ms != null
          ? `${q.latest_mean_ms.toFixed(2)}ms`
          : "—") +
        " · " +
        (q.latest_calls?.toLocaleString() ?? "—") +
        " calls",
    });
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  const top = events.slice(0, limit);

  if (top.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative pl-6 pr-3 py-3">
      <span
        className="absolute left-[15px] top-2 bottom-2 w-px bg-edge"
        aria-hidden
      />
      {top.map((e, i) => {
        const Icon = e.icon;
        return (
          <li
            key={e.id}
            style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
            onClick={e.onClick}
            className={`relative flex gap-3 py-1.5 ${
              e.onClick ? "cursor-pointer hover:bg-accent/5 -mx-3 px-3 rounded" : ""
            } animate-fade-up transition-colors`}
          >
            <span
              className={`absolute left-[-15px] top-2 grid place-items-center w-3.5 h-3.5 rounded-full bg-panel ring-1 ring-edge ${e.tone}`}
            >
              <Icon size={9} strokeWidth={2.5} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs leading-snug">{e.message}</div>
              <div className="mt-0.5 text-2xs font-mono text-muted truncate">
                {e.hint}
              </div>
            </div>
            <span className="text-2xs font-mono text-muted shrink-0">
              {relTime(e.at)} ago
            </span>
          </li>
        );
      })}
    </ol>
  );
}
