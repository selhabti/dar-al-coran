import Link from "next/link";
import { BookOpen, CalendarClock, Clock, Plus, Users } from "lucide-react";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  countLinkedGuardians,
  getTodayInParis,
  listCohortsForTeacher,
} from "@/lib/data/cohorts";
import { ensureUpcomingSessions, getNextSession, listSessions } from "@/lib/data/sessions";
import {
  formatFullDate,
  formatMonth,
  formatTimeInZone,
  scheduleLabel,
  weekdayLabel,
} from "@/lib/format";
import { requireTeacher } from "@/lib/session";
import type { SessionListItem } from "@/lib/data/sessions";

export const dynamic = "force-dynamic";

function SessionRow({ session }: { session: SessionListItem }) {
  const closed = session.status === "cloturee";
  return (
    <Card className={closed ? "" : "border-primary/40"}>
      <Link href={`/seances/${session.id}`} className="flex items-center gap-3 px-3 py-3">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-muted px-1 py-1.5">
          <span className="text-sm font-semibold text-foreground">
            {formatTimeInZone(session.starts_at)}
          </span>
          <span className="text-[0.65rem] text-muted-foreground">
            {session.ends_at ? formatTimeInZone(session.ends_at) : ""}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium">
            {session.cohort_name}
            <span className="text-xs font-normal text-muted-foreground">
              {formatFullDate(session.starts_at)}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>
              {session.present_count}/{session.total_count} présents
            </span>
            {session.last_surah ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="size-3" />
                  {session.last_surah}
                  {session.last_ayah ? ` ${session.last_ayah}` : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>

        {closed ? (
          <Badge variant="secondary" className="shrink-0">
            Clôturée
          </Badge>
        ) : (
          <Badge className="shrink-0">Pointer</Badge>
        )}
      </Link>
    </Card>
  );
}

export default async function SessionsPage() {
  const teacher = await requireTeacher();
  const cohorts = await listCohortsForTeacher(teacher.id);
  const cohortIds = cohorts.map((cohort) => cohort.id);

  await ensureUpcomingSessions(teacher.id);

  const today = await getTodayInParis();
  const todayDate = new Date(today.year, today.month - 1, today.day);

  const sessions = await listSessions(cohortIds);
  const todaysSessions = sessions.filter((session) => session.is_today);
  const pastSessions = sessions.filter((session) => !session.is_today);
  const nextSession = todaysSessions.length === 0 ? await getNextSession(cohortIds) : null;

  const guardianStats = await Promise.all(
    cohorts.map(async (cohort) => [cohort.id, await countLinkedGuardians(cohort.id)] as const),
  );

  if (cohorts.length === 0) {
    return (
      <EmptyState
        title="Aucun groupe"
        description="Votre compte n'est encore rattaché à aucun groupe. Ajoutez la ligne correspondante dans teacher_cohorts depuis le dashboard Neon."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Séances</h1>
          <p className="text-sm text-muted-foreground">Au {formatFullDate(todayDate)}</p>
        </div>
        <NewSessionDialog cohorts={cohorts} />
      </div>

      <Card className="overflow-hidden border-primary/30">
        <CardContent className="flex items-center gap-4 py-1">
          <div className="flex w-20 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-3 text-primary">
            <span className="text-[0.7rem] uppercase tracking-wide">
              {formatMonth(todayDate)}
            </span>
            <span className="text-3xl font-bold leading-none">{today.day}</span>
            <span className="text-[0.7rem]">{today.year}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize">{formatFullDate(todayDate)}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {weekdayLabel(today.weekday)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {cohorts.map((cohort) => {
                const schedule = scheduleLabel(cohort);
                return schedule ? (
                  <Badge key={cohort.id} variant="secondary" className="h-6 gap-1 px-2 text-[0.7rem]">
                    <Clock className="size-3" />
                    {cohort.name} · {schedule}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 text-primary" />
          Séance du jour
        </h2>
        {todaysSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            <p>Aucune séance prévue aujourd&apos;hui.</p>
            {nextSession ? (
              <p className="mt-1 text-xs">
                Prochaine séance :{" "}
                <Link
                  href={`/seances/${nextSession.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {nextSession.cohort_name} — {formatFullDate(nextSession.starts_at)} à{" "}
                  {formatTimeInZone(nextSession.starts_at)}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysSessions.map((session) => (
              <li key={session.id}>
                <SessionRow session={session} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" />
            Séances passées
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {cohorts.map((cohort) => {
              const stats = guardianStats.find(([id]) => id === cohort.id)?.[1];
              return (
                <Badge key={cohort.id} variant="outline" className="h-6 gap-1 px-2 text-[0.7rem]">
                  <Users className="size-3" />
                  {cohort.name} · {cohort.student_count} élèves
                  {stats ? ` · ${stats.linked}/${stats.total} liés` : ""}
                </Badge>
              );
            })}
          </div>
        </div>

        {pastSessions.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Aucune séance passée.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pastSessions.map((session) => (
              <li key={session.id}>
                <SessionRow session={session} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {cohorts.every((cohort) => cohort.student_count === 0) ? (
        <Button asChild variant="outline" className="w-full">
          <Link href="/eleves">
            <Plus />
            Ajouter les élèves du groupe
          </Link>
        </Button>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <CalendarClock className="size-3" />
        Horaires affichés en heure de Paris (Europe/Paris).
      </p>
    </div>
  );
}
