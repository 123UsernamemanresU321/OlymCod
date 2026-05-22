create table if not exists public.note_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  note_type text not null,
  topic text,
  template_markdown text not null,
  default_recognition_triggers text[] default '{}'::text[] not null,
  default_false_uses text[] default '{}'::text[] not null,
  default_tags text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_page text not null,
  config jsonb not null default '{}'::jsonb,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists note_templates_set_updated_at on public.note_templates;
create trigger note_templates_set_updated_at before update on public.note_templates for each row execute function public.set_updated_at();

drop trigger if exists saved_views_set_updated_at on public.saved_views;
create trigger saved_views_set_updated_at before update on public.saved_views for each row execute function public.set_updated_at();

alter table public.note_templates enable row level security;
alter table public.saved_views enable row level security;

drop policy if exists "Users can select their own note templates" on public.note_templates;
create policy "Users can select their own note templates"
on public.note_templates for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own note templates" on public.note_templates;
create policy "Users can insert their own note templates"
on public.note_templates for insert
to authenticated
with check (user_id = (select auth.uid()) and not (select public.is_banned()));

drop policy if exists "Users can update their own note templates" on public.note_templates;
create policy "Users can update their own note templates"
on public.note_templates for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own note templates" on public.note_templates;
create policy "Users can delete their own note templates"
on public.note_templates for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can select their own saved views" on public.saved_views;
create policy "Users can select their own saved views"
on public.saved_views for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own saved views" on public.saved_views;
create policy "Users can insert their own saved views"
on public.saved_views for insert
to authenticated
with check (user_id = (select auth.uid()) and not (select public.is_banned()));

drop policy if exists "Users can update their own saved views" on public.saved_views;
create policy "Users can update their own saved views"
on public.saved_views for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own saved views" on public.saved_views;
create policy "Users can delete their own saved views"
on public.saved_views for delete
to authenticated
using (user_id = (select auth.uid()));

create index if not exists note_templates_user_id_idx on public.note_templates (user_id);
create index if not exists note_templates_note_type_idx on public.note_templates (note_type);
create index if not exists note_templates_updated_at_idx on public.note_templates (updated_at desc);
create index if not exists note_templates_tags_gin_idx on public.note_templates using gin (default_tags);
create index if not exists saved_views_user_id_idx on public.saved_views (user_id);
create index if not exists saved_views_target_page_idx on public.saved_views (target_page);
create index if not exists saved_views_updated_at_idx on public.saved_views (updated_at desc);
create index if not exists saved_views_is_default_idx on public.saved_views (is_default);
