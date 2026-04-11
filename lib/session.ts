export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEV_SESSION_SECRET = 'next-rbac-admin-dev-secret';

export interface AdminSessionPayload {
  userId: number;
  username: string;
  nickname: string;
  role: string;
  exp: number;
}

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须配置 AUTH_SECRET');
  }

  return DEV_SESSION_SECRET;
}

function timingSafeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < aBuffer.length; i += 1) {
    diff |= aBuffer[i] ^ bBuffer[i];
  }

  return diff === 0;
}

function toBase64Url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signSessionPayload(payload: string) {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );

  return Buffer.from(signature).toString('base64url');
}

export async function createAdminSessionToken(session: Omit<AdminSessionPayload, 'exp'>) {
  const payload: AdminSessionPayload = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await signSessionPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signSessionPayload(encodedPayload);

  if (!timingSafeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AdminSessionPayload;

    if (!payload.userId || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
