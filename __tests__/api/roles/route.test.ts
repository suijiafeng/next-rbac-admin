import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequirePermission, mockFindMany, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    role: { findMany: mockFindMany, findUnique: mockFindUnique, create: mockCreate },
  },
}));

import { GET, POST } from '@/app/api/roles/route';

const MOCK_ROLES = [
  {
    id: 1,
    name: 'ADMIN',
    description: '管理员',
    createdAt: new Date('2024-01-01'),
    rolePermissions: [{ permission: { id: 1, code: 'user:view', name: '查看用户' } }],
    _count: { userRoles: 3 },
  },
];

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/roles', () => {
  it('返回角色列表（含 permissions 和 userCount）', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindMany.mockResolvedValue(MOCK_ROLES);

    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data[0].name).toBe('ADMIN');
    expect(body.data[0].userCount).toBe(3);
    expect(body.data[0].permissions[0].code).toBe('user:view');
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe('POST /api/roles', () => {
  it('成功创建角色', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 10,
      name: 'CUSTOM',
      description: '自定义角色',
      createdAt: new Date(),
      rolePermissions: [],
      _count: { userRoles: 0 },
    });

    const res = await POST(makeRequest({ name: 'CUSTOM', description: '自定义角色' }));
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('创建成功');
    expect(body.data.name).toBe('CUSTOM');
  });

  it('角色名为空时返回 400', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    const res = await POST(makeRequest({ name: '' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toBe('角色标识不能为空');
  });

  it('角色名已存在时返回 400', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue({ id: 1, name: 'ADMIN' });
    const res = await POST(makeRequest({ name: 'ADMIN' }));
    expect(res.status).toBe(400);
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await POST(makeRequest({ name: 'TEST' }));
    expect(res.status).toBe(403);
  });
});
