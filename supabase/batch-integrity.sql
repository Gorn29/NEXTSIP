-- NEXT SIP Batch Integrity: append-only audit history for Batch and measurement changes.
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.batch_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  batch_id uuid not null,
  entity_type text not null check (entity_type in ('batch', 'measurement')),
  action text not null check (action in ('created', 'updated', 'deleted')),
  record_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists batch_audit_logs_user_batch_time_idx
  on public.batch_audit_logs (user_id, batch_id, created_at desc);

alter table public.batch_audit_logs enable row level security;

drop policy if exists "Users can read their own Batch audit logs"
  on public.batch_audit_logs;
create policy "Users can read their own Batch audit logs"
  on public.batch_audit_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE, or DELETE policies are created for users.
-- Only the database trigger below can write audit records.

create or replace function public.capture_batch_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_actor_id uuid;
  v_batch_id uuid;
  v_record_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_action text;
begin
  v_actor_id := auth.uid();
  v_action := lower(TG_OP);

  if TG_TABLE_NAME = 'production_batches' then
    if TG_OP = 'INSERT' then
      v_user_id := NEW.user_id;
      v_batch_id := NEW.id;
      v_record_id := NEW.id;
      v_after := jsonb_build_object(
        'batch_code', NEW.batch_code,
        'product_name', NEW.product_name,
        'recipe_version', NEW.recipe_version,
        'start_date', NEW.start_date,
        'owner_name', NEW.owner_name,
        'status', NEW.status,
        'flagged', NEW.flagged
      );
    elsif TG_OP = 'UPDATE' then
      v_user_id := NEW.user_id;
      v_batch_id := NEW.id;
      v_record_id := NEW.id;
      v_before := jsonb_build_object(
        'batch_code', OLD.batch_code,
        'product_name', OLD.product_name,
        'recipe_version', OLD.recipe_version,
        'start_date', OLD.start_date,
        'owner_name', OLD.owner_name,
        'status', OLD.status,
        'flagged', OLD.flagged
      );
      v_after := jsonb_build_object(
        'batch_code', NEW.batch_code,
        'product_name', NEW.product_name,
        'recipe_version', NEW.recipe_version,
        'start_date', NEW.start_date,
        'owner_name', NEW.owner_name,
        'status', NEW.status,
        'flagged', NEW.flagged
      );
      if v_before = v_after then
        return NEW;
      end if;
    else
      v_user_id := OLD.user_id;
      v_batch_id := OLD.id;
      v_record_id := OLD.id;
      v_before := jsonb_build_object(
        'batch_code', OLD.batch_code,
        'product_name', OLD.product_name,
        'recipe_version', OLD.recipe_version,
        'start_date', OLD.start_date,
        'owner_name', OLD.owner_name,
        'status', OLD.status,
        'flagged', OLD.flagged
      );
    end if;
  elsif TG_TABLE_NAME = 'batch_measurements' then
    if TG_OP = 'INSERT' then
      v_user_id := NEW.user_id;
      v_batch_id := NEW.batch_id;
      v_record_id := NEW.id;
      v_after := jsonb_build_object(
        'measured_at', NEW.measured_at,
        'ph', NEW.ph,
        'brix', NEW.brix,
        'temperature', NEW.temperature,
        'note', NEW.note
      );
    elsif TG_OP = 'UPDATE' then
      v_user_id := NEW.user_id;
      v_batch_id := NEW.batch_id;
      v_record_id := NEW.id;
      v_before := jsonb_build_object(
        'measured_at', OLD.measured_at,
        'ph', OLD.ph,
        'brix', OLD.brix,
        'temperature', OLD.temperature,
        'note', OLD.note
      );
      v_after := jsonb_build_object(
        'measured_at', NEW.measured_at,
        'ph', NEW.ph,
        'brix', NEW.brix,
        'temperature', NEW.temperature,
        'note', NEW.note
      );
      if v_before = v_after then
        return NEW;
      end if;
    else
      v_user_id := OLD.user_id;
      v_batch_id := OLD.batch_id;
      v_record_id := OLD.id;
      v_before := jsonb_build_object(
        'measured_at', OLD.measured_at,
        'ph', OLD.ph,
        'brix', OLD.brix,
        'temperature', OLD.temperature,
        'note', OLD.note
      );
    end if;
  else
    raise exception 'Unsupported audit table: %', TG_TABLE_NAME;
  end if;

  insert into public.batch_audit_logs (
    user_id, batch_id, entity_type, action, record_id,
    actor_id, before_data, after_data
  ) values (
    v_user_id, v_batch_id,
    case when TG_TABLE_NAME = 'production_batches' then 'batch' else 'measurement' end,
    case v_action
      when 'insert' then 'created'
      when 'update' then 'updated'
      when 'delete' then 'deleted'
    end,
    v_record_id, v_actor_id, v_before, v_after
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

revoke all on function public.capture_batch_audit() from public;

drop trigger if exists production_batches_audit
  on public.production_batches;
create trigger production_batches_audit
  after insert or update or delete on public.production_batches
  for each row execute function public.capture_batch_audit();

drop trigger if exists batch_measurements_audit
  on public.batch_measurements;
create trigger batch_measurements_audit
  after insert or update or delete on public.batch_measurements
  for each row execute function public.capture_batch_audit();

revoke all on public.batch_audit_logs from anon, authenticated;
grant select on public.batch_audit_logs to authenticated;
