// Grava o Mapa de automação (celsopereira.pt/mapa) em public.mapas, projecto Supabase "Claude".
// Chamado por rewrite: celsopereira.pt/api/mapa → este projecto (/api/mapa).
// A chave secreta só existe aqui. O browser nunca fala com o Supabase.
//
// POST /api/mapa, JSON:
//   { nome, empresa, papel?, email, consentimento: true, pessoas, tarefas: [3 ids], tarefa_outra?,
//     horas: { id: intervalo }, custo_hora, nivel_ia, preocupacao, motivo,
//     utm_source?, utm_medium?, utm_campaign?, utm_content?, fbclid? }
// Os parâmetros do link (origem da visita) são opcionais e nunca dão 400: vazio, com mais de 150
// caracteres, com \0 ou com caracteres partidos → null, e o mapa segue. Só vão para mapas.
// O fbclid só pode ir para a Meta (Conversions API) para quem aceitou os cookies de marketing.
// O motivo é obrigatório: 15 a 400 caracteres depois do trim, contados como o char_length do
// CHECK mapas_motivo_valido. Grava-se tal como veio (só trim).
// A validação corre toda antes de qualquer escrita: um pedido recusado não grava nada.
// Os totais NÃO vêm do browser: são recalculados aqui (mesma conta do src/scripts/mapa-calculo.ts
// do site — se mudar lá, muda aqui).
// Também cria a lead em public.leads (origem "mapa") se o email ainda não existir, para a ficha
// chegar ao Notion. O motivo vai em respostas.motivo (propriedade "Frase do Mapa", pela função
// leads-para-notion) e no fim do resumo ("Frase do Mapa: «…»"). Tem de ir na própria lead: o
// gatilho dispara antes de a linha em mapas existir. Uma lead que já existia não é alterada
// (o motivo fica só em mapas); o mapa fica ligado a ela.
// id? é o id do mapa, gerado pelo site uma vez por envio. Se faltar ou não for um UUID, é gerado
// aqui. A gravação é idempotente pelo id: repetir o mesmo envio dá 200 e uma só linha em mapas.
// Responde { ok: true, id } (o site usa-o como eventID do Lead do Meta Pixel) ou { ok: false }.
// Sem consentimento, não grava nada.
// consentimento_emails? (caixa opcional dos emails gerais): sem ela vale false; outro valor que não
// true/false dá 400. Grava-se em mapas, com o texto da caixa quando é true.
//
// PATCH /api/mapa, JSON: { id, email, telefone, consentimento: true }
// Junta o telemóvel (opcional, pedido depois do resultado) ao mapa acabado de gravar. Só actualiza
// mapas.telefone e mapas.telefone_consentimento_em, e só na linha com esse id E esse email, ainda
// sem telefone e criada há menos de 1 hora. Nunca cria linhas, nunca mexe em leads (o número não
// vai para o Notion) e nada aqui contacta a pessoa. Repetir o mesmo número dá 200.
// O número é normalizado para E.164: 9 dígitos a começar por 9, com ou sem +351, → +351…;
// internacional só com '+'. Igual ao CHECK mapas_telefone_e164 e ao src/scripts/mapa.ts do site.
// Responde { ok: true } ou { ok: false } (404 se não houver mapa que corresponda).

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
  'Aceito receber o meu Mapa e emails de acompanhamento sobre ele (posso sair quando quiser). As respostas podem ser usadas de forma anónima para melhorar o serviço.';
// A caixa opcional dos emails gerais (src/data/mapa.ts do site). Os dois textos mudam juntos.
const TEXTO_CONSENTIMENTO_EMAILS = 'Quero receber também ideias para a minha equipa usar IA no dia a dia.';

const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const falhar = (res, status) => res.status(status).json({ ok: false });
const texto = (v, max) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null);
// Pontos de código, como o char_length do Postgres. Recusa \0 e surrogates soltos, que o Postgres
// não grava: o insert em mapas falharia depois de a lead já estar criada.
const MOTIVO_MIN = 15;
const MOTIVO_MAX = 400;
function motivoValido(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  const n = [...t].length;
  if (n < MOTIVO_MIN || n > MOTIVO_MAX || t.includes('\0') || !t.isWellFormed()) return null;
  return t;
}

const PARAMETROS_LINK = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'];
function parametroLink(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  const n = [...t].length;
  if (n === 0 || n > 150 || t.includes('\0') || !t.isWellFormed()) return null;
  return t;
}

// Coluna de criação de public.mapas, para a janela de 1 hora do PATCH.
const COLUNA_CRIADO = 'criado_em';
const JANELA_TELEFONE_MS = 60 * 60 * 1000;
const E164_RE = /^\+[1-9][0-9]{7,14}$/;

function normalizarTelefone(v) {
  if (typeof v !== 'string' || v.length > 40) return null;
  const n = v.replace(/[\s.-]/g, '');
  if (/^9[0-9]{8}$/.test(n)) return '+351' + n;
  if (n.startsWith('+351')) return /^\+3519[0-9]{8}$/.test(n) ? n : null;
  return E164_RE.test(n) ? n : null;
}

function validarTelefone(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (b.consentimento !== true) return null;
  if (typeof b.id !== 'string' || !UUID_RE.test(b.id)) return null;
  const email = typeof b.email === 'string' && b.email.trim().length <= 254 && EMAIL_RE.test(b.email.trim()) ? b.email.trim() : null;
  const telefone = normalizarTelefone(b.telefone);
  if (!email || !telefone) return null;
  return { id: b.id.toLowerCase(), email, telefone };
}

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

  const motivo = motivoValido(b.motivo);
  if (!motivo) return null;

  const link = Object.fromEntries(PARAMETROS_LINK.map((p) => [p, parametroLink(b[p])]));

  if (b.consentimento_emails !== undefined && typeof b.consentimento_emails !== 'boolean') return null;
  const consentimentoEmails = b.consentimento_emails === true;

  return { ...b, nome, empresa, papel, email, tarefaOutra, motivo, link, consentimentoEmails };
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
async function garantirLead(url, chave, { nome, email, motivo }, resumo) {
  const existente = await procurarLead(url, chave, email);
  if (existente) return existente;
  const res = await fetch(`${url}/rest/v1/leads?select=id`, {
    method: 'POST',
    headers: { ...cabecalhos(chave), Prefer: 'return=representation' },
    body: JSON.stringify({ origem: 'mapa', nome, email, resumo, respostas: { motivo } }),
  });
  if (res.status === 409) return procurarLead(url, chave, email); // corrida com outro pedido
  if (!res.ok) throw new Error('lead: ' + res.status + ' ' + (await res.text()));
  const [linha] = await res.json();
  return linha.id;
}

/** Idempotente pelo id: um mapa com um id que já existe é ignorado (a 2.ª tentativa do site). */
async function inserirMapa(url, chave, mapa) {
  const res = await fetch(`${url}/rest/v1/mapas?on_conflict=id`, {
    method: 'POST',
    headers: { ...cabecalhos(chave), Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(mapa),
  });
  if (!res.ok) throw new Error('mapa: ' + res.status + ' ' + (await res.text()));
}

/**
 * Devolve true se o mapa ficou com este telefone: gravado agora, ou já gravado antes com o mesmo
 * número (o site repetiu o pedido). Um mapa de outro email, antigo ou com outro número fica igual.
 */
async function juntarTelefone(url, chave, { id, email, telefone }) {
  const filtro = `id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}`;
  const desde = new Date(Date.now() - JANELA_TELEFONE_MS).toISOString();
  const res = await fetch(
    `${url}/rest/v1/mapas?${filtro}&telefone=is.null&${COLUNA_CRIADO}=gte.${encodeURIComponent(desde)}&select=id`,
    {
      method: 'PATCH',
      headers: { ...cabecalhos(chave), Prefer: 'return=representation' },
      body: JSON.stringify({ telefone, telefone_consentimento_em: new Date().toISOString() }),
    },
  );
  if (!res.ok) throw new Error('telefone: ' + res.status + ' ' + (await res.text()));
  if ((await res.json()).length > 0) return true;

  const igual = await fetch(`${url}/rest/v1/mapas?${filtro}&telefone=eq.${encodeURIComponent(telefone)}&select=id&limit=1`, {
    headers: cabecalhos(chave),
  });
  if (!igual.ok) throw new Error('telefone: ' + igual.status + ' ' + (await igual.text()));
  return (await igual.json()).length > 0;
}

// ── Handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'POST, PATCH');
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

  const v = req.method === 'PATCH' ? validarTelefone(body) : validar(body);
  if (!v) return falhar(res, 400);

  const url = process.env.LEADS_SUPABASE_URL;
  const chave = process.env.LEADS_SUPABASE_SECRET;
  if (!url || !chave) {
    console.error('[mapa] faltam LEADS_SUPABASE_URL / LEADS_SUPABASE_SECRET');
    return falhar(res, 500);
  }

  if (req.method === 'PATCH') {
    try {
      return (await juntarTelefone(url, chave, v)) ? res.status(200).json({ ok: true }) : falhar(res, 404);
    } catch (err) {
      console.error('[mapa] erro ao juntar telefone:', err.message);
      return falhar(res, 502);
    }
  }

  const totais = calcular(v.tarefas, v.horas, v.custo_hora);
  const nomeTarefa = (id) => (id === 'outra' ? v.tarefaOutra : NOMES[id]);
  const resumo =
    `Mapa de automação · ${v.empresa} · ${euros(totais.total_custo_ano)} €/ano · ` +
    `maior perda: ${nomeTarefa(totais.maior_perda)}\n` +
    `Frase do Mapa: «${v.motivo}»`;

  // O id vem do site, igual nas duas tentativas do mesmo envio: assim a 2.ª não duplica o mapa.
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id.toLowerCase() : crypto.randomUUID();

  try {
    const leadId = await garantirLead(url, chave, v, resumo.slice(0, 1000));
    await inserirMapa(url, chave, {
      id,
      lead_id: leadId,
      nome: v.nome,
      empresa: v.empresa,
      papel: v.papel,
      email: v.email,
      consentimento: true,
      consentimento_texto: TEXTO_CONSENTIMENTO,
      consentimento_emails: v.consentimentoEmails,
      consentimento_emails_texto: v.consentimentoEmails ? TEXTO_CONSENTIMENTO_EMAILS : null,
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
      ...v.link,
      ...totais,
    });
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('[mapa] erro:', err.message);
    return falhar(res, 502);
  }
}
