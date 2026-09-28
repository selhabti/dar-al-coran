import "server-only";

import { getSql } from "@/lib/db";
import type { Guardian } from "@/lib/types";

export async function addStudent(input: {
  cohortId: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
}) {
  const rows = await getSql()`
    insert into students (cohort_id, first_name, last_name, birthdate, city, email, phone)
    values (${input.cohortId}, ${input.firstName}, ${input.lastName}, ${input.birthdate}::date,
      ${input.city}, ${input.email}, ${input.phone})
    returning id
  `;
  return rows[0] as unknown as { id: string };
}

export async function updateStudent(
  studentId: string,
  input: {
    firstName: string;
    lastName: string;
    birthdate: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  },
) {
  const rows = await getSql()`
    update students
    set first_name = ${input.firstName},
        last_name = ${input.lastName},
        birthdate = ${input.birthdate}::date,
        city = ${input.city},
        email = ${input.email},
        phone = ${input.phone}
    where id = ${studentId}
    returning id
  `;
  return rows.length > 0;
}

export async function archiveStudent(studentId: string) {
  const rows = await getSql()`
    update students set active = false where id = ${studentId} returning id
  `;
  return rows.length > 0;
}

export async function addGuardian(input: {
  studentId: string;
  fullName: string;
  relation: string | null;
}) {
  const rows = await getSql()`
    insert into guardians (student_id, full_name, relation)
    values (${input.studentId}, ${input.fullName}, ${input.relation})
    returning id, student_id, full_name, relation, is_primary, telegram_chat_id, telegram_username,
      link_code, linked_at
  `;
  return rows[0] as unknown as Guardian;
}

export async function updateGuardian(
  guardianId: string,
  input: { fullName: string; relation: string | null },
) {
  const rows = await getSql()`
    update guardians set full_name = ${input.fullName}, relation = ${input.relation}
    where id = ${guardianId}
    returning id
  `;
  return rows.length > 0;
}

export async function removeGuardian(guardianId: string) {
  const rows = await getSql()`
    delete from guardians where id = ${guardianId} returning id
  `;
  return rows.length > 0;
}

export async function regenerateLinkCode(guardianId: string): Promise<Guardian> {
  const rows = await getSql()`
    update guardians
    set link_code = encode(gen_random_bytes(5), 'hex'), telegram_chat_id = null, telegram_username = null, linked_at = null
    where id = ${guardianId}
    returning id, student_id, full_name, relation, is_primary, telegram_chat_id, telegram_username,
      link_code, linked_at
  `;
  const guardian = rows[0] as unknown as Guardian | undefined;
  if (!guardian) throw new Error("Parent introuvable");
  return guardian;
}

export async function unlinkGuardian(guardianId: string) {
  const rows = await getSql()`
    update guardians
    set telegram_chat_id = null, telegram_username = null, linked_at = null
    where id = ${guardianId}
    returning id
  `;
  return rows.length > 0;
}

export async function findGuardianByLinkCode(code: string): Promise<Guardian | null> {
  const rows = await getSql()`
    select id, student_id, full_name, relation, is_primary, telegram_chat_id, telegram_username,
      link_code, linked_at
    from guardians
    where lower(link_code) = lower(${code})
  `;
  return (rows[0] as unknown as Guardian | undefined) ?? null;
}

export async function linkGuardianToTelegram(input: {
  guardianId: string;
  chatId: string;
  username: string | null;
}) {
  const rows = await getSql()`
    update guardians
    set telegram_chat_id = ${input.chatId}::bigint,
        telegram_username = ${input.username},
        linked_at = coalesce(linked_at, now())
    where id = ${input.guardianId}
    returning id, student_id, full_name
  `;
  return rows[0] as unknown as { id: string; student_id: string; full_name: string } | undefined;
}

export async function getStudentName(studentId: string) {
  const rows = await getSql()`
    select first_name, last_name from students where id = ${studentId}
  `;
  return rows[0] as unknown as { first_name: string; last_name: string } | undefined;
}
