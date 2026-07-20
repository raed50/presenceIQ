const { generateChallenge } = require('../../lib/crypto');
const { kvGet, kvSet } = require('../../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

  const cred = await kvGet(`cred:${employeeId}`);
  if (!cred) {
    return res.json({ success: false, error: "Aucune clé biométrique trouvée pour cet employé. Enregistrez d'abord votre visage." });
  }

  const challenge = generateChallenge();
  await kvSet(`challenge:${employeeId}`, challenge, 300);

  let transports;
  try { transports = JSON.parse(cred.transports); } catch { transports = ['internal']; }

  return res.json({
    success: true,
    challenge,
    credentialId: cred.credentialId,
    transports,
    employeeId
  });
};
