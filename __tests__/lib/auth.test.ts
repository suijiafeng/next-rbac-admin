import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCookiesGet, mockVerify } = vi.hoisted(() => ({
  mockCookiesGet: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookiesGet }),
}));

vi.mock('@/lib/session', () => ({
  ADMIN_SESSION_COOKIE: 'admin_session',
  verifyAdminSessionToken: mockVerify,
}));

import { getAdminToken, getAdminSession, getAdminUserId } from '@/lib/auth';

beforeEach(() => vi.clearAllMocks());

describe('getAdminToken', () => {
  it('cookie 存在时返回 token 字符串', () => {
    mockCookiesGet.mockReturnValue({ value: 'my-token' });
    expect(getAdminToken()).toBe('my-token');
  });

  it('cookie 不存在时返回 undefined', () => {
    mockCookiesGet.mockReturnValue(undefined);
    expect(getAdminToken()).toBeUndefined();
  });
});

describe('getAdminSession', () => {
  it('有效 token 时返回 session payload', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' });
    const payload = { userId: 1, username: 'admin', role: 'ADMIN', exp: 9999999999, nickname: '管理员', authVersion: 1 };
    mockVerify.mockResolvedValue(payload);
    expect(await getAdminSession()).toEqual(payload);
    expect(mockVerify).toHaveBeenCalledWith('valid-token');
  });

  it('无 cookie 时传 undefined 给 verify，返回 null', async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockVerify.mockResolvedValue(null);
    expect(await getAdminSession()).toBeNull();
    expect(mockVerify).toHaveBeenCalledWith(undefined);
  });

  it('token 无效时返回 null', async () => {
    mockCookiesGet.mockReturnValue({ value: 'bad-token' });
    mockVerify.mockResolvedValue(null);
    expect(await getAdminSession()).toBeNull();
  });
});

describe('getAdminUserId', () => {
  it('有效 session 时返回 userId', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' });
    mockVerify.mockResolvedValue({ userId: 42, username: 'alice', role: 'USER', exp: 9999999999, nickname: 'Alice', authVersion: 1 });
    expect(await getAdminUserId()).toBe(42);
  });

  it('无 session 时返回 null', async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockVerify.mockResolvedValue(null);
    expect(await getAdminUserId()).toBeNull();
  });
});
