"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  listCohortIdsForTeacher,
  requireGuardianAccess,
  requireStudentAccess,
} from "@/lib/data/access";
import {
  addGuardian,
  addStudent,
  archiveStudent,
  regenerateLinkCode,
  removeGuardian,
  unlinkGuardian,
  updateGuardian,
  updateStudent,
} from "@/lib/data/guardians";
import { requireTeacher } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Operation impossible" };
}

const studentSchema = z.object({
  cohortId: z.string().uuid(),
  firstName: z.string().trim().min(1, "Prenom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function addStudentAction(input: unknown): Promise<ActionResult> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  try {
    const teacher = await requireTeacher();
    const cohortIds = await listCohortIdsForTeacher(teacher.id);
    if (!cohortIds.includes(parsed.data.cohortId)) return { ok: false, error: "Groupe non autorise" };
    await addStudent(parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/eleves");
  return { ok: true };
}

const updateStudentSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function updateStudentAction(input: unknown): Promise<ActionResult> {
  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  try {
    const teacher = await requireTeacher();
    await requireStudentAccess(teacher.id, parsed.data.studentId);
    await updateStudent(parsed.data.studentId, parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/eleves");
  revalidatePath(`/eleves/${parsed.data.studentId}`);
  return { ok: true };
}

export async function archiveStudentAction(studentId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    await requireStudentAccess(teacher.id, studentId);
    await archiveStudent(studentId);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/eleves");
  return { ok: true };
}

const guardianSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().trim().min(1, "Nom du parent requis").max(120),
  relation: z.string().trim().max(40).nullable(),
});

export async function addGuardianAction(input: unknown): Promise<ActionResult> {
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  try {
    const teacher = await requireTeacher();
    await requireStudentAccess(teacher.id, parsed.data.studentId);
    await addGuardian(parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/eleves/${parsed.data.studentId}`);
  return { ok: true };
}

const updateGuardianSchema = z.object({
  guardianId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  relation: z.string().trim().max(40).nullable(),
});

export async function updateGuardianAction(input: unknown): Promise<ActionResult> {
  const parsed = updateGuardianSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Donnees invalides" };

  try {
    const teacher = await requireTeacher();
    const studentId = await requireGuardianAccess(teacher.id, parsed.data.guardianId);
    await updateGuardian(parsed.data.guardianId, parsed.data);
    revalidatePath(`/eleves/${studentId}`);
  } catch (error) {
    return fail(error);
  }
  return { ok: true };
}

export async function removeGuardianAction(guardianId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const studentId = await requireGuardianAccess(teacher.id, guardianId);
    await removeGuardian(guardianId);
    revalidatePath(`/eleves/${studentId}`);
  } catch (error) {
    return fail(error);
  }
  return { ok: true };
}

export async function regenerateLinkCodeAction(guardianId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const studentId = await requireGuardianAccess(teacher.id, guardianId);
    await regenerateLinkCode(guardianId);
    revalidatePath(`/eleves/${studentId}`);
  } catch (error) {
    return fail(error);
  }
  return { ok: true };
}

export async function unlinkGuardianAction(guardianId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const studentId = await requireGuardianAccess(teacher.id, guardianId);
    await unlinkGuardian(guardianId);
    revalidatePath(`/eleves/${studentId}`);
  } catch (error) {
    return fail(error);
  }
  return { ok: true };
}
