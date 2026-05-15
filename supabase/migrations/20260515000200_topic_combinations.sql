do $$
begin
  if exists (select 1 from pg_constraint where conname = 'notes_topic_check' and conrelid = 'public.notes'::regclass) then
    alter table public.notes drop constraint notes_topic_check;
  end if;

  alter table public.notes add constraint notes_topic_check check (
    topic in ('Formula Bank', 'Problem Patterns', 'Inbox')
    or topic ~ '^(Number Theory|Combinatorics|Algebra|Geometry|Inequalities)( \+ (Number Theory|Combinatorics|Algebra|Geometry|Inequalities))*$'
  );
end $$;
