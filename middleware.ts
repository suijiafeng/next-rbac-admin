import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/session';

/** 不需要任何认证的 API 路径 */
const publicApiPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
];

/** 认证页面路径（已登录用户应被重定向离开） */
const authPagePaths = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开 API 路径直接放行
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(sessionToken);

  const isAuthPage = authPagePaths.some((path) => pathname.startsWith(path));

  // 已登录用户访问登录/注册页面，重定向至首页
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 未登录用户访问认证页面，直接放行
  if (!session && isAuthPage) {
    return NextResponse.next();
  }

  // 未登录访问 API，返回 401
  if (!session && pathname.startsWith('/api/')) {
    return NextResponse.json(
      { code: 1, data: null, message: '未登录' },
      { status: 401 },
    );
  }

  // 未登录访问其他页面，重定向至登录页
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register/:path*',
    '/dashboard/:path*',
    '/monitoring/:path*',
    '/users/:path*',
    '/announcements/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/permissions/:path*',
    '/roles/:path*',
    '/feedback/:path*',
    '/api/:path*',
    '/',
  ],
};
