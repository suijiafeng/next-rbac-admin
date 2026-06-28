import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDate } from '@/lib/format';

describe('formatDateTime', () => {
  it('格式化有效日期字符串', () => {
    const result = formatDateTime('2026-06-28T14:08:16.000Z');
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('格式化 Date 对象', () => {
    const d = new Date('2026-06-28T14:08:16.000Z');
    const result = formatDateTime(d);
    expect(result).not.toBe('-');
  });

  it('格式化时间戳数字', () => {
    const result = formatDateTime(1751116096000);
    expect(result).not.toBe('-');
  });

  it('null 返回 -', () => {
    expect(formatDateTime(null)).toBe('-');
  });

  it('undefined 返回 -', () => {
    expect(formatDateTime(undefined)).toBe('-');
  });

  it('空字符串返回 -', () => {
    expect(formatDateTime('')).toBe('-');
  });

  it('无效日期字符串返回 -', () => {
    expect(formatDateTime('not-a-date')).toBe('-');
  });
});

describe('formatDate', () => {
  it('格式化有效日期字符串，不含时间', () => {
    const result = formatDate('2026-06-28T14:08:16.000Z');
    expect(result).not.toBe('-');
    expect(result).not.toContain(':');
  });

  it('null 返回 -', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('undefined 返回 -', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('空字符串返回 -', () => {
    expect(formatDate('')).toBe('-');
  });

  it('无效日期字符串返回 -', () => {
    expect(formatDate('invalid')).toBe('-');
  });

  it('格式化 Date 对象', () => {
    const result = formatDate(new Date('2026-01-01'));
    expect(result).not.toBe('-');
  });
});
