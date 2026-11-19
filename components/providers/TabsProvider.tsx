'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pathnameToTabKey, resolvePageMeta } from '@/lib/page-meta';
import {
  LEGACY_TABS_STORAGE_KEY,
  canRoleOpenTab,
  filterTabsForRole,
  tabsStorageKey,
} from '@/lib/tab-access';

export interface TabItem {
  /** 唯一 key，等于 pathname 第一段（/dashboard、/users …） */
  key: string;
  /** 完整 pathname（含 query 段去除前的路径） */
  path: string;
  /** 显示标题 */
  label: string;
  /** 是否可关闭（首页不可关闭） */
  closable: boolean;
}

interface TabsContextValue {
  tabs: TabItem[];
  activeKey: string;
  /** 每个 tab 的版本号，刷新时自增，用于强制重挂载对应页面（不影响其它 tab 状态） */
  versions: Record<string, number>;
  openTab: (path: string) => void;
  closeTab: (key: string) => void;
  closeOthers: (key: string) => void;
  closeRight: (key: string) => void;
  closeAll: () => void;
  switchTab: (key: string) => void;
  refreshTab: (key: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const HOME_TAB: TabItem = {
  key: '/dashboard',
  path: '/dashboard',
  label: '治理概览',
  closable: false,
};

function isStoredTab(value: unknown): value is TabItem {
  if (!value || typeof value !== 'object') return false;
  const tab = value as TabItem;
  return typeof tab.key === 'string' && typeof tab.path === 'string' && typeof tab.label === 'string';
}

function loadStoredTabs(userId: number, role: string): TabItem[] {
  if (typeof window === 'undefined') return [HOME_TAB];
  try {
    // 旧键不区分用户。读到就丢掉，避免上一位用户的标签被下一位接着用。
    localStorage.removeItem(LEGACY_TABS_STORAGE_KEY);
    const raw = localStorage.getItem(tabsStorageKey(userId));
    if (!raw) return [HOME_TAB];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [HOME_TAB];
    const stored = filterTabsForRole(parsed.filter(isStoredTab), role);
    if (stored.length === 0) return [HOME_TAB];
    const hasHome = stored.some((tab) => tab.key === HOME_TAB.key);
    const next = hasHome ? stored : [HOME_TAB, ...stored];
    return next.map((tab) => (tab.key === HOME_TAB.key ? { ...HOME_TAB, path: tab.path || HOME_TAB.path } : tab));
  } catch {
    return [HOME_TAB];
  }
}

export function TabsProvider({
  children,
  userId,
  role,
}: {
  children: React.ReactNode;
  userId: number;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [tabs, setTabs] = useState<TabItem[]>([HOME_TAB]);
  const [activeKey, setActiveKey] = useState<string>(HOME_TAB.key);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [hydratedUserId, setHydratedUserId] = useState<number | null>(null);

  // 按当前用户恢复，并丢掉该角色打不开的标签
  useEffect(() => {
    setTabs(loadStoredTabs(userId, role));
    setHydratedUserId(userId);
  }, [role, userId]);

  // 只在恢复完成之后写入该用户自己的键，避免把上一位用户的标签写进来
  useEffect(() => {
    if (hydratedUserId !== userId) return;
    try {
      localStorage.setItem(tabsStorageKey(userId), JSON.stringify(tabs));
    } catch {
      /* noop */
    }
  }, [hydratedUserId, tabs, userId]);

  // 监听路径变化 —— 自动注册 tab + 设为活动
  useEffect(() => {
    if (!pathname) return;
    const key = pathnameToTabKey(pathname);
    const meta = resolvePageMeta(pathname);

    setTabs((prev) => {
      // 当前地址对应的标签保留（直接打开无权限页面时仍要画出 403），其余无权限标签丢掉
      const visible = prev.filter(
        (tab) => tab.key === key || canRoleOpenTab(role, tab.key),
      );
      const base = visible.some((tab) => tab.key === HOME_TAB.key) ? visible : [HOME_TAB, ...visible];
      const exists = base.find((tab) => tab.key === key);
      if (exists) {
        if (exists.path === pathname) return base;
        return base.map((tab) => (tab.key === key ? { ...tab, path: pathname } : tab));
      }
      return [
        ...base,
        {
          key,
          path: pathname,
          label: meta.label,
          closable: meta.closable,
        },
      ];
    });
    setActiveKey(key);
  }, [pathname, role]);

  const openTab = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const switchTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const t = prev.find((it) => it.key === key);
        if (t) router.push(t.path);
        return prev;
      });
    },
    [router],
  );

  const closeTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.key === key);
        if (idx === -1) return prev;
        const target = prev[idx];
        if (!target.closable) return prev;
        const next = prev.filter((t) => t.key !== key);
        // 如果关闭的是当前 tab，切换到相邻 tab
        if (key === activeKey) {
          const fallback = next[idx] ?? next[idx - 1] ?? next[0];
          if (fallback) router.push(fallback.path);
        }
        return next;
      });
    },
    [activeKey, router],
  );

  const closeOthers = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const target = prev.find((t) => t.key === key);
        const next = prev.filter((t) => t.key === key || !t.closable);
        if (target && key !== activeKey) router.push(target.path);
        return next;
      });
    },
    [activeKey, router],
  );

  const closeRight = useCallback((key: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      if (idx === -1) return prev;
      // 右侧那些 closable 的关掉
      const next = prev.filter((t, i) => i <= idx || !t.closable);
      return next;
    });
  }, []);

  const refreshTab = useCallback((key: string) => {
    setVersions((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  }, []);

  const closeAll = useCallback(() => {
    setTabs((prev) => {
      const next = prev.filter((t) => !t.closable);
      // 跳转到首页
      const home = next[0] ?? HOME_TAB;
      router.push(home.path);
      return next;
    });
  }, [router]);

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs,
      activeKey,
      versions,
      openTab,
      closeTab,
      closeOthers,
      closeRight,
      closeAll,
      switchTab,
      refreshTab,
    }),
    [tabs, activeKey, versions, openTab, closeTab, closeOthers, closeRight, closeAll, switchTab, refreshTab],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs 必须在 TabsProvider 内使用');
  return ctx;
}
