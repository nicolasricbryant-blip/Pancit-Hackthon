-- TAMBAYAN — enable Supabase Realtime on lobbies + lobby_members.
--
-- /lobbies/[id] (LobbyActions.tsx) subscribed to postgres_changes on these
-- tables to replace its 10s router.refresh() poll, but postgres_changes only
-- fires for tables added to the `supabase_realtime` publication. Guarded
-- with an existence check since ALTER PUBLICATION ... ADD TABLE has no
-- portable IF NOT EXISTS across Postgres versions. Idempotent.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lobbies'
  ) then
    alter publication supabase_realtime add table public.lobbies;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lobby_members'
  ) then
    alter publication supabase_realtime add table public.lobby_members;
  end if;
end $$;
