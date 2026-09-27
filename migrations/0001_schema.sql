create table if not exists teachers (
  id uuid primary key,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text,
  subject text,
  slot_label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists teacher_cohorts (
  teacher_id uuid not null references teachers (id) on delete cascade,
  cohort_id uuid not null references cohorts (id) on delete cascade,
  role text not null default 'principal' check (role in ('principal', 'assistant')),
  created_at timestamptz not null default now(),
  primary key (teacher_id, cohort_id)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birthdate date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists students_cohort_idx on students (cohort_id);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  full_name text not null,
  relation text,
  is_primary boolean not null default true,
  telegram_chat_id bigint,
  telegram_username text,
  link_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  linked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guardians_student_idx on guardians (student_id);
create index if not exists guardians_chat_idx on guardians (telegram_chat_id) where telegram_chat_id is not null;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete cascade,
  teacher_id uuid not null references teachers (id),
  title text,
  starts_at timestamptz not null default now(),
  duration_minutes integer,
  status text not null default 'ouverte' check (status in ('ouverte', 'cloturee')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sessions_cohort_start_idx on sessions (cohort_id, starts_at desc);

create table if not exists session_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  attendance text not null default 'inconnu' check (attendance in ('present', 'retard', 'absent', 'exempt', 'inconnu')),
  validated boolean,
  comment text,
  marked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists session_entries_student_idx on session_entries (student_id);
create index if not exists session_entries_session_idx on session_entries (session_id);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('groupe', 'direct')),
  template_key text not null unique,
  label text not null,
  body text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  kind text not null check (kind in ('groupe', 'direct')),
  cohort_id uuid references cohorts (id) on delete set null,
  session_id uuid references sessions (id) on delete set null,
  student_id uuid references students (id) on delete set null,
  guardian_id uuid references guardians (id) on delete set null,
  telegram_chat_id bigint,
  body text not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'envoye', 'echec', 'ignore')),
  telegram_message_id bigint,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_batch_idx on messages (batch_id);
create index if not exists messages_student_idx on messages (student_id, created_at desc);
create index if not exists messages_session_idx on messages (session_id);
