create table if not exists public.deleted_account_logs (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid,
  email text not null,
  username text,
  display_name text,
  profile_created_at timestamptz,
  deleted_at timestamptz not null default now(),
  deletion_source text not null default 'self-service',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.deleted_account_logs enable row level security;

create index if not exists idx_deleted_account_logs_deleted_at
  on public.deleted_account_logs (deleted_at desc);

create index if not exists idx_deleted_account_logs_email
  on public.deleted_account_logs (email);

drop policy if exists "Admins can view deleted account logs" on public.deleted_account_logs;
create policy "Admins can view deleted account logs"
on public.deleted_account_logs
for select
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Service role can insert deleted account logs" on public.deleted_account_logs;
create policy "Service role can insert deleted account logs"
on public.deleted_account_logs
for insert
with check (auth.role() = 'service_role');
