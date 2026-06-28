import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireRole, mockFindMany, mockCount } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: { auditLog: { findMany: mockFindMany, count: mockCount } },
}));

import { GET } from '@/app/api/admin/audit-logs/route';

const SUPER_USER = { id: 1, username: 'super', role: 'SUPER_ADMIN' };

const MOCK_LOGS = [
  { id: 10, action: 'user.login', actorUsername: 'admin', createdAt: new Date() },
];

function makeRequest(params = '') {
  return new Request(`http://localhost/api/admin/audit-logs${params}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFindMany.mockResolvedValue(MOCK_LOGS);
  mockCount.mockResolvedValue(1);
});

describe('GET /api/admin/audit-logs', () => {
  it('返回审计日志列表', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('按 action 参数过滤', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    await GET(makeRequest('?action=user.login'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ action: 'user.login' }),
    }));
  });

  it('按 actorUsername 参数模糊过滤', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    await GET(makeRequest('?actorUsername=adm'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ actorUsername: { contains: 'adm' } }),
    }));
  });

  it('按日期范围过滤', async () => {
    mockRequireRole.mockResolvedValue(SUPER_USER);

    await GET(makeRequest('?startDate=2024-01-01&endDate=2024-01-31'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ createdAt: expect.any(Object) }),
    }));
  });

  it('无权限时返回 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
