const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvSet(key, value, exSeconds) {
  const url = exSeconds
    ? `${KV_URL}/set/${encodeURIComponent(key)}?EX=${exSeconds}`
    : `${KV_URL}/set/${encodeURIComponent(key)}`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(value)
  });
}

async function kvDel(key) {
  await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
}

module.exports = { kvGet, kvSet, kvDel };
