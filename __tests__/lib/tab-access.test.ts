import { describe, expect, it } from 'vitest';
import { canRoleOpenTab, filterTabsForRole, tabsStorageKey } from '@/lib/tab-access';

const SUPER_ADMIN_TABS = [
  { key: '/dashboard' },
  { key: '/users' },
  { key: '/permissions' },
  { key: '/approvals' },
  { key: '/temp-grants' },
  { key: '/audit' },
  { key: '/settings' },
];

describe('canRoleOpenTab', () => {
  it('普通用户打不开超级管理员留下的治理页', () => {
    expect(canRoleOpenTab('USER', '/users')).toBe(false);
    expect(canRoleOpenTab('USER', '/permissions')).toBe(false);
    expect(canRoleOpenTab('USER', '/approvals')).toBe(false);
    expect(canRoleOpenTab('USER', '/temp-grants')).toBe(false);
    expect(canRoleOpenTab('USER', '/audit')).toBe(false);
    expect(canRoleOpenTab('USER', '/settings')).toBe(false);
  });

  it('普通用户可以打开自己的页面，首页始终保留', () => {
    expect(canRoleOpenTab('USER', '/dashboard')).toBe(true);
    expect(canRoleOpenTab('USER', '/feedback')).toBe(true);
    expect(canRoleOpenTab('USER', '/exams')).toBe(true);
    expect(canRoleOpenTab('USER', '/exam-take')).toBe(true);
  });

  it('管理员可以打开审批和临时授权，打不开权限、审计和系统设置', () => {
    expect(canRoleOpenTab('ADMIN', '/approvals')).toBe(true);
    expect(canRoleOpenTab('ADMIN', '/temp-grants')).toBe(true);
    expect(canRoleOpenTab('ADMIN', '/permissions')).toBe(false);
    expect(canRoleOpenTab('ADMIN', '/audit')).toBe(false);
    expect(canRoleOpenTab('ADMIN', '/settings')).toBe(false);
  });

  it('超级管理员可以打开全部标签', () => {
    for (const tab of SUPER_ADMIN_TABS) {
      expect(canRoleOpenTab('SUPER_ADMIN', tab.key)).toBe(true);
    }
  });
});

describe('filterTabsForRole', () => {
  it('换到普通用户后只留下该角色能打开的标签', () => {
    expect(filterTabsForRole(SUPER_ADMIN_TABS, 'USER').map((tab) => tab.key)).toEqual(['/dashboard']);
  });

  it('标签按用户分开存储，不再共用一个键', () => {
    expect(tabsStorageKey(7)).toBe('next-admin-tabs:7');
    expect(tabsStorageKey(7)).not.toBe(tabsStorageKey(8));
  });
});
