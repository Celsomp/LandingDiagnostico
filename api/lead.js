// Grava as leads do diagnóstico em public.leads (projecto Supabase "Claude").
// A chave secreta só existe aqui, no servidor. O browser nunca fala com o Supabase.
//
// POST /api/lead, JSON:
//   { accao: 'lead', nome, email, whatsapp?, respostas: { P1..P9 }, score, categoria, gap, anti_fit }
//   { accao: 'whatsapp', email, whatsapp }   junta o WhatsApp à lead desse email
// Responde só { ok: true } ou { ok: false }. Nunca devolve dados da tabela.

const MAX_BYTES = 10 * 1024;
const JANELA_WHATSAPP_MS = 60 * 60 * 1000;

// Os valores possíveis de cada pergunta. Têm de bater certo com QUESTIONS no quiz.js.
const RESPOSTAS_VALIDAS = {
  P1: ['menos_500', '500_1k', '1k_5k', 'mais_5k'],
  P2: ['menos_500', '500_2k', '2k_10k', 'mais_10k'],
  P3: ['curso', 'grupo', 'individual', 'nada'],
  P4: ['menos_100', '100_300', '300_1k', 'mais_1k'],
  P5: ['nenhum', 'um', 'dois_tres', 'quatro'],
  P6: ['nao_sei', 'menos_2k', '2k_10k', 'mais_10k'],
  P7: ['estruturado', 'informal', 'direto', 'sem_seq'],
  P8: ['sistema', 'mao', 'agencia', 'sem_proc'],
  P9: ['tempo', 'porque', 'sozinho', 'tecnica']
};
const CATEGORIAS = ['critico', 'em_margem', 'solido'];

// Mais apertado que o CHECK da tabela: sem '*' (wildcard no ilike do PostgREST).
const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Igual ao CHECK leads_whatsapp_check.
const WHATSAPP_RE = /^\+?[0-9]{8,15}$/;

function falhar(res, status) {
  return res.status(status).json({ ok: false });
}

function validarEmail(valor) {
  if (typeof valor !== 'string') return null;
  const email = valor.trim();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/** Tira espaços, hífens, pontos e parênteses; o resto tem de ser só dígitos e um '+' inicial. */
function validarWhatsapp(valor) {
  if (typeof valor !== 'string') return null;
  const numero = valor.replace(/[\s().-]/g, '');
  return WHATSAPP_RE.test(numero) ? numero : null;
}

function validarRespostas(respostas) {
  if (!respostas || typeof respostas !== 'object' || Array.isArray(respostas)) return null;
  const chaves = Object.keys(respostas);
  if (chaves.length !== 9) return null;
  const limpas = {};
  for (const id of Object.keys(RESPOSTAS_VALIDAS)) {
    if (!RESPOSTAS_VALIDAS[id].includes(respostas[id])) return null;
    limpas[id] = respostas[id];
  }
  return limpas;
}

function validarLead(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  if (!nome || nome.length > 120) return null;

  const email = validarEmail(body.email);
  if (!email) return null;

  let whatsapp = null;
  if (body.whatsapp !== undefined && body.whatsapp !== null && body.whatsapp !== '') {
    whatsapp = validarWhatsapp(body.whatsapp);
    if (!whatsapp) return null;
  }

  const respostas = validarRespostas(body.respostas);
  if (!respostas) return null;

  const { score, categoria, gap, anti_fit } = body;
  if (!Number.isInteger(score) || score < 0 || score > 100) return null;
  if (!CATEGORIAS.includes(categoria)) return null;
  if (!Number.isInteger(gap) || gap < 0 || gap > 100000000) return null;
  if (typeof anti_fit !== 'boolean') return null;

  const lead = { nome, email, respostas, score, categoria, gap_lancamento: gap, anti_fit };
  if (whatsapp) lead.whatsapp = whatsapp;
  return lead;
}

// ── Supabase (PostgREST) ─────────────────────────────────────

function cabecalhos(chave) {
  const h = { apikey: chave, 'Content-Type': 'application/json' };
  // Chave antiga (JWT service_role) também precisa do Authorization; a nova (sb_secret_) não.
  if (chave.startsWith('eyJ')) h.Authorization = 'Bearer ' + chave;
  return h;
}

/** Procura a lead pelo email, sem distinguir maiúsculas (o índice único é em lower(email)). */
async function procurarId(url, chave, email) {
  const padrao = email.replace(/[\\%_]/g, '\\$&');
  const res = await fetch(
    `${url}/rest/v1/leads?select=id&limit=1&email=ilike.${encodeURIComponent(padrao)}`,
    { headers: cabecalhos(chave) }
  );
  if (!res.ok) throw new Error('procurar: ' + res.status + ' ' + (await res.text()));
  const linhas = await res.json();
  return linhas[0] ? linhas[0].id : null;
}

async function actualizar(url, chave, id, campos) {
  const res = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...cabecalhos(chave), Prefer: 'return=minimal' },
    body: JSON.stringify(campos)
  });
  if (!res.ok) throw new Error('actualizar: ' + res.status + ' ' + (await res.text()));
}

/** Devolve false se o email já existir (corrida com outro pedido); lança noutros erros. */
async function inserir(url, chave, campos) {
  const res = await fetch(`${url}/rest/v1/leads`, {
    method: 'POST',
    headers: { ...cabecalhos(chave), Prefer: 'return=minimal' },
    body: JSON.stringify(campos)
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error('inserir: ' + res.status + ' ' + (await res.text()));
  return true;
}

/** Upsert pelo email. A origem só se escreve ao criar: uma lead que já existia mantém a sua. */
async function gravarLead(url, chave, lead) {
  const id = await procurarId(url, chave, lead.email);
  if (id) return actualizar(url, chave, id, lead);
  if (await inserir(url, chave, { origem: 'diagnostico', ...lead })) return;
  const idDepois = await procurarId(url, chave, lead.email);
  if (!idDepois) throw new Error('inserir: conflito sem lead correspondente');
  return actualizar(url, chave, idDepois, lead);
}

/**
 * Junta o WhatsApp só a uma lead sem número e tocada na última hora (o campo aparece logo
 * a seguir ao relatório). Uma lead antiga ou que já tem número fica como está.
 */
async function juntarWhatsapp(url, chave, email, whatsapp) {
  const id = await procurarId(url, chave, email);
  if (!id) return;
  const desde = new Date(Date.now() - JANELA_WHATSAPP_MS).toISOString();
  const res = await fetch(
    `${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&whatsapp=is.null` +
      `&actualizado_em=gte.${encodeURIComponent(desde)}`,
    {
      method: 'PATCH',
      headers: { ...cabecalhos(chave), Prefer: 'return=minimal' },
      body: JSON.stringify({ whatsapp })
    }
  );
  if (!res.ok) throw new Error('whatsapp: ' + res.status + ' ' + (await res.text()));
}

// ── Handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return falhar(res, 405);
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return falhar(res, 415);
  }
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return falhar(res, 413);

  let body;
  try {
    body = req.body;
  } catch (e) {
    return falhar(res, 400); // JSON inválido
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return falhar(res, 400);
  // Sem Content-Length (chunked), mede-se o que chegou.
  if (Buffer.byteLength(JSON.stringify(body)) > MAX_BYTES) return falhar(res, 413);

  const url = process.env.LEADS_SUPABASE_URL;
  const chave = process.env.LEADS_SUPABASE_SECRET;
  if (!url || !chave) {
    console.error('[lead] faltam LEADS_SUPABASE_URL / LEADS_SUPABASE_SECRET');
    return falhar(res, 500);
  }

  try {
    if (body.accao === 'whatsapp') {
      const email = validarEmail(body.email);
      const whatsapp = validarWhatsapp(body.whatsapp);
      if (!email || !whatsapp) return falhar(res, 400);
      // Responde sempre ok, haja ou não lead: a resposta não pode revelar que emails existem.
      try {
        await juntarWhatsapp(url, chave, email, whatsapp);
      } catch (err) {
        console.error('[lead] erro ao juntar whatsapp:', err.message);
      }
      return res.status(200).json({ ok: true });
    }

    if (body.accao === 'lead') {
      const lead = validarLead(body);
      if (!lead) return falhar(res, 400);
      await gravarLead(url, chave, lead);
      return res.status(200).json({ ok: true });
    }

    return falhar(res, 400);
  } catch (err) {
    // O detalhe fica só nos logs do Vercel.
    console.error('[lead] erro:', err.message);
    return falhar(res, 502);
  }
}
