import { Link, NavLink, Outlet } from "react-router";
import { Boxes, FolderKanban, Settings, Sparkles, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "توليد حزمة", icon: Sparkles },
  { to: "/projects", label: "مشاريعي", icon: FolderKanban },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="ambient-orb right-[-6rem] top-20 h-72 w-72" />
      <div className="ambient-orb bottom-32 left-[-8rem] h-80 w-80 bg-sky-400/10" />
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3" aria-label="الانتقال إلى الصفحة الرئيسية">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30 transition-transform group-hover:scale-105">
              <Boxes className="h-5 w-5" />
              <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-primary ring-1 ring-primary/30">
                <WandSparkles className="h-2.5 w-2.5" />
              </span>
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">مِرْوَر</span>
              <span className="block max-w-[220px] truncate text-[11px] text-muted-foreground">
                من الفكرة إلى حزمة توثيق جاهزة للـ Vibe Coding
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-background/35 p-1" aria-label="التنقل الرئيسي">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
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

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/10 py-6">
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
