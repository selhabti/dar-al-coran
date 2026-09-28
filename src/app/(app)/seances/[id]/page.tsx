import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SessionPanel } from "@/components/session-panel";
import { requireCohortAccess, requireSessionAccess } from "@/lib/data/access";
import { listTemplates } from "@/lib/data/messages";
import { getStudentsForSession } from "@/lib/data/students";
import { requireTeacher } from "@/lib/session";
import { telegramConfigured } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const session = await requireSessionAccess(teacher.id, id);
  const cohort = await requireCohortAccess(teacher.id, session.cohort_id);
  const [roster, templates] = await Promise.all([
    getStudentsForSession(session.id),
    listTemplates("groupe"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/seances"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Séances
        </Link>
      </div>

      <SessionPanel
        session={session}
        cohortName={cohort.name}
        roster={roster}
        templates={templates}
        telegramReady={telegramConfigured()}
        isUpcoming={session.is_upcoming}
      />
    </div>
  );
}
