interface Props {
  severity: "high" | "medium" | "low";
  className?: string;
}

const classes = {
  high: "bg-red-900 text-red-300 border border-red-600",
  medium: "bg-amber-900 text-amber-300 border border-amber-600",
  low: "bg-slate-700 text-slate-300 border border-slate-500",
};

export function RegressionBadge({ severity, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${classes[severity]} ${className}`}
    >
      {severity}
    </span>
  );
}
