import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
} from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({
    code: 0,
    data: true,
    message: '退出成功',
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, '', getAdminSessionCookieOptions(0));
  response.cookies.set('admin_token', '', getAdminSessionCookieOptions(0));
  response.cookies.set('admin_user', '', getAdminSessionCookieOptions(0));

  return response;
}
