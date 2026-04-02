import { NextRequest, NextResponse } from 'next/server';
const publicPaths = ['/login', '/api/auth/login','/api/profile',];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // const adminToken = request.cookies.get('admin_token')?.value;
  const adminUser = request.cookies.get('admin_user')?.value;




  if (!adminUser) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (adminUser && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/users/:path*', '/settings/:path*', '/profile/:path*', '/'],
};