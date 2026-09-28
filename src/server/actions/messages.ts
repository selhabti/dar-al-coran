"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCohortAccess, requireSessionAccess, requireStudentAccess } from "@/lib/data/access";
import { getStudentsForSession, getStudentWithGuardians } from "@/lib/data/students";
import { getSql } from "@/lib/db";
import { firstNameOf, formatFullDate } from "@/lib/format";
import { requireTeacher } from "@/lib/session";
import { dispatchBatch } from "@/lib/telegram/send";
import {
  ATTENDANCE_LABELS,
  VALIDATION_LABELS,
  renderTemplate,
  type TemplateVariables,
} from "@/lib/templates";
import type { Attendance, Session, Teacher } from "@/lib/types";

export type SendResultPayload = {
  ok: boolean;
  error?: string;
  batch?: {
    batchId: string;
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    items: {
      id: string;
      studentName: string;
      guardianName: string | null;
      status: string;
      error: string | null;
    }[];
  };
};

function buildVariables(input: {
  student: { first_name: string; last_name: string };
  guardianName: string | null;
  attendance: Attendance;
  validated: boolean | null;
  comment: string | null;
  session: Session | null;
  cohortName: string;
  teacher: Teacher;
}): TemplateVariables {
  const comment = input.comment?.trim() ?? "";
  return {
    student_first_name: input.student.first_name,
    student_last_name: input.student.last_name,
    parent_name: firstNameOf(input.guardianName),
    attendance_label: ATTENDANCE_LABELS[input.attendance] ?? ATTENDANCE_LABELS.inconnu,
    validation_label:
      input.validated === null || input.validated === undefined
        ? VALIDATION_LABELS.none
        : input.validated
          ? VALIDATION_LABELS.true
          : VALIDATION_LABELS.false,
    comment,
    comment_line: comment ? `- Commentaire : ${comment}` : "",
    session_date: input.session ? formatFullDate(input.session.starts_at) : "",
    session_title: input.session?.title ?? "",
    cohort_name: input.cohortName,
    teacher_first_name: firstNameOf(input.teacher.full_name),
    teacher_full_name: input.teacher.full_name,
  };
}

const groupSchema = z.object({
  sessionId: z.string().uuid(),
  body: z.string().trim().min(1, "Le message ne peut pas etre vide").max(4000),
  filter: z.enum(["tous", "pointes", "absents"]).default("tous"),
  studentIds: z.array(z.string().uuid()).optional(),
});

export async function sendGroupMessagesAction(input: unknown): Promise<SendResultPayload> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  const teacher = await requireTeacher();
  const session = await requireSessionAccess(teacher.id, parsed.data.sessionId);
  const cohort = await requireCohortAccess(teacher.id, session.cohort_id);

  const rows = (await getStudentsForSession(session.id)) as unknown as {
    student_id: string;
    first_name: string;
    last_name: string;
    attendance: Attendance;
    validated: boolean | null;
    comment: string | null;
  }[];

  const students = await getStudentWithGuardiansForCohort(session.cohort_id);

  const wanted = parsed.data.studentIds ? new Set(parsed.data.studentIds) : null;
  const messages = [];

  for (const row of rows) {
    const student = students.get(row.student_id);
    if (!student) continue;
    if (wanted && !wanted.has(row.student_id)) continue;
    if (parsed.data.filter === "pointes" && !["present", "retard"].includes(row.attendance)) {
      continue;
    }
    if (
      parsed.data.filter === "absents" &&
      !["absent_justifie", "absent_non_justifie"].includes(row.attendance)
    ) {
      continue;
    }

    for (const guardian of student.guardians) {
      const variables = buildVariables({
        student: { first_name: row.first_name, last_name: row.last_name },
        guardianName: guardian.full_name,
        attendance: row.attendance ?? "inconnu",
        validated: row.validated,
        comment: row.comment,
        session,
        cohortName: cohort.name,
        teacher,
      });
      messages.push({
        studentId: row.student_id,
        guardianId: guardian.id,
        chatId: guardian.telegram_chat_id,
        body: renderTemplate(parsed.data.body, variables),
      });
    }
  }

  if (messages.length === 0) {
    return { ok: false, error: "Aucun destinataire pour ces criteres" };
  }

  const summary = await dispatchBatch({
    kind: "groupe",
    cohortId: cohort.id,
    sessionId: session.id,
    messages,
  });

  revalidatePath("/messages");
  revalidatePath(`/seances/${session.id}/messages`);

  return {
    ok: true,
    batch: {
      batchId: summary.batchId,
      total: summary.total,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
      items: summary.messages.map((message) => {
        const extended = message as typeof message & {
          first_name: string | null;
          last_name: string | null;
          guardian_name: string | null;
        };
        return {
          id: message.id,
          studentName:
            extended.first_name && extended.last_name
              ? `${extended.first_name} ${extended.last_name}`
              : "Eleve",
          guardianName: extended.guardian_name,
          status: message.status,
          error: message.error,
        };
      }),
    },
  };
}

const directSchema = z.object({
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
  body: z.string().trim().min(1, "Le message ne peut pas etre vide").max(4000),
  sessionId: z.string().uuid().optional(),
});

export async function sendDirectMessageAction(input: unknown): Promise<SendResultPayload> {
  const parsed = directSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  const teacher = await requireTeacher();
  const student = await requireStudentAccess(teacher.id, parsed.data.studentId);
  const cohort = await requireCohortAccess(teacher.id, student.cohort_id);
  const full = await getStudentWithGuardians(parsed.data.studentId);
  const guardian = full.guardians.find((item) => item.id === parsed.data.guardianId);
  if (!guardian) return { ok: false, error: "Parent introuvable" };

  let session: Session | null = null;
  let entry: { attendance: Attendance; validated: boolean | null; comment: string | null } | null = null;

  if (parsed.data.sessionId) {
    session = await requireSessionAccess(teacher.id, parsed.data.sessionId);
    const rows = await getSql()`
      select attendance, validated, comment
      from session_entries
      where session_id = ${session.id} and student_id = ${student.id}
    `;
    entry =
      (rows[0] as unknown as {
        attendance: Attendance;
        validated: boolean | null;
        comment: string | null;
      }) ?? null;
  }

  const variables = buildVariables({
    student: { first_name: student.first_name, last_name: student.last_name },
    guardianName: guardian.full_name,
    attendance: entry?.attendance ?? "inconnu",
    validated: entry?.validated ?? null,
    comment: entry?.comment ?? null,
    session,
    cohortName: cohort.name,
    teacher,
  });

  const summary = await dispatchBatch({
    kind: "direct",
    cohortId: cohort.id,
    sessionId: session?.id ?? null,
    messages: [
      {
        studentId: student.id,
        guardianId: guardian.id,
        chatId: guardian.telegram_chat_id,
        body: renderTemplate(parsed.data.body, variables),
      },
    ],
  });

  revalidatePath("/messages");
  revalidatePath(`/eleves/${student.id}`);

  return {
    ok: true,
    batch: {
      batchId: summary.batchId,
      total: summary.total,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
      items: summary.messages.map((message) => ({
        id: message.id,
        studentName: `${student.first_name} ${student.last_name}`,
        guardianName: guardian.full_name,
        status: message.status,
        error: message.error,
      })),
    },
  };
}

async function getStudentWithGuardiansForCohort(cohortId: string) {
  const rows = await getSql()`
    select
      s.id,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', g.id,
              'student_id', g.student_id,
              'full_name', g.full_name,
              'relation', g.relation,
              'phone', g.phone,
              'is_primary', g.is_primary,
              'telegram_chat_id', g.telegram_chat_id,
              'telegram_username', g.telegram_username,
              'link_code', g.link_code,
              'linked_at', g.linked_at
            )
            order by g.is_primary desc, g.created_at
          )
          from guardians g
          where g.student_id = s.id
        ),
        '[]'::json
      ) as guardians
    from students s
    where s.cohort_id = ${cohortId} and s.active
  `;
  const map = new Map<string, { guardians: { id: string; full_name: string; telegram_chat_id: string | null }[] }>();
  for (const row of rows as unknown as { id: string; guardians: { id: string; full_name: string; telegram_chat_id: string | null }[] }[]) {
    map.set(row.id, { guardians: row.guardians ?? [] });
  }
  return map;
}
