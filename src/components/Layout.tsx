import { Link, NavLink, Outlet } from "react-router";
import { Boxes, FolderKanban, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "توليد حزمة", icon: Sparkles },
  { to: "/projects", label: "مشاريعي", icon: FolderKanban },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold">مِرْوَر</span>
              <span className="block text-[11px] text-muted-foreground">
                من الفكرة إلى حزمة توثيق جاهزة للـ Vibe Coding
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            مبني على إطار ورقة «The New SDLC with Vibe Coding» — من المطالبات العشوائية إلى
            الهندسة الوكيلة المنضبطة
          </p>
          <p className="font-mono" dir="ltr">
            Spec → Agent → Verify
          </p>
        </div>
      </footer>
    </div>
  );
}
