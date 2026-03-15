'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pathnameToTabKey, resolvePageMeta } from '@/lib/page-meta';

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
  openTab: (path: string) => void;
  closeTab: (key: string) => void;
  closeOthers: (key: string) => void;
  closeRight: (key: string) => void;
  closeAll: () => void;
  switchTab: (key: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);
const STORAGE_KEY = 'next-admin-tabs';

const HOME_TAB: TabItem = {
  key: '/dashboard',
  path: '/dashboard',
  label: '仪表盘',
  closable: false,
};

function loadStoredTabs(): TabItem[] {
  if (typeof window === 'undefined') return [HOME_TAB];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [HOME_TAB];
    const parsed = JSON.parse(raw) as TabItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [HOME_TAB];
    // 强制保证首页在第一个
    const hasHome = parsed.some((t) => t.key === HOME_TAB.key);
    return hasHome ? parsed : [HOME_TAB, ...parsed];
  } catch {
    return [HOME_TAB];
  }
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [tabs, setTabs] = useState<TabItem[]>([HOME_TAB]);
  const [activeKey, setActiveKey] = useState<string>(HOME_TAB.key);
  const inited = useRef(false);

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    setTabs(loadStoredTabs());
    inited.current = true;
  }, []);

  // 持久化
  useEffect(() => {
    if (!inited.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      /* noop */
    }
  }, [tabs]);

  // 监听路径变化 —— 自动注册 tab + 设为活动
  useEffect(() => {
    if (!pathname) return;
    const key = pathnameToTabKey(pathname);
    const meta = resolvePageMeta(pathname);

    setTabs((prev) => {
      const exists = prev.find((t) => t.key === key);
      if (exists) {
        // 已存在：仅更新 path（query 可能变化）
        if (exists.path === pathname) return prev;
        return prev.map((t) => (t.key === key ? { ...t, path: pathname } : t));
      }
      return [
        ...prev,
        {
          key,
          path: pathname,
          label: meta.label,
          closable: meta.closable,
        },
      ];
    });
    setActiveKey(key);
  }, [pathname]);

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
      openTab,
      closeTab,
      closeOthers,
      closeRight,
      closeAll,
      switchTab,
    }),
    [tabs, activeKey, openTab, closeTab, closeOthers, closeRight, closeAll, switchTab],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs 必须在 TabsProvider 内使用');
  return ctx;
}
