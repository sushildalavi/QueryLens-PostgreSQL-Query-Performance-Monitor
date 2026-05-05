import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}

export function Section({ icon: Icon, title, hint, action, children, flush }: Props) {
  return (
    <section className="surface animate-fade-up overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-3.5 pb-3 border-b border-edge">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="grid place-items-center w-6 h-6 rounded bg-panel-2 ring-1 ring-edge shrink-0">
              <Icon size={13} className="text-secondary" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary tracking-tight truncate">
              {title}
            </h2>
            {hint && <p className="text-2xs text-muted mt-0.5 truncate">{hint}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={flush ? "" : ""}>{children}</div>
    </section>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
