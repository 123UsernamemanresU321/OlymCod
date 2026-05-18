alter table public.notes
  add column if not exists recognition_triggers text[] default '{}'::text[] not null,
  add column if not exists false_uses text[] default '{}'::text[] not null;

alter table public.problem_logs
  add column if not exists topic text,
  add column if not exists mistake_category text;

alter table public.problem_logs alter column status set default 'attempted';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'problem_logs_mistake_category_check' and conrelid = 'public.problem_logs'::regclass) then
    alter table public.problem_logs add constraint problem_logs_mistake_category_check check (
      mistake_category is null or mistake_category in ('Did not know theorem', 'Knew theorem but did not recognize it', 'Forgot condition', 'Algebra slip', 'False assumption', 'Weak diagram', 'Bad casework', 'Misread problem', 'Overcomplicated solution', 'Gave up too early', 'Incomplete proof', 'Other')
    );
  end if;
end $$;

create table if not exists public.revision_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  selected_note_ids uuid[] default '{}'::uuid[] not null,
  selected_problem_ids uuid[] default '{}'::uuid[] not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'revision_packs_required_name_check' and conrelid = 'public.revision_packs'::regclass) then
    alter table public.revision_packs add constraint revision_packs_required_name_check check (length(trim(name)) > 0);
  end if;
end $$;

drop trigger if exists revision_packs_set_updated_at on public.revision_packs;
create trigger revision_packs_set_updated_at
before update on public.revision_packs
for each row execute function public.set_updated_at();

drop trigger if exists note_links_insert_reciprocal on public.note_links;
drop trigger if exists note_links_delete_reciprocal on public.note_links;
drop function if exists public.ensure_reciprocal_note_link();
drop function if exists public.delete_reciprocal_note_link();
drop function if exists public.inverse_note_link_relation(text);

alter table public.revision_packs enable row level security;

drop policy if exists "Users can select their own revision packs" on public.revision_packs;
create policy "Users can select their own revision packs"
on public.revision_packs for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own revision packs" on public.revision_packs;
create policy "Users can insert their own revision packs"
on public.revision_packs for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own revision packs" on public.revision_packs;
create policy "Users can update their own revision packs"
on public.revision_packs for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own revision packs" on public.revision_packs;
create policy "Users can delete their own revision packs"
on public.revision_packs for delete
to authenticated
using (user_id = (select auth.uid()));

create index if not exists notes_recognition_triggers_gin_idx on public.notes using gin (recognition_triggers);
create index if not exists notes_false_uses_gin_idx on public.notes using gin (false_uses);
create index if not exists problem_logs_topic_idx on public.problem_logs (topic);
create index if not exists problem_logs_mistake_category_idx on public.problem_logs (mistake_category);
create index if not exists revision_packs_user_id_idx on public.revision_packs (user_id);
create index if not exists revision_packs_created_at_idx on public.revision_packs (created_at desc);
create index if not exists revision_packs_updated_at_idx on public.revision_packs (updated_at desc);
