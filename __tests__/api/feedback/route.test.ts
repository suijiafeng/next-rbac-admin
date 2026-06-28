import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAdminUser, mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockRequireAdminUser: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({ requireAdminUser: mockRequireAdminUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: { feedback: { findMany: mockFindMany, create: mockCreate } },
}));

import { GET, POST } from '@/app/api/feedback/route';

const ADMIN_USER = {
  id: 2,
  username: 'admin',
  nickname: '管理员',
  role: 'ADMIN',
  status: 1,
  authVersion: 1,
  email: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const USER_USER = { ...ADMIN_USER, id: 3, username: 'user1', role: 'USER' };
const SUPER_USER = { ...ADMIN_USER, id: 1, username: 'super', role: 'SUPER_ADMIN' };

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  title: '测试反馈',
  content: '这是一条十字以上的详细内容描述',
  type: 'bug',
  priority: 'medium',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/feedback', () => {
  it('SUPER_ADMIN 可看到下级提交的反馈', async () => {
    mockRequireAdminUser.mockResolvedValue(SUPER_USER);
    mockFindMany.mockResolvedValue([
      { id: 1, submitterRole: 'ADMIN', reads: [{ id: 1 }] },
      { id: 2, submitterRole: 'USER', reads: [] },
    ]);

    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toHaveLength(2);
    expect(body.data.unread).toBe(1);
  });

  it('USER 角色没有下级，返回空列表', async () => {
    mockRequireAdminUser.mockResolvedValue(USER_USER);

    const res = await GET();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.list).toEqual([]);
    expect(body.data.unread).toBe(0);
  });

  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe('POST /api/feedback', () => {
  it('ADMIN 角色可以提交反馈', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    mockCreate.mockResolvedValue({ id: 10 });

    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.id).toBe(10);
  });

  it('SUPER_ADMIN 无需提交反馈，返回 403', async () => {
    mockRequireAdminUser.mockResolvedValue(SUPER_USER);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it('标题为空时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, title: '' }));
    expect(res.status).toBe(400);
  });

  it('标题超过 50 字返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, title: 'a'.repeat(51) }));
    expect(res.status).toBe(400);
  });

  it('内容少于 10 字返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, content: '短' }));
    expect(res.status).toBe(400);
  });

  it('内容超过 500 字返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, content: 'a'.repeat(501) }));
    expect(res.status).toBe(400);
  });

  it('type 不合法时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, type: 'unknown' }));
    expect(res.status).toBe(400);
  });

  it('priority 不合法时返回 400', async () => {
    mockRequireAdminUser.mockResolvedValue(ADMIN_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, priority: 'urgent' }));
    expect(res.status).toBe(400);
  });
});
