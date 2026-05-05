import { useState } from "react";
import { useParams } from "react-router-dom";
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-slate-700"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function QueryDetail() {
  const { fid = "" } = useParams<{ fid: string }>();
  const { data: detail, isLoading: dLoading } = useQuery_(fid);
  const { data: metrics = [] } = useMetrics(fid);
  const { data: plan } = useLatestPlan(fid);
  const { data: regsPage } = useRegressions({ limit: 20 });
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

  if (dLoading) return <p className="text-slate-500 py-8">Loading…</p>;
  if (!detail) return <p className="text-red-400 py-8">Query not found.</p>;

  const fp = detail.fingerprint;
  const latestMetric = detail.latest_metric;
  const hasHighReg = myRegs.some((r) => r.severity === "high");

  return (
    <div className="space-y-8">
      {/* header */}
      <div>
        {hasHighReg && (
          <div className="mb-3 px-3 py-2 bg-red-900/40 border border-red-700 rounded text-sm text-red-300">
            High-severity regression detected
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-white">Query Detail</h1>
          <span className="text-xs text-slate-500 font-mono">{fp.fingerprint_hash.slice(0, 12)}</span>
        </div>
        <div className="mt-3 relative">
          <pre className="bg-slate-900 rounded p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
            {fp.normalized_query}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={fp.normalized_query} />
          </div>
        </div>
      </div>

      {/* metric summary */}
      {latestMetric && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Mean exec (ms)", val: latestMetric.mean_exec_time_ms.toFixed(2) },
            { label: "Total calls", val: latestMetric.calls.toLocaleString() },
            { label: "Rows returned", val: latestMetric.rows_returned.toLocaleString() },
            { label: "Temp blocks", val: latestMetric.temp_blks_written.toLocaleString() },
          ].map(({ label, val }) => (
            <div key={label} className="bg-slate-900 rounded p-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-white mt-1">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* charts */}
      {metrics.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">Mean exec time (ms)</h2>
            <LatencyChart points={metrics} dataKey="mean_exec_time_ms" color="#6366f1" />
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">Call count</h2>
            <LatencyChart points={metrics} dataKey="calls" color="#22c55e" />
          </div>
        </div>
      )}

      {/* plan viewer */}
      {plan && (
        <div className="bg-slate-900 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Latest execution plan</h2>
          <PlanViewer planJson={plan.plan_json} parsed={plan} />
          {plan.execution_time_ms != null && (
            <p className="mt-3 text-xs text-slate-500">
              Execution: {plan.execution_time_ms.toFixed(2)}ms
              {plan.planning_time_ms != null &&
                ` / Planning: ${plan.planning_time_ms.toFixed(2)}ms`}
            </p>
          )}
        </div>
      )}

      {/* regressions */}
      {myRegs.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Regressions</h2>
          <ul className="space-y-3">
            {myRegs.map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <RegressionBadge severity={r.severity} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-200">{r.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{r.regression_type}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI report */}
      <div className="bg-slate-900 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Performance report</h2>
          <button
            onClick={handleReport}
            disabled={generateMutation.isPending}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded text-xs font-medium transition-colors"
          >
            {generateMutation.isPending
              ? "Generating…"
              : report || existingReport
              ? "Regenerate"
              : "Generate report"}
          </button>
        </div>
        {(report ?? existingReport?.generated_text) ? (
          <div className="text-sm text-slate-300 leading-relaxed">
            {report ?? existingReport?.generated_text}
            {existingReport?.model_name && (
              <p className="mt-2 text-xs text-slate-600">
                Generated by {existingReport.model_name}
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            Click "Generate report" to produce a plain-English performance summary.
          </p>
        )}
      </div>
    </div>
  );
}
