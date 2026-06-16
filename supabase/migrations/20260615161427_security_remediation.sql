create extension if not exists pgcrypto;

create table if not exists public.security_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, identifier_hash, window_start),
  constraint security_rate_limits_scope_check check (length(scope) between 1 and 80),
  constraint security_rate_limits_identifier_hash_check check (identifier_hash ~ '^[a-f0-9]{64}$'),
  constraint security_rate_limits_count_check check (count >= 0)
);

alter table public.security_rate_limits enable row level security;

create index if not exists security_rate_limits_window_idx
on public.security_rate_limits (window_start desc);

create or replace function public.text_array_items_lte(p_values text[], max_length integer)
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(length(item) <= max_length), true)
  from unnest(coalesce(p_values, '{}'::text[])) as item;
$$;

create or replace function public.check_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_scope is null
    or length(p_scope) = 0
    or length(p_scope) > 80
    or p_identifier_hash is null
    or p_identifier_hash !~ '^[a-f0-9]{64}$'
    or p_limit < 1
    or p_window_seconds < 60
    or p_window_seconds > 86400
  then
    return false;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.security_rate_limits (scope, identifier_hash, window_start, count, updated_at)
  values (p_scope, p_identifier_hash, v_window_start, 1, now())
  on conflict (scope, identifier_hash, window_start)
  do update set
    count = public.security_rate_limits.count + 1,
    updated_at = now()
  returning count into v_count;

  delete from public.security_rate_limits
  where window_start < now() - interval '2 days';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;

create or replace function public.enforce_suggestion_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_identifier_hash text;
begin
  if new.contributor_id is null then
    return new;
  end if;

  v_identifier_hash := encode(digest(new.contributor_id::text, 'sha256'), 'hex');

  if not public.check_rate_limit('contributions:direct:user:hour', v_identifier_hash, 5, 3600) then
    raise exception 'Rate limit exceeded for suggestions.'
      using errcode = 'P0001';
  end if;

  if not public.check_rate_limit('contributions:direct:user:day', v_identifier_hash, 20, 86400) then
    raise exception 'Rate limit exceeded for suggestions.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists suggestions_rate_limit_insert on public.suggestions;
create trigger suggestions_rate_limit_insert
before insert on public.suggestions
for each row execute function public.enforce_suggestion_insert_rate_limit();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suggestions_length_limits_check' and conrelid = 'public.suggestions'::regclass) then
    alter table public.suggestions add constraint suggestions_length_limits_check check (
      length(trim(title)) between 1 and 180
      and length(trim(body_markdown)) between 1 and 50000
      and (reason is null or length(reason) <= 2000)
      and (source_reference is null or length(source_reference) <= 500)
      and cardinality(tags) <= 20
      and public.text_array_items_lte(tags, 60)
      and cardinality(diagram_urls) <= 5
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contribution_comments_body_length_check' and conrelid = 'public.contribution_comments'::regclass) then
    alter table public.contribution_comments add constraint contribution_comments_body_length_check check (
      length(trim(body)) between 1 and 4000
    );
  end if;
end;
$$;

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg']
where id in ('note-diagrams', 'suggestion-diagrams');
