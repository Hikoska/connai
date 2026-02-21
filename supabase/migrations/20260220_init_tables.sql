-- Create the users table, leveraging Supabase Auth
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the audit_sessions table
create table if not exists public.audit_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  started_at timestamptz default timezone('utc'::text, now()) not null,
  status text default 'in_progress'::text not null, -- e.g., in_progress, complete, archived
  transcript jsonb
);

-- Secure the tables
alter table public.users enable row level security;
alter table public.audit_sessions enable row level security;

-- Policies for users table: user can see their own data
create policy "Allow user to view their own data"
on public.users for select
using (auth.uid() = id);

-- Policies for audit_sessions: user can CURD their own sessions
create policy "Allow user to view their own audit sessions"
on public.audit_sessions for select
using (auth.uid() = user_id);

create policy "Allow user to create their own audit sessions"
on public.audit_sessions for insert
with check (auth.uid() = user_id);

create policy "Allow user to update their own audit sessions"
on public.audit_sessions for update
using (auth.uid() = user_id);

-- Function to handle new user signup and create a corresponding public user entry
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger to automatically populate the users table on new auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
