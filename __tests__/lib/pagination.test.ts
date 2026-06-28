import { describe, it, expect } from 'vitest';
import { parsePagination } from '@/lib/pagination';

function params(obj: Record<string, string>) {
  return new URLSearchParams(obj);
}

describe('parsePagination', () => {
  it('默认值：page=1, pageSize=10', () => {
    const result = parsePagination(params({}));
    expect(result).toEqual({ page: 1, pageSize: 10, skip: 0, take: 10 });
  });

  it('正常传参', () => {
    const result = parsePagination(params({ page: '3', pageSize: '20' }));
    expect(result).toEqual({ page: 3, pageSize: 20, skip: 40, take: 20 });
  });

  it('page 小于 1 时取 1', () => {
    const result = parsePagination(params({ page: '0' }));
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('page 为负数时取 1', () => {
    const result = parsePagination(params({ page: '-5' }));
    expect(result.page).toBe(1);
  });

  it('pageSize 超过 maxPageSize 时取 maxPageSize', () => {
    const result = parsePagination(params({ pageSize: '200' }));
    expect(result.pageSize).toBe(100);
  });

  it('pageSize 小于 1 时取 1', () => {
    const result = parsePagination(params({ pageSize: '0' }));
    expect(result.pageSize).toBe(1);
  });

  it('自定义 defaultPageSize', () => {
    const result = parsePagination(params({}), { defaultPageSize: 25 });
    expect(result.pageSize).toBe(25);
  });

  it('自定义 maxPageSize', () => {
    const result = parsePagination(params({ pageSize: '60' }), { maxPageSize: 50 });
    expect(result.pageSize).toBe(50);
  });

  it('非数字字符串回退到默认值', () => {
    const result = parsePagination(params({ page: 'abc', pageSize: 'xyz' }));
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('空字符串回退到默认值', () => {
    const result = parsePagination(params({ page: '', pageSize: '' }));
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('skip 计算正确', () => {
    const result = parsePagination(params({ page: '5', pageSize: '15' }));
    expect(result.skip).toBe(60);
    expect(result.take).toBe(15);
  });
});
