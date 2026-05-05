import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Database,
  Gauge,
  ListOrdered,
  Play,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useCollect, useQueries, useRegressions } from "../api/hooks";
import { LatencyChart } from "../components/LatencyChart";
import { MetricCard } from "../components/MetricCard";
import { QueryTable } from "../components/QueryTable";
import { RegressionBadge } from "../components/RegressionBadge";
import { Section, Skeleton } from "../components/Section";
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
        `collected ${r.fingerprints} queries · ${r.regressions} new regression${
          r.regressions === 1 ? "" : "s"
        } · ${r.duration_ms.toFixed(0)}ms`
      );
    } catch {
      setToast("collection failed — backend unreachable");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const queries = queriesPage?.items ?? [];
  const regressions = regressionsPage?.items ?? [];

  const totalQueries = queriesPage?.total ?? 0;
  const slowQueries = queries.filter((q) => (q.latest_mean_ms ?? 0) > 100).length;
  const highRegs = regressions.filter((r) => r.severity === "high").length;
  const totalRegs = regressionsPage?.total ?? 0;
  const avgLatency = queries.length
    ? (
        queries.reduce((s, q) => s + (q.latest_mean_ms ?? 0), 0) / queries.length
      ).toFixed(2)
    : null;

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-2xs uppercase tracking-widest text-muted font-mono">
            overview
          </p>
          <h1 className="text-2xl font-semibold text-primary tracking-tight mt-1">
            Query performance, demystified.
          </h1>
          <p className="text-secondary text-sm mt-1.5 max-w-xl">
            Live signal from <span className="font-mono text-primary">pg_stat_statements</span>{" "}
            and <span className="font-mono text-primary">EXPLAIN</span>, scored by
            deterministic regression rules.
          </p>
        </div>
        <button
          onClick={handleCollect}
          disabled={collectMutation.isPending}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-accent text-ink rounded-md text-sm font-medium hover:bg-accent-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-glow"
        >
          <Play size={14} strokeWidth={2.5} className={collectMutation.isPending ? "animate-spin" : ""} />
          {collectMutation.isPending ? "Collecting…" : "Run collector"}
        </button>
      </div>

      {toast && (
        <div className="surface-2 px-4 py-2.5 text-sm text-secondary font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Tracked queries"
          value={totalQueries}
          icon={Database}
          hint="unique fingerprints"
        />
        <MetricCard
          label="Slow (>100ms)"
          value={slowQueries}
          icon={Timer}
          tone={slowQueries > 0 ? "warn" : "default"}
          hint="latest snapshot"
        />
        <MetricCard
          label="High-severity regs"
          value={highRegs}
          icon={AlertTriangle}
          tone={highRegs > 0 ? "bad" : "default"}
          hint={`${totalRegs} total tracked`}
        />
        <MetricCard
          label="Avg mean latency"
          value={avgLatency}
          icon={Gauge}
          hint="ms · across tracked"
        />
      </div>

      {latencyPoints.length > 1 && (
        <Section icon={TrendingUp} title="Latency landscape" hint="latest mean per fingerprint">
          <div className="px-5 pt-4 pb-2">
            <LatencyChart
              points={latencyPoints}
              dataKey="mean_exec_time_ms"
              color="#f59e0b"
              unit="ms"
              height={200}
            />
          </div>
        </Section>
      )}

      <Section
        icon={AlertTriangle}
        title="Recent regressions"
        hint="newest first · click a row for context"
        action={
          <button
            onClick={() => navigate("/regressions")}
            className="text-2xs uppercase tracking-widest text-muted hover:text-secondary font-mono transition-colors"
          >
            view all →
          </button>
        }
      >
        <div className="px-2 py-2">
          {rLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : regressions.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted">
              No regressions yet — run the collector after a workload.
            </div>
          ) : (
            <ul className="divide-y divide-edge">
              {regressions.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/5 rounded-md transition-colors"
                  onClick={() => navigate(`/queries/${r.fingerprint_id}`)}
                >
                  <RegressionBadge severity={r.severity} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-primary leading-snug">{r.message}</p>
                    <p className="text-2xs text-muted mt-1 font-mono truncate">
                      {r.normalized_query.slice(0, 110)}
                    </p>
                  </div>
                  <span className="text-2xs text-muted font-mono whitespace-nowrap shrink-0">
                    {r.regression_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section icon={ListOrdered} title="Slowest queries" hint="ordered by mean exec time">
        {qLoading ? (
          <div className="p-5 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <QueryTable rows={queries} onRowClick={(id) => navigate(`/queries/${id}`)} />
        )}
      </Section>
    </div>
  );
}

