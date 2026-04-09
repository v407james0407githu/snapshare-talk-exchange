create table if not exists public.photo_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.photo_series
  add constraint photo_series_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.photos
  add column if not exists photo_series_id uuid references public.photo_series(id) on delete set null,
  add column if not exists series_order integer;

create index if not exists idx_photos_photo_series_id on public.photos(photo_series_id);
create index if not exists idx_photos_photo_series_order on public.photos(photo_series_id, series_order);

alter table public.photo_series enable row level security;

create policy "Public can view photo series"
on public.photo_series
for select
using (true);

create policy "Authenticated users can create own photo series"
on public.photo_series
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Authenticated users can update own photo series"
on public.photo_series
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Authenticated users can delete own photo series"
on public.photo_series
for delete
to authenticated
using (auth.uid() = user_id);
