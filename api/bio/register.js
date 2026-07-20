const { generateChallenge } = require('../../lib/crypto');
const { kvSet } = require('../../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { employeeId, rpId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

  const challenge = generateChallenge();
  await kvSet(`challenge:${employeeId}`, challenge, 300);

  return res.json({
    challenge,
    rpId: rpId || 'presence-iq-gilt.vercel.app',
    rpName: 'PresenceIQ',
    userId: employeeId,
    userName: employeeId
  });
};
