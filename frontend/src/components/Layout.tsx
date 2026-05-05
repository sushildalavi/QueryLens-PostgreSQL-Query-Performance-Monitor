import { Link, useLocation } from "react-router-dom";
import { Activity, AlertTriangle } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    pathname === to || (to !== "/" && pathname.startsWith(to));

  const navItem = (to: string, label: string, Icon: typeof Activity) => (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        isActive(to)
          ? "bg-panel-2 text-primary"
          : "text-secondary hover:text-primary hover:bg-panel-2/60"
      }`}
    >
      <Icon
        size={15}
        strokeWidth={2}
        className={isActive(to) ? "text-accent" : "text-muted group-hover:text-secondary"}
      />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-ink/80 backdrop-blur border-b border-edge">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="relative grid place-items-center w-7 h-7 rounded bg-accent/10 ring-1 ring-accent/30 transition-colors group-hover:bg-accent/15">
              <span className="font-mono font-bold text-accent text-[11px] tracking-tighter">
                QL
              </span>
            </span>
            <span className="text-sm font-semibold text-primary tracking-tight">
              QueryLens
            </span>
            <span className="hidden sm:inline-block text-2xs text-muted font-mono uppercase tracking-widest">
              postgres
            </span>
          </Link>
          <nav className="flex gap-1">
            {navItem("/", "Overview", Activity)}
            {navItem("/regressions", "Regressions", AlertTriangle)}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-2xs text-muted font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
            live
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-edge text-2xs text-muted py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-mono">
          <span>querylens · pg_stat_statements + EXPLAIN JSON</span>
          <span className="hidden sm:inline">deterministic regression rules</span>
        </div>
      </footer>
    </div>
  );
}
