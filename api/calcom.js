// Webhook do cal.com: quando alguém marca a conversa do Mapa, põe a tag Conversa_Marcada no
// contacto do systeme.io com o email do participante. As etapas do CRM fazem-nas os workflows
// do systeme.io, a partir da tag.
//
// URL a configurar no cal.com: https://landing-diagnostico-two.vercel.app/api/calcom
// Evento: BOOKING_CREATED. Segredo: o mesmo valor que CALCOM_WEBHOOK_SECRET na Vercel.
//
// Assinatura: o cal.com envia X-Cal-Signature-256 = HMAC-SHA256 do corpo exacto, em hex, com o
// segredo. Por isso o corpo lê-se em bruto (request.text()) antes de qualquer JSON.parse.
// Sem assinatura válida → 401, e o systeme.io não é chamado.
//
// Só conta a marcação criada (BOOKING_CREATED) do tipo de evento do Mapa (EVENTO_MAPA, o slug em
// payload.type). O resto, incluindo o teste de ping do cal.com, responde 200 sem fazer nada.
// Nunca cria contactos nem tags: um email que não existe no systeme.io fica só nos logs (200).
// O cal.com não reenvia webhooks (um só envio, sem fila). Por isso tenta-se o systeme.io até
// 3 vezes, com uma pausa curta entre elas. Se as 3 falharem, cada email da marcação fica em
// public.webhook_falhas (projecto Supabase Claude) e a resposta é 502. Tudo cabe em ~10 s,
// o limite mais curto de uma função na Vercel.
// Os pedidos ao systeme.io seguem o api/mapa.js (X-API-Key, procura pelo email, tag por id).

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 100 * 1024;
const EVENTO_MAPA = 'mapa'; // cal.com/celso-pereira/mapa
const MAX_PARTICIPANTES = 10;

const SYSTEME = 'https://api.systeme.io/api';
const SYSTEME_PRAZO_MS = 2000; // por tentativa
const PAUSAS_MS = [300, 600]; // antes da 2.ª e da 3.ª tentativa
const SUPABASE_PRAZO_MS = 1500;
const TAG = 'Conversa_Marcada';
const TAG_VARIAVEL = 'SYSTEMEIO_TAG_CONVERSA_MARCADA';

const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const responder = (status, corpo = { ok: status < 400 }) => Response.json(corpo, { status });

function assinaturaValida(corpo, assinatura, segredo) {
  if (typeof assinatura !== 'string' || !/^[0-9a-f]{64}$/i.test(assinatura)) return false;
  const esperada = createHmac('sha256', segredo).update(corpo).digest();
  return timingSafeEqual(esperada, Buffer.from(assinatura, 'hex'));
}

function systeme(chave, caminho, sinal, { method = 'GET', body } = {}) {
  const headers = { 'X-API-Key': chave };
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(SYSTEME + caminho, { method, headers, body: body && JSON.stringify(body), signal: sinal });
}

async function procurarContacto(chave, email, sinal) {
  const res = await systeme(chave, `/contacts?email=${encodeURIComponent(email)}`, sinal);
  if (!res.ok) throw new Error('systeme procurar: ' + res.status + ' ' + (await res.text()));
  const { items } = await res.json();
  return items?.[0] ?? null;
}

/** Id da tag pela variável de ambiente ou pelo nome exacto. Nunca a cria. */
async function idDaTag(chave, sinal) {
  const n = Number(process.env[TAG_VARIAVEL]);
  if (Number.isInteger(n) && n > 0) return n;
  const res = await systeme(chave, '/tags?limit=100', sinal);
  if (!res.ok) throw new Error('systeme tags: ' + res.status + ' ' + (await res.text()));
  const { items = [] } = await res.json();
  const tag = items.find((t) => t.name === TAG);
  if (!tag) throw new Error('systeme: a tag ' + TAG + ' não existe na conta');
  return tag.id;
}

/** Emails únicos e válidos dos participantes. */
function emailsDosParticipantes(payload) {
  const lista = Array.isArray(payload?.attendees) ? payload.attendees.slice(0, MAX_PARTICIPANTES) : [];
  const emails = lista
    .map((a) => (typeof a?.email === 'string' ? a.email.trim() : ''))
    .filter((e) => e.length <= 254 && EMAIL_RE.test(e));
  const vistos = new Set();
  return emails.filter((e) => !vistos.has(e.toLowerCase()) && vistos.add(e.toLowerCase()));
}

// Nos logs, o email vai tapado: t•••@exemplo.pt.
const tapar = (email) => email.replace(/^(.)[^@]*/, '$1•••');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Uma tentativa: põe a tag em cada contacto que exista. Lança erro se o systeme.io falhar. */
async function porTag(chave, emails, uid) {
  const sinal = AbortSignal.timeout(SYSTEME_PRAZO_MS);
  const [tagId, ...contactos] = await Promise.all([idDaTag(chave, sinal), ...emails.map((e) => procurarContacto(chave, e, sinal))]);
  for (const [i, contacto] of contactos.entries()) {
    if (!contacto) {
      console.error('[calcom] email sem contacto no systeme.io (marcação ' + uid + '):', tapar(emails[i]));
      continue;
    }
    if ((contacto.tags || []).some((t) => t.id === tagId)) continue;
    const res = await systeme(chave, `/contacts/${contacto.id}/tags`, sinal, { method: 'POST', body: { tagId } });
    if (!res.ok) throw new Error('systeme tag: ' + res.status + ' ' + (await res.text()));
  }
}

/** Grava a falha em public.webhook_falhas, uma linha por email. Se o Supabase falhar, fica nos logs. */
async function registarFalha(emails, uid, erro) {
  const url = process.env.LEADS_SUPABASE_URL;
  const chave = process.env.LEADS_SUPABASE_SECRET;
  if (!url || !chave) {
    console.error('[calcom] faltam LEADS_SUPABASE_URL / LEADS_SUPABASE_SECRET: falha não gravada');
    return;
  }
  const headers = { apikey: chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (chave.startsWith('eyJ')) headers.Authorization = 'Bearer ' + chave;
  const linhas = emails.map((email) => ({
    origem: 'calcom',
    email,
    marcacao_uid: typeof uid === 'string' ? uid.slice(0, 200) : null,
    erro: String(erro).slice(0, 500),
  }));
  try {
    const res = await fetch(`${url}/rest/v1/webhook_falhas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(linhas),
      signal: AbortSignal.timeout(SUPABASE_PRAZO_MS),
    });
    if (!res.ok) throw new Error(res.status + ' ' + (await res.text()));
  } catch (err) {
    console.error('[calcom] não consegui gravar em webhook_falhas (marcação ' + uid + '):', err.message);
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ ok: false }, { status: 405, headers: { Allow: 'POST' } });

    const segredo = process.env.CALCOM_WEBHOOK_SECRET;
    const chave = process.env.SYSTEMEIO_KEY;
    if (!segredo || !chave) {
      console.error('[calcom] faltam CALCOM_WEBHOOK_SECRET / SYSTEMEIO_KEY');
      return responder(500);
    }

    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return responder(413);
    const corpo = await request.text();
    if (Buffer.byteLength(corpo) > MAX_BYTES) return responder(413);

    if (!assinaturaValida(corpo, request.headers.get('x-cal-signature-256'), segredo)) {
      console.error('[calcom] assinatura inválida');
      return responder(401);
    }

    let evento;
    try {
      evento = JSON.parse(corpo);
    } catch {
      return responder(400);
    }

    if (evento?.triggerEvent !== 'BOOKING_CREATED') return responder(200, { ok: true, ignorado: true });
    if (evento.payload?.type !== EVENTO_MAPA) {
      console.error('[calcom] marcação de outro tipo de evento, ignorada:', String(evento.payload?.type).slice(0, 60));
      return responder(200, { ok: true, ignorado: true });
    }

    const emails = emailsDosParticipantes(evento.payload);
    if (emails.length === 0) {
      console.error('[calcom] marcação sem email de participante:', evento.payload?.uid);
      return responder(200, { ok: true, ignorado: true });
    }

    const uid = evento.payload?.uid;
    let erro;
    for (let tentativa = 1; tentativa <= PAUSAS_MS.length + 1; tentativa++) {
      try {
        await porTag(chave, emails, uid);
        return responder(200);
      } catch (err) {
        erro = err.message;
        console.error(`[calcom] systeme, marcação ${uid}, tentativa ${tentativa}:`, erro);
      }
      if (tentativa <= PAUSAS_MS.length) await pausa(PAUSAS_MS[tentativa - 1]);
    }
    await registarFalha(emails, uid, erro);
    return responder(502);
  },
};
