import { Link, useLocation } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const navItem = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
        pathname === to || (to !== "/" && pathname.startsWith(to))
          ? "bg-indigo-600 text-white"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="text-lg font-bold text-indigo-400 tracking-tight">
            QueryLens
          </span>
          <nav className="flex gap-2">
            {navItem("/", "Dashboard")}
            {navItem("/regressions", "Regressions")}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
