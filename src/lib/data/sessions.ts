import "server-only";

import { getSql } from "@/lib/db";
import type { Attendance, Session } from "@/lib/types";

export interface SessionListItem extends Session {
  cohort_name: string;
  present_count: number;
  total_count: number;
  is_upcoming: boolean;
  is_today: boolean;
}

export async function listSessions(cohortIds: string[], limit = 50): Promise<SessionListItem[]> {
  if (cohortIds.length === 0) return [];

  const rows = await getSql()`
    select
      s.id, s.cohort_id, s.teacher_id, s.title, s.starts_at, s.ends_at, s.duration_minutes,
      s.status, s.closed_at, s.last_surah, s.last_ayah,
      c.name as cohort_name,
      (s.starts_at > now()) as is_upcoming,
      ((s.starts_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date) as is_today,
      (
        select count(*)::int
        from session_entries e
        join students st on st.id = e.student_id
        where e.session_id = s.id
          and st.active
          and e.attendance in ('present', 'retard')
      ) as present_count,
      (select count(*)::int from students st where st.cohort_id = s.cohort_id and st.active) as total_count
    from sessions s
    join cohorts c on c.id = s.cohort_id
    where s.cohort_id = any(${cohortIds}::uuid[])
      and (
        s.starts_at <= now()
        or (s.starts_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date
      )
    order by s.starts_at desc
    limit ${limit}
  `;
  return rows as unknown as SessionListItem[];
}

export async function getNextSession(
  cohortIds: string[],
): Promise<{ id: string; starts_at: string; cohort_name: string } | null> {
  if (cohortIds.length === 0) return null;
  const rows = await getSql()`
    select s.id, s.starts_at, c.name as cohort_name
    from sessions s
    join cohorts c on c.id = s.cohort_id
    where s.cohort_id = any(${cohortIds}::uuid[]) and s.starts_at > now()
    order by s.starts_at asc
    limit 1
  `;
  return (
    (rows[0] as unknown as { id: string; starts_at: string; cohort_name: string } | undefined) ??
    null
  );
}

export async function listOpenSessions(cohortIds: string[]): Promise<Session[]> {
  if (cohortIds.length === 0) return [];
  const rows = await getSql()`
    select s.id, s.cohort_id, s.teacher_id, s.title, s.starts_at, s.ends_at, s.duration_minutes,
      s.status, s.closed_at, s.last_surah, s.last_ayah
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
  endsAt: string | null;
  durationMinutes: number | null;
}): Promise<Session> {
  const rows = await getSql()`
    insert into sessions (cohort_id, teacher_id, title, starts_at, ends_at, duration_minutes)
    values (${input.cohortId}, ${input.teacherId}, ${input.title}, ${input.startsAt},
      ${input.endsAt}, ${input.durationMinutes})
    returning id, cohort_id, teacher_id, title, starts_at, ends_at, duration_minutes, status,
      closed_at, last_surah, last_ayah
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

export async function updateSessionVerse(
  sessionId: string,
  verse: { surah: string | null; ayah: number | null },
) {
  const rows = await getSql()`
    update sessions
    set last_surah = ${verse.surah}, last_ayah = ${verse.ayah}
    where id = ${sessionId}
    returning id, last_surah, last_ayah
  `;
  return rows.length > 0;
}

export async function ensureUpcomingSessions(teacherId: string, weeksAhead = 4) {
  const rows = await getSql()`
    insert into sessions (cohort_id, teacher_id, title, starts_at, ends_at, duration_minutes)
    select
      c.id,
      ${teacherId},
      null,
      (g.d::date + c.start_time) at time zone c.timezone,
      (g.d::date + c.end_time) at time zone c.timezone,
      (extract(epoch from (c.end_time - c.start_time)) / 60)::int
    from cohorts c
    join teacher_cohorts tc on tc.cohort_id = c.id and tc.teacher_id = ${teacherId}
    cross join generate_series(
      current_date,
      current_date + (${weeksAhead}::int * interval '7 days'),
      interval '1 day'
    ) as g(d)
    where c.weekday is not null
      and c.start_time is not null
      and c.end_time is not null
      and extract(dow from g.d) = c.weekday
      and not exists (
        select 1 from sessions s
        where s.cohort_id = c.id
          and s.starts_at = (g.d::date + c.start_time) at time zone c.timezone
      )
    returning id
  `;
  return rows.length;
}
