import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Compass, Inbox, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/inbox", label: "Applicants", icon: Inbox },
  { to: "/me/questionnaire", label: "My Q", icon: ClipboardList },
  { to: "/me", label: "Profile", icon: UserRound },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/90 px-5 py-3 backdrop-blur-md">
        <Link to="/" className="font-display text-2xl tracking-tight text-fg">
          Dately
        </Link>
        <span className="text-[11px] uppercase tracking-[0.22em] text-subtle">Ask better</span>
      </header>
      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active =
              tab.to === "/"
                ? pathname === "/"
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] tracking-wide",
                    active ? "text-fg" : "text-subtle",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
