import { useState } from "react";
import { ChevronDown, ChevronRight, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { PlanSummary } from "../types";

interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Plan Rows"?: number;
  "Actual Rows"?: number;
  "Total Cost"?: number;
  Plans?: PlanNode[];
  [key: string]: unknown;
}

interface Props {
  planJson: unknown;
  parsed: PlanSummary;
}

const SEQ_NODES = new Set(["Seq Scan"]);
const IDX_NODES = new Set(["Index Scan", "Index Only Scan", "Bitmap Index Scan"]);

function nodeTone(t: string): "bad" | "ok" | "neutral" {
  if (SEQ_NODES.has(t)) return "bad";
  if (IDX_NODES.has(t)) return "ok";
  return "neutral";
}

function NodeRow({ node, depth }: { node: PlanNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!(node.Plans && node.Plans.length);
  const tone = nodeTone(node["Node Type"]);

  const colorByTone = {
    bad: "text-bad",
    ok: "text-ok",
    neutral: "text-secondary",
  }[tone];

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <div
        className={`flex items-center gap-2 py-1 group ${
          hasChildren ? "cursor-pointer" : ""
        }`}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <span className="w-3 text-muted">
          {hasChildren ? (
            open ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : null}
        </span>
        <span className={`font-mono text-xs font-semibold ${colorByTone}`}>
          {node["Node Type"]}
        </span>
        {node["Relation Name"] && (
          <span className="font-mono text-xs text-muted">
            on <span className="text-secondary">{node["Relation Name"]}</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-2xs font-mono text-muted">
          {node["Plan Rows"] != null && (
            <span>
              est <span className="text-secondary num">{node["Plan Rows"]}</span>
              {node["Actual Rows"] != null && (
                <>
                  {" "}
                  → actual{" "}
                  <span className="text-secondary num">{node["Actual Rows"]}</span>
                </>
              )}
            </span>
          )}
          {node["Total Cost"] != null && (
            <span>
              cost{" "}
              <span className="text-secondary num">
                {node["Total Cost"]?.toFixed(2)}
              </span>
            </span>
          )}
        </span>
      </div>
      {open &&
        hasChildren &&
        node.Plans!.map((child, i) => (
          <NodeRow key={i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "bad" | "ok";
}) {
  const cls = {
    neutral: "bg-panel-2 text-secondary ring-edge",
    bad: "bg-bad/10 text-bad ring-bad/30",
    ok: "bg-ok/10 text-ok ring-ok/30",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ring-1 ${cls} text-2xs font-mono`}
    >
      {children}
    </span>
  );
}

export function PlanViewer({ planJson, parsed }: Props) {
  const root = (() => {
    const raw = planJson as Array<{ Plan?: PlanNode }> | { Plan?: PlanNode } | null;
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0]?.Plan ?? null;
    return (raw as { Plan?: PlanNode }).Plan ?? null;
  })();

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {parsed.top_node_type && <Pill>{parsed.top_node_type}</Pill>}
        {parsed.uses_seq_scan && (
          <Pill tone="bad">
            <AlertOctagon size={11} /> seq scan
          </Pill>
        )}
        {parsed.uses_index_scan && (
          <Pill tone="ok">
            <CheckCircle2 size={11} /> index scan
          </Pill>
        )}
        {parsed.estimated_total_cost != null && (
          <Pill>cost {parsed.estimated_total_cost.toFixed(2)}</Pill>
        )}
        {parsed.estimated_rows != null && (
          <Pill>est {parsed.estimated_rows} rows</Pill>
        )}
        {parsed.actual_rows != null && (
          <Pill>actual {parsed.actual_rows} rows</Pill>
        )}
      </div>

      {root ? (
        <div className="surface-2 p-3 overflow-x-auto">
          <NodeRow node={root} depth={0} />
        </div>
      ) : (
        <p className="text-muted text-sm">Plan data unavailable.</p>
      )}
    </div>
  );
}
