create table if not exists public.app_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_sync enable row level security;

revoke all on table public.app_sync from anon;
grant select, insert, update, delete on table public.app_sync to authenticated;

drop policy if exists "Users can read own sync data" on public.app_sync;
create policy "Users can read own sync data"
on public.app_sync for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sync data" on public.app_sync;
create policy "Users can insert own sync data"
on public.app_sync for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own sync data" on public.app_sync;
create policy "Users can update own sync data"
on public.app_sync for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sync data" on public.app_sync;
create policy "Users can delete own sync data"
on public.app_sync for delete
to authenticated
using (auth.uid() = user_id);
