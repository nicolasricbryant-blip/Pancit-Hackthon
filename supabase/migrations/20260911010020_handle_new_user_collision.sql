-- TAMBAYAN — handle_new_user() must never fail a sign-up over a handle clash.
--
-- The generated handle (`emaillocalpart_first4ofuuid`) sits on a UNIQUE INDEX
-- (`profiles.handle text unique`), but the insert only guards `on conflict
-- (id) do nothing` — that suppresses a PRIMARY KEY conflict, not a unique
-- violation on a different column. A collision on the 4-char uuid suffix (low
-- probability, but very much possible with enough signups sharing an email
-- local part) raises an unhandled unique_violation, which aborts the
-- `auth.users` INSERT this trigger fires from — the whole sign-up fails with
-- a confusing error, for a cause the signing-up user can't see or fix.
--
-- Redefines handle_new_user() (does not touch the original migration, which
-- may already be applied) to retry once with the caller's FULL uuid appended
-- — unique by construction, since no other row's id can ever produce the same
-- string — and, in the unreachable case that still collides, fall back to a
-- null handle rather than fail the insert. `profiles.handle` is nullable and
-- onboarding (OnboardingForm) collects one on submit when it's missing, so a
-- null handle here just defers the choice — the profile row always gets
-- created either way. Idempotent (create or replace).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );
  v_local   text := split_part(new.email, '@', 1);
  v_handle  text := coalesce(
    new.raw_user_meta_data->>'handle',
    v_local || '_' || substr(new.id::text, 1, 4)
  );
begin
  begin
    insert into public.profiles (id, display_name, handle)
    values (new.id, v_display, v_handle)
    on conflict (id) do nothing;
  exception when unique_violation then
    begin
      -- Retry with the full uuid (no dashes) as the suffix instead of just its
      -- first 4 characters. Since it's this row's own auth.users id, no other
      -- profile can already hold this exact string — the only way this
      -- second insert can still raise unique_violation is a genuine (id)
      -- primary-key conflict, i.e. this trigger somehow re-firing for a user
      -- that already has a profiles row, which `on conflict (id) do nothing`
      -- already handles silently without needing this branch at all.
      insert into public.profiles (id, display_name, handle)
      values (new.id, v_display, v_local || '_' || replace(new.id::text, '-', ''))
      on conflict (id) do nothing;
    exception when unique_violation then
      -- Should be unreachable given the above, but never let a handle clash
      -- be the reason a profile row — and therefore the sign-up — fails.
      insert into public.profiles (id, display_name, handle)
      values (new.id, v_display, null)
      on conflict (id) do nothing;
    end;
  end;
  return new;
end;
$$;
