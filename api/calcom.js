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
// Uma falha do systeme.io responde 502 e fica nos logs.
// Os pedidos ao systeme.io seguem o api/mapa.js (X-API-Key, procura pelo email, tag por id).

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 100 * 1024;
const EVENTO_MAPA = 'mapa'; // cal.com/celso-pereira/mapa
const MAX_PARTICIPANTES = 10;

const SYSTEME = 'https://api.systeme.io/api';
const SYSTEME_PRAZO_MS = 5000; // ninguém espera por esta resposta: o prazo pode ser folgado
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

    const sinal = AbortSignal.timeout(SYSTEME_PRAZO_MS);
    try {
      const [tagId, ...contactos] = await Promise.all([idDaTag(chave, sinal), ...emails.map((e) => procurarContacto(chave, e, sinal))]);
      for (const [i, contacto] of contactos.entries()) {
        if (!contacto) {
          console.error('[calcom] email sem contacto no systeme.io (marcação ' + evento.payload?.uid + '):', tapar(emails[i]));
          continue;
        }
        if ((contacto.tags || []).some((t) => t.id === tagId)) continue;
        const res = await systeme(chave, `/contacts/${contacto.id}/tags`, sinal, { method: 'POST', body: { tagId } });
        if (!res.ok) throw new Error('systeme tag: ' + res.status + ' ' + (await res.text()));
      }
    } catch (err) {
      console.error('[calcom] systeme, marcação ' + evento.payload?.uid + ':', err.message);
      return responder(502);
    }
    return responder(200);
  },
};
