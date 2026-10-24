-- Mapa de automação, versão 2 (2026-10-24): "onde perdes clientes".
-- Projeto Supabase "Claude", tabela public.mapas. Corre-se no painel (SQL Editor), pelo Celso.
-- NÃO apaga colunas nem dados. As respostas antigas ficam com versao_mapa = 1.
-- Ordem de publicação: este SQL → API (Landing_Page_Diagnostico, api/mapa.js) → site.

-- ══════════════════════════════════════════════════════════════════
-- PASSO 0 — Inspeção (feita a 2026-10-24; o resultado está no passo 1.4 e 1.5).
-- Serve para confirmar que colunas são NOT NULL e que CHECKs existem
-- (sobretudo em papel e preocupacao, cujos valores mudam).
-- ══════════════════════════════════════════════════════════════════

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'mapas'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.mapas'::regclass
order by conname;

-- ══════════════════════════════════════════════════════════════════
-- PASSO 1 — Migração mapas_versao_2.
-- ══════════════════════════════════════════════════════════════════

begin;

-- 1.1 Colunas novas. versao_mapa nasce com 1 em todas as linhas que já existem.
alter table public.mapas
  add column if not exists versao_mapa smallint not null default 1,
  add column if not exists setor text,
  add column if not exists setor_outro text,
  add column if not exists canais text[],
  add column if not exists contactos_semana text,
  add column if not exists tempo_resposta text,
  add column if not exists fora_horas text,
  add column if not exists seguimento text,
  add column if not exists marcacoes boolean,
  add column if not exists faltas_semana text,
  add column if not exists horas_semana text,
  add column if not exists valor_cliente text,
  add column if not exists urgencia text,
  add column if not exists referencia_cliente_ano integer,
  add column if not exists pontos_perda text[],
  add column if not exists servicos_sugeridos text[];

-- 1.2 As colunas da versão 1 que a versão 2 não preenche passam a aceitar null.
-- Se uma já aceitar null, a linha não faz nada. custo_hora e os totais ficam null quando a
-- pessoa não dá os números. Os dados que lá estão não mudam.
alter table public.mapas
  alter column pessoas drop not null,
  alter column tarefa_1 drop not null,
  alter column horas_1 drop not null,
  alter column tarefa_2 drop not null,
  alter column horas_2 drop not null,
  alter column tarefa_3 drop not null,
  alter column horas_3 drop not null,
  alter column custo_hora drop not null,
  alter column nivel_ia drop not null,
  alter column maior_perda drop not null,
  alter column total_horas_ano drop not null,
  alter column total_custo_mes drop not null,
  alter column total_custo_ano drop not null;

-- 1.3 Regras da versão 2. Só se aplicam às linhas com versao_mapa = 2: as antigas passam sempre.
alter table public.mapas
  add constraint mapas_versao_valida check (versao_mapa in (1, 2)),
  add constraint mapas_v2_valores check (
    versao_mapa <> 2 or (
      setor in ('imobiliaria', 'saude', 'estetica', 'ginasio', 'escola', 'oficina', 'domicilio',
                'restauracao', 'contabilidade', 'comercio', 'outro')
      and (setor <> 'outro' or char_length(setor_outro) between 1 and 80)
      and papel in ('dono', 'responsavel', 'outro')
      and canais is not null and cardinality(canais) > 0
      and canais <@ array['whatsapp', 'telefone', 'formulario', 'email', 'portais', 'redes']::text[]
      and contactos_semana in ('menos_10', '10_30', '30_100', 'mais_100')
      and tempo_resposta in ('minutos', 'ate_1h', 'mesmo_dia', 'dia_seguinte', 'nao_sei')
      and fora_horas in ('ninguem', 'eu_noite', 'automatica', 'alguem')
      and seguimento in ('sempre', 'as_vezes', 'quase_nunca')
      and marcacoes is not null
      and (case when marcacoes then faltas_semana in ('nenhuma', '1_2', '3_5', 'mais_5') else faltas_semana is null end)
      and (horas_semana is null or horas_semana in ('menos_5', '5_10', '10_20', 'mais_20'))
      and (custo_hora is null or custo_hora in ('menos_10', '10_15', '15_20', 'mais_20'))
      and (valor_cliente is null or valor_cliente in ('menos_100', '100_500', '500_2000', 'mais_2000'))
      and preocupacao in ('custo', 'dados', 'ia_erra')
      and urgencia in ('este_mes', '3_meses', 'explorar')
    )
  );

-- 1.4 Os CHECK de papel e preocupacao só aceitavam os valores da versão 1 (inspeção de
-- 2026-10-24). Passam a aceitar os da versão 1 e os da versão 2. Nenhuma linha muda.
alter table public.mapas drop constraint mapas_papel_check;
alter table public.mapas add constraint mapas_papel_check
  check (papel = any (array['dono', 'chefia', 'equipa', 'responsavel', 'outro']));
alter table public.mapas drop constraint mapas_preocupacao_check;
alter table public.mapas add constraint mapas_preocupacao_check
  check (preocupacao = any (array['custo', 'dados', 'equipa', 'ia_erra']));

-- 1.5 mapas_motivo_check limitava o motivo a 300 caracteres, mas o site, a API e o
-- mapas_motivo_valido aceitam até 400 (decisão de 2026-10-11): um motivo com 301 a 400
-- caracteres passava no site e falhava ao gravar. O mapas_motivo_valido já cobre 15 a 400.
alter table public.mapas drop constraint mapas_motivo_check;

commit;

-- ══════════════════════════════════════════════════════════════════
-- PASSO 2 — Confirmação, depois do commit.
-- ══════════════════════════════════════════════════════════════════

select versao_mapa, count(*) from public.mapas group by versao_mapa;
