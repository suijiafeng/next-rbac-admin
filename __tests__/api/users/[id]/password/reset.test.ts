import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireRole, mockFindUnique, mockUpdate, mockWriteAuditLog, mockBcryptHash, mockGeneratePassword } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockGeneratePassword: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('bcryptjs', () => ({ default: { hash: mockBcryptHash } }));
vi.mock('@/lib/user-helpers', () => ({ generateInitialPassword: mockGeneratePassword }));

import { POST } from '@/app/api/users/[id]/password/reset/route';

const SUPER_USER = {
  id: 1,
  username: 'super',
  nickname: '超管',
  role: 'SUPER_ADMIN',
  status: 1,
  authVersion: 1,
};

const TARGET_USER = { id: 2, username: 'user1', nickname: '用户1' };

function makeRequest() {
  return new Request('http://localhost/api/users/2/password/reset', { method: 'POST' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/users/[id]/password/reset', () => {
  it('成功重置密码并返回临时密码', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);
    mockFindUnique.mockResolvedValue(TARGET_USER);
    mockGeneratePassword.mockReturnValue('TmpPwd123');
    mockBcryptHash.mockResolvedValue('hashed');
    mockUpdate.mockResolvedValue(undefined);
    mockWriteAuditLog.mockResolvedValue(undefined);

    const res = await POST(makeRequest(), { params: { id: '2' } });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.defaultPassword).toBe('TmpPwd123');
  });

  it('ID 非法时返回 400', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);
    const res = await POST(makeRequest(), { params: { id: 'abc' } });
    expect(res.status).toBe(400);
  });

  it('不能重置自己的密码', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);
    const res = await POST(makeRequest(), { params: { id: '1' } });
    expect(res.status).toBe(400);
  });

  it('目标用户不存在时返回 404', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(), { params: { id: '99' } });
    expect(res.status).toBe(404);
  });

  it('非 SUPER_ADMIN 时抛出无权限', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await POST(makeRequest(), { params: { id: '2' } });
    expect(res.status).toBe(403);
  });
});
