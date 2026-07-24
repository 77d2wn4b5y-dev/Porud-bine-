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

-- Opcione normalizovane tabele za cenovnike. Aplikacija nastavlja da ih čuva i kroz
-- app_sync payload, pa postojeći korisnici mogu bezbedno da nastave bez ove migracije.
create table if not exists public.price_lists (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, updated_at timestamptz not null default now()
);
create table if not exists public.price_list_items (
  id uuid primary key, price_list_id uuid not null references public.price_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, product_name text not null,
  unit text not null default 'kom', price numeric(14,2) not null default 0 check (price >= 0), updated_at timestamptz not null default now(),
  unique(price_list_id, product_name)
);
create table if not exists public.price_history (
  id uuid primary key, price_list_id uuid not null references public.price_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, product_name text not null,
  old_price numeric(14,2) not null, new_price numeric(14,2) not null, changed_at timestamptz not null default now(), price_list_name text not null
);
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.price_history enable row level security;
grant select,insert,update,delete on public.price_lists,public.price_list_items,public.price_history to authenticated;
drop policy if exists "Own price lists" on public.price_lists;
create policy "Own price lists" on public.price_lists for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Own price list items" on public.price_list_items;
create policy "Own price list items" on public.price_list_items for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Own price history" on public.price_history;
create policy "Own price history" on public.price_history for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create index if not exists price_list_items_list_idx on public.price_list_items(price_list_id);
create index if not exists price_history_list_product_idx on public.price_history(price_list_id,product_name,changed_at desc);
