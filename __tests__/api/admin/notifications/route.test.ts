import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireRole, mockFindMany, mockCount, mockGroupBy } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockGroupBy: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { findMany: mockFindMany, count: mockCount, groupBy: mockGroupBy },
  },
}));

import { GET } from '@/app/api/admin/notifications/route';

const SUPER_USER = { id: 1, username: 'super', role: 'SUPER_ADMIN' };

function makeRequest(params = '') {
  return new Request(`http://localhost/api/admin/notifications${params}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFindMany.mockResolvedValue([{ id: 1, action: 'user.login', actorUsername: 'admin', createdAt: new Date() }]);
  mockCount.mockResolvedValue(1);
  mockGroupBy.mockResolvedValue([{ action: 'user.login', _count: { action: 5 } }]);
});

describe('GET /api/admin/notifications', () => {
  it('返回通知列表和 summary', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.summary['user.login']).toBe(5);
  });

  it('按 action 参数过滤', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    await GET(makeRequest('?action=user.login'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ action: 'user.login' }),
    }));
  });

  it('无权限时返回 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
