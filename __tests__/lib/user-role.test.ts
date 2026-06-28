import { describe, it, expect } from 'vitest';
import { resolveRoleFromNames } from '@/lib/user-role';

describe('resolveRoleFromNames', () => {
  it('空数组返回 USER', () => {
    expect(resolveRoleFromNames([])).toBe('USER');
  });

  it('只有 USER 角色返回 USER', () => {
    expect(resolveRoleFromNames(['USER'])).toBe('USER');
  });

  it('只有 ADMIN 角色返回 ADMIN', () => {
    expect(resolveRoleFromNames(['ADMIN'])).toBe('ADMIN');
  });

  it('只有 SUPER_ADMIN 角色返回 SUPER_ADMIN', () => {
    expect(resolveRoleFromNames(['SUPER_ADMIN'])).toBe('SUPER_ADMIN');
  });

  it('同时有 ADMIN 和 USER，优先返回 ADMIN', () => {
    expect(resolveRoleFromNames(['USER', 'ADMIN'])).toBe('ADMIN');
  });

  it('同时有 SUPER_ADMIN 和 ADMIN，优先返回 SUPER_ADMIN', () => {
    expect(resolveRoleFromNames(['ADMIN', 'SUPER_ADMIN'])).toBe('SUPER_ADMIN');
  });

  it('角色名称不区分大小写', () => {
    expect(resolveRoleFromNames(['admin'])).toBe('ADMIN');
    expect(resolveRoleFromNames(['super_admin'])).toBe('SUPER_ADMIN');
  });

  it('未知角色名称回退到 USER', () => {
    expect(resolveRoleFromNames(['UNKNOWN', 'GUEST'])).toBe('USER');
  });
});
