-- Spark Dating App (minimal) schema for Supabase
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1) Users profile table (separate from auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null,
  age int,
  bio text,
  avatar_url text,
  city text,
  created_at timestamptz not null default now()
);

-- 2) Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.users (id) on delete cascade,
  user_b uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sparked', 'dating')),
  created_at timestamptz not null default now()
);

create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);

-- 3) Spark answers (one answer per user per match)
create table if not exists public.spark_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index if not exists spark_answers_match_id_idx on public.spark_answers (match_id);
create index if not exists spark_answers_user_id_idx on public.spark_answers (user_id);

-- 4) Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_match_id_created_at_idx
  on public.messages (match_id, created_at);

-- -----------------------------
-- RLS Policies
-- -----------------------------

alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.spark_answers enable row level security;
alter table public.messages enable row level security;

-- USERS: allow selecting your own profile and profiles participating in your matches
create policy "users_select_participants"
  on public.users
  for select
  using (
    id = auth.uid()
    OR exists (
      select 1
      from public.matches m
      where (m.user_a = users.id OR m.user_b = users.id)
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- MATCHES: allow selecting and modifying matches where you are a participant
create policy "matches_select_participants"
  on public.matches
  for select
  using (
    user_a = auth.uid() OR user_b = auth.uid()
  );

create policy "matches_insert_participants"
  on public.matches
  for insert
  with check (
    user_a = auth.uid() OR user_b = auth.uid()
  );

create policy "matches_update_participants"
  on public.matches
  for update
  using (
    user_a = auth.uid() OR user_b = auth.uid()
  )
  with check (
    user_a = auth.uid() OR user_b = auth.uid()
  );

create policy "matches_delete_participants"
  on public.matches
  for delete
  using (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- SPARK_ANSWERS: allow read/write for participants, enforce user_id = auth.uid() on writes
create policy "spark_answers_select_participants"
  on public.spark_answers
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = spark_answers.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

create policy "spark_answers_insert_participants"
  on public.spark_answers
  for insert
  with check (
    user_id = auth.uid()
    AND exists (
      select 1
      from public.matches m
      where m.id = spark_answers.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

create policy "spark_answers_update_participants"
  on public.spark_answers
  for update
  using (
    exists (
      select 1
      from public.matches m
      where m.id = spark_answers.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  )
  with check (
    user_id = auth.uid()
    AND exists (
      select 1
      from public.matches m
      where m.id = spark_answers.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- MESSAGES: allow read/write for participants, enforce sender_id = auth.uid() on writes
create policy "messages_select_participants"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

create policy "messages_insert_participants"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    AND exists (
      select 1
      from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- No message UPDATE policy needed (app only INSERTs + DELETE match)

