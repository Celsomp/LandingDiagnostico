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
      return res.status(contactRes.status).json({ error: text });
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
    return res.status(500).json({ error: err.message });
  }
}
