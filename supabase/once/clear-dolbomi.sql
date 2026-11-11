-- ONE TIME, AND IT CANNOT BE UNDONE.
--
-- Clears what the Dolbomi app (and the first prototype of Celestual) left in
-- the `dolbomi_db` project: its 18 tables, its 21 functions and its 33
-- accounts. The portfolio's own two tables, `works` and `notes`, and the
-- function behind them are kept.
--
-- Run it once, in the Supabase dashboard: SQL Editor, new query, paste, Run.
-- Then run supabase/seed.sql to fill the index. Check the project name at the
-- top of the dashboard first: this must never be run on `celestual`.

do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not in ('works', 'notes')
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname <> 'notes_guard'
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
  for r in
    select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype in ('e', 'd')
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

delete from auth.users;

-- what is left: should read `notes, works`, `notes_guard`, and three zeros
select
  (select string_agg(tablename, ', ' order by tablename) from pg_tables where schemaname = 'public') as public_tables,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as public_functions,
  (select count(*) from auth.users) as accounts,
  (select count(*) from auth.identities) as identities,
  (select count(*) from auth.sessions) as sessions;
