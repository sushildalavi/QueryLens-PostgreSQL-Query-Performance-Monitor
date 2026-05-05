import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number | null | undefined;
  hint?: string;
  tone?: "default" | "warn" | "bad" | "ok";
  icon?: LucideIcon;
  delta?: { value: string; direction: "up" | "down" | "flat" };
}

const toneAccent = {
  default: "text-secondary",
  warn: "text-warn",
  bad: "text-bad",
  ok: "text-ok",
};

export function MetricCard({ label, value, hint, tone = "default", icon: Icon, delta }: Props) {
  return (
    <div className="surface p-4 transition-colors hover:border-edge-bright">
      <div className="flex items-center justify-between">
        <span className="text-2xs uppercase tracking-widest text-muted font-medium">
          {label}
        </span>
        {Icon && <Icon size={14} className={toneAccent[tone]} strokeWidth={2} />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-primary tracking-tight num">
          {value ?? <span className="text-muted">—</span>}
        </span>
        {delta && (
          <span
            className={`text-2xs font-mono ${
              delta.direction === "up"
                ? "text-bad"
                : delta.direction === "down"
                ? "text-ok"
                : "text-muted"
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
