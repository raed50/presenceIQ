const WEBHOOKS = {
  'pointage-entree': process.env.WEBHOOK_ENTREE,
  'pointage-sortie': process.env.WEBHOOK_SORTIE,
  'bio-register': process.env.BIO_REGISTER,
  'bio-save': process.env.BIO_SAVE,
  'bio-challenge': process.env.BIO_CHALLENGE,
  'bio-verify': process.env.BIO_VERIFY
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { webhook } = req.query;

  if (!webhook || !WEBHOOKS[webhook]) {
    return res.status(400).json({ error: 'Invalid webhook endpoint' });
  }

  const targetUrl = WEBHOOKS[webhook];

  if (!targetUrl) {
    return res.status(500).json({ error: 'Webhook URL not configured' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach webhook' });
  }
};
