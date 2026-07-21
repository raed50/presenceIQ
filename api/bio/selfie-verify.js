const { kvGet } = require('../../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { employeeId, photo } = req.body || {};
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId required' });
  }

  // Check-only mode (used by checkBioStatus)
  if (photo === 'check') {
    const stored = await kvGet(`selfie:${employeeId}`);
    return res.json({ success: true, hasSelfie: !!(stored && stored.photo) });
  }

  if (!photo) {
    return res.status(400).json({ error: 'photo required' });
  }

  const stored = await kvGet(`selfie:${employeeId}`);
  if (!stored || !stored.photo) {
    return res.json({ success: false, verified: false, error: 'Aucun selfie enregistré. Enregistrez votre visage d\'abord.' });
  }

  const storedHash = extractSimpleHash(stored.photo);
  const newHash = extractSimpleHash(photo);
  const similarity = compareHashes(storedHash, newHash);

  if (similarity > 0.7) {
    return res.json({ success: true, verified: true, similarity, message: '✅ Visage reconnu' });
  }

  return res.json({ success: false, verified: false, similarity, error: 'Visage non reconnu. Réessayez.' });
};

function extractSimpleHash(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  let r = 0, g = 0, b = 0, count = 0;
  const step = Math.max(1, Math.floor(buffer.length / 300));

  for (let i = 0; i < buffer.length - 2; i += step * 3) {
    r += buffer[i];
    g += buffer[i + 1];
    b += buffer[i + 2];
    count++;
  }

  return { avgR: r / count, avgG: g / count, avgB: b / count, size: buffer.length };
}

function compareHashes(a, b) {
  const colorDiff = Math.abs(a.avgR - b.avgR) + Math.abs(a.avgG - b.avgG) + Math.abs(a.avgB - b.avgB);
  const colorSim = 1 - (colorDiff / (255 * 3));
  const sizeDiff = Math.abs(a.size - b.size) / Math.max(a.size, b.size);
  const sizeSim = 1 - sizeDiff;
  return colorSim * 0.6 + sizeSim * 0.4;
}
