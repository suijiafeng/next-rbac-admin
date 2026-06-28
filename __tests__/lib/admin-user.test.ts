import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentAdminUser } from '@/lib/admin-user';

const { mockGetAdminSession, mockFindUnique } = vi.hoisted(() => ({
  mockGetAdminSession: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession: mockGetAdminSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mockFindUnique } } }));
vi.mock('@/lib/user-role', () => ({
  resolveRoleFromNames: (names: string[]) => names[0] ?? 'USER',
}));

const BASE_USER = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  email: 'admin@example.com',
  avatar: null,
  status: 1,
  authVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [{ role: { name: 'ADMIN' } }],
};

beforeEach(() => vi.clearAllMocks());

describe('getCurrentAdminUser', () => {
  it('无 session 时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue(null);
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('session.userId 缺失时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: null });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('数据库用户不存在时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue(null);
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('用户 status !== 1（被禁用）时返回 null', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, status: 0 });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('authVersion 不匹配时返回 null（令牌已失效）', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 2 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, authVersion: 1 });
    expect(await getCurrentAdminUser()).toBeNull();
  });

  it('一切正常时返回用户信息（不含 userRoles）', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1, authVersion: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER });
    const user = await getCurrentAdminUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(1);
    expect(user?.username).toBe('admin');
    expect(user?.role).toBe('ADMIN');
    expect(user).not.toHaveProperty('userRoles');
  });

  it('session.authVersion 未定义时按 0 处理', async () => {
    mockGetAdminSession.mockResolvedValue({ userId: 1 });
    mockFindUnique.mockResolvedValue({ ...BASE_USER, authVersion: 0 });
    const user = await getCurrentAdminUser();
    expect(user).not.toBeNull();
  });
});
