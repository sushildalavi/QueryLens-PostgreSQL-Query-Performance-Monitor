import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;
}

export function Section({ icon: Icon, title, hint, action, children, bare }: Props) {
  return (
    <section className={bare ? "" : "surface"}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-edge">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid place-items-center w-6 h-6 rounded bg-panel-2 ring-1 ring-edge">
              <Icon size={13} className="text-secondary" />
            </span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-primary tracking-tight">
              {title}
            </h2>
            {hint && <p className="text-2xs text-muted mt-0.5">{hint}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={bare ? "" : ""}>{children}</div>
    </section>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-panel-2 rounded ${className}`}
      aria-hidden
    />
  );
}
