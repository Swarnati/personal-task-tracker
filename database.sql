-- Run this entire script in Supabase: SQL Editor > New query.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  category text not null default 'Personal',
  priority text not null default 'Medium'
    check (priority in ('Low', 'Medium', 'High')),
  due_date date,
  completed boolean not null default false,
  recurrence text not null default 'None'
    check (recurrence in ('None', 'Daily', 'Weekly', 'Monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_date_idx
  on public.tasks(user_id, due_date);

alter table public.tasks enable row level security;

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated using (auth.uid() = user_id);

-- No anonymous access policy is created. Users must sign in.
