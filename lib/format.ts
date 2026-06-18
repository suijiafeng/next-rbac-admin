/**
 * 统一的日期/时间格式化工具，避免在各组件里重复 new Date(...).toLocaleString。
 */

const LOCALE = 'zh-CN';

/** 格式化为「日期 + 时间」，如 2026/6/28 22:08:16。空值返回 '-'。 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(LOCALE);
}

/** 仅格式化日期，如 2026/6/28。空值返回 '-'。 */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(LOCALE);
}
