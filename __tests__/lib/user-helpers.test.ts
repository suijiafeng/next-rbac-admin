import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatUser, generateInitialPassword } from '@/lib/user-helpers';

// formatUser 依赖 resolveRoleFromNames，一并覆盖

describe('formatUser', () => {
  const baseUser = {
    id: 1,
    username: 'testuser',
    nickname: null,
    email: 'test@example.com',
    avatar: null,
    status: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    userRoles: [],
  };

  it('没有角色时 role 默认为 USER', () => {
    const result = formatUser({ ...baseUser, userRoles: [] });
    expect(result.role).toBe('USER');
  });

  it('有 ADMIN 角色时 role 为 ADMIN', () => {
    const result = formatUser({
      ...baseUser,
      userRoles: [{ role: { name: 'ADMIN' } }],
    });
    expect(result.role).toBe('ADMIN');
  });

  it('同时有 ADMIN 和 USER 时，优先取 ADMIN', () => {
    const result = formatUser({
      ...baseUser,
      userRoles: [
        { role: { name: 'USER' } },
        { role: { name: 'ADMIN' } },
      ],
    });
    expect(result.role).toBe('ADMIN');
  });

  it('有 SUPER_ADMIN 角色时优先级最高', () => {
    const result = formatUser({
      ...baseUser,
      userRoles: [
        { role: { name: 'ADMIN' } },
        { role: { name: 'SUPER_ADMIN' } },
      ],
    });
    expect(result.role).toBe('SUPER_ADMIN');
  });

  it('nickname 为 null 时转为空字符串', () => {
    const result = formatUser({ ...baseUser, nickname: null });
    expect(result.nickname).toBe('');
  });

  it('有 nickname 时保留原值', () => {
    const result = formatUser({ ...baseUser, nickname: '张三' });
    expect(result.nickname).toBe('张三');
  });

  it('userRoles 字段不出现在返回值中', () => {
    const result = formatUser(baseUser);
    expect(result).not.toHaveProperty('userRoles');
  });

  it('其余字段原样保留', () => {
    const result = formatUser({ ...baseUser, username: 'alice', email: 'alice@test.com' });
    expect(result.username).toBe('alice');
    expect(result.email).toBe('alice@test.com');
    expect(result.id).toBe(1);
  });
});

describe('generateInitialPassword', () => {
  it('长度为 12', () => {
    const pwd = generateInitialPassword();
    expect(pwd).toHaveLength(12);
  });

  it('只包含合法字符（无 0/O/I/l/1）', () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateInitialPassword();
      expect(pwd).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]{12}$/);
    }
  });

  it('每次生成结果不同（概率极高）', () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generateInitialPassword()));
    expect(passwords.size).toBeGreaterThan(1);
  });
});
