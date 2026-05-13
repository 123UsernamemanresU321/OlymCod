create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null,
  topic text not null,
  note_type text not null,
  difficulty int check (difficulty between 1 and 12),
  description text,
  tags text[] default '{}'::text[] not null,
  body_markdown text not null,
  diagram_urls text[] default '{}'::text[] not null,
  is_favorite boolean default false not null,
  is_archived boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_markdown, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B')
  ) stored,
  unique (user_id, slug)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

alter table public.notes enable row level security;

drop policy if exists "Users can select their own notes" on public.notes;
create policy "Users can select their own notes"
on public.notes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
on public.notes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
on public.notes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
on public.notes for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_topic_idx on public.notes (topic);
create index if not exists notes_note_type_idx on public.notes (note_type);
create index if not exists notes_difficulty_idx on public.notes (difficulty);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);
create index if not exists notes_tags_gin_idx on public.notes using gin (tags);
create index if not exists notes_search_vector_idx on public.notes using gin (search_vector);
