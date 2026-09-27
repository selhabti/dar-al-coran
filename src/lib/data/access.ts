import "server-only";

import { notFound } from "next/navigation";
import { getSql } from "@/lib/db";
import type { Cohort, Session, Student } from "@/lib/types";

export async function listCohortIdsForTeacher(teacherId: string): Promise<string[]> {
  const rows = await getSql()`
    select cohort_id from teacher_cohorts where teacher_id = ${teacherId}
  `;
  return rows.map((row) => row.cohort_id as string);
}

export async function requireCohortAccess(teacherId: string, cohortId: string): Promise<Cohort> {
  const rows = await getSql()`
    select c.id, c.name, c.level, c.subject, c.slot_label, c.active
    from cohorts c
    join teacher_cohorts tc on tc.cohort_id = c.id
    where tc.teacher_id = ${teacherId} and c.id = ${cohortId}
  `;
  const cohort = rows[0] as unknown as Cohort | undefined;
  if (!cohort) notFound();
  return cohort;
}

export async function requireStudentAccess(teacherId: string, studentId: string) {
  const cohortIds = await listCohortIdsForTeacher(teacherId);
  if (cohortIds.length === 0) notFound();

  const rows = await getSql()`
    select s.id, s.cohort_id, s.first_name, s.last_name, s.birthdate, s.active
    from students s
    where s.id = ${studentId} and s.cohort_id = any(${cohortIds}::uuid[])
  `;
  const student = rows[0] as unknown as Student | undefined;
  if (!student) notFound();
  return student;
}

export async function requireSessionAccess(teacherId: string, sessionId: string): Promise<Session> {
  const cohortIds = await listCohortIdsForTeacher(teacherId);
  if (cohortIds.length === 0) notFound();

  const rows = await getSql()`
    select s.id, s.cohort_id, s.teacher_id, s.title, s.starts_at, s.duration_minutes, s.status, s.closed_at
    from sessions s
    where s.id = ${sessionId} and s.cohort_id = any(${cohortIds}::uuid[])
  `;
  const session = rows[0] as unknown as Session | undefined;
  if (!session) notFound();
  return session;
}

export async function requireGuardianAccess(teacherId: string, guardianId: string): Promise<string> {
  const cohortIds = await listCohortIdsForTeacher(teacherId);
  if (cohortIds.length === 0) notFound();

  const rows = await getSql()`
    select g.student_id
    from guardians g
    join students s on s.id = g.student_id
    where g.id = ${guardianId} and s.cohort_id = any(${cohortIds}::uuid[])
  `;
  const owner = rows[0] as unknown as { student_id: string } | undefined;
  if (!owner) notFound();
  return owner.student_id;
}
