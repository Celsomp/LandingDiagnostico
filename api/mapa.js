// Grava o Mapa de automação (celsopereira.pt/mapa) em public.mapas, projecto Supabase "Claude".
// Chamado por rewrite: celsopereira.pt/api/mapa → este projecto (/api/mapa).
// A chave secreta só existe aqui. O browser nunca fala com o Supabase.
//
// POST /api/mapa, JSON. Duas versões do Mapa (mapas.versao_mapa):
// Versão 2 (2026-10-24, "onde perdes clientes"), com versao_mapa: 2:
//   { versao_mapa: 2, nome, empresa, email, consentimento: true, consentimento_emails,
//     setor, setor_outro?, papel, canais: [ids], contactos_semana, tempo_resposta, fora_horas,
//     seguimento, marcacoes: boolean, faltas_semana?, horas_semana?, custo_hora?, valor_cliente?,
//     preocupacao, urgencia, motivo, utm_source?, utm_medium?, utm_campaign?, utm_content?, fbclid? }
//   Os números (horas_semana, custo_hora, valor_cliente) são opcionais: null = "Não sei" ou em branco.
//   A conta, os pontos de perda e os serviços sugeridos são recalculados aqui (mesmas regras do
//   src/scripts/mapa-calculo.ts do site — se mudar lá, muda aqui).
// Versão 1 (formação para equipas, até 2026-10-24), sem versao_mapa: só para os pedidos do site
// antigo durante a publicação. Sai quando o site novo estiver em produção.
//   { nome, empresa, papel?, email, consentimento: true, pessoas, tarefas: [3 ids], tarefa_outra?,
//     horas: { id: intervalo }, custo_hora, nivel_ia, preocupacao, motivo,
//     utm_source?, utm_medium?, utm_campaign?, utm_content?, fbclid? }
// Os parâmetros do link (origem da visita) são opcionais e nunca dão 400: vazio, com mais de 150
// caracteres, com \0 ou com caracteres partidos → null, e o mapa segue. Só vão para mapas.
// O fbclid só pode ir para a Meta (Conversions API) para quem aceitou os cookies de marketing.
// O motivo é obrigatório: 15 a 400 caracteres depois do trim, contados como o char_length do
// CHECK mapas_motivo_valido. Grava-se tal como veio (só trim).
// A validação corre toda antes de qualquer escrita: um pedido recusado não grava nada.
// Os totais NÃO vêm do browser: são recalculados aqui.
// Também cria a lead em public.leads (origem "mapa") se o email ainda não existir, para a ficha
// chegar ao Notion. O motivo vai em respostas.motivo (propriedade "Frase do Mapa", pela função
// leads-para-notion) e no fim do resumo ("Frase do Mapa: «…»"). Tem de ir na própria lead: o
// gatilho dispara antes de a linha em mapas existir. Uma lead que já existia não é alterada
// (o motivo fica só em mapas); o mapa fica ligado a ela.
// id? é o id do mapa, gerado pelo site uma vez por envio. Se faltar ou não for um UUID, é gerado
// aqui. A gravação é idempotente pelo id: repetir o mesmo envio dá 200 e uma só linha em mapas.
// Responde { ok: true, id } (o site usa-o como eventID do Lead do Meta Pixel) ou { ok: false }.
// Sem consentimento, não grava nada.
// consentimento_emails (caixa opcional dos emails gerais): true/false; outro valor dá 400. Grava-se
// em mapas, com o texto da caixa quando é true. O site novo envia-o sempre. Um pedido SEM o campo
// vem do site antigo, que mostrou a caixa antiga: grava-se o texto antigo como prova
// (TEXTO_CONSENTIMENTO_ANTERIOR) e o mapa não vai para o systeme.io.
//
// systeme.io: depois de o mapa ficar gravado, cria ou actualiza o contacto pelo email, com os
// campos do mapa, e põe as tags Mapa_Lead e Lista_Celso (mais Emails_Sim com a caixa opcional).
// Se correr bem, grava mapas.systeme_sincronizado_em. Corre DEPOIS da resposta ao browser
// (waitUntil, @vercel/functions): nunca a atrasa nem a muda; uma falha fica só nos logs. Nunca cria
// tags: os ids vêm das variáveis SYSTEMEIO_TAG_*, ou do nome exacto na lista de tags da conta.
//
// PATCH /api/mapa, JSON: { id, email, telefone, consentimento: true }
// Junta o telemóvel (opcional, pedido depois do resultado) ao mapa acabado de gravar. Só actualiza
// mapas.telefone e mapas.telefone_consentimento_em, e só na linha com esse id E esse email, ainda
// sem telefone e criada há menos de 1 hora. Nunca cria linhas, nunca mexe em leads (o número não
// vai para o Notion) e nada aqui contacta a pessoa. Repetir o mesmo número dá 200.
// O número é normalizado para E.164: 9 dígitos a começar por 9, com ou sem +351, → +351…;
// internacional só com '+'. Igual ao CHECK mapas_telefone_e164 e ao src/scripts/mapa.ts do site.
// Responde { ok: true } ou { ok: false } (404 se não houver mapa que corresponda).
// Depois do UPDATE e da resposta (waitUntil), escreve o número no phone_number do contacto, se o
// mapa não for do site antigo. Nunca cria o contacto: se ainda não existir (a sincronização do POST
// a correr), espera e tenta outra vez. Uma falha fica só nos logs.

import { waitUntil } from '@vercel/functions';

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
// ── Versão 2 (2026-10-24) ─────────────────────────────────────
// Os ids batem certo com src/data/mapa.ts do site.
const V2 = {
  setor: ['imobiliaria', 'saude', 'estetica', 'ginasio', 'escola', 'oficina', 'domicilio', 'restauracao', 'contabilidade', 'comercio', 'outro'],
  papel: ['dono', 'responsavel', 'outro'],
  canais: ['whatsapp', 'telefone', 'formulario', 'email', 'portais', 'redes'],
  contactos_semana: ['menos_10', '10_30', '30_100', 'mais_100'],
  tempo_resposta: ['minutos', 'ate_1h', 'mesmo_dia', 'dia_seguinte', 'nao_sei'],
  fora_horas: ['ninguem', 'eu_noite', 'automatica', 'alguem'],
  seguimento: ['sempre', 'as_vezes', 'quase_nunca'],
  faltas_semana: ['nenhuma', '1_2', '3_5', 'mais_5'],
  preocupacao: ['custo', 'dados', 'ia_erra'],
  urgencia: ['este_mes', '3_meses', 'explorar'],
};
// Um valor baixo em cada intervalo (conservador), como o site.
const V2_HORAS = { menos_5: 2, '5_10': 5, '10_20': 10, mais_20: 20 };
const V2_CUSTO = { menos_10: 8, '10_15': 10, '15_20': 15, mais_20: 20 };
const V2_VALOR = { menos_100: 50, '100_500': 100, '500_2000': 500, mais_2000: 2000 };
const V2_SERVICOS = {
  atendimento: 'Agente de atendimento no WhatsApp',
  qualificacao: 'Agente de qualificação e seguimento de leads',
  resposta_imediata: 'Resposta imediata a leads',
  lembretes: 'Confirmação e lembrete de marcações',
};
const V2_PONTOS = {
  resposta_lenta: 'Resposta lenta',
  resposta_nao_sei: 'Tempo de resposta desconhecido',
  fora_horas_ninguem: 'Ninguém responde fora de horas',
  fora_horas_eu: 'O dono responde à noite',
  seguimento_quase_nunca: 'Quase sem seguimento',
  seguimento_as_vezes: 'Seguimento irregular',
  faltas: 'Faltas a marcações',
};
const V2_SETORES = {
  imobiliaria: 'Imobiliária',
  saude: 'Clínica ou saúde',
  estetica: 'Estética e bem-estar',
  ginasio: 'Ginásio ou estúdio',
  escola: 'Escola ou formação',
  oficina: 'Oficina ou serviços técnicos',
  domicilio: 'Serviços ao domicílio',
  restauracao: 'Restauração',
  contabilidade: 'Contabilidade ou consultoria',
  comercio: 'Comércio',
};

// O texto exacto da caixa, guardado com cada mapa como prova do consentimento.
const TEXTO_CONSENTIMENTO =
  'Aceito receber o meu Mapa e emails de acompanhamento sobre ele (posso sair quando quiser). As respostas podem ser usadas de forma anónima para melhorar o serviço.';
// A caixa do site antigo (até 2026-10-17). Só para os pedidos que ainda vêm dele, sem consentimento_emails.
const TEXTO_CONSENTIMENTO_ANTERIOR =
  'Aceito que o Celso Pereira guarde estes dados para me mostrar o mapa, me contactar sobre ele e, de forma anónima, melhorar o serviço.';
// A caixa opcional dos emails gerais (src/data/mapa.ts do site). Os dois textos mudam juntos.
// A versão 2 tem texto próprio; a versão 1 grava o texto que o site antigo mostrou.
const TEXTO_CONSENTIMENTO_EMAILS = 'Quero receber também ideias para responder a tempo aos meus clientes.';
const TEXTO_CONSENTIMENTO_EMAILS_V1 = 'Quero receber também ideias para a minha equipa usar IA no dia a dia.';

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

  // Sem o campo: pedido do site antigo (ver o topo).
  const siteAntigo = b.consentimento_emails === undefined;
  if (!siteAntigo && typeof b.consentimento_emails !== 'boolean') return null;
  const consentimentoEmails = b.consentimento_emails === true;

  return { ...b, nome, empresa, papel, email, tarefaOutra, motivo, link, consentimentoEmails, siteAntigo };
}

/** Versão 2. Devolve null se alguma coisa não servir: um pedido recusado não grava nada. */
function validarV2(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (b.consentimento !== true || typeof b.consentimento_emails !== 'boolean') return null;

  const nome = texto(b.nome, 120);
  const empresa = texto(b.empresa, 120);
  const email = typeof b.email === 'string' && b.email.trim().length <= 254 && EMAIL_RE.test(b.email.trim()) ? b.email.trim() : null;
  if (!nome || !empresa || !email) return null;

  const obrigatorias = ['setor', 'papel', 'contactos_semana', 'tempo_resposta', 'fora_horas', 'seguimento', 'preocupacao', 'urgencia'];
  if (!obrigatorias.every((k) => V2[k].includes(b[k]))) return null;
  const setorOutro = b.setor === 'outro' ? texto(b.setor_outro, 80) : null;
  if (b.setor === 'outro' && !setorOutro) return null;

  if (!Array.isArray(b.canais) || b.canais.length === 0 || new Set(b.canais).size !== b.canais.length) return null;
  if (!b.canais.every((c) => V2.canais.includes(c))) return null;

  if (typeof b.marcacoes !== 'boolean') return null;
  if (b.marcacoes ? !V2.faltas_semana.includes(b.faltas_semana) : b.faltas_semana != null) return null;

  // Os números são opcionais: null (ou ausente) = sem número.
  const opcional = (v, tabela) => (v == null ? null : typeof v === 'string' && Object.hasOwn(tabela, v) ? v : undefined);
  const horas = opcional(b.horas_semana, V2_HORAS);
  const custo = opcional(b.custo_hora, V2_CUSTO);
  const valor = opcional(b.valor_cliente, V2_VALOR);
  if (horas === undefined || custo === undefined || valor === undefined) return null;

  const motivo = motivoValido(b.motivo);
  if (!motivo) return null;

  const link = Object.fromEntries(PARAMETROS_LINK.map((p) => [p, parametroLink(b[p])]));

  return {
    versao: 2,
    nome,
    empresa,
    email,
    motivo,
    link,
    consentimentoEmails: b.consentimento_emails,
    siteAntigo: false,
    setor: b.setor,
    setorOutro,
    papel: b.papel,
    canais: b.canais,
    contactos_semana: b.contactos_semana,
    tempo_resposta: b.tempo_resposta,
    fora_horas: b.fora_horas,
    seguimento: b.seguimento,
    marcacoes: b.marcacoes,
    faltas_semana: b.marcacoes ? b.faltas_semana : null,
    horas_semana: horas,
    custo_hora: custo,
    valor_cliente: valor,
    preocupacao: b.preocupacao,
    urgencia: b.urgencia,
  };
}

/** Versão 2: a conta (só com os números da pessoa), os pontos de perda e até 2 serviços. */
function calcularV2(v) {
  const h = v.horas_semana ? V2_HORAS[v.horas_semana] : null;
  const c = v.custo_hora ? V2_CUSTO[v.custo_hora] : null;
  const valor = v.valor_cliente ? V2_VALOR[v.valor_cliente] : null;
  const tempo = h !== null && c !== null;

  const respostaLenta = v.tempo_resposta === 'mesmo_dia' || v.tempo_resposta === 'dia_seguinte';
  const foraDeHoras = v.fora_horas === 'ninguem' || v.fora_horas === 'eu_noite';
  const semSeguimento = v.seguimento === 'quase_nunca' || v.seguimento === 'as_vezes';
  const faltas = v.marcacoes && (v.faltas_semana === '3_5' || v.faltas_semana === 'mais_5');

  const pontos = [];
  if (respostaLenta) pontos.push('resposta_lenta');
  if (v.tempo_resposta === 'nao_sei') pontos.push('resposta_nao_sei');
  if (v.fora_horas === 'ninguem') pontos.push('fora_horas_ninguem');
  if (v.fora_horas === 'eu_noite') pontos.push('fora_horas_eu');
  if (v.seguimento === 'quase_nunca') pontos.push('seguimento_quase_nunca');
  if (v.seguimento === 'as_vezes') pontos.push('seguimento_as_vezes');
  if (faltas) pontos.push('faltas');

  const servicos = [];
  if (semSeguimento) servicos.push('qualificacao');
  else if (respostaLenta || foraDeHoras)
    servicos.push(v.canais.some((canal) => ['formulario', 'email', 'portais'].includes(canal)) ? 'resposta_imediata' : 'atendimento');
  if (faltas) servicos.push('lembretes');

  return {
    total_horas_ano: tempo ? h * 48 : null,
    total_custo_mes: tempo ? dezenas(h * c * 4) : null,
    total_custo_ano: tempo ? dezenas(h * c * 48) : null,
    referencia_cliente_ano: valor !== null ? valor * 48 : null,
    pontos_perda: pontos,
    servicos_sugeridos: servicos.slice(0, 2),
  };
}

const nomeSetor = (v) => (v.setor === 'outro' ? `Outro: ${v.setorOutro}` : V2_SETORES[v.setor]);

const nomeTarefa = (v, id) => (id === 'outra' ? v.tarefaOutra : NOMES[id]);

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
 * Devolve a linha do mapa ({ id, consentimento_texto }) se ficou com este telefone: gravado
 * agora, ou já gravado antes com o mesmo número (o site repetiu o pedido). Devolve null se não
 * houver mapa que corresponda: um mapa de outro email, antigo ou com outro número fica igual.
 */
async function juntarTelefone(url, chave, { id, email, telefone }) {
  const filtro = `id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}`;
  const campos = 'select=id,consentimento_texto';
  const desde = new Date(Date.now() - JANELA_TELEFONE_MS).toISOString();
  const res = await fetch(
    `${url}/rest/v1/mapas?${filtro}&telefone=is.null&${COLUNA_CRIADO}=gte.${encodeURIComponent(desde)}&${campos}`,
    {
      method: 'PATCH',
      headers: { ...cabecalhos(chave), Prefer: 'return=representation' },
      body: JSON.stringify({ telefone, telefone_consentimento_em: new Date().toISOString() }),
    },
  );
  if (!res.ok) throw new Error('telefone: ' + res.status + ' ' + (await res.text()));
  const [gravado] = await res.json();
  if (gravado) return gravado;

  const igual = await fetch(`${url}/rest/v1/mapas?${filtro}&telefone=eq.${encodeURIComponent(telefone)}&${campos}&limit=1`, {
    headers: cabecalhos(chave),
  });
  if (!igual.ok) throw new Error('telefone: ' + igual.status + ' ' + (await igual.text()));
  const [repetido] = await igual.json();
  return repetido ?? null;
}

/** Marca o mapa como sincronizado com o systeme.io. */
async function marcarSincronizado(url, chave, id) {
  const res = await fetch(`${url}/rest/v1/mapas?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...cabecalhos(chave), Prefer: 'return=minimal' },
    body: JSON.stringify({ systeme_sincronizado_em: new Date().toISOString() }),
    signal: AbortSignal.timeout(SUPABASE_MARCA_PRAZO_MS),
  });
  if (!res.ok) throw new Error('sincronizado: ' + res.status + ' ' + (await res.text()));
}

// ── systeme.io ───────────────────────────────────────────────
// API pública: chave em X-API-Key; PATCH com application/merge-patch+json; campos por slug.
// Corre depois da resposta ao browser (waitUntil): a pessoa nunca espera pelo systeme.io.
// Cada tentativa tem SYSTEME_PRAZO_MS. Uma falha de rede, um prazo esgotado, um 408/429 ou um 5xx
// têm uma 2.ª tentativa; um 4xx não (não muda à segunda). Cada pedido fica nos logs: passo,
// método, caminho (sem o email), status e ms; num prazo esgotado, também o que estava em curso.

const SYSTEME = 'https://api.systeme.io/api';
const SYSTEME_PRAZO_MS = 8000; // por tentativa
const SYSTEME_PAUSA_MS = 500; // antes da 2.ª tentativa
// O PATCH do telefone pode chegar antes de a sincronização do POST acabar: sem contacto, espera.
const SYSTEME_PAUSA_SEM_CONTACTO_MS = 5000;
const SUPABASE_MARCA_PRAZO_MS = 3000;

// Slugs dos campos do contacto. first_name, company_name e phone_number são campos nativos do
// systeme.io; os outros foram criados na conta pelo Celso (2026-10-17).
const CAMPO = {
  nome: 'first_name',
  empresa: 'company_name',
  papel: 'papel',
  totalCustoAno: 'total_custo_ano',
  maiorPerda: 'maior_perda',
  nivelIa: 'nivel_ia',
  preocupacao: 'preocupacao',
  utmSource: 'utm_source',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  fbclid: 'fbclid',
  telefone: 'phone_number',
  mapaId: 'mapa_id',
  // Versão 2 (2026-10-24): campos novos, criados na conta pelo Celso antes da publicação.
  setor: 'setor',
  urgencia: 'urgencia',
  contactosSemana: 'contactos_semana',
  servicoSugerido: 'servico_sugerido',
};

// Nome exacto da tag → variável de ambiente com o id dela.
const TAG_VARIAVEL = {
  Mapa_Lead: 'SYSTEMEIO_TAG_MAPA_LEAD',
  Lista_Celso: 'SYSTEMEIO_TAG_LISTA_CELSO',
  Emails_Sim: 'SYSTEMEIO_TAG_EMAILS_SIM',
};

/** Resposta do systeme.io que não é 2xx (ou uma tag que não existe). Só se repete se for passageira. */
class ErroSysteme extends Error {
  constructor(passo, status, detalhe, { repetir = status === 408 || status === 429 || status >= 500, pausa } = {}) {
    super(`${passo}: ${status} ${detalhe}`.slice(0, 600));
    this.repetir = repetir;
    this.pausa = pausa;
  }
}
const repetivel = (err) => !(err instanceof ErroSysteme) || err.repetir;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// O email não vai para os logs: a procura fica com o valor tapado.
const caminhoNosLogs = (caminho) => caminho.replace(/email=[^&]*/, 'email=…');

/** Um pedido ao systeme.io, registado em ctx.reg. ctx = { chave, sinal, reg }. */
async function systeme(ctx, passo, caminho, { method = 'GET', body, merge = false } = {}) {
  const headers = { 'X-API-Key': ctx.chave };
  if (body) headers['Content-Type'] = merge ? 'application/merge-patch+json' : 'application/json';
  const marca = Symbol();
  const inicio = Date.now();
  const linha = `${passo} ${method} ${caminhoNosLogs(caminho)}`;
  ctx.reg.emCurso.set(marca, { linha, inicio });
  try {
    const res = await fetch(SYSTEME + caminho, { method, headers, body: body && JSON.stringify(body), signal: ctx.sinal });
    ctx.reg.linhas.push(`${linha} ${res.status} ${Date.now() - inicio}ms`);
    return res;
  } catch (err) {
    ctx.reg.linhas.push(`${linha} ✗ ${err.name} ${Date.now() - inicio}ms`);
    throw err;
  } finally {
    ctx.reg.emCurso.delete(marca);
  }
}

async function falhou(passo, res) {
  return new ErroSysteme(passo, res.status, await res.text().catch(() => ''));
}

async function procurarContacto(ctx, email) {
  const res = await systeme(ctx, 'procurar', `/contacts?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw await falhou('procurar', res);
  const { items } = await res.json();
  return items?.[0] ?? null;
}

async function actualizarContacto(ctx, id, fields) {
  const res = await systeme(ctx, 'actualizar', `/contacts/${id}`, { method: 'PATCH', body: { fields }, merge: true });
  if (!res.ok) throw await falhou('actualizar', res);
  return res.json();
}

/** Ids das tags pelas variáveis SYSTEMEIO_TAG_*; as que faltarem, pelo nome exacto. Nunca cria tags. */
async function idsDasTags(ctx, nomes) {
  const ids = {};
  const faltam = [];
  for (const nome of nomes) {
    const n = Number(process.env[TAG_VARIAVEL[nome]]);
    if (Number.isInteger(n) && n > 0) ids[nome] = n;
    else faltam.push(nome);
  }
  if (faltam.length === 0) return ids;
  const res = await systeme(ctx, 'tags', '/tags?limit=100');
  if (!res.ok) throw await falhou('tags', res);
  const { items = [] } = await res.json();
  for (const nome of faltam) {
    const tag = items.find((t) => t.name === nome);
    if (!tag) throw new ErroSysteme('tags', 'em falta', `a tag ${nome} não existe na conta`, { repetir: false });
    ids[nome] = tag.id;
  }
  return ids;
}

/** Os campos do contacto. Os parâmetros do link vazios não se enviam: não apagam os de um mapa anterior. */
function camposDoMapa(v, totais, id) {
  if (v.versao === 2) return camposDoMapaV2(v, totais, id);
  const campos = [
    [CAMPO.nome, v.nome],
    [CAMPO.empresa, v.empresa],
    [CAMPO.papel, v.papel],
    [CAMPO.totalCustoAno, String(totais.total_custo_ano)],
    [CAMPO.maiorPerda, nomeTarefa(v, totais.maior_perda)],
    [CAMPO.nivelIa, v.nivel_ia],
    [CAMPO.preocupacao, v.preocupacao],
    [CAMPO.utmSource, v.link.utm_source],
    [CAMPO.utmCampaign, v.link.utm_campaign],
    [CAMPO.utmContent, v.link.utm_content],
    [CAMPO.fbclid, v.link.fbclid ? 'sim' : 'não'],
    [CAMPO.mapaId, id],
  ];
  return campos.filter(([, value]) => value !== null).map(([slug, value]) => ({ slug, value }));
}

/**
 * Versão 2. Os valores de decisão (setor, papel, preocupacao, urgencia) vão como ids, para os
 * workflows; maior_perda e servico_sugerido vão com o nome, para ler e para os emails.
 * nivel_ia deixa de ir. Sem os números, total_custo_ano não se envia (não apaga o de um mapa anterior).
 */
function camposDoMapaV2(v, totais, id) {
  const campos = [
    [CAMPO.nome, v.nome],
    [CAMPO.empresa, v.empresa],
    [CAMPO.papel, v.papel],
    [CAMPO.setor, v.setor],
    [CAMPO.urgencia, v.urgencia],
    [CAMPO.contactosSemana, v.contactos_semana],
    [CAMPO.preocupacao, v.preocupacao],
    [CAMPO.totalCustoAno, totais.total_custo_ano === null ? null : String(totais.total_custo_ano)],
    [CAMPO.maiorPerda, totais.pontos_perda.length ? V2_PONTOS[totais.pontos_perda[0]] : 'Nenhuma clara'],
    [CAMPO.servicoSugerido, totais.servicos_sugeridos.length ? V2_SERVICOS[totais.servicos_sugeridos[0]] : 'A ver na conversa'],
    [CAMPO.utmSource, v.link.utm_source],
    [CAMPO.utmCampaign, v.link.utm_campaign],
    [CAMPO.utmContent, v.link.utm_content],
    [CAMPO.fbclid, v.link.fbclid ? 'sim' : 'não'],
    [CAMPO.mapaId, id],
  ];
  return campos.filter(([, value]) => value !== null).map(([slug, value]) => ({ slug, value }));
}

/** Cria ou actualiza o contacto e põe-lhe as tags que ainda não tem. Lança erro se algo falhar. */
async function sincronizarMapa(ctx, v, totais, id) {
  const fields = camposDoMapa(v, totais, id);
  const nomes = ['Mapa_Lead', 'Lista_Celso', ...(v.consentimentoEmails ? ['Emails_Sim'] : [])];

  const [existente, tags] = await Promise.all([procurarContacto(ctx, v.email), idsDasTags(ctx, nomes)]);

  let contacto;
  if (existente) {
    contacto = await actualizarContacto(ctx, existente.id, fields);
  } else {
    const res = await systeme(ctx, 'criar', '/contacts', { method: 'POST', body: { email: v.email, locale: 'pt', fields } });
    if (res.ok) {
      contacto = await res.json();
    } else if (res.status === 422) {
      // Pode ter sido criado entretanto (outro pedido com o mesmo email).
      const erro = await falhou('criar', res);
      const outro = await procurarContacto(ctx, v.email);
      if (!outro) throw erro;
      contacto = await actualizarContacto(ctx, outro.id, fields);
    } else {
      throw await falhou('criar', res);
    }
  }

  const jaTem = new Set((contacto.tags || []).map((t) => t.id));
  const porPor = nomes.filter((n) => !jaTem.has(tags[n]));
  const respostas = await Promise.all(
    porPor.map((n) => systeme(ctx, `tag ${n}`, `/contacts/${contacto.id}/tags`, { method: 'POST', body: { tagId: tags[n] } })),
  );
  for (const [i, r] of respostas.entries()) if (!r.ok) throw await falhou(`tag ${porPor[i]}`, r);
}

/** Escreve o telefone no contacto. Sem contacto (a sincronização do POST ainda a correr), lança um erro que se repete. */
async function telefoneNoSysteme(ctx, { email, telefone }) {
  const contacto = await procurarContacto(ctx, email);
  if (!contacto) throw new ErroSysteme('procurar', 'sem contacto', 'o contacto ainda não existe', { repetir: true, pausa: SYSTEME_PAUSA_SEM_CONTACTO_MS });
  await actualizarContacto(ctx, contacto.id, [{ slug: CAMPO.telefone, value: telefone }]);
}

/**
 * Corre tarefa(ctx) com o prazo de uma tentativa e, se falhar por uma razão passageira, mais uma vez.
 * Cada tentativa deixa uma linha nos logs. Lança o último erro se não conseguir.
 */
async function comNovaTentativa(rotulo, chave, tarefa) {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const reg = { linhas: [], emCurso: new Map() };
    const ctx = { chave, reg, sinal: AbortSignal.timeout(SYSTEME_PRAZO_MS) };
    // Quando o prazo corta, guarda o que estava em curso (antes de os pedidos saírem da lista).
    let noCorte = '';
    ctx.sinal.addEventListener(
      'abort',
      () => (noCorte = [...reg.emCurso.values()].map(({ linha, inicio }) => `${linha} (${Date.now() - inicio} ms)`).join(', ')),
      { once: true },
    );
    const inicio = Date.now();
    try {
      const resultado = await tarefa(ctx);
      console.log(`[mapa] systeme, ${rotulo}, tentativa ${tentativa}: ok em ${Date.now() - inicio} ms · ${reg.linhas.join(' · ')}`);
      return resultado;
    } catch (err) {
      const corte = ctx.sinal.aborted;
      const motivo = corte ? `prazo de ${SYSTEME_PRAZO_MS} ms esgotado; em curso: ${noCorte || '—'}` : err.message;
      console.error(`[mapa] systeme, ${rotulo}, tentativa ${tentativa}: ${motivo} · ${reg.linhas.join(' · ') || 'nenhum pedido acabou'}`);
      if (tentativa === 2 || !repetivel(err)) throw err;
      await pausa(err.pausa ?? SYSTEME_PAUSA_MS);
    }
  }
}

/** Depois da resposta ao browser: sincroniza o mapa e marca-o. Nunca lança (tudo fica nos logs). */
async function sincronizarDepois(url, chave, chaveSysteme, v, totais, id) {
  try {
    await comNovaTentativa(`mapa ${id}`, chaveSysteme, (ctx) => sincronizarMapa(ctx, v, totais, id));
  } catch {
    return; // já está nos logs; systeme_sincronizado_em fica null
  }
  try {
    await marcarSincronizado(url, chave, id);
  } catch (err) {
    console.error(`[mapa] mapa ${id}: está no systeme.io, mas não gravei systeme_sincronizado_em:`, err.message);
  }
}

/** Depois da resposta ao browser: o telefone no contacto. Nunca lança. */
async function telefoneDepois(chaveSysteme, v) {
  try {
    await comNovaTentativa(`telefone do mapa ${v.id}`, chaveSysteme, (ctx) => telefoneNoSysteme(ctx, v));
  } catch {
    // já está nos logs
  }
}

// ── A linha de mapas e o resumo da lead, por versão ──────────

function mapaV2(v) {
  const totais = calcularV2(v);
  const servico = totais.servicos_sugeridos.length ? V2_SERVICOS[totais.servicos_sugeridos[0]] : 'a ver na conversa';
  const conta = totais.total_custo_ano === null ? '' : ` · ${euros(totais.total_custo_ano)} €/ano`;
  const resumo = `Mapa · ${v.empresa} · ${nomeSetor(v)} · começar por: ${servico}${conta}\nFrase do Mapa: «${v.motivo}»`;
  const linha = {
    versao_mapa: 2,
    nome: v.nome,
    empresa: v.empresa,
    papel: v.papel,
    email: v.email,
    consentimento: true,
    consentimento_texto: TEXTO_CONSENTIMENTO,
    consentimento_emails: v.consentimentoEmails,
    consentimento_emails_texto: v.consentimentoEmails ? TEXTO_CONSENTIMENTO_EMAILS : null,
    setor: v.setor,
    setor_outro: v.setorOutro,
    canais: v.canais,
    contactos_semana: v.contactos_semana,
    tempo_resposta: v.tempo_resposta,
    fora_horas: v.fora_horas,
    seguimento: v.seguimento,
    marcacoes: v.marcacoes,
    faltas_semana: v.faltas_semana,
    horas_semana: v.horas_semana,
    custo_hora: v.custo_hora,
    valor_cliente: v.valor_cliente,
    preocupacao: v.preocupacao,
    urgencia: v.urgencia,
    motivo: v.motivo,
  };
  return { totais, resumo, linha };
}

function mapaV1(v) {
  const totais = calcular(v.tarefas, v.horas, v.custo_hora);
  const resumo =
    `Mapa de automação · ${v.empresa} · ${euros(totais.total_custo_ano)} €/ano · ` +
    `maior perda: ${nomeTarefa(v, totais.maior_perda)}\n` +
    `Frase do Mapa: «${v.motivo}»`;
  const linha = {
    versao_mapa: 1,
    nome: v.nome,
    empresa: v.empresa,
    papel: v.papel,
    email: v.email,
    consentimento: true,
    consentimento_texto: v.siteAntigo ? TEXTO_CONSENTIMENTO_ANTERIOR : TEXTO_CONSENTIMENTO,
    consentimento_emails: v.consentimentoEmails,
    consentimento_emails_texto: v.consentimentoEmails ? TEXTO_CONSENTIMENTO_EMAILS_V1 : null,
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
  };
  return { totais, resumo, linha };
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

  // versao_mapa: 2 → Mapa novo; sem o campo → site antigo (versão 1), só durante a publicação.
  const v = req.method === 'PATCH' ? validarTelefone(body) : body?.versao_mapa === 2 ? validarV2(body) : validar(body);
  if (!v) return falhar(res, 400);

  const url = process.env.LEADS_SUPABASE_URL;
  const chave = process.env.LEADS_SUPABASE_SECRET;
  if (!url || !chave) {
    console.error('[mapa] faltam LEADS_SUPABASE_URL / LEADS_SUPABASE_SECRET');
    return falhar(res, 500);
  }

  const chaveSysteme = process.env.SYSTEMEIO_KEY;
  if (!chaveSysteme) console.error('[mapa] falta SYSTEMEIO_KEY: o systeme.io fica de fora');

  if (req.method === 'PATCH') {
    let mapa;
    try {
      mapa = await juntarTelefone(url, chave, v);
    } catch (err) {
      console.error('[mapa] erro ao juntar telefone:', err.message);
      return falhar(res, 502);
    }
    if (!mapa) return falhar(res, 404);
    // Os mapas do site antigo não vão para o systeme.io. Não se espera pelo systeme_sincronizado_em:
    // o telefone pode chegar antes de a sincronização do POST acabar (telefoneNoSysteme espera).
    if (chaveSysteme && mapa.consentimento_texto !== TEXTO_CONSENTIMENTO_ANTERIOR) waitUntil(telefoneDepois(chaveSysteme, v));
    return res.status(200).json({ ok: true });
  }

  // O id vem do site, igual nas duas tentativas do mesmo envio: assim a 2.ª não duplica o mapa.
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id.toLowerCase() : crypto.randomUUID();

  const { totais, resumo, linha } = v.versao === 2 ? mapaV2(v) : mapaV1(v);

  try {
    const leadId = await garantirLead(url, chave, v, resumo.slice(0, 1000));
    await inserirMapa(url, chave, { id, lead_id: leadId, ...linha, ...v.link, ...totais });
  } catch (err) {
    console.error('[mapa] erro:', err.message);
    return falhar(res, 502);
  }

  // Só com o mapa gravado e o consentimento novo, e depois da resposta: nada daqui a atrasa nem a muda.
  if (chaveSysteme && !v.siteAntigo) waitUntil(sincronizarDepois(url, chave, chaveSysteme, v, totais, id));
  return res.status(200).json({ ok: true, id });
}
