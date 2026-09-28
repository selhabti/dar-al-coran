import "server-only";

import { getSql } from "@/lib/db";
import type { Attendance, Guardian, Student, StudentHistoryRow } from "@/lib/types";

export interface StudentWithGuardians extends Student {
  guardians: Guardian[];
}

export interface SessionRosterRow {
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

export async function listStudents(cohortId: string): Promise<StudentWithGuardians[]> {
  const rows = await getSql()`
    select
      s.id, s.cohort_id, s.first_name, s.last_name, s.birthdate, s.city, s.email, s.phone, s.active,
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
    order by s.last_name, s.first_name
  `;

  return (rows as unknown as (Student & { guardians: Guardian[] })[]).map((row) => ({
    ...row,
    guardians: row.guardians ?? [],
  }));
}

export async function getStudentWithGuardians(studentId: string): Promise<StudentWithGuardians> {
  const rows = await getSql()`
    select
      s.id, s.cohort_id, s.first_name, s.last_name, s.birthdate, s.city, s.email, s.phone, s.active,
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
    where s.id = ${studentId}
  `;
  const row = rows[0] as unknown as (Student & { guardians: Guardian[] }) | undefined;
  if (!row) throw new Error("Eleve introuvable");
  return { ...row, guardians: row.guardians ?? [] };
}

export async function getStudentHistory(studentId: string): Promise<StudentHistoryRow[]> {
  const rows = await getSql()`
    select
      s.id as session_id,
      s.starts_at,
      s.title,
      e.attendance,
      e.validated,
      e.comment
    from session_entries e
    join sessions s on s.id = e.session_id
    where e.student_id = ${studentId}
    order by s.starts_at desc
    limit 100
  `;
  return rows as unknown as StudentHistoryRow[];
}

export async function getStudentStats(studentId: string) {
  const rows = await getSql()`
    select
      count(*) filter (where e.attendance = 'present')::int as presents,
      count(*) filter (where e.attendance = 'retard')::int as retards,
      count(*) filter (where e.attendance in ('absent_justifie', 'absent_non_justifie'))::int as absences,
      count(*) filter (where e.attendance = 'absent_justifie')::int as absences_justifiees,
      count(*) filter (where e.attendance = 'absent_non_justifie')::int as absences_non_justifiees,
      count(*) filter (where e.validated is true)::int as validations_ok,
      count(*) filter (where e.validated is false)::int as validations_ko,
      count(*)::int as total
    from session_entries e
    where e.student_id = ${studentId}
  `;
  return (
    rows[0] as unknown as {
      presents: number;
      retards: number;
      absences: number;
      absences_justifiees: number;
      absences_non_justifiees: number;
      validations_ok: number;
      validations_ko: number;
      total: number;
    }
  ) ?? {
    presents: 0,
    retards: 0,
    absences: 0,
    absences_justifiees: 0,
    absences_non_justifiees: 0,
    validations_ok: 0,
    validations_ko: 0,
    total: 0,
  };
}

export async function getStudentsForSession(sessionId: string): Promise<SessionRosterRow[]> {
  const rows = await getSql()`
    select
      s.id as session_id,
      s.cohort_id,
      s.teacher_id,
      s.title,
      s.starts_at,
      s.duration_minutes,
      s.status,
      s.closed_at,
      st.id as student_id,
      st.first_name,
      st.last_name,
      st.city,
      st.email,
      st.phone,
      e.attendance,
      e.validated,
      e.comment
    from sessions s
    join students st on st.cohort_id = s.cohort_id and st.active
    left join session_entries e on e.student_id = st.id and e.session_id = s.id
    where s.id = ${sessionId}
    order by st.last_name, st.first_name
  `;
  return rows as unknown as SessionRosterRow[];
}
