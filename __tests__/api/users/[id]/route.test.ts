import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequirePermission,
  mockGetCurrentAdminUser,
  mockFindUnique,
  mockFindFirst,
  mockUpdate,
  mockDelete,
  mockWriteAuditLog,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockGetCurrentAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/admin-user', () => ({ getCurrentAdminUser: mockGetCurrentAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

import { GET, PUT, DELETE } from '@/app/api/users/[id]/route';

const ACTOR = { id: 1, username: 'superadmin', role: 'SUPER_ADMIN' };
const RAW_USER = {
  id: 2,
  username: 'alice',
  nickname: 'Alice',
  email: null,
  status: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [{ role: { name: 'USER' } }],
};
const ctx = (id: string) => ({ params: { id } });

function makeRequest(method: string, body?: object) {
  return new Request(`http://localhost/api/users/2`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequirePermission.mockResolvedValue({ user: ACTOR, role: 'SUPER_ADMIN', permissions: [] });
  mockGetCurrentAdminUser.mockResolvedValue(ACTOR);
  mockFindUnique.mockResolvedValue(RAW_USER);
  mockFindFirst.mockResolvedValue(null);
  mockUpdate.mockResolvedValue(RAW_USER);
  mockDelete.mockResolvedValue(RAW_USER);
  mockWriteAuditLog.mockResolvedValue(undefined);
});

// ─── GET ───────────────────────────────────────────────────────────────────

describe('GET /api/users/[id]', () => {
  it('ID 非法时返回 400', async () => {
    const res = await GET(makeRequest('GET'), ctx('abc'));
    expect(res.status).toBe(400);
  });

  it('用户不存在时返回 404', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'), ctx('99'));
    expect(res.status).toBe(404);
  });

  it('成功返回用户信息', async () => {
    const res = await GET(makeRequest('GET'), ctx('2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.username).toBe('alice');
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await GET(makeRequest('GET'), ctx('2'));
    expect(res.status).toBe(403);
  });
});

// ─── PUT ───────────────────────────────────────────────────────────────────

describe('PUT /api/users/[id]', () => {
  const BODY = { username: 'alice2', nickname: 'Alice2', status: 1 };

  it('ID 非法时返回 400', async () => {
    const res = await PUT(makeRequest('PUT', BODY), ctx('0'));
    expect(res.status).toBe(400);
  });

  it('缺少用户名或昵称时返回 400', async () => {
    const res = await PUT(makeRequest('PUT', { username: 'u' }), ctx('2'));
    expect(res.status).toBe(400);
  });

  it('status 非法时返回 400', async () => {
    const res = await PUT(makeRequest('PUT', { ...BODY, status: 9 }), ctx('2'));
    expect(res.status).toBe(400);
  });

  it('用户不存在时返回 404', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest('PUT', BODY), ctx('2'));
    expect(res.status).toBe(404);
  });

  it('编辑超级管理员时返回 403', async () => {
    mockFindUnique.mockResolvedValue({ ...RAW_USER, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
    const res = await PUT(makeRequest('PUT', BODY), ctx('2'));
    expect(res.status).toBe(403);
  });

  it('用户名冲突时返回 400', async () => {
    mockFindFirst.mockResolvedValue({ id: 99 });
    const res = await PUT(makeRequest('PUT', BODY), ctx('2'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('已存在');
  });

  it('状态变更时写入审计日志', async () => {
    mockFindUnique.mockResolvedValue({ ...RAW_USER, status: 1 });
    mockUpdate.mockResolvedValue({ ...RAW_USER, status: 0 });
    const res = await PUT(makeRequest('PUT', { ...BODY, status: 0 }), ctx('2'));
    expect(res.status).toBe(200);
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog.mock.calls[0][0].action).toBe('user.suspend');
  });

  it('状态未变时不写审计日志', async () => {
    const res = await PUT(makeRequest('PUT', BODY), ctx('2'));
    expect(res.status).toBe(200);
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('成功编辑返回 200', async () => {
    const res = await PUT(makeRequest('PUT', BODY), ctx('2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('成功');
  });
});

// ─── DELETE ────────────────────────────────────────────────────────────────

describe('DELETE /api/users/[id]', () => {
  it('ID 非法时返回 400', async () => {
    const res = await DELETE(makeRequest('DELETE'), ctx('abc'));
    expect(res.status).toBe(400);
  });

  it('用户不存在时返回 404', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest('DELETE'), ctx('2'));
    expect(res.status).toBe(404);
  });

  it('删除超级管理员时返回 403', async () => {
    mockFindUnique.mockResolvedValue({ ...RAW_USER, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
    const res = await DELETE(makeRequest('DELETE'), ctx('2'));
    expect(res.status).toBe(403);
  });

  it('删除自己时返回 400', async () => {
    // actor.id === target.id
    mockRequirePermission.mockResolvedValue({ user: { ...ACTOR, id: 2 }, role: 'SUPER_ADMIN', permissions: [] });
    const res = await DELETE(makeRequest('DELETE'), ctx('2'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('自己');
  });

  it('成功删除后写入审计日志', async () => {
    const res = await DELETE(makeRequest('DELETE'), ctx('2'));
    expect(res.status).toBe(200);
    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog.mock.calls[0][0].action).toBe('user.delete');
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await DELETE(makeRequest('DELETE'), ctx('2'));
    expect(res.status).toBe(403);
  });
});
