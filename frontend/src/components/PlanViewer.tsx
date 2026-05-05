import { useState } from "react";
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

function NodeRow({
  node,
  depth,
}: {
  node: PlanNode;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.Plans && node.Plans.length > 0;
  const isSeq = node["Node Type"] === "Seq Scan";
  const isIdx = ["Index Scan", "Index Only Scan", "Bitmap Index Scan"].includes(
    node["Node Type"]
  );

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div
        className={`flex items-start gap-2 py-1 text-sm ${hasChildren ? "cursor-pointer" : ""}`}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren && (
          <span className="text-slate-500 w-3 select-none">{open ? "▾" : "▸"}</span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span
          className={`font-mono font-semibold ${
            isSeq ? "text-red-400" : isIdx ? "text-green-400" : "text-blue-400"
          }`}
        >
          {node["Node Type"]}
        </span>
        {node["Relation Name"] && (
          <span className="text-slate-300">on {node["Relation Name"]}</span>
        )}
        {node["Total Cost"] != null && (
          <span className="text-slate-500 ml-auto text-xs">
            cost={node["Total Cost"]?.toFixed(2)}
          </span>
        )}
      </div>
      {node["Plan Rows"] != null && (
        <div style={{ paddingLeft: depth * 16 + 20 }} className="text-xs text-slate-500 -mt-1 mb-1">
          est {node["Plan Rows"]} rows
          {node["Actual Rows"] != null && ` → actual ${node["Actual Rows"]}`}
        </div>
      )}
      {open &&
        hasChildren &&
        node.Plans!.map((child, i) => (
          <NodeRow key={i} node={child} depth={depth + 1} />
        ))}
    </div>
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
      {/* parsed facts pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {parsed.top_node_type && (
          <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-mono">
            {parsed.top_node_type}
          </span>
        )}
        {parsed.uses_seq_scan && (
          <span className="px-2 py-1 bg-red-900/60 text-red-300 rounded text-xs">Seq Scan</span>
        )}
        {parsed.uses_index_scan && (
          <span className="px-2 py-1 bg-green-900/60 text-green-300 rounded text-xs">
            Index Scan
          </span>
        )}
        {parsed.estimated_total_cost != null && (
          <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
            cost {parsed.estimated_total_cost.toFixed(2)}
          </span>
        )}
        {parsed.estimated_rows != null && (
          <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
            est {parsed.estimated_rows} rows
          </span>
        )}
        {parsed.actual_rows != null && (
          <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
            actual {parsed.actual_rows} rows
          </span>
        )}
      </div>

      {/* tree */}
      {root ? (
        <div className="bg-slate-900 rounded p-3 overflow-x-auto">
          <NodeRow node={root} depth={0} />
        </div>
      ) : (
        <p className="text-slate-500 text-sm">Plan data unavailable.</p>
      )}
    </div>
  );
}
