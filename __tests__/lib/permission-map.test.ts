import { describe, it, expect } from 'vitest';
import { getPermissionsByRole, hasPermission } from '@/lib/permission-map';
import { PERMISSIONS } from '@/constants/permission';

describe('getPermissionsByRole', () => {
  it('USER 只有 user:view 权限', () => {
    const perms = getPermissionsByRole('USER');
    expect(perms).toEqual([PERMISSIONS.USER_VIEW]);
  });

  it('ADMIN 包含 user:view、user:create、user:edit、role:view', () => {
    const perms = getPermissionsByRole('ADMIN');
    expect(perms).toContain(PERMISSIONS.USER_VIEW);
    expect(perms).toContain(PERMISSIONS.USER_CREATE);
    expect(perms).toContain(PERMISSIONS.USER_EDIT);
    expect(perms).toContain(PERMISSIONS.ROLE_VIEW);
  });

  it('ADMIN 不拥有 user:delete', () => {
    const perms = getPermissionsByRole('ADMIN');
    expect(perms).not.toContain(PERMISSIONS.USER_DELETE);
  });

  it('SUPER_ADMIN 拥有全部权限', () => {
    const perms = getPermissionsByRole('SUPER_ADMIN');
    const allPermissions = Object.values(PERMISSIONS);
    for (const p of allPermissions) {
      expect(perms).toContain(p);
    }
  });
});

describe('hasPermission', () => {
  it('USER 有 user:view 权限', () => {
    expect(hasPermission('USER', PERMISSIONS.USER_VIEW)).toBe(true);
  });

  it('USER 没有 user:delete 权限', () => {
    expect(hasPermission('USER', PERMISSIONS.USER_DELETE)).toBe(false);
  });

  it('ADMIN 有 user:create 权限', () => {
    expect(hasPermission('ADMIN', PERMISSIONS.USER_CREATE)).toBe(true);
  });

  it('ADMIN 没有 settings:edit 权限', () => {
    expect(hasPermission('ADMIN', PERMISSIONS.SETTINGS_EDIT)).toBe(false);
  });

  it('SUPER_ADMIN 拥有所有权限', () => {
    const allPermissions = Object.values(PERMISSIONS);
    for (const p of allPermissions) {
      expect(hasPermission('SUPER_ADMIN', p)).toBe(true);
    }
  });
});
