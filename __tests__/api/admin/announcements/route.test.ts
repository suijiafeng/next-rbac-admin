import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockRequireRole, mockFindMany, mockCount, mockCreate } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockRequireRole: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({
  requireAdminUser: mockRequireAdminUser,
  requireRole: mockRequireRole,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: { findMany: mockFindMany, count: mockCount, create: mockCreate },
  },
}));

import { GET, POST } from '@/app/api/admin/announcements/route';

const ADMIN_USER = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  role: 'ADMIN',
};

const MOCK_ANNOUNCEMENT = {
  id: 1,
  title: '系统维护',
  content: '今晚维护',
  level: 'info',
  active: true,
  startsAt: new Date(),
  expiresAt: null,
  createdAt: new Date(),
};

function makeGetRequest(params = '') {
  return new Request(`http://localhost/api/admin/announcements${params}`);
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/admin/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFindMany.mockResolvedValue([MOCK_ANNOUNCEMENT]);
  mockCount.mockResolvedValue(1);
});

describe('GET /api/admin/announcements', () => {
  it('返回公告列表', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);

    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('active=true 参数时只查活跃公告', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);

    const res = await GET(makeGetRequest('?active=true'));
    expect(body => body).toBeTruthy();
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ active: true }),
    }));
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/announcements', () => {
  it('成功创建公告', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    mockCreate.mockResolvedValue({ ...MOCK_ANNOUNCEMENT, id: 2 });

    const res = await POST(makePostRequest({ title: '新公告', content: '内容', level: 'info' }));
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('公告已发布');
  });

  it('标题或内容为空时返回 400', async () => {
    mockRequireRole.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ title: '', content: '内容' }));
    expect(res.status).toBe(400);
  });

  it('无权限时返回 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('无权限'));
    const res = await POST(makePostRequest({ title: 'x', content: 'y' }));
    expect(res.status).toBe(403);
  });
});
