export type Attendance = "present" | "retard" | "absent" | "exempt" | "inconnu";
export type SessionStatus = "ouverte" | "cloturee";
export type MessageKind = "groupe" | "direct";
export type MessageStatus = "en_attente" | "envoye" | "echec" | "ignore";
export type TemplateScope = "groupe" | "direct";

export interface Teacher {
  id: string;
  email: string;
  full_name: string;
}

export interface Cohort {
  id: string;
  name: string;
  level: string | null;
  subject: string | null;
  slot_label: string | null;
  active: boolean;
}

export interface Student {
  id: string;
  cohort_id: string;
  first_name: string;
  last_name: string;
  birthdate: string | null;
  active: boolean;
}

export interface Guardian {
  id: string;
  student_id: string;
  full_name: string;
  relation: string | null;
  is_primary: boolean;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  link_code: string;
  linked_at: string | null;
}

export interface Session {
  id: string;
  cohort_id: string;
  teacher_id: string;
  title: string | null;
  starts_at: string;
  duration_minutes: number | null;
  status: SessionStatus;
  closed_at: string | null;
}

export interface SessionEntry {
  id: string;
  session_id: string;
  student_id: string;
  attendance: Attendance;
  validated: boolean | null;
  comment: string | null;
  marked_at: string | null;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  scope: TemplateScope;
  template_key: string;
  label: string;
  body: string;
  sort_order: number;
  is_active: boolean;
}

export interface MessageRecord {
  id: string;
  batch_id: string;
  kind: MessageKind;
  student_id: string | null;
  guardian_id: string | null;
  telegram_chat_id: string | null;
  body: string;
  status: MessageStatus;
  telegram_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface StudentRow extends Student {
  full_name: string;
}

export interface SessionEntryRow extends SessionEntry {
  first_name: string;
  last_name: string;
}

export interface StudentHistoryRow {
  session_id: string;
  starts_at: string;
  title: string | null;
  attendance: Attendance;
  validated: boolean | null;
  comment: string | null;
}
