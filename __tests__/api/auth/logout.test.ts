import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/auth/logout/route';

describe('POST /api/auth/logout', () => {
  it('返回 code=0 退出成功', async () => {
    const res = await POST();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('退出成功');
  });

  it('清除 admin_session cookie（maxAge=0）', async () => {
    const res = await POST();
    const cookies = res.headers.getSetCookie?.() ?? [];
    const sessionCookie = cookies.find((c) => c.startsWith('admin_session='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('Max-Age=0');
  });

  it('清除 admin_token cookie', async () => {
    const res = await POST();
    const cookies = res.headers.getSetCookie?.() ?? [];
    const tokenCookie = cookies.find((c) => c.startsWith('admin_token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('Max-Age=0');
  });

  it('清除 admin_user cookie', async () => {
    const res = await POST();
    const cookies = res.headers.getSetCookie?.() ?? [];
    const userCookie = cookies.find((c) => c.startsWith('admin_user='));
    expect(userCookie).toBeDefined();
    expect(userCookie).toContain('Max-Age=0');
  });
});
