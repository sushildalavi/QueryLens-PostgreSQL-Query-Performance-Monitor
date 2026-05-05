import {
  Area,
  AreaChart,
  CartesianGrid,
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
  height?: number;
  unit?: string;
}

export function LatencyChart({
  points,
  dataKey,
  label,
  color = "#f59e0b",
  height = 180,
  unit = "",
}: Props) {
  if (!points.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted border border-dashed border-edge rounded-md"
        style={{ height }}
      >
        no data yet
      </div>
    );
  }

  const formatted = points.map((p) => ({
    ...p,
    t: new Date(p.captured_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const gradId = `g-${dataKey}-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div>
      {label && (
        <p className="text-2xs uppercase tracking-widest text-muted font-medium mb-2">
          {label}
        </p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={formatted}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#26262c"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tick={{ fill: "#6b6b75", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b6b75", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => (typeof v === "number" ? v.toFixed(0) : v)}
          />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.4, strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#111114",
              border: "1px solid #26262c",
              borderRadius: 6,
              fontSize: 12,
              padding: "8px 10px",
            }}
            labelStyle={{ color: "#a0a0a8", fontSize: 10, marginBottom: 4 }}
            itemStyle={{ color: "#e7e7ea" }}
            formatter={(v: number | string) =>
              typeof v === "number"
                ? [v.toFixed(2) + (unit ? " " + unit : ""), label || dataKey]
                : [v, label || dataKey]
            }
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{
              r: 3,
              stroke: color,
              strokeWidth: 2,
              fill: "#111114",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
