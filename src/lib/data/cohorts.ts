import "server-only";

import { getSql } from "@/lib/db";
import type { Cohort } from "@/lib/types";

export interface CohortWithCounts extends Cohort {
  student_count: number;
  open_session_id: string | null;
}

export async function listCohortsForTeacher(teacherId: string): Promise<CohortWithCounts[]> {
  const rows = await getSql()`
    select
      c.id,
      c.name,
      c.level,
      c.subject,
      c.slot_label,
      c.active,
      (select count(*)::int from students s where s.cohort_id = c.id and s.active) as student_count,
      (
        select s2.id
        from sessions s2
        where s2.cohort_id = c.id and s2.status = 'ouverte'
        order by s2.starts_at desc
        limit 1
      ) as open_session_id
    from cohorts c
    join teacher_cohorts tc on tc.cohort_id = c.id
    where tc.teacher_id = ${teacherId}
    order by c.name
  `;
  return rows as unknown as CohortWithCounts[];
}

export async function countLinkedGuardians(cohortId: string): Promise<{ linked: number; total: number }> {
  const rows = await getSql()`
    select
      count(*) filter (where g.telegram_chat_id is not null)::int as linked,
      count(*)::int as total
    from guardians g
    join students s on s.id = g.student_id
    where s.cohort_id = ${cohortId} and s.active
  `;
  const row = rows[0] as unknown as { linked: number; total: number } | undefined;
  return row ?? { linked: 0, total: 0 };
}
