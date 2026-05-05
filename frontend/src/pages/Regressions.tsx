import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegressions } from "../api/hooks";
import { RegressionBadge } from "../components/RegressionBadge";

type Severity = "all" | "high" | "medium" | "low";

export function Regressions() {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState<Severity>("all");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading } = useRegressions({
    severity: severity === "all" ? undefined : severity,
    limit,
    offset: page * limit,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const filterBtn = (s: Severity) => (
    <button
      key={s}
      onClick={() => { setSeverity(s); setPage(0); }}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
        severity === s
          ? "bg-indigo-600 text-white"
          : "bg-slate-800 text-slate-400 hover:text-white"
      }`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Regressions</h1>
          <p className="text-slate-400 text-sm mt-1">{total} total detected</p>
        </div>
        <div className="flex gap-2">
          {(["all", "high", "medium", "low"] as Severity[]).map(filterBtn)}
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-500 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">
            No regressions yet. Run the collector after the demo workload.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Query</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Detected at</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/queries/${r.fingerprint_id}`)}
                >
                  <td className="px-4 py-3">
                    <RegressionBadge severity={r.severity} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {r.regression_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-xs truncate">
                    {r.normalized_query.slice(0, 70)}
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-sm">{r.message}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* pagination */}
      {total > limit && (
        <div className="flex items-center gap-4 justify-end text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded disabled:opacity-40 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="text-slate-500">
            {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </span>
          <button
            disabled={(page + 1) * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded disabled:opacity-40 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
