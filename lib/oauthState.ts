import crypto from 'crypto';

interface StatePayload {
  userId: number;
  platform: string;
  nonce: string;
}

function secret() {
  return process.env.NEXTAUTH_SECRET || 'dev-secret-change-me';
}

export function signState(payload: StatePayload): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${hmac}`;
}

export function verifyState(state: string): StatePayload | null {
  const [encoded, hmac] = state.split('.');
  if (!encoded || !hmac) return null;
  const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  const hmacBuf = Buffer.from(hmac);
  const expectedBuf = Buffer.from(expected);
  if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
