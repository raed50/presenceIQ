const { kvSet, kvGet } = require('../../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { employeeId, photo } = req.body || {};
  if (!employeeId || !photo) {
    return res.status(400).json({ error: 'employeeId and photo required' });
  }

  const existing = await kvGet(`selfie:${employeeId}`);
  if (existing) {
    return res.json({ success: true, message: 'Selfie déjà enregistré', isUpdate: false });
  }

  await kvSet(`selfie:${employeeId}`, {
    photo,
    registeredAt: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Selfie enregistré avec succès', isUpdate: false });
};
