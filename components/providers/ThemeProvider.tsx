'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;             // 用户选择
  resolved: ResolvedTheme;     // 实际生效
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'next-admin-theme';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === 'system' ? systemTheme : mode;
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function saveThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage 可能在隐私模式或受限环境不可用，主题仍按内存状态生效。
  }
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  html.style.colorScheme = resolved;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // 初始化：读取本地 + 系统偏好
  useEffect(() => {
    const stored = getStoredThemeMode();
    const sys = getSystemTheme();
    setModeState(stored);
    setSystemTheme(sys);
    applyTheme(resolveTheme(stored, sys));
    setMounted(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved: ResolvedTheme = resolveTheme(mode, systemTheme);

  // 把 data-theme / colorScheme 同步落到 <html>；antd cssVar 模式下
  // 切换只需翻转 CSS 变量，无需 flushSync 或 ViewTransition，即时且干脆。
  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;
    applyTheme(resolved);
  }, [mounted, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    saveThemeMode(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  // 主题算法：仅明暗，不再叠加 compactAlgorithm
  // —— compactAlgorithm 会把 fontSize 一并缩小（×0.75），
  //    与我们想要的"间距紧凑、字号正常"目标相悖。
  //    这里改用 defaultAlgorithm + 组件级 token 单独控制密度。
  const algorithm = useMemo(() => {
    return resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  }, [resolved]);

  const themeConfig = useMemo<ThemeConfig>(() => ({
    algorithm,
    cssVar: {
      key: 'next-admin-theme',
      prefix: 'ant',
    },
    token: {
      colorPrimary: '#1677ff',
      borderRadius: 6,
      // 基础字号回归 antd 默认 14；不再被算法压成 10
      fontSize: 14,
      fontSizeSM: 12,
      fontSizeLG: 16,
      fontSizeHeading4: 18,
      fontSizeHeading5: 16,
      wireframe: false,
      colorBgLayout: resolved === 'dark' ? '#0f1115' : '#f4f6f8',
      colorBgContainer: resolved === 'dark' ? '#181a20' : '#ffffff',
      colorBgElevated: resolved === 'dark' ? '#1f2128' : '#ffffff',
      colorBorder: resolved === 'dark' ? '#2a2d36' : '#e3e8ef',
      colorBorderSecondary: resolved === 'dark' ? '#23262e' : '#eef1f5',
    },
    components: {
      Layout: {
        headerBg: resolved === 'dark' ? '#181a20' : '#ffffff',
        headerHeight: 52,
        headerPadding: '0 16px',
        siderBg: resolved === 'dark' ? '#0a0c10' : '#101c2e',
        bodyBg: resolved === 'dark' ? '#0f1115' : '#f4f6f8',
      },
      Menu: {
        darkItemBg: resolved === 'dark' ? '#0a0c10' : '#101c2e',
        darkSubMenuItemBg: resolved === 'dark' ? '#0a0c10' : '#0a1422',
        darkItemSelectedBg: '#1677ff',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
        itemHeight: 38,
        itemMarginInline: 8,
        itemBorderRadius: 6,
        fontSize: 14,
      },
      Card: {
        borderRadiusLG: 8,
        paddingLG: 16,
        headerFontSize: 15,
      },
      Table: {
        headerBg: resolved === 'dark' ? '#1f2128' : '#f7f9fb',
        headerColor: resolved === 'dark' ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
        rowHoverBg: resolved === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.025)',
        fontSize: 13,
        cellPaddingBlock: 10,
        cellPaddingInline: 12,
      },
      Button: {
        controlHeight: 32,
        fontSize: 14,
      },
      Tabs: {
        fontSize: 14,
      },
      Pagination: {
        fontSize: 13,
      },
      Form: {
        labelFontSize: 14,
      },
      Input: {
        fontSize: 14,
      },
      Select: {
        fontSize: 14,
      },
    },
  }), [algorithm, resolved]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        locale={zhCN}
        theme={themeConfig}
      >
        {/* 始终渲染同一棵子树，避免挂载后整树重挂载；首屏在读取本地偏好前允许轻微闪烁 */}
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
