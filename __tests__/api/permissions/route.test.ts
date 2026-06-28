import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequirePermission, mockFindMany } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: { permission: { findMany: mockFindMany } },
}));

import { GET } from '@/app/api/permissions/route';

const MOCK_PERMS = [
  { id: 1, code: 'user:view', name: '查看用户', description: null },
  { id: 2, code: 'user:create', name: '创建用户', description: null },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/permissions', () => {
  it('有权限时返回权限列表', async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockFindMany.mockResolvedValue(MOCK_PERMS);

    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toEqual(MOCK_PERMS);
  });

  it('无权限时返回 403', async () => {
    mockRequirePermission.mockRejectedValue(new Error('无权限'));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.message).toBe('无权限');
  });

  it('未登录时返回 401', async () => {
    mockRequirePermission.mockRejectedValue(new Error('未登录'));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
