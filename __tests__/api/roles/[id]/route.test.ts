import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequirePermission, mockFindUnique, mockUpdate, mockDelete, mockTransaction } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    role: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete },
    $transaction: mockTransaction,
  },
}));

import { PUT, DELETE } from '@/app/api/roles/[id]/route';

const MOCK_ROLE = {
  id: 2,
  name: 'CUSTOM',
  description: '自定义',
  createdAt: new Date(),
  rolePermissions: [],
  _count: { userRoles: 0 },
};

function makeParams(id: string) {
  return Promise.resolve({ id });
}

function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/roles/2', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PUT /api/roles/[id]', () => {
  it('成功更新角色', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique
      .mockResolvedValueOnce(MOCK_ROLE)
      .mockResolvedValueOnce({ ...MOCK_ROLE, description: '新描述' });
    mockTransaction.mockResolvedValue(undefined);

    const res = await PUT(makePutRequest({ description: '新描述' }), { params: makeParams('2') });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('更新成功');
  });

  it('ID 非法时返回 400', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    const res = await PUT(makePutRequest({}), { params: makeParams('abc') });
    expect(res.status).toBe(400);
  });

  it('角色不存在时返回 404', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PUT(makePutRequest({ description: 'x' }), { params: makeParams('99') });
    expect(res.status).toBe(404);
  });

  it('修改 SUPER_ADMIN 权限时返回 403', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_ROLE, name: 'SUPER_ADMIN' });
    const res = await PUT(makePutRequest({ permissionIds: [1, 2] }), { params: makeParams('1') });
    expect(res.status).toBe(403);
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await PUT(makePutRequest({}), { params: makeParams('2') });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/roles/[id]', () => {
  it('成功删除角色', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue({ ...MOCK_ROLE, _count: { userRoles: 0 } });
    mockDelete.mockResolvedValue(undefined);

    const res = await DELETE(new Request('http://localhost'), { params: makeParams('2') });
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('删除成功');
  });

  it('ID 非法时返回 400', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    const res = await DELETE(new Request('http://localhost'), { params: makeParams('-1') });
    expect(res.status).toBe(400);
  });

  it('角色不存在时返回 404', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(new Request('http://localhost'), { params: makeParams('99') });
    expect(res.status).toBe(404);
  });

  it('SUPER_ADMIN 角色不能删除', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue({ ...MOCK_ROLE, name: 'SUPER_ADMIN', _count: { userRoles: 1 } });
    const res = await DELETE(new Request('http://localhost'), { params: makeParams('1') });
    expect(res.status).toBe(403);
  });

  it('角色下有用户时不能删除', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue({ ...MOCK_ROLE, _count: { userRoles: 2 } });
    const res = await DELETE(new Request('http://localhost'), { params: makeParams('2') });
    expect(res.status).toBe(400);
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await DELETE(new Request('http://localhost'), { params: makeParams('2') });
    expect(res.status).toBe(403);
  });
});
