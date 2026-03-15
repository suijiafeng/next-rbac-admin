'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
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

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme, animate = true) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (animate) {
    html.classList.add('theme-transition');
    window.setTimeout(() => html.classList.remove('theme-transition'), 250);
  }
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
    const stored = (typeof window !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
      : null) ?? 'light';
    const sys = getSystemTheme();
    setModeState(stored);
    setSystemTheme(sys);
    const resolved = stored === 'system' ? sys : stored;
    applyTheme(resolved, false);
    setMounted(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(next);
      if (mode === 'system') {
        applyTheme(next);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
    const resolved: ResolvedTheme = next === 'system' ? getSystemTheme() : next;
    applyTheme(resolved);
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  // 数据密集风：紧凑算法 + 主题算法
  const algorithm = useMemo(() => {
    const base = resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
    return [base, antdTheme.compactAlgorithm];
  }, [resolved]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
            fontSize: 13,
            wireframe: false,
            colorBgLayout: resolved === 'dark' ? '#0f1115' : '#f2f3f5',
            colorBgContainer: resolved === 'dark' ? '#181a20' : '#ffffff',
            colorBgElevated: resolved === 'dark' ? '#1f2128' : '#ffffff',
            colorBorder: resolved === 'dark' ? '#2a2d36' : '#e5e7eb',
            colorBorderSecondary: resolved === 'dark' ? '#23262e' : '#f0f0f0',
          },
          components: {
            Layout: {
              headerBg: resolved === 'dark' ? '#181a20' : '#ffffff',
              headerHeight: 52,
              headerPadding: '0 16px',
              siderBg: resolved === 'dark' ? '#0a0c10' : '#001529',
              bodyBg: resolved === 'dark' ? '#0f1115' : '#f2f3f5',
            },
            Menu: {
              darkItemBg: resolved === 'dark' ? '#0a0c10' : '#001529',
              darkSubMenuItemBg: resolved === 'dark' ? '#0a0c10' : '#000c17',
              darkItemSelectedBg: '#1677ff',
              darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
              itemHeight: 38,
              itemMarginInline: 8,
              itemBorderRadius: 6,
            },
            Card: {
              borderRadiusLG: 8,
              paddingLG: 16,
            },
            Table: {
              headerBg: resolved === 'dark' ? '#1f2128' : '#fafafa',
              headerColor: resolved === 'dark' ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)',
              rowHoverBg: resolved === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            },
            Button: {
              controlHeight: 32,
            },
          },
        }}
      >
        {/* 避免 SSR 闪烁：未挂载前不渲染主题色相关内容也行；这里允许首屏轻微闪烁以换更小代码 */}
        {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
