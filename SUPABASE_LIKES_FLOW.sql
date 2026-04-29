-- Add likes flow for discovery -> incoming likes -> mutual -> spark
-- Run once in Supabase SQL editor.

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'mutual')),
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

create index if not exists likes_from_user_idx on public.likes (from_user_id);
create index if not exists likes_to_user_idx on public.likes (to_user_id);

alter table public.likes enable row level security;

-- Discover feed: authenticated users can read profiles.
drop policy if exists "users_select_participants" on public.users;
create policy "users_select_authenticated"
  on public.users
  for select
  using (auth.uid() is not null);

-- Likes visibility and writes for participants only.
create policy "likes_select_participants"
  on public.likes
  for select
  using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

create policy "likes_insert_me_only"
  on public.likes
  for insert
  with check (
    from_user_id = auth.uid() and to_user_id <> auth.uid()
  );

create policy "likes_update_participants"
  on public.likes
  for update
  using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  )
  with check (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

