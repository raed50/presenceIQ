const crypto = require('crypto');

function generateChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

function parseCOSEKey(coseB64url) {
  const buf = Buffer.from(coseB64url, 'base64url');
  let off = 0;

  function readInt() {
    const b = buf[off++];
    const mt = (b & 0xe0) >> 5;
    const ai = b & 0x1f;
    if (mt === 0) return ai;
    if (mt === 1) return -1 - ai;
    if (ai < 24) return ai;
    if (ai === 24) return buf[off++];
    if (ai === 25) { const v = buf.readUInt16BE(off); off += 2; return v; }
    throw new Error('Unsupported CBOR int size');
  }

  function readBytes() {
    const len = readInt();
    const slice = buf.slice(off, off + len);
    off += len;
    return slice;
  }

  const first = buf[off++];
  const mapLen = first & 0x1f;
  const map = {};

  for (let i = 0; i < mapLen; i++) {
    const key = readInt();
    const vb = buf[off++];
    const vmt = (vb & 0xe0) >> 5;
    const vai = vb & 0x1f;
    if (vmt === 0 || vmt === 1) {
      map[key] = vai;
    } else if (vmt === 2) {
      off--;
      map[key] = readBytes();
    }
  }

  return { x: map[-2], y: map[-3] };
}

function verifySignature(publicKeyB64url, challengeB64url, clientDataJSONB64url, authenticatorDataB64url, signatureB64url) {
  const { x, y } = parseCOSEKey(publicKeyB64url);

  const spkiHeader = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');
  const uncompressed = Buffer.concat([Buffer.from([0x04]), x, y]);
  const spkiDer = Buffer.concat([spkiHeader, uncompressed]);

  const keyObject = crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' });

  const clientDataHash = crypto.createHash('sha256').update(Buffer.from(clientDataJSONB64url, 'base64url')).digest();
  const authData = Buffer.from(authenticatorDataB64url, 'base64url');
  const dataToVerify = Buffer.concat([authData, clientDataHash]);

  const sig = Buffer.from(signatureB64url, 'base64url');
  return crypto.createVerify('SHA256').update(dataToVerify).verify(keyObject, sig);
}

module.exports = { generateChallenge, parseCOSEKey, verifySignature };
