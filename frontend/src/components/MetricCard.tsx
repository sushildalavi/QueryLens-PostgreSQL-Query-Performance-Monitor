import type { LucideIcon } from "lucide-react";
import { Ticker } from "./Ticker";

interface Props {
  label: string;
  value: string | number | null | undefined;
  hint?: string;
  tone?: "default" | "warn" | "bad" | "ok";
  icon?: LucideIcon;
  unit?: string;
  decimals?: number;
  trend?: number[];
}

const toneIcon = {
  default: "text-secondary",
  warn: "text-warn",
  bad: "text-bad",
  ok: "text-ok",
};

const toneRing = {
  default: "",
  warn: "ring-1 ring-inset ring-warn/15",
  bad: "ring-1 ring-inset ring-bad/20",
  ok: "ring-1 ring-inset ring-ok/15",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const w = 64;
  const h = 16;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="opacity-80"
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  unit,
  decimals = 0,
  trend,
}: Props) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : null;
  const isNum = numeric != null && !isNaN(numeric);

  return (
    <div
      className={`surface p-4 transition-all duration-300 hover:border-edge-bright hover:translate-y-[-1px] hover:shadow-glow-soft ${toneRing[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs uppercase tracking-widest text-muted font-medium">
          {label}
        </span>
        {Icon && (
          <span className="grid place-items-center w-6 h-6 rounded bg-panel-2 ring-1 ring-edge">
            <Icon size={12} className={toneIcon[tone]} strokeWidth={2.25} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-display font-semibold text-primary tracking-tightest leading-none">
          {value == null ? (
            <span className="text-muted">—</span>
          ) : isNum ? (
            <Ticker value={numeric} decimals={decimals} />
          ) : (
            <span className="num">{value}</span>
          )}
        </span>
        {unit && <span className="text-xs text-muted font-mono">{unit}</span>}
      </div>
      <div className="mt-2 flex items-end justify-between">
        {hint && <p className="text-2xs text-muted">{hint}</p>}
        {trend && trend.length >= 2 && (
          <Sparkline
            data={trend}
            color={
              tone === "bad"
                ? "#f87171"
                : tone === "warn"
                ? "#fbbf24"
                : tone === "ok"
                ? "#34d399"
                : "#6b6b75"
            }
          />
        )}
      </div>
    </div>
  );
}
