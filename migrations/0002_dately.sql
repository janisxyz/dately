create table if not exists profiles (
  user_id text primary key,
  display_name text not null default '',
  age integer,
  bio text not null default '',
  location text not null default '',
  gender text not null default '',
  looking_for text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profile_fields (
  id serial primary key,
  user_id text not null,
  label text not null,
  value text not null default '',
  sort_order integer not null default 0
);
create index if not exists profile_fields_user_idx on profile_fields (user_id);

create table if not exists profile_media (
  id serial primary key,
  user_id text not null,
  kind text not null,
  mime text not null,
  data text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists profile_media_user_idx on profile_media (user_id);

create table if not exists questionnaires (
  id serial primary key,
  user_id text not null unique,
  title text not null default 'My questionnaire',
  intro text not null default '',
  is_published boolean not null default false,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists questionnaires_published_idx on questionnaires (is_published);

create table if not exists questions (
  id serial primary key,
  questionnaire_id integer not null references questionnaires(id) on delete cascade,
  type text not null,
  prompt text not null,
  required boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);
create index if not exists questions_qid_idx on questions (questionnaire_id);

create table if not exists filters (
  id serial primary key,
  questionnaire_id integer not null references questionnaires(id) on delete cascade,
  kind text not null,
  field text,
  question_id integer references questions(id) on delete cascade,
  operator text not null,
  value jsonb not null,
  hard boolean not null default true
);
create index if not exists filters_qid_idx on filters (questionnaire_id);

create table if not exists applications (
  id serial primary key,
  questionnaire_id integer not null references questionnaires(id) on delete cascade,
  applicant_id text not null,
  status text not null default 'pending',
  auto_status text not null default 'pending',
  fail_reasons jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (questionnaire_id, applicant_id)
);
create index if not exists applications_qid_idx on applications (questionnaire_id);
create index if not exists applications_applicant_idx on applications (applicant_id);

create table if not exists answers (
  id serial primary key,
  application_id integer not null references applications(id) on delete cascade,
  question_id integer not null,
  value jsonb not null,
  unique (application_id, question_id)
);

create table if not exists messages (
  id serial primary key,
  application_id integer not null references applications(id) on delete cascade,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_app_idx on messages (application_id);
