import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExpire } = vi.hoisted(() => ({
  mockExpire: vi.fn(),
}));

vi.mock('@/lib/temp-grant', () => ({ expireDueGrants: mockExpire }));

import { GET } from '@/app/api/cron/expire-grants/route';

const SECRET = 'test-cron-secret';

function call(url: string, headers: Record<string, string> = {}) {
  return GET(new Request(url, { headers }));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mockExpire.mockResolvedValue(2);
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/expire-grants', () => {
  it('未配置 CRON_SECRET 时拒绝且不执行回收', async () => {
    delete process.env.CRON_SECRET;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('http://localhost/api/cron/expire-grants', {
      authorization: `Bearer ${SECRET}`,
    });
    expect(res.status).toBe(401);
    expect(mockExpire).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('缺少密钥时返回 401', async () => {
    const res = await call('http://localhost/api/cron/expire-grants');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe('无权限');
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it('错误的 Bearer 密钥返回 401', async () => {
    const res = await call('http://localhost/api/cron/expire-grants', {
      authorization: 'Bearer wrong-secret',
    });
    expect(res.status).toBe(401);
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it('Authorization: Bearer CRON_SECRET 时执行回收', async () => {
    const res = await call('http://localhost/api/cron/expire-grants', {
      authorization: `Bearer ${SECRET}`,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.expired).toBe(2);
    expect(body.message).toContain('2');
    expect(mockExpire).toHaveBeenCalledOnce();
  });

  it('Bearer 方案大小写不敏感', async () => {
    const res = await call('http://localhost/api/cron/expire-grants', {
      authorization: `bearer ${SECRET}`,
    });
    expect(res.status).toBe(200);
    expect(mockExpire).toHaveBeenCalledOnce();
  });

  it('?secret= 正确时执行回收', async () => {
    const res = await call(`http://localhost/api/cron/expire-grants?secret=${SECRET}`);
    expect(res.status).toBe(200);
    expect(mockExpire).toHaveBeenCalledOnce();
  });

  it('错误的 query secret 返回 401', async () => {
    const res = await call('http://localhost/api/cron/expire-grants?secret=nope');
    expect(res.status).toBe(401);
    expect(mockExpire).not.toHaveBeenCalled();
  });
});
