-- Ranking global de Scoundrel. Pega esto en Supabase → SQL Editor → Run.
-- Lectura pública; la escritura solo pasa por submit_score(), que valida los datos.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(name) between 1 and 16),
  score       integer     not null check (score between -250 and 30),
  deck        text        not null default 'classic' check (char_length(deck) between 1 and 24),
  rule        text        not null default 'strict' check (rule in ('strict', 'lte')),
  won         boolean     not null,
  created_at  timestamptz not null default now()
);

create index if not exists scores_rank_idx on public.scores (score desc, created_at asc);
create index if not exists scores_name_time_idx on public.scores (name, created_at desc);

alter table public.scores enable row level security;

drop policy if exists "scores are public" on public.scores;
create policy "scores are public" on public.scores for select to anon, authenticated using (true);

-- Sin políticas de insert/update/delete: anon no puede escribir directamente.
revoke insert, update, delete on public.scores from anon, authenticated;

create or replace function public.submit_score(p_name text, p_score integer, p_deck text, p_won boolean, p_rule text default 'strict')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 16 then
    raise exception 'Nombre no válido';
  end if;
  -- Al ganar se acaba con 1..20 de vida (+ hasta 10 de bonus); al perder, 0 o menos.
  if p_won and (p_score < 1 or p_score > 30) then raise exception 'Puntuación no válida'; end if;
  if not p_won and (p_score > 0 or p_score < -250) then raise exception 'Puntuación no válida'; end if;
  if p_rule not in ('strict', 'lte') then raise exception 'Regla no válida'; end if;
  if exists (select 1 from scores where name = v_name and created_at > now() - interval '30 seconds') then
    raise exception 'Espera unos segundos antes de enviar otra puntuación';
  end if;
  insert into scores (name, score, deck, rule, won)
  values (v_name, p_score, left(coalesce(nullif(p_deck, ''), 'classic'), 24), p_rule, p_won);
end;
$$;

revoke all on function public.submit_score(text, integer, text, boolean, text) from public;
grant execute on function public.submit_score(text, integer, text, boolean, text) to anon, authenticated;
