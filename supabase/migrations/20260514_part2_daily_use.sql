create table if not exists public.quick_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  capture_type text not null default 'Rough Note',
  topic_guess text,
  tags text[] default '{}'::text[] not null,
  attachment_urls text[] default '{}'::text[] not null,
  converted_note_id uuid references public.notes(id) on delete set null,
  is_converted boolean default false not null,
  is_archived boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.problem_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source text,
  olympiad text,
  year int,
  problem_number text,
  difficulty int check (difficulty between 1 and 12),
  status text not null default 'unsolved',
  problem_text text,
  solution_summary text,
  key_idea text,
  mistake_made text,
  linked_note_ids uuid[] default '{}'::uuid[] not null,
  tags text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.mistake_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text,
  mistake_type text,
  description text not null,
  correct_principle text,
  example text,
  linked_note_ids uuid[] default '{}'::uuid[] not null,
  linked_problem_id uuid references public.problem_logs(id) on delete set null,
  severity int check (severity between 1 and 5) default 3,
  is_resolved boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references public.notes(id) on delete cascade,
  target_note_id uuid not null references public.notes(id) on delete cascade,
  relation_type text not null default 'related',
  created_at timestamptz default now() not null,
  unique (user_id, source_note_id, target_note_id, relation_type)
);

create table if not exists public.note_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  review_status text not null default 'new',
  confidence int check (confidence between 1 and 5) default 3,
  next_review_at date,
  last_reviewed_at timestamptz,
  review_count int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, note_id)
);

create table if not exists public.diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete set null,
  storage_path text not null,
  public_url text,
  filename text not null,
  mime_type text,
  size_bytes int,
  caption text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, storage_path)
);

create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  title text,
  body_markdown text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quick_captures_type_check' and conrelid = 'public.quick_captures'::regclass) then
    alter table public.quick_captures add constraint quick_captures_type_check check (
      capture_type in ('Rough Note', 'Theorem', 'Technique', 'Formula', 'Mistake', 'Problem Pattern', 'Geometry Diagram', 'Problem Log')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quick_captures_required_text_check' and conrelid = 'public.quick_captures'::regclass) then
    alter table public.quick_captures add constraint quick_captures_required_text_check check (length(trim(raw_text)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'problem_logs_status_check' and conrelid = 'public.problem_logs'::regclass) then
    alter table public.problem_logs add constraint problem_logs_status_check check (
      status in ('unsolved', 'attempted', 'solved', 'solved_with_hint', 'failed', 'review_later', 'mastered')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'problem_logs_required_text_check' and conrelid = 'public.problem_logs'::regclass) then
    alter table public.problem_logs add constraint problem_logs_required_text_check check (length(trim(title)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'mistake_logs_type_check' and conrelid = 'public.mistake_logs'::regclass) then
    alter table public.mistake_logs add constraint mistake_logs_type_check check (
      mistake_type is null or mistake_type in ('Forgot condition', 'Algebra slip', 'False assumption', 'Diagram trap', 'Missed invariant', 'Wrong modulo step', 'Overcomplicated solution', 'Misread problem', 'Weak proof', 'Other')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'mistake_logs_required_text_check' and conrelid = 'public.mistake_logs'::regclass) then
    alter table public.mistake_logs add constraint mistake_logs_required_text_check check (
      length(trim(title)) > 0 and length(trim(description)) > 0
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'note_links_relation_check' and conrelid = 'public.note_links'::regclass) then
    alter table public.note_links add constraint note_links_relation_check check (
      relation_type in ('related', 'prerequisite', 'stronger version', 'weaker version', 'commonly confused', 'used together', 'example of', 'generalization', 'special case')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'note_links_no_self_link_check' and conrelid = 'public.note_links'::regclass) then
    alter table public.note_links add constraint note_links_no_self_link_check check (source_note_id <> target_note_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'note_reviews_status_check' and conrelid = 'public.note_reviews'::regclass) then
    alter table public.note_reviews add constraint note_reviews_status_check check (
      review_status in ('new', 'learning', 'needs_practice', 'comfortable', 'mastered', 'ignored')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diagrams_required_path_check' and conrelid = 'public.diagrams'::regclass) then
    alter table public.diagrams add constraint diagrams_required_path_check check (
      length(trim(storage_path)) > 0 and length(trim(filename)) > 0
    );
  end if;
end $$;

drop trigger if exists quick_captures_set_updated_at on public.quick_captures;
create trigger quick_captures_set_updated_at before update on public.quick_captures for each row execute function public.set_updated_at();

drop trigger if exists problem_logs_set_updated_at on public.problem_logs;
create trigger problem_logs_set_updated_at before update on public.problem_logs for each row execute function public.set_updated_at();

drop trigger if exists mistake_logs_set_updated_at on public.mistake_logs;
create trigger mistake_logs_set_updated_at before update on public.mistake_logs for each row execute function public.set_updated_at();

drop trigger if exists note_reviews_set_updated_at on public.note_reviews;
create trigger note_reviews_set_updated_at before update on public.note_reviews for each row execute function public.set_updated_at();

drop trigger if exists diagrams_set_updated_at on public.diagrams;
create trigger diagrams_set_updated_at before update on public.diagrams for each row execute function public.set_updated_at();

alter table public.quick_captures enable row level security;
alter table public.problem_logs enable row level security;
alter table public.mistake_logs enable row level security;
alter table public.note_links enable row level security;
alter table public.note_reviews enable row level security;
alter table public.diagrams enable row level security;
alter table public.note_versions enable row level security;

drop policy if exists "Owners and row owners can select quick captures" on public.quick_captures;
create policy "Owners and row owners can select quick captures" on public.quick_captures for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert quick captures" on public.quick_captures;
create policy "Row owners can insert quick captures" on public.quick_captures for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update quick captures" on public.quick_captures;
create policy "Owners and row owners can update quick captures" on public.quick_captures for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete quick captures" on public.quick_captures;
create policy "Owners and row owners can delete quick captures" on public.quick_captures for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select problem logs" on public.problem_logs;
create policy "Owners and row owners can select problem logs" on public.problem_logs for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert problem logs" on public.problem_logs;
create policy "Row owners can insert problem logs" on public.problem_logs for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update problem logs" on public.problem_logs;
create policy "Owners and row owners can update problem logs" on public.problem_logs for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete problem logs" on public.problem_logs;
create policy "Owners and row owners can delete problem logs" on public.problem_logs for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select mistake logs" on public.mistake_logs;
create policy "Owners and row owners can select mistake logs" on public.mistake_logs for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert mistake logs" on public.mistake_logs;
create policy "Row owners can insert mistake logs" on public.mistake_logs for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update mistake logs" on public.mistake_logs;
create policy "Owners and row owners can update mistake logs" on public.mistake_logs for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete mistake logs" on public.mistake_logs;
create policy "Owners and row owners can delete mistake logs" on public.mistake_logs for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select note links" on public.note_links;
create policy "Owners and row owners can select note links" on public.note_links for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert note links" on public.note_links;
create policy "Row owners can insert note links" on public.note_links for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update note links" on public.note_links;
create policy "Owners and row owners can update note links" on public.note_links for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete note links" on public.note_links;
create policy "Owners and row owners can delete note links" on public.note_links for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select note reviews" on public.note_reviews;
create policy "Owners and row owners can select note reviews" on public.note_reviews for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert note reviews" on public.note_reviews;
create policy "Row owners can insert note reviews" on public.note_reviews for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update note reviews" on public.note_reviews;
create policy "Owners and row owners can update note reviews" on public.note_reviews for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete note reviews" on public.note_reviews;
create policy "Owners and row owners can delete note reviews" on public.note_reviews for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select diagrams" on public.diagrams;
create policy "Owners and row owners can select diagrams" on public.diagrams for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert diagrams" on public.diagrams;
create policy "Row owners can insert diagrams" on public.diagrams for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can update diagrams" on public.diagrams;
create policy "Owners and row owners can update diagrams" on public.diagrams for update to authenticated using ((select public.is_owner()) or user_id = (select auth.uid())) with check ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Owners and row owners can delete diagrams" on public.diagrams;
create policy "Owners and row owners can delete diagrams" on public.diagrams for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

drop policy if exists "Owners and row owners can select note versions" on public.note_versions;
create policy "Owners and row owners can select note versions" on public.note_versions for select to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));
drop policy if exists "Row owners can insert note versions" on public.note_versions;
create policy "Row owners can insert note versions" on public.note_versions for insert to authenticated with check (((select public.is_owner()) or user_id = (select auth.uid())) and not (select public.is_banned()));
drop policy if exists "Owners and row owners can delete note versions" on public.note_versions;
create policy "Owners and row owners can delete note versions" on public.note_versions for delete to authenticated using ((select public.is_owner()) or user_id = (select auth.uid()));

create index if not exists quick_captures_user_id_idx on public.quick_captures (user_id);
create index if not exists quick_captures_created_at_idx on public.quick_captures (created_at desc);
create index if not exists quick_captures_updated_at_idx on public.quick_captures (updated_at desc);
create index if not exists quick_captures_type_idx on public.quick_captures (capture_type);
create index if not exists quick_captures_topic_idx on public.quick_captures (topic_guess);
create index if not exists quick_captures_tags_gin_idx on public.quick_captures using gin (tags);
create index if not exists problem_logs_user_id_idx on public.problem_logs (user_id);
create index if not exists problem_logs_status_idx on public.problem_logs (status);
create index if not exists problem_logs_olympiad_idx on public.problem_logs (olympiad);
create index if not exists problem_logs_updated_at_idx on public.problem_logs (updated_at desc);
create index if not exists problem_logs_tags_gin_idx on public.problem_logs using gin (tags);
create index if not exists problem_logs_linked_note_ids_gin_idx on public.problem_logs using gin (linked_note_ids);
create index if not exists mistake_logs_user_id_idx on public.mistake_logs (user_id);
create index if not exists mistake_logs_topic_idx on public.mistake_logs (topic);
create index if not exists mistake_logs_type_idx on public.mistake_logs (mistake_type);
create index if not exists mistake_logs_resolved_idx on public.mistake_logs (is_resolved);
create index if not exists mistake_logs_updated_at_idx on public.mistake_logs (updated_at desc);
create index if not exists mistake_logs_linked_note_ids_gin_idx on public.mistake_logs using gin (linked_note_ids);
create index if not exists note_links_user_id_idx on public.note_links (user_id);
create index if not exists note_links_source_idx on public.note_links (source_note_id);
create index if not exists note_links_target_idx on public.note_links (target_note_id);
create index if not exists note_links_relation_idx on public.note_links (relation_type);
create index if not exists note_reviews_user_id_idx on public.note_reviews (user_id);
create index if not exists note_reviews_note_id_idx on public.note_reviews (note_id);
create index if not exists note_reviews_next_review_idx on public.note_reviews (next_review_at);
create index if not exists note_reviews_status_idx on public.note_reviews (review_status);
create index if not exists diagrams_user_id_idx on public.diagrams (user_id);
create index if not exists diagrams_note_id_idx on public.diagrams (note_id);
create index if not exists diagrams_created_at_idx on public.diagrams (created_at desc);
create index if not exists note_versions_user_id_idx on public.note_versions (user_id);
create index if not exists note_versions_note_id_idx on public.note_versions (note_id);
create index if not exists note_versions_created_at_idx on public.note_versions (created_at desc);
