-- Run this in the Supabase SQL editor for your project.

create table if not exists public.weight_projects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phase text not null check (phase in ('bulking', 'cutting')),
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists weight_projects_user_id_idx on public.weight_projects (user_id);

alter table public.weight_projects enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can read own projects"
  on public.weight_projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.weight_projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.weight_projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.weight_projects for delete
  using (auth.uid() = user_id);

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own settings"
  on public.user_settings for delete
  using (auth.uid() = user_id);
