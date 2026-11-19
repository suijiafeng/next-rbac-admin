import { Role, rolePageMap } from '@/constants/permission';

/** 旧版标签存在这个全局键里，换账号登录会把上一位用户的标签带过来。 */
export const LEGACY_TABS_STORAGE_KEY = 'next-admin-tabs';

export function tabsStorageKey(userId: number): string {
  return `${LEGACY_TABS_STORAGE_KEY}:${userId}`;
}

/**
 * 当前角色能不能打开这个标签。
 * 依据 constants/permission.ts 的 rolePageMap：超级管理员是 '*'，其它角色是白名单。
 * 治理概览始终保留，它是不可关闭的首页。
 */
export function canRoleOpenTab(role: string, tabKey: string): boolean {
  if (tabKey === '/dashboard') return true;
  const pages = rolePageMap[role as Role] as readonly string[] | undefined;
  if (!pages) return false;
  if (pages.includes('*')) return true;
  return pages.includes(tabKey);
}

export function filterTabsForRole<T extends { key: string }>(tabs: T[], role: string): T[] {
  return tabs.filter((tab) => canRoleOpenTab(role, tab.key));
}
