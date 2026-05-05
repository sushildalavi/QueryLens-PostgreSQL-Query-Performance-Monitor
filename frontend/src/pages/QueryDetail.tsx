import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  GitBranch,
  Hash,
  History,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  useGenerateReport,
  useLatestPlan,
  useMetrics,
  useQuery_,
  useRegressions,
  useReport,
} from "../api/hooks";
import { LatencyChart } from "../components/LatencyChart";
import { PlanViewer } from "../components/PlanViewer";
import { RegressionBadge } from "../components/RegressionBadge";
import { Section, Skeleton } from "../components/Section";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1.5 text-2xs text-muted hover:text-primary transition-colors px-2 py-1 rounded border border-edge hover:border-edge-bright bg-panel"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function QueryDetail() {
  const { fid = "" } = useParams<{ fid: string }>();
  const { data: detail, isLoading: dLoading } = useQuery_(fid);
  const { data: metrics = [] } = useMetrics(fid);
  const { data: plan } = useLatestPlan(fid);
  const { data: regsPage } = useRegressions({ limit: 50 });
  const { data: existingReport } = useReport(fid);
  const generateMutation = useGenerateReport(fid);
  const [report, setReport] = useState<string | null>(null);

  const myRegs = (regsPage?.items ?? []).filter(
    (r) => r.fingerprint_id === fid
  );

  const handleReport = async () => {
    try {
      const r = await generateMutation.mutateAsync();
      setReport(r.generated_text);
    } catch {
      setReport("Failed to generate report.");
    }
  };

  if (dLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!detail)
    return (
      <div className="surface p-8 text-center">
        <p className="text-bad text-sm">Query not found.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-3 text-2xs text-muted hover:text-primary"
        >
          <ArrowLeft size={12} /> back to overview
        </Link>
      </div>
    );

  const fp = detail.fingerprint;
  const latestMetric = detail.latest_metric;
  const hasHighReg = myRegs.some((r) => r.severity === "high");

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-2xs text-muted hover:text-primary font-mono uppercase tracking-widest"
        >
          <ArrowLeft size={12} /> overview
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-2xs uppercase tracking-widest text-muted font-mono">
              query fingerprint
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary tracking-tight flex items-center gap-2">
              <Hash size={16} className="text-accent" />
              <span className="font-mono">{fp.fingerprint_hash.slice(0, 16)}</span>
            </h1>
          </div>
          {hasHighReg && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-bad/10 ring-1 ring-bad/30 text-bad text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-bad animate-pulse" />
              high-severity regression detected
            </div>
          )}
        </div>
      </div>

      <div className="surface relative">
        <div className="absolute top-2.5 right-2.5">
          <CopyButton text={fp.normalized_query} />
        </div>
        <pre className="p-4 pr-20 text-xs font-mono text-secondary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
          {fp.normalized_query}
        </pre>
      </div>

      {latestMetric && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Mean exec",
              val: latestMetric.mean_exec_time_ms.toFixed(2),
              suffix: "ms",
            },
            {
              label: "Total calls",
              val: latestMetric.calls.toLocaleString(),
              suffix: "",
            },
            {
              label: "Rows returned",
              val: latestMetric.rows_returned.toLocaleString(),
              suffix: "",
            },
            {
              label: "Temp blocks",
              val: latestMetric.temp_blks_written.toLocaleString(),
              suffix: "",
            },
          ].map(({ label, val, suffix }) => (
            <div key={label} className="surface px-4 py-3">
              <p className="text-2xs uppercase tracking-widest text-muted font-medium">
                {label}
              </p>
              <p className="text-xl font-semibold text-primary tracking-tight num mt-1.5">
                {val}
                {suffix && (
                  <span className="text-muted text-sm font-normal ml-1">
                    {suffix}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {metrics.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Section icon={TrendingUp} title="Mean exec time" hint="ms · over time">
            <div className="px-5 py-4">
              <LatencyChart
                points={metrics}
                dataKey="mean_exec_time_ms"
                color="#f59e0b"
                unit="ms"
              />
            </div>
          </Section>
          <Section icon={History} title="Call count" hint="calls observed">
            <div className="px-5 py-4">
              <LatencyChart
                points={metrics}
                dataKey="calls"
                color="#34d399"
              />
            </div>
          </Section>
        </div>
      )}

      {plan && (
        <Section
          icon={GitBranch}
          title="Latest execution plan"
          hint={
            plan.execution_time_ms != null
              ? `executed in ${plan.execution_time_ms.toFixed(2)}ms${
                  plan.planning_time_ms != null
                    ? ` · planned in ${plan.planning_time_ms.toFixed(2)}ms`
                    : ""
                }`
              : "from latest EXPLAIN"
          }
        >
          <div className="p-5">
            <PlanViewer planJson={plan.plan_json} parsed={plan} />
          </div>
        </Section>
      )}

      {myRegs.length > 0 && (
        <Section icon={History} title="Regression history" hint={`${myRegs.length} detected`}>
          <ul className="divide-y divide-edge">
            {myRegs.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                <RegressionBadge severity={r.severity} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary">{r.message}</p>
                  <p className="text-2xs text-muted mt-1 font-mono">
                    {r.regression_type} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        icon={FileText}
        title="Performance report"
        hint="plain-English summary built from collected facts"
        action={
          <button
            onClick={handleReport}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent ring-1 ring-accent/30 rounded text-xs font-medium transition-colors disabled:opacity-60"
          >
            <Sparkles size={12} className={generateMutation.isPending ? "animate-pulse" : ""} />
            {generateMutation.isPending
              ? "Generating…"
              : report || existingReport
              ? "Regenerate"
              : "Generate"}
          </button>
        }
      >
        <div className="p-5">
          {(report ?? existingReport?.generated_text) ? (
            <div>
              <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
                {report ?? existingReport?.generated_text}
              </p>
              {existingReport?.model_name && !report && (
                <p className="mt-3 text-2xs text-muted font-mono">
                  generated by {existingReport.model_name}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No report yet. Click <span className="text-accent">Generate</span> to
              produce a 2–4 sentence summary from collected metrics and plan facts.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
