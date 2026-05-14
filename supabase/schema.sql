create extension if not exists pgcrypto;

create or replace function public.configured_owner_email()
returns text
language sql
stable
as $$
  select 'erichuang.shangjing@outlook.com'::text;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'contributor',
  is_banned boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

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
  visibility text not null default 'private',
  is_favorite boolean default false not null,
  is_archived boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  published_at timestamptz,
  unique (user_id, slug)
);

alter table public.notes add column if not exists visibility text not null default 'private';
alter table public.notes add column if not exists published_at timestamptz;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references auth.users(id) on delete set null,
  target_note_id uuid references public.notes(id) on delete set null,
  title text not null,
  suggestion_type text not null,
  topic text,
  note_type text,
  difficulty int check (difficulty between 1 and 12),
  tags text[] default '{}'::text[] not null,
  body_markdown text not null,
  reason text,
  source_reference text,
  diagram_urls text[] default '{}'::text[] not null,
  status text not null default 'pending',
  owner_feedback text,
  owner_internal_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  merged_note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.contribution_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now() not null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create table if not exists public.site_settings (
  id text primary key default 'main',
  owner_id uuid references auth.users(id),
  public_notes_enabled boolean default false not null,
  contributions_enabled boolean default false not null,
  require_login_to_contribute boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

insert into public.site_settings (id)
values ('main')
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_role_check check (
      role in ('owner', 'trusted_contributor', 'contributor', 'viewer', 'banned')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_topic_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes add constraint notes_topic_check check (
      topic in ('Number Theory', 'Combinatorics', 'Algebra', 'Geometry', 'Inequalities', 'Formula Bank', 'Problem Patterns', 'Inbox')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_note_type_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes add constraint notes_note_type_check check (
      note_type in ('Theorem', 'Lemma', 'Technique', 'Formula', 'Trick', 'Common Mistake', 'Problem Pattern', 'Definition', 'Example', 'Inbox')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_visibility_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes add constraint notes_visibility_check check (visibility in ('private', 'public'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_required_text_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes add constraint notes_required_text_check check (
      length(trim(title)) > 0 and length(trim(slug)) > 0 and length(trim(body_markdown)) > 0
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_slug_format_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes add constraint notes_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'suggestions_type_check' and conrelid = 'public.suggestions'::regclass) then
    alter table public.suggestions add constraint suggestions_type_check check (
      suggestion_type in ('typo', 'correction', 'addition', 'new_note', 'diagram', 'formula', 'explanation', 'example', 'related_technique', 'common_mistake', 'other')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'suggestions_status_check' and conrelid = 'public.suggestions'::regclass) then
    alter table public.suggestions add constraint suggestions_status_check check (
      status in ('pending', 'approved', 'rejected', 'needs_changes', 'merged', 'spam')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'suggestions_required_text_check' and conrelid = 'public.suggestions'::regclass) then
    alter table public.suggestions add constraint suggestions_required_text_check check (
      length(trim(title)) > 0 and length(trim(body_markdown)) > 0
    );
  end if;
end $$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case when p.is_banned or p.role = 'banned' then 'banned' else p.role end
      from public.profiles p
      where p.id = (select auth.uid())
    ),
    'viewer'
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner';
$$;

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'banned';
$$;

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  next_role text;
  profile_row public.profiles;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  next_role := case
    when current_email = lower(public.configured_owner_email()) then 'owner'
    else 'contributor'
  end;

  insert into public.profiles (id, email, display_name, role, is_banned)
  values (
    current_id,
    current_email,
    nullif(split_part(current_email, '@', 1), ''),
    next_role,
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = case
      when excluded.email = lower(public.configured_owner_email()) then 'owner'
      else public.profiles.role
    end,
    updated_at = now()
  returning * into profile_row;

  if profile_row.role = 'owner' then
    update public.site_settings
    set owner_id = profile_row.id
    where id = 'main' and owner_id is null;
  end if;

  return profile_row;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_email text := lower(coalesce(new.email, ''));
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new_email,
    nullif(split_part(new_email, '@', 1), ''),
    case when new_email = lower(public.configured_owner_email()) then 'owner' else 'contributor' end
  )
  on conflict (id) do nothing;

  if new_email = lower(public.configured_owner_email()) then
    update public.site_settings
    set owner_id = new.id
    where id = 'main' and owner_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    new.email := old.email;
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;

  if old.id = (select auth.uid()) and old.role = 'owner' and (new.role <> 'owner' or new.is_banned) then
    raise exception 'Owners cannot demote or ban themselves';
  end if;

  if old.role = 'owner' and new.role <> 'owner' and (
    select count(*) from public.profiles where role = 'owner' and is_banned = false and id <> old.id
  ) = 0 then
    raise exception 'Cannot remove the last owner';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_protect_update on public.profiles;
create trigger profiles_protect_update
before update on public.profiles
for each row execute function public.protect_profile_update();

create or replace function public.protect_suggestion_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    new.contributor_id := old.contributor_id;
    new.target_note_id := old.target_note_id;
    new.status := old.status;
    new.owner_feedback := old.owner_feedback;
    new.owner_internal_note := old.owner_internal_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.merged_note_id := old.merged_note_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists suggestions_protect_update on public.suggestions;
create trigger suggestions_protect_update
before update on public.suggestions
for each row execute function public.protect_suggestion_update();

create or replace function public.audit_suggestion_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (
    new.contributor_id,
    'suggestion_created',
    'suggestion',
    new.id,
    jsonb_build_object('suggestion_type', new.suggestion_type, 'target_note_id', new.target_note_id)
  );
  return new;
end;
$$;

drop trigger if exists suggestions_audit_created on public.suggestions;
create trigger suggestions_audit_created
after insert on public.suggestions
for each row execute function public.audit_suggestion_created();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.suggestions enable row level security;
alter table public.contribution_comments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Profiles are readable by self or owner" on public.profiles;
create policy "Profiles are readable by self or owner"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select public.is_owner()));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (
  id = (select auth.uid())
  and role in ('contributor', 'viewer')
  and is_banned = false
);

drop policy if exists "Profiles are editable by self or owner" on public.profiles;
create policy "Profiles are editable by self or owner"
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or (select public.is_owner()))
with check (id = (select auth.uid()) or (select public.is_owner()));

drop policy if exists "Owners can select all notes and public can select published notes" on public.notes;
create policy "Owners can select all notes and public can select published notes"
on public.notes for select
to anon, authenticated
using (
  (select public.is_owner())
  or (
    visibility = 'public'
    and is_archived = false
    and exists (
      select 1 from public.site_settings s
      where s.id = 'main' and s.public_notes_enabled = true
    )
  )
);

drop policy if exists "Only owners can insert notes" on public.notes;
create policy "Only owners can insert notes"
on public.notes for insert
to authenticated
with check ((select public.is_owner()));

drop policy if exists "Only owners can update notes" on public.notes;
create policy "Only owners can update notes"
on public.notes for update
to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

drop policy if exists "Only owners can delete notes" on public.notes;
create policy "Only owners can delete notes"
on public.notes for delete
to authenticated
using ((select public.is_owner()));

drop policy if exists "Owners and contributors can select suggestions" on public.suggestions;
create policy "Owners and contributors can select suggestions"
on public.suggestions for select
to authenticated
using ((select public.is_owner()) or contributor_id = (select auth.uid()));

drop policy if exists "Non-banned users can insert suggestions" on public.suggestions;
create policy "Non-banned users can insert suggestions"
on public.suggestions for insert
to authenticated
with check (
  contributor_id = (select auth.uid())
  and status = 'pending'
  and not (select public.is_banned())
  and exists (
    select 1 from public.site_settings s
    where s.id = 'main' and s.contributions_enabled = true
  )
);

drop policy if exists "Owners can update all suggestions and contributors can revise pending suggestions" on public.suggestions;
create policy "Owners can update all suggestions and contributors can revise pending suggestions"
on public.suggestions for update
to authenticated
using (
  (select public.is_owner())
  or (
    contributor_id = (select auth.uid())
    and status in ('pending', 'needs_changes')
    and not (select public.is_banned())
  )
)
with check (
  (select public.is_owner())
  or (
    contributor_id = (select auth.uid())
    and status in ('pending', 'needs_changes')
    and not (select public.is_banned())
  )
);

drop policy if exists "Only owners can delete suggestions" on public.suggestions;
create policy "Only owners can delete suggestions"
on public.suggestions for delete
to authenticated
using ((select public.is_owner()));

drop policy if exists "Owners and original contributors can read comments" on public.contribution_comments;
create policy "Owners and original contributors can read comments"
on public.contribution_comments for select
to authenticated
using (
  (select public.is_owner())
  or exists (
    select 1 from public.suggestions s
    where s.id = suggestion_id and s.contributor_id = (select auth.uid())
  )
);

drop policy if exists "Owners and original contributors can create comments" on public.contribution_comments;
create policy "Owners and original contributors can create comments"
on public.contribution_comments for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and not (select public.is_banned())
  and (
    (select public.is_owner())
    or exists (
      select 1 from public.suggestions s
      where s.id = suggestion_id and s.contributor_id = (select auth.uid())
    )
  )
);

drop policy if exists "Only owners can read audit logs" on public.audit_logs;
create policy "Only owners can read audit logs"
on public.audit_logs for select
to authenticated
using ((select public.is_owner()));

drop policy if exists "Only owners can insert audit logs" on public.audit_logs;
create policy "Only owners can insert audit logs"
on public.audit_logs for insert
to authenticated
with check ((select public.is_owner()));

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select
to anon, authenticated
using (id = 'main');

drop policy if exists "Only owners can update site settings" on public.site_settings;
create policy "Only owners can update site settings"
on public.site_settings for update
to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

drop policy if exists "Only owners can insert site settings" on public.site_settings;
create policy "Only owners can insert site settings"
on public.site_settings for insert
to authenticated
with check ((select public.is_owner()));

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_topic_idx on public.notes (topic);
create index if not exists notes_note_type_idx on public.notes (note_type);
create index if not exists notes_visibility_idx on public.notes (visibility);
create index if not exists notes_difficulty_idx on public.notes (difficulty);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);
create index if not exists notes_public_slug_idx on public.notes (slug) where visibility = 'public' and is_archived = false;
create index if not exists notes_tags_gin_idx on public.notes using gin (tags);
create index if not exists suggestions_contributor_id_idx on public.suggestions (contributor_id);
create index if not exists suggestions_target_note_id_idx on public.suggestions (target_note_id);
create index if not exists suggestions_status_idx on public.suggestions (status);
create index if not exists suggestions_type_idx on public.suggestions (suggestion_type);
create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
