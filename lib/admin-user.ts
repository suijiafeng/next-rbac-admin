import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveRoleFromNames } from '@/lib/user-role';
import { isConditionSatisfiedNow } from '@/lib/governance';

export async function getCurrentAdminUser() {
  const session = await getAdminSession();

  if (!session?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      username: true,
      nickname: true,
      email: true,
      avatar: true,
      status: true,
      authVersion: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user || user.status !== 1) {
    return null;
  }

  let roleNames = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);

  // ABAC：临时授权可附带约束（如「仅工作时间」）。约束当前不满足时，
  // 该临时提升的角色此刻"挂起"不生效（到期前仍保留记录）。
  // 临时授权仅用于 USER→ADMIN，不会与常驻 ADMIN 冲突，故下面的挂起是安全的。
  try {
    const conditionalGrants = await prisma.tempGrant.findMany({
      where: { userId: user.id, status: 'ACTIVE', condition: { not: null } },
      select: { grantedRole: true, condition: true },
    });
    if (conditionalGrants.length > 0) {
      const now = new Date();
      const suppressed = new Set<string>();
      for (const grant of conditionalGrants) {
        if (!isConditionSatisfiedNow(grant.condition, now)) {
          suppressed.add(grant.grantedRole);
        }
      }
      if (suppressed.size > 0) {
        roleNames = roleNames.filter((name: string) => !suppressed.has(name));
      }
    }
  } catch (error) {
    // ABAC 评估失败时降级为基础角色解析，保证鉴权可用性不受影响
    console.error('ABAC condition eval failed:', error);
  }

  const role = resolveRoleFromNames(roleNames);
  const tokenAuthVersion = session.authVersion ?? 0;

  if (tokenAuthVersion !== user.authVersion) {
    return null;
  }

  const { userRoles, ...rest } = user;
  void userRoles;
  return { ...rest, role };
}
