import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/session';

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/captcha'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(sessionToken);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register/:path*', '/dashboard/:path*', '/users/:path*', '/settings/:path*', '/profile/:path*', '/'],
};
