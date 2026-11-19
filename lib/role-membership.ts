export interface RoleAssignment {
  userId: number;
  username: string;
  nickname: string | null;
  roleName: string;
}

export interface MultiRoleUser {
  userId: number;
  username: string;
  nickname: string | null;
  roles: string[];
}

export interface RoleCountSummary {
  totalUsers: number;
  usersWithRoles: number;
  membershipCount: number;
  multiRoleUsers: MultiRoleUser[];
}

/**
 * 角色卡片上的人数是 UserRole 行数，不是把用户切成互斥的组。
 * 一人可以同时拥有多条角色关系（例如临时授权再补一条 ADMIN），
 * 所以各角色人数相加可以大于用户总数。
 */
export function summarizeRoleMemberships(
  totalUsers: number,
  assignments: RoleAssignment[],
): RoleCountSummary {
  const byUser = new Map<number, { username: string; nickname: string | null; roles: string[] }>();

  for (const row of assignments) {
    const current = byUser.get(row.userId) ?? {
      username: row.username,
      nickname: row.nickname,
      roles: [],
    };
    if (!current.roles.includes(row.roleName)) {
      current.roles.push(row.roleName);
    }
    byUser.set(row.userId, current);
  }

  const multiRoleUsers = Array.from(byUser.entries())
    .filter(([, user]) => user.roles.length > 1)
    .map(([userId, user]) => ({
      userId,
      username: user.username,
      nickname: user.nickname,
      roles: [...user.roles].sort(),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return {
    totalUsers,
    usersWithRoles: byUser.size,
    membershipCount: assignments.length,
    multiRoleUsers,
  };
}

export function formatMembershipNote(summary: RoleCountSummary): string {
  const counts =
    summary.usersWithRoles === summary.totalUsers
      ? `共 ${summary.totalUsers} 名用户，成员关系 ${summary.membershipCount} 条。`
      : `共 ${summary.totalUsers} 名用户，其中 ${summary.usersWithRoles} 人已分配角色，成员关系 ${summary.membershipCount} 条。`;
  const head = `成员数按角色关系分别计数，同一用户可以同时拥有多个角色。${counts}`;

  if (summary.multiRoleUsers.length === 0) {
    return `${head}当前没有人兼任多个角色。`;
  }

  const who = summary.multiRoleUsers
    .map((user) => {
      const name = user.nickname ? `${user.nickname}（${user.username}）` : user.username;
      return `${name}同时拥有 ${user.roles.join('、')}`;
    })
    .join('；');

  return `${head}${who}，因此会被计入多个角色，各角色人数相加会大于用户总数。`;
}
