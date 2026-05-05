import { ChevronRight } from "lucide-react";
import type { QuerySummary } from "../types";

interface Props {
  rows: QuerySummary[];
  onRowClick: (fid: string) => void;
}

function truncate(s: string, n = 90): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function severityColor(ms: number | null | undefined): string {
  if (ms == null) return "text-muted";
  if (ms > 100) return "text-bad";
  if (ms > 10) return "text-warn";
  return "text-secondary";
}

export function QueryTable({ rows, onRowClick }: Props) {
  if (!rows.length) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted">
        No queries tracked yet. Run the collector to populate this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-widest text-muted">
            <th className="px-4 py-2.5 font-medium">Query</th>
            <th className="px-4 py-2.5 font-medium text-right">Calls</th>
            <th className="px-4 py-2.5 font-medium text-right">Mean ms</th>
            <th className="px-4 py-2.5 font-medium text-center">Regs</th>
            <th className="px-4 py-2.5 font-medium">Last seen</th>
            <th className="px-2 py-2.5 w-6" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              onClick={() => onRowClick(r.id)}
              style={{ animationDelay: `${Math.min(i * 18, 240)}ms` }}
              className={`group cursor-pointer transition-colors border-t border-edge animate-fade-up ${
                i % 2 === 0 ? "bg-transparent" : "bg-panel-2/30"
              } hover:bg-accent/5`}
            >
              <td className="px-4 py-2.5 font-mono text-xs text-primary/90 max-w-md">
                <span className="block truncate">
                  {truncate(r.normalized_query)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-secondary num">
                {r.latest_calls?.toLocaleString() ?? "—"}
              </td>
              <td
                className={`px-4 py-2.5 text-right num font-medium ${severityColor(
                  r.latest_mean_ms
                )}`}
              >
                {r.latest_mean_ms != null ? r.latest_mean_ms.toFixed(2) : "—"}
              </td>
              <td className="px-4 py-2.5 text-center">
                {r.regression_count > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded bg-bad/10 ring-1 ring-bad/30 text-bad text-2xs font-mono num">
                    {r.regression_count}
                  </span>
                ) : (
                  <span className="text-muted text-2xs num">0</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted text-2xs whitespace-nowrap">
                {relativeTime(r.last_seen_at)}
              </td>
              <td className="px-2 py-2.5 text-muted">
                <ChevronRight
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
