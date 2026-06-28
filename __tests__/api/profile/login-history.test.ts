import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockFindMany, mockCount } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireAdminUser: mockRequireAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: { auditLog: { findMany: mockFindMany, count: mockCount } },
}));

import { GET } from '@/app/api/profile/login-history/route';

const MOCK_USER = { id: 3, username: 'user1', role: 'USER' };

const MOCK_LOGS = [
  { id: 1, action: 'user.login', detail: {}, createdAt: new Date() },
];

function makeRequest(params = '') {
  return new Request(`http://localhost/api/profile/login-history${params}`);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/profile/login-history', () => {
  it('返回当前用户的登录记录', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindMany.mockResolvedValue(MOCK_LOGS);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('只查询当前用户自己的记录', async () => {
    mockRequireAdminUser.mockResolvedValue(MOCK_USER);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest());
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ actorId: MOCK_USER.id }),
    }));
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });
});
