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
    limit: 12,
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
    ? Number(
        (
          queries.reduce((s, q) => s + (q.latest_mean_ms ?? 0), 0) /
          queries.length
        ).toFixed(2)
      )
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-2xs uppercase tracking-widest text-muted font-mono">
            overview
          </p>
          <h1 className="font-display text-3xl font-semibold text-primary tracking-tightest mt-1.5 leading-tight">
            Query performance,
            <br className="sm:hidden" />{" "}
            <span className="bg-gradient-to-r from-accent via-accent-soft to-accent bg-clip-text text-transparent">
              demystified.
            </span>
          </h1>
          <p className="text-secondary text-sm mt-2 max-w-xl">
            Live signal from{" "}
            <span className="font-mono text-primary">pg_stat_statements</span>{" "}
            and <span className="font-mono text-primary">EXPLAIN</span>, scored by
            deterministic regression rules. No magic.
          </p>
        </div>
        <button
          onClick={handleCollect}
          disabled={collectMutation.isPending}
          className="group inline-flex items-center gap-2 px-4 py-2 bg-accent text-ink rounded-md text-sm font-medium hover:bg-accent-soft active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-glow"
        >
          <Play
            size={14}
            strokeWidth={2.75}
            className={`${
              collectMutation.isPending
                ? "animate-spin"
                : "group-active:scale-90 transition-transform"
            }`}
          />
          {collectMutation.isPending ? "Collecting…" : "Run collector"}
        </button>
      </div>

      {toast && (
        <div className="surface-2 px-4 py-2.5 text-sm text-secondary font-mono flex items-center gap-2 animate-slide-down">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-fast">
        <MetricCard
          label="Tracked queries"
          value={totalQueries}
          icon={Database}
          hint="unique fingerprints"
        />
        <MetricCard
          label="Slow ( >100ms )"
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
          unit="ms"
          decimals={2}
          hint="across tracked"
        />
      </div>

      {latencyPoints.length > 1 && (
        <Section
          icon={TrendingUp}
          title="Latency landscape"
          hint="latest mean per fingerprint"
        >
          <div className="px-5 pt-4 pb-2">
            <LatencyChart
              points={latencyPoints}
              dataKey="mean_exec_time_ms"
              color="#f59e0b"
              unit="ms"
              height={210}
            />
          </div>
        </Section>
      )}

      <Section
        icon={AlertTriangle}
        title="Recent regressions"
        hint="newest first · click for query context"
        action={
          <button
            onClick={() => navigate("/regressions")}
            className="text-2xs uppercase tracking-widest text-muted hover:text-secondary font-mono transition-colors"
          >
            view all →
          </button>
        }
      >
        <div className="p-2">
          {rLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : regressions.length === 0 ? (
            <div className="px-3 py-12 text-center">
              <p className="text-sm text-muted">
                No regressions yet — run the collector after a workload change.
              </p>
              <p className="text-2xs text-muted mt-2 font-mono">
                tip: <span className="text-accent">make demo</span>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-edge stagger-fast">
              {regressions.slice(0, 10).map((r) => (
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

      <Section
        icon={ListOrdered}
        title="Slowest queries"
        hint="ordered by mean exec time · click a row to drill in"
      >
        {qLoading ? (
          <div className="p-5 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
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
