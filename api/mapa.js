// Grava o Mapa de automação (celsopereira.pt/mapa) em public.mapas, projecto Supabase "Claude".
// Chamado por rewrite: celsopereira.pt/api/mapa → este projecto (/api/mapa).
// A chave secreta só existe aqui. O browser nunca fala com o Supabase.
//
// POST /api/mapa, JSON:
//   { nome, empresa, papel?, email, consentimento: true, pessoas, tarefas: [3 ids], tarefa_outra?,
//     horas: { id: intervalo }, custo_hora, nivel_ia, preocupacao, motivo? }
// Os totais NÃO vêm do browser: são recalculados aqui (mesma conta do src/scripts/mapa-calculo.ts
// do site — se mudar lá, muda aqui).
// Também cria a lead em public.leads (origem "mapa") se o email ainda não existir, para a ficha
// chegar ao Notion. Uma lead que já existia não é alterada; o mapa fica ligado a ela.
// Responde só { ok: true } ou { ok: false }. Sem consentimento, não grava nada.

const MAX_BYTES = 10 * 1024;

const PESSOAS = ['1_3', '4_8', '9_15', 'mais_15'];
const TAREFAS = ['relatorios', 'folhas_calculo', 'emails', 'propostas', 'atas', 'introducao_dados', 'atendimento', 'chamadas', 'outra'];
// O site obriga o papel. Aqui é opcional (grava null), para nenhum mapa se perder enquanto
// o site e esta API não estão publicados ao mesmo tempo. Valores fora da lista são recusados.
const PAPEL = ['dono', 'chefia', 'equipa'];
const HORAS_SEMANA = { '1_2': 1.5, '2_5': 3.5, '5_10': 7.5, mais_10: 10 };
const CUSTO_HORA = { menos_10: 8, '10_15': 12.5, '15_20': 17.5, mais_20: 22 };
const NIVEL_IA = ['ninguem', 'so_eu', 'algumas', 'todos'];
const PREOCUPACAO = ['custo', 'dados', 'equipa'];
const NOMES = {
  relatorios: 'Relatórios',
  folhas_calculo: 'Folhas de cálculo',
  emails: 'Emails e respostas repetidas',
  propostas: 'Propostas e orçamentos',
  atas: 'Atas e resumos de reuniões',
  introducao_dados: 'Introdução de dados em software',
  atendimento: 'Atendimento e marcações',
  chamadas: 'Chamadas e seguimento de contactos',
};
// O texto exacto da caixa, guardado com cada mapa como prova do consentimento.
const TEXTO_CONSENTIMENTO =
  'Aceito que o Celso Pereira guarde estes dados para me mostrar o mapa e me contactar sobre ele.';

const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const falhar = (res, status) => res.status(status).json({ ok: false });
const texto = (v, max) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null);
const opcional = (v, max) => (v === undefined || v === null || v === '' ? '' : texto(v, max));

function validar(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (b.consentimento !== true) return null;

  const nome = texto(b.nome, 120);
  const empresa = texto(b.empresa, 120);
  const email = typeof b.email === 'string' && b.email.trim().length <= 254 && EMAIL_RE.test(b.email.trim()) ? b.email.trim() : null;
  if (!nome || !empresa || !email) return null;

  const semPapel = b.papel === undefined || b.papel === null || b.papel === '';
  if (!semPapel && !PAPEL.includes(b.papel)) return null;
  const papel = semPapel ? null : b.papel;

  if (!PESSOAS.includes(b.pessoas)) return null;
  if (!Array.isArray(b.tarefas) || b.tarefas.length !== 3 || new Set(b.tarefas).size !== 3) return null;
  if (!b.tarefas.every((t) => TAREFAS.includes(t))) return null;

  const temOutra = b.tarefas.includes('outra');
  const tarefaOutra = temOutra ? texto(b.tarefa_outra, 80) : null;
  if (temOutra && !tarefaOutra) return null;

  if (!b.horas || typeof b.horas !== 'object' || Array.isArray(b.horas)) return null;
  if (!b.tarefas.every((t) => typeof b.horas[t] === 'string' && Object.hasOwn(HORAS_SEMANA, b.horas[t]))) return null;
  if (!(typeof b.custo_hora === 'string' && Object.hasOwn(CUSTO_HORA, b.custo_hora))) return null;
  if (!NIVEL_IA.includes(b.nivel_ia) || !PREOCUPACAO.includes(b.preocupacao)) return null;

  const motivo = opcional(b.motivo, 300);
  if (motivo === null) return null;

  return { ...b, nome, empresa, papel, email, tarefaOutra, motivo: motivo || null };
}

const dezenas = (n) => Math.round(n / 10) * 10;

function calcular(tarefas, horas, custo) {
  const c = CUSTO_HORA[custo];
  const linhas = tarefas.map((id) => ({ id, h: HORAS_SEMANA[horas[id]] }));
  const somaH = linhas.reduce((t, l) => t + l.h, 0);
  return {
    total_horas_ano: Math.round(somaH * 48),
    total_custo_mes: dezenas(somaH * c * 4),
    total_custo_ano: dezenas(somaH * c * 48),
    // sort estável: em empate fica a primeira escolhida.
    maior_perda: [...linhas].sort((a, b) => b.h - a.h)[0].id,
  };
}

const euros = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ── Supabase (PostgREST) ─────────────────────────────────────

function cabecalhos(chave) {
  const h = { apikey: chave, 'Content-Type': 'application/json' };
  if (chave.startsWith('eyJ')) h.Authorization = 'Bearer ' + chave;
  return h;
}

async function procurarLead(url, chave, email) {
  const padrao = email.replace(/[\\%_]/g, '\\$&');
  const res = await fetch(`${url}/rest/v1/leads?select=id&limit=1&email=ilike.${encodeURIComponent(padrao)}`, {
    headers: cabecalhos(chave),
  });
  if (!res.ok) throw new Error('procurar: ' + res.status + ' ' + (await res.text()));
  const linhas = await res.json();
  return linhas[0] ? linhas[0].id : null;
}

/** Devolve o id da lead (nova ou já existente). Uma lead existente não é alterada. */
async function garantirLead(url, chave, { nome, email }, resumo) {
  const existente = await procurarLead(url, chave, email);
  if (existente) return existente;
  const res = await fetch(`${url}/rest/v1/leads?select=id`, {
    method: 'POST',
    headers: { ...cabecalhos(chave), Prefer: 'return=representation' },
    body: JSON.stringify({ origem: 'mapa', nome, email, resumo }),
  });
  if (res.status === 409) return procurarLead(url, chave, email); // corrida com outro pedido
  if (!res.ok) throw new Error('lead: ' + res.status + ' ' + (await res.text()));
  const [linha] = await res.json();
  return linha.id;
}

async function inserirMapa(url, chave, mapa) {
  const res = await fetch(`${url}/rest/v1/mapas`, {
    method: 'POST',
    headers: { ...cabecalhos(chave), Prefer: 'return=minimal' },
    body: JSON.stringify(mapa),
  });
  if (!res.ok) throw new Error('mapa: ' + res.status + ' ' + (await res.text()));
}

// ── Handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return falhar(res, 405);
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return falhar(res, 415);
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return falhar(res, 413);

  let body;
  try {
    body = req.body;
  } catch (e) {
    return falhar(res, 400);
  }
  if (body && Buffer.byteLength(JSON.stringify(body)) > MAX_BYTES) return falhar(res, 413);

  const v = validar(body);
  if (!v) return falhar(res, 400);

  const url = process.env.LEADS_SUPABASE_URL;
  const chave = process.env.LEADS_SUPABASE_SECRET;
  if (!url || !chave) {
    console.error('[mapa] faltam LEADS_SUPABASE_URL / LEADS_SUPABASE_SECRET');
    return falhar(res, 500);
  }

  const totais = calcular(v.tarefas, v.horas, v.custo_hora);
  const nomeTarefa = (id) => (id === 'outra' ? v.tarefaOutra : NOMES[id]);
  const resumo =
    `Mapa de automação · ${v.empresa} · ${euros(totais.total_custo_ano)} €/ano · ` +
    `maior perda: ${nomeTarefa(totais.maior_perda)}`;

  try {
    const leadId = await garantirLead(url, chave, v, resumo.slice(0, 1000));
    await inserirMapa(url, chave, {
      lead_id: leadId,
      nome: v.nome,
      empresa: v.empresa,
      papel: v.papel,
      email: v.email,
      consentimento: true,
      consentimento_texto: TEXTO_CONSENTIMENTO,
      pessoas: v.pessoas,
      tarefa_1: v.tarefas[0],
      horas_1: v.horas[v.tarefas[0]],
      tarefa_2: v.tarefas[1],
      horas_2: v.horas[v.tarefas[1]],
      tarefa_3: v.tarefas[2],
      horas_3: v.horas[v.tarefas[2]],
      tarefa_outra: v.tarefaOutra,
      custo_hora: v.custo_hora,
      nivel_ia: v.nivel_ia,
      preocupacao: v.preocupacao,
      motivo: v.motivo,
      ...totais,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[mapa] erro:', err.message);
    return falhar(res, 502);
  }
}
