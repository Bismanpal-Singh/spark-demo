-- Ignite a Date schema + RLS policies
-- Run in Supabase SQL editor after base spark schema.

create table if not exists public.date_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (match_id)
);

create index if not exists date_requests_match_idx on public.date_requests(match_id);

create table if not exists public.friction_tasks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  task_key text not null,
  user_a_response text,
  user_b_response text,
  status text not null default 'active' check (status in ('active', 'complete')),
  created_at timestamptz not null default now(),
  unique (match_id)
);

create index if not exists friction_tasks_match_idx on public.friction_tasks(match_id);

alter table public.date_requests enable row level security;
alter table public.friction_tasks enable row level security;

create policy "date_requests_select_participants"
  on public.date_requests
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = date_requests.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "date_requests_insert_participants"
  on public.date_requests
  for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = date_requests.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "date_requests_update_participants"
  on public.date_requests
  for update
  using (
    exists (
      select 1
      from public.matches m
      where m.id = date_requests.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = date_requests.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "date_requests_delete_participants"
  on public.date_requests
  for delete
  using (
    exists (
      select 1
      from public.matches m
      where m.id = date_requests.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "friction_tasks_select_participants"
  on public.friction_tasks
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = friction_tasks.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "friction_tasks_insert_participants"
  on public.friction_tasks
  for insert
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = friction_tasks.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "friction_tasks_update_participants"
  on public.friction_tasks
  for update
  using (
    exists (
      select 1
      from public.matches m
      where m.id = friction_tasks.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = friction_tasks.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "friction_tasks_delete_participants"
  on public.friction_tasks
  for delete
  using (
    exists (
      select 1
      from public.matches m
      where m.id = friction_tasks.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

