import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockFindUnique, mockUpdate, mockWriteAuditLog, mockBcryptCompare, mockBcryptHash, mockCreateToken } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockCreateToken: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireAdminUser: mockRequireAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('bcryptjs', () => ({ default: { compare: mockBcryptCompare, hash: mockBcryptHash } }));
vi.mock('@/lib/session', () => ({
  ADMIN_SESSION_COOKIE: 'admin_session',
  createAdminSessionToken: mockCreateToken,
  getAdminSessionCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/' })),
}));

import { POST } from '@/app/api/profile/password/route';

const MOCK_USER = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  role: 'ADMIN',
  status: 1,
  authVersion: 1,
  email: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/profile/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/profile/password', () => {
  it('成功修改密码并重签 session', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindUnique.mockResolvedValue({ id: 1, password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue('new-hashed');
    mockUpdate.mockResolvedValue({ authVersion: 2 });
    mockCreateToken.mockResolvedValue('new-session-token');
    mockWriteAuditLog.mockReturnValue(undefined);

    const res = await POST(makeRequest({ oldPassword: 'old123', newPassword: 'new456' }));
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('密码修改成功');
  });

  it('旧密码或新密码为空时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    const res = await POST(makeRequest({ oldPassword: '', newPassword: 'new456' }));
    expect(res.status).toBe(400);
  });

  it('新密码少于 6 位时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    const res = await POST(makeRequest({ oldPassword: 'old123', newPassword: '12' }));
    expect(res.status).toBe(400);
  });

  it('用户不存在时返回 404', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ oldPassword: 'old123', newPassword: 'new456' }));
    expect(res.status).toBe(404);
  });

  it('旧密码不正确时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindUnique.mockResolvedValue({ id: 1, password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ oldPassword: 'wrong', newPassword: 'new456' }));
    expect(res.status).toBe(400);
  });

  it('新旧密码相同时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindUnique.mockResolvedValue({ id: 1, password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(true);
    const res = await POST(makeRequest({ oldPassword: 'same123', newPassword: 'same123' }));
    expect(res.status).toBe(400);
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await POST(makeRequest({ oldPassword: 'x', newPassword: 'xxxxxx' }));
    expect(res.status).toBe(401);
  });
});
