import { cookies } from 'next/headers';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from '@/lib/session';

export function getAdminToken() {
  return cookies().get(ADMIN_SESSION_COOKIE)?.value;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  return verifyAdminSessionToken(getAdminToken());
}

export async function getAdminUserId() {
  const session = await getAdminSession();
  return session?.userId ?? null;
}
