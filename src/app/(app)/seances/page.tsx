import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus, Users } from "lucide-react";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { countLinkedGuardians, listCohortsForTeacher } from "@/lib/data/cohorts";
import { listSessions } from "@/lib/data/sessions";
import { formatDateTime, formatTime } from "@/lib/format";
import { requireTeacher } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const teacher = await requireTeacher();
  const cohorts = await listCohortsForTeacher(teacher.id);
  const cohortIds = cohorts.map((cohort) => cohort.id);
  const sessions = await listSessions(cohortIds);
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
          <p className="text-sm text-muted-foreground">
            {sessions.length > 0 ? `${sessions.length} séance(s) enregistrée(s)` : "Aucune séance"}
          </p>
        </div>
        <NewSessionDialog cohorts={cohorts} />
      </div>

      {cohorts.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {cohorts.map((cohort) => {
            const stats = guardianStats.find(([id]) => id === cohort.id)?.[1];
            return (
              <Badge key={cohort.id} variant="secondary" className="h-7 gap-1.5 px-2.5">
                <Users className="size-3" />
                {cohort.name} · {cohort.student_count} élèves
                {stats ? ` · ${stats.linked}/${stats.total} parents liés` : ""}
              </Badge>
            );
          })}
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance"
          description="Créez une séance pour pointer les présences et valider les cours."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => {
            const isOpen = session.status === "ouverte";
            const allPresent = session.total_count > 0 && session.present_count >= session.total_count;
            return (
              <li key={session.id}>
                <Card
                  className={`transition-colors hover:border-primary/40 ${isOpen ? "border-primary/40" : ""}`}
                >
                  <Link
                    href={`/seances/${session.id}`}
                    className="flex items-center gap-3 px-3 py-3"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted px-1 py-1.5">
                      <span className="text-[0.65rem] uppercase text-muted-foreground">
                        {formatTime(session.starts_at)}
                      </span>
                      <span className="text-sm font-semibold">
                        {new Date(session.starts_at).getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {session.title ?? `Séance du ${formatDateTime(session.starts_at)}`}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{session.cohort_name}</span>
                        <span>·</span>
                        <span>
                          {session.present_count}/{session.total_count} pointés
                        </span>
                      </p>
                    </div>

                    {isOpen ? (
                      <Badge className="shrink-0">En cours</Badge>
                    ) : allPresent ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-warning" />
                    )}
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {cohorts.every((cohort) => cohort.student_count === 0) ? (
        <Button asChild variant="outline" className="w-full">
          <Link href="/eleves">
            <Plus />
            Ajouter les élèves du groupe
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
