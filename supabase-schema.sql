create extension if not exists pgcrypto;

create table if not exists public.chat_users (
  id text primary key,
  name text not null,
  password_hash text,
  password_salt text,
  password_plain text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  from_id text not null references public.chat_users(id) on delete cascade,
  to_id text not null references public.chat_users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  token text primary key,
  user_id text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_from_to_idx on public.chat_messages (from_id, to_id, created_at);
create index if not exists chat_messages_to_from_idx on public.chat_messages (to_id, from_id, created_at);
create index if not exists chat_sessions_user_idx on public.chat_sessions (user_id);

alter table public.chat_users enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_sessions enable row level security;
