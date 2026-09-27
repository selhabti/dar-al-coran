import Link from "next/link";
import { CalendarClock, ChevronLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { DirectMessageForm } from "@/components/direct-message-form";
import { GuardianManager } from "@/components/guardian-manager";
import { StudentActions } from "@/components/student-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCohortAccess, requireStudentAccess } from "@/lib/data/access";
import { listTemplates, listMessagesForStudent } from "@/lib/data/messages";
import { getStudentHistory, getStudentStats, getStudentWithGuardians } from "@/lib/data/students";
import { formatDateTime, formatFullDate } from "@/lib/format";
import { requireTeacher } from "@/lib/session";
import { ATTENDANCE_LABELS, VALIDATION_LABELS } from "@/lib/templates";
import { botUsername, telegramConfigured } from "@/lib/telegram/client";
import type { Attendance, MessageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<MessageStatus, string> = {
  en_attente: "En attente",
  envoye: "Envoyé",
  echec: "Échec",
  ignore: "Ignoré",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const student = await requireStudentAccess(teacher.id, id);
  const cohort = await requireCohortAccess(teacher.id, student.cohort_id);
  const [full, history, stats, templates, messages] = await Promise.all([
    getStudentWithGuardians(student.id),
    getStudentHistory(student.id),
    getStudentStats(student.id),
    listTemplates("direct"),
    listMessagesForStudent(student.id),
  ]);

  const messageRows = messages as unknown as {
    id: string;
    status: MessageStatus;
    body: string;
    sent_at: string | null;
    created_at: string;
    guardian_name: string | null;
    session_title: string | null;
    session_starts_at: string | null;
  }[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/eleves"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Élèves
        </Link>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">
                {student.first_name} {student.last_name}
              </CardTitle>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{cohort.name}</span>
                {student.birthdate ? (
                  <>
                    <span>·</span>
                    <span>Né(e) le {formatFullDate(student.birthdate)}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <StudentActions student={student} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold text-success">{stats.presents}</p>
              <p className="text-[0.7rem] text-muted-foreground">Présences</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold text-warning">{stats.retards}</p>
              <p className="text-[0.7rem] text-muted-foreground">Retards</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold text-destructive">{stats.absences}</p>
              <p className="text-[0.7rem] text-muted-foreground">Absences</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {stats.validations_ok} cours validé(s) · {stats.validations_ko} non validé(s) sur{" "}
            {stats.total} séance(s) renseignée(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Parents &amp; accès Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GuardianManager
            studentId={student.id}
            guardians={full.guardians}
            botUsername={botUsername()}
          />
        </CardContent>
      </Card>

      <DirectMessageForm
        studentId={student.id}
        guardians={full.guardians}
        templates={templates}
        telegramReady={telegramConfigured()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Historique des séances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune séance enregistrée.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {history.map((entry) => (
                <li
                  key={entry.session_id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {entry.title ?? formatDateTime(entry.starts_at)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(entry.starts_at)}
                      {entry.comment ? ` · ${entry.comment}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={entry.attendance === "absent" ? "destructive" : "secondary"}
                    >
                      {ATTENDANCE_LABELS[entry.attendance as Attendance] ?? entry.attendance}
                    </Badge>
                    {entry.validated !== null ? (
                      <span className="text-[0.7rem] text-muted-foreground">
                        Cours : {entry.validated ? VALIDATION_LABELS.true : VALIDATION_LABELS.false}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" />
            Messages envoyés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messageRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun message envoyé.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {messageRows.map((message) => (
                <li key={message.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(message.sent_at ?? message.created_at)}
                      {message.guardian_name ? ` · ${message.guardian_name}` : ""}
                    </span>
                    <Badge variant={message.status === "echec" ? "destructive" : "secondary"}>
                      {STATUS_LABELS[message.status] ?? message.status}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
