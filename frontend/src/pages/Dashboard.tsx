import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollect, useQueries, useRegressions } from "../api/hooks";
import { LatencyChart } from "../components/LatencyChart";
import { MetricCard } from "../components/MetricCard";
import { QueryTable } from "../components/QueryTable";
import { RegressionBadge } from "../components/RegressionBadge";
import type { MetricPoint } from "../types";

export function Dashboard() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const { data: queriesPage, isLoading: qLoading } = useQueries({
    limit: 50,
    sort: "mean_latency_desc",
  });
  const { data: regressionsPage, isLoading: rLoading } = useRegressions({
    limit: 10,
  });

  const collectMutation = useCollect();

  const handleCollect = async () => {
    try {
      const r = await collectMutation.mutateAsync();
      setToast(
        `Collected: ${r.fingerprints} queries, ${r.regressions} new regressions (${r.duration_ms.toFixed(0)}ms)`
      );
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast("Collection failed — is the backend running?");
      setTimeout(() => setToast(null), 4000);
    }
  };

  const queries = queriesPage?.items ?? [];
  const regressions = regressionsPage?.items ?? [];

  const totalQueries = queriesPage?.total ?? 0;
  const slowQueries = queries.filter((q) => (q.latest_mean_ms ?? 0) > 100).length;
  const highRegs = regressions.filter((r) => r.severity === "high").length;
  const avgLatency =
    queries.length
      ? (
          queries.reduce((s, q) => s + (q.latest_mean_ms ?? 0), 0) / queries.length
        ).toFixed(2)
      : null;

  // Build a chart-friendly series from the queries list (use latest_mean_ms as single point)
  const latencyPoints: MetricPoint[] = queries
    .filter((q) => q.latest_mean_ms != null)
    .map((q) => ({
      captured_at: q.last_seen_at,
      mean_exec_time_ms: q.latest_mean_ms!,
      calls: q.latest_calls ?? 0,
      total_exec_time_ms: 0,
      rows_returned: 0,
      shared_blks_hit: 0,
      shared_blks_read: 0,
      temp_blks_written: 0,
    }))
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            PostgreSQL query performance at a glance
          </p>
        </div>
        <button
          onClick={handleCollect}
          disabled={collectMutation.isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded text-sm font-medium transition-colors"
        >
          {collectMutation.isPending ? "Collecting…" : "Run collector"}
        </button>
      </div>

      {/* toast */}
      {toast && (
        <div className="px-4 py-3 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200">
          {toast}
        </div>
      )}

      {/* metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Tracked queries" value={totalQueries} />
        <MetricCard
          title="Slow queries (>100ms)"
          value={slowQueries}
          color={slowQueries > 0 ? "amber" : "default"}
        />
        <MetricCard
          title="High-severity regressions"
          value={highRegs}
          color={highRegs > 0 ? "red" : "default"}
        />
        <MetricCard
          title="Avg mean latency (ms)"
          value={avgLatency}
          hint="across tracked queries"
        />
      </div>

      {/* overview chart */}
      {latencyPoints.length > 1 && (
        <div className="bg-slate-900 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Latency snapshot (latest per query)
          </h2>
          <LatencyChart
            points={latencyPoints}
            dataKey="mean_exec_time_ms"
            label="mean exec time (ms)"
          />
        </div>
      )}

      {/* regressions feed */}
      <div className="bg-slate-900 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Recent regressions
        </h2>
        {rLoading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : regressions.length === 0 ? (
          <p className="text-slate-500 text-sm">None yet.</p>
        ) : (
          <ul className="space-y-3">
            {regressions.slice(0, 10).map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 cursor-pointer hover:bg-slate-800/50 rounded p-2 -mx-2 transition-colors"
                onClick={() => navigate(`/queries/${r.fingerprint_id}`)}
              >
                <RegressionBadge severity={r.severity} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{r.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                    {r.normalized_query.slice(0, 80)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* slow queries table */}
      <div className="bg-slate-900 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Slowest queries
        </h2>
        {qLoading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <QueryTable rows={queries} onRowClick={(id) => navigate(`/queries/${id}`)} />
        )}
      </div>
    </div>
  );
}
