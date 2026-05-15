export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, fields, tags } = req.body;
  const apiKey = process.env.SYSTEMEIO_KEY;
  const baseHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  };

  try {
    // 1. Criar/actualizar contacto (sem tags — a API espera IDs numéricos)
    const contactRes = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ email, firstName, fields })
    });

    const contactText = await contactRes.text();

    if (!contactRes.ok) {
      console.error('[systemeio] erro ao criar contacto:', contactRes.status, contactText);
      return res.status(contactRes.status).json({ error: contactText });
    }

    const contact = JSON.parse(contactText);
    const contactId = contact.id;

    // 2. Adicionar tags por nome → ID
    if (tags && tags.length > 0 && contactId) {
      // Obter lista de tags existentes
      const tagsRes = await fetch('https://api.systeme.io/api/tags?limit=100', {
        headers: { 'X-API-Key': apiKey }
      });
      const tagsData = await tagsRes.json();
      const tagMap = {};
      (tagsData.items || []).forEach(t => { tagMap[t.name] = t.id; });

      for (const tagName of tags) {
        let tagId = tagMap[tagName];

        // Criar tag se não existir
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

        // Associar tag ao contacto
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
    return res.status(500).json({ error: err.message });
  }
}
