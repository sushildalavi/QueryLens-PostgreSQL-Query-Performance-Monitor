import type { QuerySummary } from "../types";
import { RegressionBadge } from "./RegressionBadge";

interface Props {
  rows: QuerySummary[];
  onRowClick: (fid: string) => void;
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function QueryTable({ rows, onRowClick }: Props) {
  if (!rows.length) {
    return (
      <p className="text-slate-500 text-sm py-4">
        No queries tracked yet. Run the collector first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-800">
            <th className="pb-2 pr-4 font-medium">Query</th>
            <th className="pb-2 pr-4 font-medium text-right">Calls</th>
            <th className="pb-2 pr-4 font-medium text-right">Mean ms</th>
            <th className="pb-2 pr-4 font-medium text-center">Regressions</th>
            <th className="pb-2 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onRowClick(r.id)}
              className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <td className="py-2 pr-4 font-mono text-xs text-slate-300 max-w-md">
                {truncate(r.normalized_query)}
              </td>
              <td className="py-2 pr-4 text-right text-slate-300">
                {r.latest_calls?.toLocaleString() ?? "—"}
              </td>
              <td className="py-2 pr-4 text-right text-slate-300">
                {r.latest_mean_ms != null ? r.latest_mean_ms.toFixed(2) : "—"}
              </td>
              <td className="py-2 pr-4 text-center">
                {r.regression_count > 0 ? (
                  <span className="text-red-400 font-semibold">{r.regression_count}</span>
                ) : (
                  <span className="text-slate-600">0</span>
                )}
              </td>
              <td className="py-2 text-slate-500 text-xs">
                {new Date(r.last_seen_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
