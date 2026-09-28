"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Loader2, Lock, Send, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import {
  saveEntryAction,
  setSessionStatusAction,
  setSessionVerseAction,
} from "@/server/actions/sessions";
import { sendGroupMessagesAction, type SendResultPayload } from "@/server/actions/messages";
import { SessionClock } from "@/components/session-clock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeInZone, formatTimeInZone } from "@/lib/format";
import { SURAHS } from "@/lib/surahs";
import type { Attendance, MessageTemplate, Session, SessionStatus } from "@/lib/types";

interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  attendance: Attendance | null;
  validated: boolean | null;
  comment: string | null;
}

interface EntryState {
  attendance: Attendance;
  validated: boolean | null;
  comment: string;
}

const ATTENDANCE_CLASS: Record<Attendance, string> = {
  inconnu: "border-border text-muted-foreground",
  present: "border-success/50 bg-success/15 text-success",
  retard: "border-warning/50 bg-warning/15 text-warning",
  absent_justifie: "border-primary/50 bg-primary/15 text-primary",
  absent_non_justifie: "border-destructive/50 bg-destructive/15 text-destructive",
};

const ATTENDANCE_CHOICES: { value: Attendance; label: string }[] = [
  { value: "inconnu", label: "Non renseigné" },
  { value: "present", label: "Présent" },
  { value: "retard", label: "Retard" },
  { value: "absent_justifie", label: "Absent justifié" },
  { value: "absent_non_justifie", label: "Absent non justifié" },
];

const FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "pointes", label: "Pointés" },
  { value: "absents", label: "Absents" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function isMarked(attendance: Attendance): boolean {
  return attendance === "present" || attendance === "retard";
}

function isAbsent(attendance: Attendance): boolean {
  return attendance === "absent_justifie" || attendance === "absent_non_justifie";
}

export function SessionPanel({
  session,
  cohortName,
  roster,
  templates,
  telegramReady,
  isUpcoming,
}: {
  session: Session;
  cohortName: string;
  roster: RosterRow[];
  templates: MessageTemplate[];
  telegramReady: boolean;
  isUpcoming: boolean;
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

  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");
  const [sendPending, startSend] = useTransition();
  const [result, setResult] = useState<SendResultPayload["batch"] | null>(null);

  const [surah, setSurah] = useState(session.last_surah ?? "");
  const [ayah, setAyah] = useState(session.last_ayah ? String(session.last_ayah) : "");
  const [versePending, startVerse] = useTransition();

  const isOpen = status === "ouverte";

  const scheduleStatus = useMemo(() => {
    if (status === "cloturee") return { label: "Clôturée", variant: "secondary" as const };
    if (isUpcoming) return { label: "À venir", variant: "outline" as const };
    return { label: "En cours", variant: "default" as const };
  }, [status, isUpcoming]);

  const stats = useMemo(() => {
    let marked = 0;
    let present = 0;
    let absent = 0;
    for (const entry of entries.values()) {
      if (isMarked(entry.attendance)) marked += 1;
      if (entry.attendance === "present") present += 1;
      if (isAbsent(entry.attendance)) absent += 1;
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
    const validated = isAbsent(value) ? false : current.validated;
    void persist(studentId, { ...current, attendance: value, validated });
  }

  function setValidated(studentId: string, value: boolean | null) {
    const current = entries.get(studentId);
    if (!current) return;
    void persist(studentId, { ...current, validated: value });
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

  function saveVerse() {
    const ayahNumber = ayah.trim() === "" ? null : Number.parseInt(ayah, 10);
    if (ayahNumber !== null && (!Number.isFinite(ayahNumber) || ayahNumber < 1)) {
      toast.error("Numéro de verset invalide");
      return;
    }
    startVerse(async () => {
      const response = await setSessionVerseAction({
        sessionId: session.id,
        surah: surah.trim() || null,
        ayah: ayahNumber,
      });
      if (!response.ok) {
        toast.error(response.error ?? "Enregistrement impossible");
        return;
      }
      toast.success("Dernier verset enregistré");
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

  const endTime = session.ends_at
    ? formatTimeInZone(session.ends_at)
    : session.duration_minutes
      ? formatTimeInZone(
          new Date(new Date(session.starts_at).getTime() + session.duration_minutes * 60000),
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">
              {session.title ?? `Séance du ${formatDateTimeInZone(session.starts_at)}`}
            </CardTitle>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{cohortName}</span>
              <span>·</span>
              <span>
                {formatDateTimeInZone(session.starts_at)}
                {endTime ? ` – ${endTime}` : ""} (heure de Paris)
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant={scheduleStatus.variant}>{scheduleStatus.label}</Badge>
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

      <SessionClock startsAt={session.starts_at} endsAt={session.ends_at} />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Élève</th>
                <th className="px-3 py-2 font-medium">Ville</th>
                <th className="px-3 py-2 font-medium">Téléphone</th>
                <th className="px-3 py-2 font-medium">Présence</th>
                <th className="px-3 py-2 font-medium">Cours validé</th>
                <th className="px-3 py-2 font-medium">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Aucun élève actif dans ce groupe.
                  </td>
                </tr>
              ) : (
                roster.map((student) => {
                  const entry = entries.get(student.student_id);
                  if (!entry) return null;
                  const isSaving = saving.has(student.student_id);
                  return (
                    <tr key={student.student_id} className="border-t align-middle">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">
                            {student.last_name} {student.first_name}
                          </span>
                          {isSaving ? (
                            <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{student.city ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{student.phone ?? "—"}</td>
                      <td className="px-3 py-2">
                        <select
                          value={entry.attendance}
                          onChange={(event) =>
                            setAttendance(student.student_id, event.target.value as Attendance)
                          }
                          className={`h-8 rounded-lg border px-2 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${ATTENDANCE_CLASS[entry.attendance]}`}
                        >
                          {ATTENDANCE_CHOICES.map((choice) => (
                            <option key={choice.value} value={choice.value}>
                              {choice.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-pressed={entry.validated === true}
                            onClick={() =>
                              setValidated(student.student_id, entry.validated === true ? null : true)
                            }
                            className={`flex size-7 items-center justify-center rounded-lg border transition-colors ${
                              entry.validated === true
                                ? "border-success/50 bg-success/15 text-success"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                            title="Cours validé"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-pressed={entry.validated === false}
                            onClick={() =>
                              setValidated(student.student_id, entry.validated === false ? null : false)
                            }
                            className={`flex size-7 items-center justify-center rounded-lg border transition-colors ${
                              entry.validated === false
                                ? "border-destructive/50 bg-destructive/15 text-destructive"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                            title="Cours non validé"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          defaultValue={entry.comment}
                          maxLength={1000}
                          placeholder="Observation…"
                          className="h-8 min-w-[180px]"
                          onBlur={(event) => {
                            const value = event.target.value;
                            if (value.trim() === entry.comment.trim()) return;
                            void persist(student.student_id, { ...entry, comment: value });
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Fin de séance — dernier verset étudié
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verse-surah">Sourate</Label>
              <Input
                id="verse-surah"
                list="surah-list"
                value={surah}
                placeholder="Ex : Al-Mulk"
                onChange={(event) => setSurah(event.target.value)}
              />
              <datalist id="surah-list">
                {SURAHS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verse-ayah">N° du verset</Label>
              <Input
                id="verse-ayah"
                type="number"
                min={1}
                max={1000}
                value={ayah}
                placeholder="Ex : 30"
                onChange={(event) => setAyah(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {session.last_surah
                ? `Enregistré : ${session.last_surah}${session.last_ayah ? ` — verset ${session.last_ayah}` : ""}`
                : "Aucun verset enregistré pour cette séance."}
            </p>
            <Button onClick={saveVerse} disabled={versePending}>
              {versePending ? <Loader2 className="animate-spin" /> : <Check />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

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
