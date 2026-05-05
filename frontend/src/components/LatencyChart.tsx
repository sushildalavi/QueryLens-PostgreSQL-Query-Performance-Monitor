import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Point = Record<string, any>;

interface Props {
  points: Point[];
  dataKey: string;
  label?: string;
  color?: string;
}

export function LatencyChart({ points, dataKey, label, color = "#6366f1" }: Props) {
  if (!points.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No data yet
      </div>
    );
  }

  const formatted = points.map((p) => ({
    ...p,
    t: new Date(p.captured_at).toLocaleTimeString(),
  }));

  return (
    <div>
      {label && <p className="text-xs text-slate-400 mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="t"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 6,
              fontSize: 12,
            }}
            itemStyle={{ color: "#e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
