import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

const { mockVerify } = vi.hoisted(() => ({ mockVerify: vi.fn() }));

vi.mock('@/lib/session', () => ({
  ADMIN_SESSION_COOKIE: 'admin_session',
  verifyAdminSessionToken: mockVerify,
}));

function makeRequest(pathname: string, cookie?: string) {
  const req = new NextRequest(`http://localhost${pathname}`);
  if (cookie) req.cookies.set('admin_session', cookie);
  return req;
}

beforeEach(() => vi.clearAllMocks());

describe('middleware', () => {
  it('公开 API 路径直接放行（不校验 session）', async () => {
    const res = await middleware(makeRequest('/api/auth/login'));
    expect(res.status).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('/api/auth/logout 也是公开路径', async () => {
    const res = await middleware(makeRequest('/api/auth/logout'));
    expect(res.status).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('已登录用户访问 /login 时重定向到 /', async () => {
    mockVerify.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    const res = await middleware(makeRequest('/login', 'valid-token'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/');
  });

  it('未登录用户访问 /login 时放行', async () => {
    mockVerify.mockResolvedValue(null);
    const res = await middleware(makeRequest('/login'));
    expect(res.status).toBe(200);
  });

  it('未登录访问 API 返回 401 JSON', async () => {
    mockVerify.mockResolvedValue(null);
    const res = await middleware(makeRequest('/api/users'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(1);
    expect(body.message).toBe('未登录');
  });

  it('未登录访问页面重定向到 /login', async () => {
    mockVerify.mockResolvedValue(null);
    const res = await middleware(makeRequest('/users'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('已登录用户访问正常页面放行', async () => {
    mockVerify.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    const res = await middleware(makeRequest('/users', 'valid-token'));
    expect(res.status).toBe(200);
  });

  it('已登录用户访问 API 放行', async () => {
    mockVerify.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    const res = await middleware(makeRequest('/api/users', 'valid-token'));
    expect(res.status).toBe(200);
  });
});
