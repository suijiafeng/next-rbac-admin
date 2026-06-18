/**
 * 页面元信息映射 —— 路径 → { 中文标题、是否可关闭 }
 * 面包屑、多标签页共用
 */

export interface PageMeta {
  /** 中文标题 */
  label: string;
  /** 是否允许关闭 tab（首页通常不允许） */
  closable: boolean;
}

/**
 * 以 pathname 第一段（如 'dashboard'）作为 key
 */
export const PAGE_META: Record<string, PageMeta> = {
  dashboard: { label: '仪表盘', closable: false },
  monitoring: { label: '数据监控', closable: true },
  users: { label: '用户管理', closable: true },
  permissions: { label: '权限管理', closable: true },
  settings: { label: '系统设置', closable: true },
  profile: { label: '个人中心', closable: true },
  feedback: { label: '意见反馈', closable: true },
  notifications: { label: '审计日志', closable: true },
  announcements: { label: '公告管理', closable: true },
};

/** 根据完整 pathname 解析出页面元信息 */
export function resolvePageMeta(pathname: string): PageMeta {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return { label: '首页', closable: false };
  const first = segs[0];
  return PAGE_META[first] ?? { label: first, closable: true };
}

/** 把完整 pathname 规范化为 tab key（取第一段 + 前导斜杠） */
export function pathnameToTabKey(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return '/dashboard';
  return '/' + segs[0];
}
