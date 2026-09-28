import Link from "next/link";
import { UserRound } from "lucide-react";
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

  const rows = groups.flatMap((group) =>
    group.students.map((student) => ({ student, cohortName: group.cohort.name })),
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
          <h1 className="text-xl font-bold tracking-tight">Élèves</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length > 0 ? `${rows.length} élève(s)` : "Aucun élève"}
          </p>
        </div>
        <AddStudentDialog cohorts={cohorts} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun élève"
          description="Ajoutez les élèves de vos groupes pour commencer le suivi des présences."
          icon={UserRound}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {rows.map(({ student, cohortName }) => (
              <Link
                key={student.id}
                href={`/eleves/${student.id}`}
                className="rounded-2xl border bg-card p-3 shadow-sm transition-all hover:shadow active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {student.last_name} {student.first_name}
                  </span>
                  <Badge variant="secondary">{cohortName}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {student.city ? <span>{student.city}</span> : null}
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="hover:text-foreground">
                      {student.phone}
                    </a>
                  ) : null}
                  {student.email ? (
                    <a href={`mailto:${student.email}`} className="hover:text-foreground">
                      {student.email}
                    </a>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Prénom</th>
                  <th className="px-3 py-2 font-medium">Ville</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Téléphone</th>
                  <th className="px-3 py-2 font-medium">Groupe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, cohortName }) => (
                  <tr
                    key={student.id}
                    className="border-t transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/eleves/${student.id}`}
                        className="font-medium transition-colors hover:text-primary"
                      >
                        {student.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{student.first_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{student.city ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.email ? (
                        <a href={`mailto:${student.email}`} className="hover:text-foreground">
                          {student.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.phone ? (
                        <a href={`tel:${student.phone}`} className="hover:text-foreground">
                          {student.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted-foreground">{cohortName}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}
    </div>
  );
}
