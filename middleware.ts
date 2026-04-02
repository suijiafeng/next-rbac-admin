import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get('admin_token')?.value;

  if (!adminToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (adminToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/users/:path*', '/settings/:path*','/profile/:path*','/api/profile/:path*', '/'],
};