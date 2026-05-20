alter table public.diagrams add column if not exists title text;
alter table public.diagrams add column if not exists alt_text text;
alter table public.diagrams add column if not exists tags text[] default '{}'::text[] not null;

create index if not exists diagrams_tags_gin_idx on public.diagrams using gin (tags);
