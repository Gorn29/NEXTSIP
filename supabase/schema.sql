-- NEXT SIP user profiles
-- Run this file in Supabase SQL Editor after creating the project.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  account_type text not null default 'producer'
    check (account_type in ('producer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'producer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- Saved Flavor Studio concepts (each member can access only their own records).
create table if not exists public.flavor_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  concept_type text not null default '',
  description text not null default '',
  ingredients text[] not null default '{}',
  market text not null default '',
  goal text not null default '',
  flavor_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.flavor_concepts enable row level security;

drop policy if exists "Users can read their own flavor concepts" on public.flavor_concepts;
create policy "Users can read their own flavor concepts"
on public.flavor_concepts for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own flavor concepts" on public.flavor_concepts;
create policy "Users can insert their own flavor concepts"
on public.flavor_concepts for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own flavor concepts" on public.flavor_concepts;
create policy "Users can delete their own flavor concepts"
on public.flavor_concepts for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists flavor_concepts_user_created_idx
on public.flavor_concepts (user_id, created_at desc);

-- Batch Guardian cloud records (each producer can access only their own batches).
create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  batch_code text not null,
  product_name text not null,
  recipe_version text not null default '',
  start_date date not null,
  owner_name text not null default '',
  status text not null default 'active' check (status in ('active', 'completed')),
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, batch_code)
);

create table if not exists public.batch_measurements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_at timestamptz not null default now(),
  ph numeric(5,2),
  brix numeric(6,2),
  temperature numeric(6,2),
  note text not null default ''
);

create index if not exists production_batches_user_created_idx on public.production_batches (user_id, created_at desc);
create index if not exists batch_measurements_batch_time_idx on public.batch_measurements (batch_id, measured_at desc);
alter table public.production_batches enable row level security;
alter table public.batch_measurements enable row level security;

drop policy if exists "Users can read their own batches" on public.production_batches;
create policy "Users can read their own batches" on public.production_batches for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own batches" on public.production_batches;
create policy "Users can insert their own batches" on public.production_batches for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own batches" on public.production_batches;
create policy "Users can update their own batches" on public.production_batches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own batches" on public.production_batches;
create policy "Users can delete their own batches" on public.production_batches for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own batch measurements" on public.batch_measurements;
create policy "Users can read their own batch measurements" on public.batch_measurements for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.production_batches b where b.id = batch_id and b.user_id = (select auth.uid())));
drop policy if exists "Users can insert their own batch measurements" on public.batch_measurements;
create policy "Users can insert their own batch measurements" on public.batch_measurements for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.production_batches b where b.id = batch_id and b.user_id = (select auth.uid())));
drop policy if exists "Users can update their own batch measurements" on public.batch_measurements;
create policy "Users can update their own batch measurements" on public.batch_measurements for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.production_batches b where b.id = batch_id and b.user_id = (select auth.uid()))) with check ((select auth.uid()) = user_id and exists (select 1 from public.production_batches b where b.id = batch_id and b.user_id = (select auth.uid())));
drop policy if exists "Users can delete their own batch measurements" on public.batch_measurements;
create policy "Users can delete their own batch measurements" on public.batch_measurements for delete to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.production_batches b where b.id = batch_id and b.user_id = (select auth.uid())));



-- Public Sip Passport pages. Only published passport fields are readable without login.
create table if not exists public.product_passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_name text not null check (char_length(product_name) between 1 and 120),
  origin text not null default '' check (char_length(origin) <= 160),
  ingredients text not null default '' check (char_length(ingredients) <= 500),
  batch_reference text not null default '' check (char_length(batch_reference) <= 80),
  story text not null default '' check (char_length(story) <= 2000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_passports_user_created_idx on public.product_passports (user_id, created_at desc);
alter table public.product_passports enable row level security;
drop policy if exists "Owners can read their passports" on public.product_passports;
create policy "Owners can read their passports" on public.product_passports for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Public can read published passports" on public.product_passports;
create policy "Public can read published passports" on public.product_passports for select to anon, authenticated using (is_published = true);
drop policy if exists "Owners can create passports" on public.product_passports;
create policy "Owners can create passports" on public.product_passports for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Owners can update passports" on public.product_passports;
create policy "Owners can update passports" on public.product_passports for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Owners can delete passports" on public.product_passports;
create policy "Owners can delete passports" on public.product_passports for delete to authenticated using ((select auth.uid()) = user_id);
