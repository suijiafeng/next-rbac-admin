import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetCurrentAdminAuth,
  mockRequireAdminUser,
  mockFindFirst,
  mockUpdate,
} = vi.hoisted(() => ({
  mockGetCurrentAdminAuth: vi.fn(),
  mockRequireAdminUser: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/permission', () => ({
  getCurrentAdminAuth: mockGetCurrentAdminAuth,
  requireAdminUser: mockRequireAdminUser,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: mockFindFirst, update: mockUpdate },
  },
}));

import { GET, PUT } from '@/app/api/profile/route';

const CURRENT_USER = {
  id: 1,
  username: 'alice',
  nickname: 'Alice',
  email: null,
  status: 1,
  authVersion: 1,
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const AUTH_INFO = {
  user: CURRENT_USER,
  role: 'USER',
  permissions: ['user:view'],
};

function makePut(body: object) {
  return new Request('http://localhost/api/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentAdminAuth.mockResolvedValue(AUTH_INFO);
  mockRequireAdminUser.mockResolvedValue(CURRENT_USER);
  mockFindFirst.mockResolvedValue(null);
  mockUpdate.mockResolvedValue({ ...CURRENT_USER, nickname: 'NewName' });
});

describe('GET /api/profile', () => {
  it('未登录时返回 401', async () => {
    mockGetCurrentAdminAuth.mockRejectedValue(new Error('未登录'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('成功返回 auth 信息（user + role + permissions）', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.user.username).toBe('alice');
    expect(body.data.role).toBe('USER');
    expect(body.data.permissions).toContain('user:view');
  });
});

describe('PUT /api/profile', () => {
  it('未登录时返回 401', async () => {
    mockRequireAdminUser.mockRejectedValue(new Error('未登录'));
    const res = await PUT(makePut({ nickname: 'New' }));
    expect(res.status).toBe(401);
  });

  it('昵称为空时返回 400', async () => {
    const res = await PUT(makePut({ nickname: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('不能为空');
  });

  it('邮箱已被其他用户使用时返回 400', async () => {
    mockFindFirst.mockResolvedValue({ id: 99 });
    const res = await PUT(makePut({ nickname: 'Alice', email: 'used@example.com' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('邮箱已存在');
  });

  it('不传 email 时不查重（findFirst 不被调用）', async () => {
    await PUT(makePut({ nickname: 'Alice' }));
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('成功更新并返回最新用户信息', async () => {
    const res = await PUT(makePut({ nickname: 'NewName', email: 'new@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('成功');
    expect(body.data.nickname).toBe('NewName');
  });

  it('email 为空字符串时存 null', async () => {
    await PUT(makePut({ nickname: 'Alice', email: '' }));
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.email).toBeNull();
  });
});
