interface Props {
  title: string;
  value: string | number | null | undefined;
  hint?: string;
  color?: "default" | "red" | "amber" | "green";
}

const colorMap = {
  default: "border-slate-700",
  red: "border-red-600",
  amber: "border-amber-500",
  green: "border-green-600",
};

export function MetricCard({ title, value, hint, color = "default" }: Props) {
  return (
    <div className={`rounded-lg bg-slate-900 border-l-4 ${colorMap[color]} p-5`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">
        {value ?? <span className="text-slate-500">—</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
