"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { saveEntryAction, setSessionStatusAction } from "@/server/actions/sessions";
import { sendGroupMessagesAction, type SendResultPayload } from "@/server/actions/messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import type { Attendance, MessageTemplate, Session, SessionStatus } from "@/lib/types";

interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  attendance: Attendance | null;
  validated: boolean | null;
  comment: string | null;
}

interface EntryState {
  attendance: Attendance;
  validated: boolean | null;
  comment: string;
}

const ATTENDANCE_OPTIONS: {
  value: Attendance;
  label: string;
  active: string;
}[] = [
  { value: "present", label: "Présent", active: "border-success/50 bg-success/15 text-success" },
  { value: "retard", label: "Retard", active: "border-warning/50 bg-warning/15 text-warning" },
  { value: "absent", label: "Absent", active: "border-destructive/50 bg-destructive/15 text-destructive" },
  { value: "exempt", label: "Exempt", active: "border-primary/50 bg-primary/15 text-primary" },
];

const FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "pointes", label: "Pointés" },
  { value: "absents", label: "Absents" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function isMarked(attendance: Attendance): boolean {
  return attendance === "present" || attendance === "retard" || attendance === "exempt";
}

export function SessionPanel({
  session,
  cohortName,
  roster,
  templates,
  telegramReady,
}: {
  session: Session;
  cohortName: string;
  roster: RosterRow[];
  templates: MessageTemplate[];
  telegramReady: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [statusPending, startStatus] = useTransition();

  const [entries, setEntries] = useState(() => {
    const map = new Map<string, EntryState>();
    for (const row of roster) {
      map.set(row.student_id, {
        attendance: row.attendance ?? "inconnu",
        validated: row.validated,
        comment: row.comment ?? "",
      });
    }
    return map;
  });
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");
  const [sendPending, startSend] = useTransition();
  const [result, setResult] = useState<SendResultPayload["batch"] | null>(null);

  const isOpen = status === "ouverte";

  const stats = useMemo(() => {
    let marked = 0;
    let present = 0;
    let absent = 0;
    for (const entry of entries.values()) {
      if (isMarked(entry.attendance)) marked += 1;
      if (entry.attendance === "present") present += 1;
      if (entry.attendance === "absent") absent += 1;
    }
    return { marked, present, absent, total: entries.size };
  }, [entries]);

  const recipientCount = useMemo(() => {
    if (filter === "pointes") return stats.marked;
    if (filter === "absents") return stats.absent;
    return stats.total;
  }, [filter, stats]);

  async function persist(studentId: string, next: EntryState) {
    setEntries((prev) => new Map(prev).set(studentId, next));
    setSaving((prev) => new Set(prev).add(studentId));
    const response = await saveEntryAction({
      sessionId: session.id,
      studentId,
      attendance: next.attendance,
      validated: next.validated,
      comment: next.comment.trim() === "" ? null : next.comment.trim(),
    });
    setSaving((prev) => {
      const copy = new Set(prev);
      copy.delete(studentId);
      return copy;
    });
    if (!response.ok) toast.error(response.error);
  }

  function setAttendance(studentId: string, value: Attendance) {
    const current = entries.get(studentId);
    if (!current) return;
    const validated = value === "absent" ? false : current.validated;
    void persist(studentId, { ...current, attendance: value, validated });
  }

  function setValidated(studentId: string, value: boolean | null) {
    const current = entries.get(studentId);
    if (!current) return;
    void persist(studentId, { ...current, validated: value });
  }

  function toggleComment(studentId: string) {
    setOpenComments((prev) => {
      const copy = new Set(prev);
      if (copy.has(studentId)) copy.delete(studentId);
      else copy.add(studentId);
      return copy;
    });
  }

  function toggleStatus() {
    const next = isOpen ? "cloturee" : "ouverte";
    startStatus(async () => {
      const response = await setSessionStatusAction(session.id, next);
      if (!response.ok) {
        toast.error(response.error ?? "Action impossible");
        return;
      }
      setStatus(next);
      toast.success(next === "cloturee" ? "Séance clôturée" : "Séance réouverte");
      router.refresh();
    });
  }

  function send() {
    if (!body.trim()) {
      toast.error("Le message est vide");
      return;
    }
    startSend(async () => {
      const response = await sendGroupMessagesAction({
        sessionId: session.id,
        body,
        filter,
      });
      if (!response.ok || !response.batch) {
        toast.error(response.error ?? "Envoi impossible");
        return;
      }
      setResult(response.batch);
      toast.success(
        `${response.batch.sent} message(s) envoyé(s)${response.batch.failed > 0 ? `, ${response.batch.failed} échec(s)` : ""}`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">
              {session.title ?? `Séance du ${formatDateTime(session.starts_at)}`}
            </CardTitle>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{cohortName}</span>
              <span>·</span>
              <span>{formatDateTime(session.starts_at)}</span>
              {session.duration_minutes ? (
                <>
                  <span>·</span>
                  <span>{session.duration_minutes} min</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant={isOpen ? "default" : "secondary"}>
              {isOpen ? "En cours" : "Clôturée"}
            </Badge>
            <Button variant="outline" size="sm" onClick={toggleStatus} disabled={statusPending}>
              {statusPending ? (
                <Loader2 className="animate-spin" />
              ) : isOpen ? (
                <Lock />
              ) : (
                <Unlock />
              )}
              {isOpen ? "Clôturer" : "Réouvrir"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">
              {stats.marked}/{stats.total} pointés
            </Badge>
            <Badge variant="secondary" className="text-success">
              {stats.present} présents
            </Badge>
            <Badge variant="secondary" className="text-destructive">
              {stats.absent} absents
            </Badge>
          </div>
        </CardContent>
      </Card>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun élève actif dans ce groupe.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {roster.map((student) => {
            const entry = entries.get(student.student_id);
            if (!entry) return null;
            const studentName = `${student.first_name} ${student.last_name}`;
            const isSaving = saving.has(student.student_id);
            const commentOpen = openComments.has(student.student_id);
            return (
              <li key={student.student_id} className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="flex items-center justify-between gap-2 px-3 pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{studentName}</span>
                    {isSaving ? (
                      <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={entry.validated === true}
                      onClick={() => setValidated(student.student_id, entry.validated === true ? null : true)}
                      className={`flex size-7 items-center justify-center rounded-lg border transition-colors ${
                        entry.validated === true
                          ? "border-success/50 bg-success/15 text-success"
                          : "border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                      title="Cours validé"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-pressed={entry.validated === false}
                      onClick={() => setValidated(student.student_id, entry.validated === false ? null : false)}
                      className={`flex size-7 items-center justify-center rounded-lg border transition-colors ${
                        entry.validated === false
                          ? "border-destructive/50 bg-destructive/15 text-destructive"
                          : "border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                      title="Cours non validé"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 px-3 py-2.5">
                  {ATTENDANCE_OPTIONS.map((option) => {
                    const active = entry.attendance === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAttendance(student.student_id, option.value)}
                        className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? option.active
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => toggleComment(student.student_id)}
                  className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MessageSquare className="size-3" />
                  {entry.comment ? "Modifier le commentaire" : "Ajouter un commentaire"}
                  <ChevronDown
                    className={`ml-auto size-3 transition-transform ${commentOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {commentOpen ? (
                  <div className="px-3 pb-3">
                    <Textarea
                      defaultValue={entry.comment}
                      rows={2}
                      maxLength={1000}
                      placeholder="Observation transmise au parent…"
                      onBlur={(event) => {
                        const value = event.target.value;
                        if (value.trim() === entry.comment.trim()) return;
                        void persist(student.student_id, { ...entry, comment: value });
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Envoyer un message aux parents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!telegramReady ? (
            <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning">
              Telegram non configuré (TELEGRAM_BOT_TOKEN absent). Les envois seront enregistrés mais
              échoueront.
            </p>
          ) : null}

          {templates.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compose-template">Modèle</Label>
              <select
                id="compose-template"
                value=""
                onChange={(event) => {
                  const chosen = templates.find((item) => item.id === event.target.value);
                  if (chosen) setBody(chosen.body);
                }}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Choisir un modèle…</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Bonjour {{parent_name}}, …"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-muted p-0.5">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filter === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {recipientCount} destinataire(s)
            </span>
            <Button className="ml-auto" onClick={send} disabled={sendPending}>
              {sendPending ? <Loader2 className="animate-spin" /> : <Send />}
              Envoyer
            </Button>
          </div>

          {result ? (
            <div className="rounded-lg border p-3 text-xs">
              <p className="font-medium">
                {result.sent} envoyé(s) · {result.failed} échec(s) · {result.skipped} ignoré(s)
              </p>
              {result.items.some((item) => item.status !== "envoye") ? (
                <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  {result.items
                    .filter((item) => item.status !== "envoye")
                    .map((item) => (
                      <li key={item.id} className="flex items-center gap-1.5">
                        <X className="size-3 shrink-0 text-destructive" />
                        <span className="font-medium">{item.studentName}</span>
                        {item.error ? <span>— {item.error}</span> : null}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
