import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireRole,
  mockUserFindUnique,
  mockRoleFind,
  mockTransaction,
  mockWriteAuditLog,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockRoleFind: vi.fn(),
  mockTransaction: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    role: { findUnique: mockRoleFind },
    userRole: { deleteMany: vi.fn(), upsert: vi.fn() },
    $transaction: mockTransaction,
  },
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

import { PATCH } from '@/app/api/users/[id]/role/route';

const SUPER_ADMIN = { id: 1, username: 'root', role: 'SUPER_ADMIN' };
const TARGET_USER = {
  id: 2,
  username: 'alice',
  nickname: 'Alice',
  email: null,
  status: 1,
  userRoles: [{ role: { name: 'USER' } }],
};
const UPDATED_USER = { ...TARGET_USER, userRoles: [{ role: { name: 'ADMIN' } }] };

const ctx = (id: string) => ({ params: { id } });

function makeRequest(body: object) {
  return new Request('http://localhost/api/users/2/role', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  // resetAllMocks 同时清除 once 队列，避免跨测试污染
  vi.resetAllMocks();
  mockRequireRole.mockResolvedValue(SUPER_ADMIN);
  // 默认：第一次查目标用户，第二次查更新后用户
  mockUserFindUnique.mockResolvedValueOnce(TARGET_USER).mockResolvedValueOnce(UPDATED_USER);
  mockRoleFind.mockResolvedValue({ id: 20, name: 'ADMIN' });
  mockTransaction.mockResolvedValue([]);
  mockWriteAuditLog.mockResolvedValue(undefined);
});

describe('PATCH /api/users/[id]/role', () => {
  it('非 SUPER_ADMIN 调用时返回 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await PATCH(makeRequest({ role: 'ADMIN' }), ctx('2'));
    expect(res.status).toBe(403);
  });

  it('ID 非法时返回 400', async () => {
    const res = await PATCH(makeRequest({ role: 'ADMIN' }), ctx('abc'));
    expect(res.status).toBe(400);
  });

  it('role 值无效时返回 400', async () => {
    const res = await PATCH(makeRequest({ role: 'SUPER_ADMIN' }), ctx('2'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('ADMIN 或 USER');
  });

  it('修改自己的角色时返回 400', async () => {
    mockRequireRole.mockResolvedValue({ ...SUPER_ADMIN, id: 2 });
    const res = await PATCH(makeRequest({ role: 'USER' }), ctx('2'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('自己');
  });

  it('目标用户不存在时返回 404', async () => {
    mockUserFindUnique.mockReset().mockResolvedValue(null);
    const res = await PATCH(makeRequest({ role: 'ADMIN' }), ctx('99'));
    expect(res.status).toBe(404);
  });

  it('目标是超级管理员时返回 403', async () => {
    mockUserFindUnique.mockReset()
      .mockResolvedValue({ ...TARGET_USER, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
    const res = await PATCH(makeRequest({ role: 'USER' }), ctx('2'));
    expect(res.status).toBe(403);
  });

  it('目标角色不存在时返回 400', async () => {
    mockRoleFind.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ role: 'ADMIN' }), ctx('2'));
    expect(res.status).toBe(400);
  });

  it('成功分配角色并写入审计日志', async () => {
    const res = await PATCH(makeRequest({ role: 'ADMIN' }), ctx('2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('成功');
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog.mock.calls[0][0].action).toBe('role.grant_admin');
  });

  it('降为 USER 时审计 action 为 role.revoke_admin', async () => {
    mockUserFindUnique.mockReset()
      .mockResolvedValueOnce({ ...TARGET_USER, userRoles: [{ role: { name: 'ADMIN' } }] })
      .mockResolvedValueOnce({ ...TARGET_USER, userRoles: [{ role: { name: 'USER' } }] });
    mockRoleFind.mockResolvedValue({ id: 10, name: 'USER' });
    await PATCH(makeRequest({ role: 'USER' }), ctx('2'));
    expect(mockWriteAuditLog.mock.calls[0][0].action).toBe('role.revoke_admin');
  });
});
