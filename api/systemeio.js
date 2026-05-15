export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, fields, tags } = req.body;

  try {
    const r = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SYSTEMEIO_KEY
      },
      body: JSON.stringify({ email, firstName, fields, tags })
    });

    const text = await r.text();

    if (!r.ok) {
      console.error('[systemeio] erro:', r.status, text);
      return res.status(r.status).json({ error: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[systemeio] erro interno:', err);
    return res.status(500).json({ error: err.message });
  }
}
