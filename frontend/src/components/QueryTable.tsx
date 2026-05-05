import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Search } from "lucide-react";
import type { QuerySummary } from "../types";

interface Props {
  rows: QuerySummary[];
  onRowClick: (fid: string) => void;
}

type SortKey = "mean" | "calls" | "regressions";
type SortDir = "asc" | "desc";

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

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-accent/20 text-accent rounded-sm px-0.5">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

export function QueryTable({ rows, onRowClick }: Props) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mean");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = term
      ? rows.filter((r) => r.normalized_query.toLowerCase().includes(term))
      : rows.slice();
    out.sort((a, b) => {
      const m = sortDir === "asc" ? 1 : -1;
      const va =
        sortKey === "mean"
          ? a.latest_mean_ms ?? -1
          : sortKey === "calls"
          ? a.latest_calls ?? -1
          : a.regression_count ?? 0;
      const vb =
        sortKey === "mean"
          ? b.latest_mean_ms ?? -1
          : sortKey === "calls"
          ? b.latest_calls ?? -1
          : b.regression_count ?? 0;
      return (va - vb) * m;
    });
    return out;
  }, [rows, q, sortKey, sortDir]);

  const setSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "mean" || k === "calls" || k === "regressions" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ArrowUp size={10} className="inline -mt-0.5" />
      ) : (
        <ArrowDown size={10} className="inline -mt-0.5" />
      )
    ) : null;

  if (!rows.length) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted">
        No queries tracked yet. Run the collector to populate this view.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-edge">
        <Search size={13} className="text-muted shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter by query text…"
          className="flex-1 bg-transparent outline-none text-xs font-mono text-primary placeholder:text-muted"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-2xs text-muted hover:text-secondary font-mono"
          >
            clear
          </button>
        )}
        <span className="text-2xs text-muted font-mono num">
          {filtered.length} / {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-2xs uppercase tracking-widest text-muted">
              <th className="px-4 py-2.5 font-medium">Query</th>
              <th className="px-4 py-2.5 font-medium text-right">
                <button
                  onClick={() => setSort("calls")}
                  className="hover:text-secondary transition-colors uppercase tracking-widest"
                >
                  Calls <SortIcon k="calls" />
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium text-right">
                <button
                  onClick={() => setSort("mean")}
                  className="hover:text-secondary transition-colors uppercase tracking-widest"
                >
                  Mean ms <SortIcon k="mean" />
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium text-center">
                <button
                  onClick={() => setSort("regressions")}
                  className="hover:text-secondary transition-colors uppercase tracking-widest"
                >
                  Regs <SortIcon k="regressions" />
                </button>
              </th>
              <th className="px-4 py-2.5 font-medium">Last seen</th>
              <th className="px-2 py-2.5 w-6" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-muted"
                >
                  No queries match "{q}".
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => onRowClick(r.id)}
                  style={{ animationDelay: `${Math.min(i * 14, 200)}ms` }}
                  className={`group cursor-pointer transition-colors border-t border-edge animate-fade-up ${
                    i % 2 === 0 ? "bg-transparent" : "bg-panel-2/30"
                  } hover:bg-accent/5`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-primary/90 max-w-md">
                    <span className="block truncate">
                      {highlight(truncate(r.normalized_query), q.trim())}
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
                      className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
