"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GraduationCap, LogOut, Send, Users } from "lucide-react";
import { signOutAction } from "@/app/connexion/actions";

const LINKS = [
  { href: "/seances", label: "Séances", icon: CalendarDays },
  { href: "/eleves", label: "Élèves", icon: Users },
  { href: "/messages", label: "Messages", icon: Send },
];

export function AppNav({
  teacherName,
  cohortNames,
  telegramReady,
}: {
  teacherName: string;
  cohortNames: string[];
  telegramReady: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2.5">
        <Link href="/seances" className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">Dar al-Coran</span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              {cohortNames.length > 0 ? cohortNames.join(" · ") : "Aucun groupe"}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {!telegramReady ? (
            <span
              title="TELEGRAM_BOT_TOKEN absent : les envois ne fonctionneront pas"
              className="size-2 rounded-full bg-warning"
            />
          ) : null}
          <span className="hidden text-xs text-muted-foreground sm:inline">{teacherName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-3xl gap-1 px-2 pb-2">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
