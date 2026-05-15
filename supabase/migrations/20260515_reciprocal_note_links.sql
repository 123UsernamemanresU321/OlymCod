create or replace function public.inverse_note_link_relation(relation text)
returns text
language sql
immutable
as $$
  select case relation
    when 'generalization' then 'special case'
    when 'special case' then 'generalization'
    when 'stronger version' then 'weaker version'
    when 'weaker version' then 'stronger version'
    when 'commonly confused' then 'commonly confused'
    when 'used together' then 'used together'
    when 'example of' then 'special case'
    when 'prerequisite' then 'used together'
    else 'related'
  end;
$$;

create or replace function public.ensure_reciprocal_note_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.note_links (user_id, source_note_id, target_note_id, relation_type)
  values (
    new.user_id,
    new.target_note_id,
    new.source_note_id,
    public.inverse_note_link_relation(new.relation_type)
  )
  on conflict (user_id, source_note_id, target_note_id, relation_type) do nothing;

  return new;
end;
$$;

create or replace function public.delete_reciprocal_note_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.note_links
  where user_id = old.user_id
    and source_note_id = old.target_note_id
    and target_note_id = old.source_note_id
    and relation_type = public.inverse_note_link_relation(old.relation_type);

  return old;
end;
$$;

drop trigger if exists note_links_insert_reciprocal on public.note_links;
create trigger note_links_insert_reciprocal
after insert on public.note_links
for each row execute function public.ensure_reciprocal_note_link();

drop trigger if exists note_links_delete_reciprocal on public.note_links;
create trigger note_links_delete_reciprocal
after delete on public.note_links
for each row execute function public.delete_reciprocal_note_link();
