import { describe, expect, it } from 'vitest';
import { pathnameToTabKey, resolvePageMeta } from '@/lib/page-meta';

describe('resolvePageMeta', () => {
  it('根路径返回首页且不可关闭', () => {
    expect(resolvePageMeta('/')).toEqual({ label: '首页', closable: false });
  });

  it('已配置页面返回预设标题和 closable', () => {
    expect(resolvePageMeta('/dashboard')).toEqual({ label: '仪表盘', closable: false });
    expect(resolvePageMeta('/notifications')).toEqual({ label: '审计日志', closable: true });
  });

  it('支持嵌套路由，仅按第一段解析', () => {
    expect(resolvePageMeta('/users/123/profile')).toEqual({ label: '用户管理', closable: true });
  });

  it('未知页面回退为首段文本并可关闭', () => {
    expect(resolvePageMeta('/custom-page/detail')).toEqual({ label: 'custom-page', closable: true });
  });
});

describe('pathnameToTabKey', () => {
  it('根路径回退到 /dashboard', () => {
    expect(pathnameToTabKey('/')).toBe('/dashboard');
  });

  it('只取首段生成 tab key', () => {
    expect(pathnameToTabKey('/monitoring/charts')).toBe('/monitoring');
    expect(pathnameToTabKey('users/1')).toBe('/users');
  });
});
