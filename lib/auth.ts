import { cookies } from 'next/headers';

export function getAdminToken() {
  return cookies().get('admin_token')?.value;
}

export function getAdminUserId() {
  const token = getAdminToken();

  if (!token) {
    return null;
  }

  const adminUserId = Number(token);

  if (Number.isNaN(adminUserId)) {
    return null;
  }

  return adminUserId;
}