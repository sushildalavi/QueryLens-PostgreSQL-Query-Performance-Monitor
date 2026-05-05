import { useEffect, useState } from "react";

interface Props {
  high: number;
  medium: number;
  low: number;
}

export function SeverityBar({ high, medium, low }: Props) {
  const total = Math.max(1, high + medium + low);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  const pct = (v: number) => (show ? `${(v / total) * 100}%` : "0%");

  return (
    <div>
      <div className="flex items-center gap-2 text-2xs font-mono text-muted mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-bad" /> high <span className="text-primary num">{high}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warn" /> medium <span className="text-primary num">{medium}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> low <span className="text-primary num">{low}</span>
        </span>
      </div>
      <div className="h-1.5 bg-panel-2 rounded overflow-hidden flex">
        <div
          className="bg-bad transition-all duration-700 ease-out"
          style={{ width: pct(high) }}
        />
        <div
          className="bg-warn transition-all duration-700 ease-out delay-75"
          style={{ width: pct(medium) }}
        />
        <div
          className="bg-secondary/60 transition-all duration-700 ease-out delay-150"
          style={{ width: pct(low) }}
        />
      </div>
    </div>
  );
}
