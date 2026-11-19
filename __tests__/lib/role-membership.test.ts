import { describe, expect, it } from 'vitest';
import { formatMembershipNote, summarizeRoleMemberships, type RoleAssignment } from '@/lib/role-membership';

/**
 * 种子数据：22 名用户。
 * SUPER_ADMIN 1、ADMIN 5（含 developer3 的临时授权）、USER 17（同样含 developer3）。
 * 成员关系 23 条，因为 developer3 同时是 USER 和 ADMIN。
 */
function seedAssignments(): RoleAssignment[] {
  const rows: RoleAssignment[] = [
    { userId: 1, username: 'super_admin', nickname: '超级管理员', roleName: 'SUPER_ADMIN' },
    { userId: 2, username: 'admin', nickname: '管理员', roleName: 'ADMIN' },
    { userId: 3, username: 'user', nickname: '普通用户', roleName: 'USER' },
  ];

  const admins = ['manager1', 'manager2', 'manager3'];
  admins.forEach((username, index) => {
    rows.push({ userId: 4 + index, username, nickname: username, roleName: 'ADMIN' });
  });

  const users = [
    'developer1',
    'developer2',
    'developer3',
    'developer4',
    'developer5',
    'designer1',
    'designer2',
    'analyst1',
    'analyst2',
    'hr1',
    'hr2',
    'sales1',
    'sales2',
    'sales3',
    'support1',
    'support2',
  ];
  users.forEach((username, index) => {
    rows.push({
      userId: 7 + index,
      username,
      nickname: username === 'developer3' ? '孙后端' : username,
      roleName: 'USER',
    });
  });

  rows.push({ userId: 9, username: 'developer3', nickname: '孙后端', roleName: 'ADMIN' });
  return rows;
}

describe('summarizeRoleMemberships', () => {
  it('22 名用户、23 条成员关系，developer3 兼任 USER 和 ADMIN', () => {
    const summary = summarizeRoleMemberships(22, seedAssignments());
    const byRole = seedAssignments().reduce<Record<string, number>>((counts, row) => {
      counts[row.roleName] = (counts[row.roleName] ?? 0) + 1;
      return counts;
    }, {});

    expect(byRole).toEqual({ SUPER_ADMIN: 1, ADMIN: 5, USER: 17 });
    expect(summary.totalUsers).toBe(22);
    expect(summary.usersWithRoles).toBe(22);
    expect(summary.membershipCount).toBe(23);
    expect(summary.multiRoleUsers).toEqual([
      {
        userId: 9,
        username: 'developer3',
        nickname: '孙后端',
        roles: ['ADMIN', 'USER'],
      },
    ]);
  });

  it('没有兼任时人数相加等于用户数', () => {
    const summary = summarizeRoleMemberships(2, [
      { userId: 1, username: 'admin', nickname: null, roleName: 'ADMIN' },
      { userId: 2, username: 'user', nickname: '普通用户', roleName: 'USER' },
    ]);
    expect(summary.membershipCount).toBe(2);
    expect(summary.multiRoleUsers).toEqual([]);
    expect(formatMembershipNote(summary)).toContain('当前没有人兼任多个角色');
  });

  it('说明文案点出兼任的人，避免把成员数当成互斥的用户数', () => {
    const note = formatMembershipNote(summarizeRoleMemberships(22, seedAssignments()));
    expect(note).toContain('共 22 名用户');
    expect(note).toContain('成员关系 23 条');
    expect(note).toContain('孙后端（developer3）同时拥有 ADMIN、USER');
    expect(note).toContain('各角色人数相加会大于用户总数');
  });
});
