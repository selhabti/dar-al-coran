import Link from "next/link";
import { Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listMessageHistory } from "@/lib/data/messages";
import { listCohortsForTeacher } from "@/lib/data/cohorts";
import { formatDateTime } from "@/lib/format";
import { requireTeacher } from "@/lib/session";
import type { MessageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<MessageStatus, string> = {
  en_attente: "En attente",
  envoye: "Envoyé",
  echec: "Échec",
  ignore: "Ignoré",
};

export default async function MessagesPage() {
  const teacher = await requireTeacher();
  const cohorts = await listCohortsForTeacher(teacher.id);
  const cohortIds = cohorts.map((cohort) => cohort.id);
  const messages = await listMessageHistory(cohortIds);

  if (cohorts.length === 0) {
    return (
      <EmptyState
        title="Aucun groupe"
        description="Votre compte n'est encore rattaché à aucun groupe."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {messages.length > 0
            ? `${messages.length} message(s) récent(s)`
            : "Aucun message envoyé"}
        </p>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          title="Aucun message"
          description="Les messages envoyés depuis une séance ou une fiche élève apparaîtront ici."
          icon={Send}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.map((message) => {
            const failed = message.status === "echec";
            const skipped = message.status === "ignore";
            return (
              <li key={message.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-2 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {message.student_id ? (
                            <Link
                              href={`/eleves/${message.student_id}`}
                              className="transition-colors hover:text-primary"
                            >
                              {message.student_name ?? "Élève"}
                            </Link>
                          ) : (
                            (message.student_name ?? "Message de groupe")
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {message.guardian_name ? <span>{message.guardian_name}</span> : null}
                          {message.cohort_name ? <span>· {message.cohort_name}</span> : null}
                          {message.session_title ? <span>· {message.session_title}</span> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant={failed ? "destructive" : skipped ? "outline" : "secondary"}
                        >
                          {STATUS_LABELS[message.status] ?? message.status}
                        </Badge>
                        <span className="text-[0.7rem] text-muted-foreground">
                          {formatDateTime(message.sent_at ?? message.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {message.body}
                    </p>
                    {message.error ? (
                      <p className="text-xs text-destructive">{message.error}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
