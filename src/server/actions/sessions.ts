"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCohortAccess } from "@/lib/data/access";
import { closeSession, createSession, reopenSession, saveEntry } from "@/lib/data/sessions";
import { requireTeacher } from "@/lib/session";
import { requireSessionAccess } from "@/lib/data/access";

const attendanceValues = ["present", "retard", "absent", "exempt", "inconnu"] as const;

const entrySchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  attendance: z.enum(attendanceValues),
  validated: z.boolean().nullable(),
  comment: z.string().max(1000).nullable(),
});

export type SaveEntryResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveEntryAction(input: unknown): Promise<SaveEntryResult> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides" };

  const teacher = await requireTeacher();
  try {
    await requireSessionAccess(teacher.id, parsed.data.sessionId);
    await saveEntry(parsed.data.sessionId, parsed.data.studentId, {
      attendance: parsed.data.attendance,
      validated: parsed.data.validated,
      comment: parsed.data.comment,
    });
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Enregistrement impossible" };
  }
}

const createSessionSchema = z.object({
  cohortId: z.string().uuid(),
  title: z.string().max(120).optional(),
  startsAt: z.string().min(1),
  durationMinutes: z.number().int().positive().max(600).nullable(),
});

export async function createSessionAction(input: unknown): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides" };

  const teacher = await requireTeacher();
  await requireCohortAccess(teacher.id, parsed.data.cohortId);

  const created = await createSession({
    cohortId: parsed.data.cohortId,
    teacherId: teacher.id,
    title: parsed.data.title?.trim() || null,
    startsAt: parsed.data.startsAt,
    durationMinutes: parsed.data.durationMinutes,
  });

  revalidatePath("/seances");
  return { ok: true, sessionId: created.id };
}

export async function setSessionStatusAction(
  sessionId: string,
  status: "ouverte" | "cloturee",
): Promise<{ ok: boolean; error?: string }> {
  const teacher = await requireTeacher();
  try {
    await requireSessionAccess(teacher.id, sessionId);
  } catch {
    return { ok: false, error: "Seance inaccessible" };
  }

  if (status === "cloturee") await closeSession(sessionId);
  else await reopenSession(sessionId);

  revalidatePath("/seances");
  revalidatePath(`/seances/${sessionId}`);
  return { ok: true };
}
