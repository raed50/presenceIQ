const { kvSet } = require('../../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { employeeId, credentialId, publicKey, transports } = req.body || {};
  if (!employeeId || !credentialId || !publicKey) {
    return res.status(400).json({ error: 'employeeId, credentialId, publicKey required' });
  }

  await kvSet(`cred:${employeeId}`, { credentialId, publicKey, transports: transports || '["internal"]' });

  return res.json({ success: true, message: 'Clé biométrique enregistrée', employeeId });
};
