import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { listCohortsForTeacher } from "@/lib/data/cohorts";
import { requireTeacher } from "@/lib/session";
import { telegramConfigured } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const teacher = await requireTeacher();
  const cohorts = await listCohortsForTeacher(teacher.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav
        teacherName={teacher.full_name}
        cohortNames={cohorts.map((cohort) => cohort.name)}
        telegramReady={telegramConfigured()}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-4 sm:pb-10">
        {children}
      </main>
    </div>
  );
}
