-- One-line teaser shown before match/unlock; full story stays in bio (shown after unlock).
-- Run in Supabase SQL editor after your base schema exists.

alter table public.users add column if not exists tagline text;

comment on column public.users.tagline is 'Short public line on Discover / previews before unlock. Max length enforced in app (100 chars).';
comment on column public.users.bio is 'Full bio visible only after profile unlocks (spark answered).';

-- Backfill: copy first 100 characters of existing bios into tagline where missing.
-- Adjust length here if you change TAGLINE_MAX_CHARS in lib/profileVisibility.ts.
update public.users
set tagline = left(btrim(bio), 100)
where tagline is null
  and bio is not null
  and btrim(bio) <> '';
