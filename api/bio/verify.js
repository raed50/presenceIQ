const { verifySignature } = require('../../lib/crypto');
const { kvGet, kvDel } = require('../../lib/store');

const POINTAGE_WEBHOOKS = {
  entree: process.env.WEBHOOK_ENTREE,
  sortie: process.env.WEBHOOK_SORTIE
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const { employeeId, nom, credentialId, clientDataJSON, authenticatorData, signature, challenge, type, latitude, longitude, timestamp, heureEntreeStr } = body;

  if (!employeeId || !credentialId || !clientDataJSON || !authenticatorData || !signature || !challenge) {
    return res.status(400).json({ success: false, error: 'Champs biométriques manquants' });
  }

  const storedChallenge = await kvGet(`challenge:${employeeId}`);
  if (!storedChallenge || storedChallenge !== challenge) {
    return res.json({ success: false, error: 'Challenge invalide ou expiré' });
  }

  const cred = await kvGet(`cred:${employeeId}`);
  if (!cred || cred.credentialId !== credentialId) {
    return res.json({ success: false, error: 'Credential non trouvé' });
  }

  let verified = false;
  try {
    verified = verifySignature(cred.publicKey, challenge, clientDataJSON, authenticatorData, signature);
  } catch (e) {
    console.error('Signature verification error:', e.message);
    return res.json({ success: false, error: 'Erreur de vérification de signature' });
  }

  await kvDel(`challenge:${employeeId}`);

  if (!verified) {
    return res.json({ success: false, error: 'Signature invalide — visage non reconnu' });
  }

  const webhookUrl = POINTAGE_WEBHOOKS[type];
  if (!webhookUrl) {
    return res.json({ success: true, verified: true, message: 'Biométrie validée (pas de pointage configuré)' });
  }

  try {
    const fwdRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId, nom, type, latitude, longitude, timestamp, heureEntreeStr,
        biometricsVerified: true,
        biometricsMethod: 'WebAuthn'
      })
    });
    const fwdData = await fwdRes.json();
    return res.json({ success: true, verified: true, biometricsVerified: true, employeeId, forwardResponse: fwdData, message: '✅ Pointage + biométrie validés' });
  } catch (e) {
    console.error('Forward error:', e.message);
    return res.json({ success: true, verified: true, biometricsVerified: true, employeeId, message: 'Biométrie validée, erreur pointage' });
  }
};
