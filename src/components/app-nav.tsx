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
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 py-2.5 sm:px-4">
          <Link href="/seances" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">
                Dar al-Coran
              </span>
              <span className="block truncate text-xs leading-tight text-muted-foreground">
                {cohortNames.length > 0 ? cohortNames.join(" · ") : "Aucun groupe"}
              </span>
            </span>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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

          <div className="ml-auto flex items-center gap-1.5">
            {!telegramReady ? (
              <span
                title="TELEGRAM_BOT_TOKEN absent : les envois ne fonctionneront pas"
                className="size-2 rounded-full bg-warning"
              />
            ) : null}
            <span className="hidden max-w-[9rem] truncate text-xs text-muted-foreground md:inline">
              {teacherName}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex w-full max-w-3xl">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
