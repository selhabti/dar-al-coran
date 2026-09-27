import "server-only";

import { getSql } from "@/lib/db";
import type { Attendance, Session } from "@/lib/types";

export interface SessionListItem extends Session {
  cohort_name: string;
  present_count: number;
  total_count: number;
}

export async function listSessions(cohortIds: string[], limit = 50): Promise<SessionListItem[]> {
  if (cohortIds.length === 0) return [];

  const rows = await getSql()`
    select
      s.id, s.cohort_id, s.teacher_id, s.title, s.starts_at, s.duration_minutes, s.status, s.closed_at,
      c.name as cohort_name,
      (
        select count(*)::int
        from session_entries e
        join students st on st.id = e.student_id
        where e.session_id = s.id
          and st.active
          and e.attendance in ('present', 'retard', 'exempt')
      ) as present_count,
      (select count(*)::int from students st where st.cohort_id = s.cohort_id and st.active) as total_count
    from sessions s
    join cohorts c on c.id = s.cohort_id
    where s.cohort_id = any(${cohortIds}::uuid[])
    order by s.starts_at desc
    limit ${limit}
  `;
  return rows as unknown as SessionListItem[];
}

export async function listOpenSessions(cohortIds: string[]): Promise<Session[]> {
  if (cohortIds.length === 0) return [];
  const rows = await getSql()`
    select s.id, s.cohort_id, s.teacher_id, s.title, s.starts_at, s.duration_minutes, s.status, s.closed_at
    from sessions s
    where s.cohort_id = any(${cohortIds}::uuid[]) and s.status = 'ouverte'
    order by s.starts_at desc
  `;
  return rows as unknown as Session[];
}

export async function createSession(input: {
  cohortId: string;
  teacherId: string;
  title: string | null;
  startsAt: string;
  durationMinutes: number | null;
}): Promise<Session> {
  const rows = await getSql()`
    insert into sessions (cohort_id, teacher_id, title, starts_at, duration_minutes)
    values (${input.cohortId}, ${input.teacherId}, ${input.title}, ${input.startsAt}, ${input.durationMinutes})
    returning id, cohort_id, teacher_id, title, starts_at, duration_minutes, status, closed_at
  `;
  return rows[0] as unknown as Session;
}

export async function closeSession(sessionId: string) {
  const rows = await getSql()`
    update sessions
    set status = 'cloturee', closed_at = now()
    where id = ${sessionId} and status = 'ouverte'
    returning id
  `;
  return rows.length > 0;
}

export async function reopenSession(sessionId: string) {
  const rows = await getSql()`
    update sessions
    set status = 'ouverte', closed_at = null
    where id = ${sessionId} and status = 'cloturee'
    returning id
  `;
  return rows.length > 0;
}

export async function saveEntry(
  sessionId: string,
  studentId: string,
  state: { attendance: Attendance; validated: boolean | null; comment: string | null },
) {
  const rows = await getSql()`
    insert into session_entries (session_id, student_id, attendance, validated, comment, marked_at, updated_at)
    values (${sessionId}, ${studentId}, ${state.attendance}, ${state.validated}, ${state.comment}, now(), now())
    on conflict (session_id, student_id) do update set
      attendance = excluded.attendance,
      validated = excluded.validated,
      comment = excluded.comment,
      marked_at = now(),
      updated_at = now()
    returning id, session_id, student_id, attendance, validated, comment, marked_at, updated_at
  `;
  return rows[0];
}
