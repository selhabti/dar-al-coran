import "server-only";

import { getSql } from "@/lib/db";
import type { MessageRecord, MessageStatus, MessageTemplate, TemplateScope } from "@/lib/types";

export async function listTemplates(scope: TemplateScope): Promise<MessageTemplate[]> {
  const rows = await getSql()`
    select id, scope, template_key, label, body, sort_order, is_active
    from message_templates
    where scope = ${scope} and is_active
    order by sort_order, label
  `;
  return rows as unknown as MessageTemplate[];
}

export interface OutgoingMessage {
  studentId: string;
  guardianId: string;
  chatId: string | null;
  body: string;
}

export async function recordMessages(input: {
  batchId: string;
  kind: "groupe" | "direct";
  cohortId: string | null;
  sessionId: string | null;
  messages: OutgoingMessage[];
}): Promise<MessageRecord[]> {
  if (input.messages.length === 0) return [];

  const studentIds = input.messages.map((message) => message.studentId);
  const guardianIds = input.messages.map((message) => message.guardianId);
  const chatIds = input.messages.map((message) => message.chatId);
  const bodies = input.messages.map((message) => message.body);

  const rows = await getSql()`
    insert into messages (
      batch_id, kind, cohort_id, session_id, student_id, guardian_id, telegram_chat_id, body, status
    )
    select
      ${input.batchId}::uuid,
      ${input.kind}::text,
      ${input.cohortId}::uuid,
      ${input.sessionId}::uuid,
      payload.student_id,
      payload.guardian_id,
      payload.chat_id,
      payload.body,
      case when payload.chat_id is null then 'ignore'::text else 'en_attente'::text end
    from unnest(
      ${studentIds}::uuid[],
      ${guardianIds}::uuid[],
      ${chatIds}::bigint[],
      ${bodies}::text[]
    ) as payload(student_id, guardian_id, chat_id, body)
    returning id, batch_id, kind, student_id, guardian_id, telegram_chat_id, body, status,
      telegram_message_id, error, sent_at, created_at
  `;
  return rows as unknown as MessageRecord[];
}

export async function markMessageSent(messageId: string, telegramMessageId: string) {
  await getSql()`
    update messages
    set status = 'envoye', telegram_message_id = ${telegramMessageId}::bigint, sent_at = now(), error = null
    where id = ${messageId}
  `;
}

export async function markMessageFailed(messageId: string, error: string) {
  await getSql()`
    update messages set status = 'echec', error = ${error.slice(0, 500)} where id = ${messageId}
  `;
}

export interface BatchSummary {
  batchId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  messages: MessageRecord[];
}

export async function getBatchSummary(batchId: string): Promise<BatchSummary> {
  const rows = await getSql()`
    select
      m.id, m.batch_id, m.kind, m.student_id, m.guardian_id, m.telegram_chat_id, m.body, m.status,
      m.telegram_message_id, m.error, m.sent_at, m.created_at,
      st.first_name, st.last_name, g.full_name as guardian_name, g.telegram_username
    from messages m
    left join students st on st.id = m.student_id
    left join guardians g on g.id = m.guardian_id
    where m.batch_id = ${batchId}
    order by st.last_name nulls last, st.first_name nulls last
  `;
  const messages = rows as unknown as (MessageRecord & {
    first_name: string | null;
    last_name: string | null;
    guardian_name: string | null;
    telegram_username: string | null;
  })[];
  return {
    batchId,
    total: messages.length,
    sent: messages.filter((message) => message.status === "envoye").length,
    failed: messages.filter((message) => message.status === "echec").length,
    skipped: messages.filter((message) => message.status === "ignore").length,
    messages,
  };
}

export interface MessageHistoryItem {
  id: string;
  batch_id: string;
  kind: string;
  status: MessageStatus;
  body: string;
  sent_at: string | null;
  created_at: string;
  error: string | null;
  student_id: string | null;
  student_name: string | null;
  guardian_name: string | null;
  cohort_name: string | null;
  session_title: string | null;
}

export async function listMessageHistory(cohortIds: string[], limit = 100): Promise<MessageHistoryItem[]> {
  if (cohortIds.length === 0) return [];
  const rows = await getSql()`
    select
      m.id, m.batch_id, m.kind, m.status, m.body, m.sent_at, m.created_at, m.error, m.student_id,
      (st.first_name || ' ' || st.last_name) as student_name,
      g.full_name as guardian_name,
      c.name as cohort_name,
      s.title as session_title
    from messages m
    left join students st on st.id = m.student_id
    left join guardians g on g.id = m.guardian_id
    left join cohorts c on c.id = m.cohort_id
    left join sessions s on s.id = m.session_id
    where m.cohort_id = any(${cohortIds}::uuid[])
    order by m.created_at desc
    limit ${limit}
  `;
  return rows as unknown as MessageHistoryItem[];
}

export async function listMessagesForStudent(studentId: string, limit = 50) {
  const rows = await getSql()`
    select
      m.id, m.batch_id, m.kind, m.status, m.body, m.sent_at, m.created_at, m.error,
      g.full_name as guardian_name, s.title as session_title, s.starts_at as session_starts_at
    from messages m
    left join guardians g on g.id = m.guardian_id
    left join sessions s on s.id = m.session_id
    where m.student_id = ${studentId}
    order by m.created_at desc
    limit ${limit}
  `;
  return rows;
}
