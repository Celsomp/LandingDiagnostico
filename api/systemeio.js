// Cria (ou encontra) o contacto no systeme.io e junta-lhe as tags.
// Valida no servidor como o api/lead.js: só passa o que o quiz.js envia.
// Responde só { ok: true } ou { ok: false }.

const MAX_BYTES = 10 * 1024;

// Mais apertado que o necessário: igual ao api/lead.js.
const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Os campos e as tags que o quiz.js envia (saveLeadToSystemeio). Mais nada passa.
const VALIDAR_CAMPO = {
  quiz_score:     v => /^\d{1,3}$/.test(v) && Number(v) <= 100,
  quiz_categoria: v => ['critico', 'em_margem', 'solido'].includes(v),
  quiz_custo:     v => /^\d{1,9}$/.test(v),
  quiz_gaps:      v => /^([A-D](, [A-D]){0,2})?$/.test(v)
};
const TAGS_VALIDAS = ['Lista_Celso'];

function falhar(res, status) {
  return res.status(status).json({ ok: false });
}

/** Devolve { email, firstName, fields, tags } limpo, ou null se algo não bater certo. */
function validar(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  if (!firstName || firstName.length > 120) return null;

  if (!Array.isArray(body.fields) || body.fields.length !== Object.keys(VALIDAR_CAMPO).length) return null;
  const vistos = new Set();
  const fields = [];
  for (const campo of body.fields) {
    if (!campo || typeof campo !== 'object') return null;
    const { slug, value } = campo;
    if (!Object.hasOwn(VALIDAR_CAMPO, slug) || vistos.has(slug)) return null;
    if (typeof value !== 'string' || !VALIDAR_CAMPO[slug](value)) return null;
    vistos.add(slug);
    fields.push({ slug, value });
  }

  if (!Array.isArray(body.tags) || body.tags.length === 0) return null;
  if (!body.tags.every(t => TAGS_VALIDAS.includes(t))) return null;
  const tags = [...new Set(body.tags)];

  return { email, firstName, fields, tags };
}

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
  if (body && Buffer.byteLength(JSON.stringify(body)) > MAX_BYTES) return falhar(res, 413);

  const contacto = validar(body);
  if (!contacto) return falhar(res, 400);

  const { email, firstName, fields, tags } = contacto;
  const apiKey = process.env.SYSTEMEIO_KEY;
  if (!apiKey) {
    console.error('[systemeio] falta SYSTEMEIO_KEY');
    return falhar(res, 500);
  }
  const baseHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  };

  try {
    // 1. Criar contacto
    const contactRes = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ email, firstName, fields })
    });

    let contactId;

    if (contactRes.ok) {
      const contact = await contactRes.json();
      contactId = contact.id;
    } else if (contactRes.status === 422) {
      // Contacto já existe — buscar pelo email
      const searchRes = await fetch(
        `https://api.systeme.io/api/contacts?email=${encodeURIComponent(email)}`,
        { headers: { 'X-API-Key': apiKey } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        contactId = searchData.items?.[0]?.id;
      }
    } else {
      const text = await contactRes.text();
      console.error('[systemeio] erro ao criar contacto:', contactRes.status, text);
      return falhar(res, 502);
    }

    // 2. Adicionar tags por nome → ID numérico
    if (tags && tags.length > 0 && contactId) {
      const tagsRes = await fetch('https://api.systeme.io/api/tags?limit=100', {
        headers: { 'X-API-Key': apiKey }
      });
      const tagsData = await tagsRes.json();
      const tagMap = {};
      (tagsData.items || []).forEach(t => { tagMap[t.name] = t.id; });

      for (const tagName of tags) {
        let tagId = tagMap[tagName];

        if (!tagId) {
          const createRes = await fetch('https://api.systeme.io/api/tags', {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({ name: tagName })
          });
          if (createRes.ok) {
            const newTag = await createRes.json();
            tagId = newTag.id;
          }
        }

        if (tagId) {
          await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({ tagId })
          });
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[systemeio] erro interno:', err);
    return falhar(res, 500);
  }
}
