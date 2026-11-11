-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0001  THE ROOM                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Everything the portfolio keeps in a database, which is two things:
--
--   works   the index: one row for each thing hung in the room. Anybody may
--           read the rows that are published. Nobody but the owner writes.
--   notes   what a visitor leaves through the form. Anybody may leave one.
--           Nobody but the owner can read one back.
--
-- "The owner" is the dashboard, or the service key: there are no accounts.
-- A visitor is `anon`, and what `anon` may do is exactly the two policies
-- below. Run once on an empty database; the seed (supabase/seed.sql) fills
-- `works` and can be run again whenever src/data/works.js changes.

-- ── works ───────────────────────────────────────────────────────────────────
create table public.works (
  slug        text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  position    integer not null default 0,
  title       text not null check (char_length(title) between 1 and 120),
  kind        text not null check (char_length(kind) between 1 and 40),
  year        text not null check (char_length(year) between 1 and 20),
  note        text not null default '' check (char_length(note) <= 280),
  -- where a visitor is taken: a plate in the room (#slug) or the work's own site
  href        text check (href is null or (char_length(href) <= 500 and href ~ '^(#|https://)')),
  -- its picture: a path in the site's own public/plates, or an https address
  plate       text check (plate is null or (char_length(plate) <= 500 and plate ~ '^(/|https://)')),
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.works is 'The index of the room: one row for each work. Read by anybody, written by the owner.';

create index works_position_idx on public.works (position) where published;

alter table public.works enable row level security;

create policy "anybody reads what is hung"
  on public.works for select
  to anon, authenticated
  using (published);

revoke all on public.works from anon, authenticated;
grant select on public.works to anon, authenticated;

-- ── notes ───────────────────────────────────────────────────────────────────
create table public.notes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text check (name is null or char_length(name) <= 120),
  reach       text check (reach is null or char_length(reach) <= 200),
  body        text not null check (char_length(btrim(body)) between 1 and 4000)
);
comment on table public.notes is 'Notes left through the form. Insert only for a visitor; read by the owner alone.';

alter table public.notes enable row level security;

-- a visitor may leave a note, and that is all: there is no policy to select,
-- change or delete one, so the table answers nothing
create policy "anybody leaves a note"
  on public.notes for insert
  to anon, authenticated
  with check (char_length(btrim(body)) between 1 and 4000);

-- and only its three fields: the number and the time are the database's own
revoke all on public.notes from anon, authenticated;
grant insert (name, reach, body) on public.notes to anon, authenticated;

-- The form has no account behind it, so the one guard against a flood is
-- here: past thirty notes in an hour the table stops taking them until the
-- hour has moved on.
create function public.notes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.notes where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'the table is full for the moment' using errcode = '53400';
  end if;
  return new;
end
$$;

revoke all on function public.notes_guard() from public, anon, authenticated;

create trigger notes_guard
  before insert on public.notes
  for each row execute function public.notes_guard();
