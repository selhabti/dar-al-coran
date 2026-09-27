import Link from "next/link";
import { ChevronRight, UserRound, Users } from "lucide-react";
import { AddStudentDialog } from "@/components/add-student-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listCohortsForTeacher } from "@/lib/data/cohorts";
import { listStudents } from "@/lib/data/students";
import { requireTeacher } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const teacher = await requireTeacher();
  const cohorts = await listCohortsForTeacher(teacher.id);
  const groups = await Promise.all(
    cohorts.map(async (cohort) => ({
      cohort,
      students: await listStudents(cohort.id),
    })),
  );
  const total = groups.reduce((sum, group) => sum + group.students.length, 0);

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
          <h1 className="text-lg font-semibold">Élèves</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} élève(s)` : "Aucun élève"}
          </p>
        </div>
        <AddStudentDialog cohorts={cohorts} />
      </div>

      {total === 0 ? (
        <EmptyState
          title="Aucun élève"
          description="Ajoutez les élèves de vos groupes pour commencer le suivi des présences."
          icon={UserRound}
        />
      ) : (
        groups.map((group) => (
          <section key={group.cohort.id} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-3.5" />
              {group.cohort.name}
              <span className="text-xs">· {group.students.length}</span>
            </h2>

            {group.students.length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Aucun élève dans ce groupe.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {group.students.map((student) => {
                  const linked = student.guardians.filter(
                    (guardian) => guardian.telegram_chat_id !== null,
                  ).length;
                  return (
                    <li key={student.id}>
                      <Card className="transition-colors hover:border-primary/40">
                        <Link
                          href={`/eleves/${student.id}`}
                          className="flex items-center gap-3 px-3 py-3"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                            {student.first_name.slice(0, 1)}
                            {student.last_name.slice(0, 1)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {student.guardians.length === 0
                                ? "Aucun parent"
                                : `${student.guardians.length} parent(s) · ${linked} lié(s) à Telegram`}
                            </span>
                          </span>
                          {student.guardians.length === 0 ? (
                            <Badge variant="outline" className="shrink-0 text-warning">
                              À compléter
                            </Badge>
                          ) : null}
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
