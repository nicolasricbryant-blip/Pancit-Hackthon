-- TAMBAYAN — Mentorship discovery RPCs. Idempotent.
--
-- mentorship_requests RLS only returns rows where the caller is already the
-- mentee, the mentor, or an admin. A mentor browsing for work is none of those
-- yet, so these SECURITY DEFINER functions expose the OPEN board and the accept
-- transition without widening the table policies.

-- 1 · open requests a mentor could pick up (never their own).
create or replace function public.list_open_mentorships(p_game text default null)
returns setof public.mentorship_requests
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.mentorship_requests
  where status = 'open'
    and mentee_id <> auth.uid()
    and (p_game is null or game_id = p_game)
  order by created_at desc
$$;

-- 2 · claim an open request as the mentor.
create or replace function public.accept_mentorship(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.mentorship_requests
  set mentor_id = auth.uid(),
      status = 'matched',
      updated_at = now()
  where id = p_id
    and status = 'open'
    and mentee_id <> auth.uid();
  if not found then
    raise exception 'request not open';
  end if;
end
$$;

-- 3 · grants.
grant execute on function public.list_open_mentorships(text) to authenticated;
grant execute on function public.accept_mentorship(uuid) to authenticated;
