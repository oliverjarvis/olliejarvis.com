-- User data table: one row per user, all nihongo learning data.
-- Uses JSONB columns mirroring the localStorage schema.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learner_profile jsonb,
  word_journal jsonb default '{}'::jsonb,
  grammar_patterns jsonb default '{}'::jsonb,
  conversation_history jsonb default '[]'::jsonb,
  saved_conversations jsonb default '{}'::jsonb,
  ai_conversations jsonb default '[]'::jsonb,
  grammar_points_journal jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.user_data enable row level security;

create policy "Users can view own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_data_updated_at
  before update on public.user_data
  for each row
  execute function public.update_updated_at();
