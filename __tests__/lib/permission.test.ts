import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, PERMISSIONS } from '@/constants/permission';

const { mockGetCurrentAdminUser } = vi.hoisted(() => ({
  mockGetCurrentAdminUser: vi.fn(),
}));

vi.mock('@/lib/admin-user', () => ({ getCurrentAdminUser: mockGetCurrentAdminUser }));

import {
  getPermissionsByRole,
  hasPermission,
  requireAdminUser,
  requireRole,
  getCurrentAdminAuth,
  requirePermission,
} from '@/lib/permission';

const MOCK_USER = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  role: 'ADMIN',
  email: null,
  avatar: null,
  status: 1,
  authVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('getPermissionsByRole', () => {
  it('USER 只有 user:view', () => {
    expect(getPermissionsByRole(Role.USER)).toEqual([PERMISSIONS.USER_VIEW]);
  });

  it('ADMIN 包含 user:view / user:create / user:edit / role:view', () => {
    const perms = getPermissionsByRole(Role.ADMIN);
    expect(perms).toContain(PERMISSIONS.USER_VIEW);
    expect(perms).toContain(PERMISSIONS.USER_CREATE);
    expect(perms).toContain(PERMISSIONS.USER_EDIT);
    expect(perms).toContain(PERMISSIONS.ROLE_VIEW);
    expect(perms).not.toContain(PERMISSIONS.USER_DELETE);
  });

  it('SUPER_ADMIN 拥有所有权限', () => {
    const perms = getPermissionsByRole(Role.SUPER_ADMIN);
    Object.values(PERMISSIONS).forEach((p) => expect(perms).toContain(p));
  });
});

describe('hasPermission', () => {
  it('USER 有 user:view', () => expect(hasPermission(Role.USER, PERMISSIONS.USER_VIEW)).toBe(true));
  it('USER 无 user:delete', () => expect(hasPermission(Role.USER, PERMISSIONS.USER_DELETE)).toBe(false));
  it('ADMIN 有 user:create', () => expect(hasPermission(Role.ADMIN, PERMISSIONS.USER_CREATE)).toBe(true));
  it('ADMIN 无 settings:edit', () => expect(hasPermission(Role.ADMIN, PERMISSIONS.SETTINGS_EDIT)).toBe(false));
  it('SUPER_ADMIN 有所有权限', () => {
    Object.values(PERMISSIONS).forEach((p) =>
      expect(hasPermission(Role.SUPER_ADMIN, p)).toBe(true),
    );
  });
});

describe('requireAdminUser', () => {
  it('已登录时返回用户信息', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    expect(await requireAdminUser()).toEqual(MOCK_USER);
  });

  it('未登录时抛出 "未登录"', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(null);
    await expect(requireAdminUser()).rejects.toThrow('未登录');
  });
});

describe('requireRole', () => {
  it('角色匹配时返回用户', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    const user = await requireRole([Role.ADMIN]);
    expect(user.username).toBe('admin');
  });

  it('角色不匹配时抛出 "无权限"', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    await expect(requireRole([Role.SUPER_ADMIN])).rejects.toThrow('无权限');
  });

  it('未登录时抛出 "未登录"', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(null);
    await expect(requireRole([Role.ADMIN])).rejects.toThrow('未登录');
  });

  it('允许多个角色，匹配任意一个即通过', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    const user = await requireRole([Role.USER, Role.ADMIN]);
    expect(user).toBeTruthy();
  });
});

describe('getCurrentAdminAuth', () => {
  it('返回 user / role / permissions 三元组', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    const auth = await getCurrentAdminAuth();
    expect(auth.user).toEqual(MOCK_USER);
    expect(auth.role).toBe(Role.ADMIN);
    expect(auth.permissions).toContain(PERMISSIONS.USER_VIEW);
  });

  it('未登录时抛出 "未登录"', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(null);
    await expect(getCurrentAdminAuth()).rejects.toThrow('未登录');
  });
});

describe('requirePermission', () => {
  it('有权限时返回 auth 信息', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    const auth = await requirePermission(PERMISSIONS.USER_VIEW);
    expect(auth.user).toEqual(MOCK_USER);
  });

  it('无权限时抛出 "无权限"（ADMIN 无 user:delete）', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(MOCK_USER);
    await expect(requirePermission(PERMISSIONS.USER_DELETE)).rejects.toThrow('无权限');
  });

  it('未登录时抛出 "未登录"', async () => {
    mockGetCurrentAdminUser.mockResolvedValue(null);
    await expect(requirePermission(PERMISSIONS.USER_VIEW)).rejects.toThrow('未登录');
  });

  it('SUPER_ADMIN 拥有所有权限，任意权限均通过', async () => {
    mockGetCurrentAdminUser.mockResolvedValue({ ...MOCK_USER, role: 'SUPER_ADMIN' });
    for (const perm of Object.values(PERMISSIONS)) {
      await expect(requirePermission(perm)).resolves.toBeTruthy();
    }
  });
});
