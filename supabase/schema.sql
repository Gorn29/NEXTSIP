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
