import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindUnique,
  mockFindFirst,
  mockBcryptCompare,
  mockIsLockedOut,
  mockRecordFailed,
  mockResetAttempts,
  mockWriteAuditLog,
  mockCreateToken,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockIsLockedOut: vi.fn(),
  mockRecordFailed: vi.fn(),
  mockResetAttempts: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockCreateToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: { findUnique: mockFindUnique },
    user: { findFirst: mockFindFirst },
  },
}));
vi.mock('bcryptjs', () => ({ default: { compare: mockBcryptCompare } }));
vi.mock('@/lib/login-attempt', () => ({
  isLockedOut: mockIsLockedOut,
  recordFailedAttempt: mockRecordFailed,
  resetAttempts: mockResetAttempts,
  LOCKOUT_DURATION_MINUTES: 15,
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/session', () => ({
  ADMIN_SESSION_COOKIE: 'admin_session',
  createAdminSessionToken: mockCreateToken,
  getAdminSessionCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/' })),
}));

import { POST } from '@/app/api/auth/login/route';

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const BASE_USER = {
  id: 1,
  username: 'alice',
  password: 'hashed',
  nickname: 'Alice',
  status: 1,
  authVersion: 1,
  userRoles: [{ role: { name: 'USER' } }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(null);   // 系统设置默认空
  mockIsLockedOut.mockResolvedValue(false);
  mockBcryptCompare.mockResolvedValue(true);
  mockCreateToken.mockResolvedValue('session-token');
  mockResetAttempts.mockResolvedValue(undefined);
  mockWriteAuditLog.mockResolvedValue(undefined);
});

describe('POST /api/auth/login', () => {
  it('缺少用户名或密码时返回 400', async () => {
    const res = await POST(makeRequest({ username: 'alice' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('不能为空');
  });

  it('账号被锁定时返回 429', async () => {
    mockIsLockedOut.mockResolvedValue(true);
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.message).toContain('15');
  });

  it('用户不存在时记录失败并返回 401', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ username: 'nobody', password: '123456' }));
    expect(res.status).toBe(401);
    expect(mockRecordFailed).toHaveBeenCalledWith('nobody');
  });

  it('账号 status !== 1（待审核）时返回 403', async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_USER, status: 0 });
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('待审核');
  });

  it('密码错误时记录失败并返回 401', async () => {
    mockFindFirst.mockResolvedValue(BASE_USER);
    mockBcryptCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ username: 'alice', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(mockRecordFailed).toHaveBeenCalledWith('alice');
  });

  it('维护模式下非超管返回 503', async () => {
    mockFindFirst.mockResolvedValue(BASE_USER);
    mockFindUnique.mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === 'maintenance_mode') return Promise.resolve({ value: 'true' });
      return Promise.resolve(null);
    });
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(503);
  });

  it('超管在维护模式下可正常登录', async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_USER, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
    mockFindUnique.mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === 'maintenance_mode') return Promise.resolve({ value: 'true' });
      return Promise.resolve(null);
    });
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(200);
  });

  it('登录成功返回 200，包含用户信息和 permissions', async () => {
    mockFindFirst.mockResolvedValue(BASE_USER);
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.username).toBe('alice');
    expect(Array.isArray(body.data.permissions)).toBe(true);
  });

  it('登录成功后重置失败次数', async () => {
    mockFindFirst.mockResolvedValue(BASE_USER);
    await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(mockResetAttempts).toHaveBeenCalledWith('alice');
  });

  it('登录成功后设置 session cookie', async () => {
    mockFindFirst.mockResolvedValue(BASE_USER);
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('admin_session');
  });

  it('自定义 max_login_attempts 系统设置生效', async () => {
    mockIsLockedOut.mockResolvedValue(true);
    mockFindUnique.mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === 'max_login_attempts') return Promise.resolve({ value: '3' });
      return Promise.resolve(null);
    });
    const res = await POST(makeRequest({ username: 'alice', password: '123456' }));
    expect(res.status).toBe(429);
  });
});
