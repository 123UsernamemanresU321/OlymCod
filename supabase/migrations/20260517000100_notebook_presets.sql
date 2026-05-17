create table if not exists public.notebook_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists notebook_presets_set_updated_at on public.notebook_presets;
create trigger notebook_presets_set_updated_at
before update on public.notebook_presets
for each row execute function public.set_updated_at();

alter table public.notebook_presets enable row level security;

drop policy if exists "Users can select their own notebook presets" on public.notebook_presets;
create policy "Users can select their own notebook presets"
on public.notebook_presets for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own notebook presets" on public.notebook_presets;
create policy "Users can insert their own notebook presets"
on public.notebook_presets for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own notebook presets" on public.notebook_presets;
create policy "Users can update their own notebook presets"
on public.notebook_presets for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own notebook presets" on public.notebook_presets;
create policy "Users can delete their own notebook presets"
on public.notebook_presets for delete
to authenticated
using (user_id = (select auth.uid()));

create index if not exists notebook_presets_user_id_idx on public.notebook_presets (user_id);
create index if not exists notebook_presets_created_at_idx on public.notebook_presets (created_at desc);
create index if not exists notebook_presets_updated_at_idx on public.notebook_presets (updated_at desc);
create index if not exists notebook_presets_is_default_idx on public.notebook_presets (is_default);
