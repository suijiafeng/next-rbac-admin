import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockUserCount, mockRoleCount, mockPermCount, mockUserFindMany, mockAuditGroupBy, mockAuditFindMany, mockLoginAggregate } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockUserCount: vi.fn(),
  mockRoleCount: vi.fn(),
  mockPermCount: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockAuditGroupBy: vi.fn(),
  mockAuditFindMany: vi.fn(),
  mockLoginAggregate: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireAdminUser: mockRequireAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: mockUserCount, findMany: mockUserFindMany },
    role: { count: mockRoleCount },
    permission: { count: mockPermCount },
    auditLog: { groupBy: mockAuditGroupBy, findMany: mockAuditFindMany },
    loginAttempt: { aggregate: mockLoginAggregate },
  },
}));

import { GET } from '@/app/api/admin/stats/route';

const ADMIN_USER = { id: 1, username: 'admin', role: 'ADMIN' };

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
  mockUserCount.mockResolvedValueOnce(100).mockResolvedValueOnce(80);
  mockRoleCount.mockResolvedValue(3);
  mockPermCount.mockResolvedValue(20);
  mockUserFindMany.mockResolvedValue([]);
  mockAuditGroupBy.mockResolvedValue([{ action: 'user.login', _count: { action: 50 } }]);
  mockAuditFindMany.mockResolvedValue([]);
  mockLoginAggregate.mockResolvedValue({ _sum: { count: 15 } });
});

describe('GET /api/admin/stats', () => {
  it('返回统计数据（用户数、角色数等）', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.userCount).toBe(100);
    expect(body.data.activeUserCount).toBe(80);
    expect(body.data.roleCount).toBe(3);
    expect(body.data.permissionCount).toBe(20);
    expect(body.data.loginFailCount).toBe(15);
  });

  it('返回近 30 天新用户趋势（30 个数据点）', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.data.newUsersTrend).toHaveLength(30);
  });

  it('返回审计 action 分布', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.data.auditActionCounts[0].action).toBe('user.login');
    expect(body.data.auditActionCounts[0].count).toBe(50);
  });

  it('loginFailCount 为 null 时回退为 0', async () => {
    mockLoginAggregate.mockResolvedValue({ _sum: { count: null } });
    const res = await GET();
    const body = await res.json();
    expect(body.data.loginFailCount).toBe(0);
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
