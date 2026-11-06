import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveRoleFromNames } from '@/lib/user-role';
import { isConditionSatisfiedNow } from '@/lib/governance';

/** 一条仍标记为 ACTIVE 的临时授权（读取时再判断是否真正生效）。 */
export interface ActiveTempGrant {
  grantedRole: string;
  condition?: string | null;
  expiresAt: Date;
  /** 缺省视为查询已限定 ACTIVE。显式非 ACTIVE 的记录不参与抑制。 */
  status?: string;
}

/**
 * 按读取时刻过滤角色名。
 *
 * 临时授权会把角色写进 UserRole，回收任务没跑时那一行还在。
 * 这里以 temp_grants 为准：某个角色只要存在 ACTIVE 授权，就只有在
 * 「未过期且 ABAC 条件当前满足」时才保留。没有对应 ACTIVE 授权的角色
 * 视为常驻角色，原样保留。同一角色有多条授权时，有一条仍有效即保留。
 *
 * 与 cron 的到期条件一致：expiresAt < now 视为已过期（等于 now 仍有效）。
 */
export function effectiveRoleNames(
  roleNames: string[],
  grants: ActiveTempGrant[],
  now: Date = new Date(),
): string[] {
  const elevated = new Set<string>();
  const allowed = new Set<string>();

  for (const grant of grants) {
    if (grant.status != null && grant.status !== 'ACTIVE') continue;
    const role = grant.grantedRole.toUpperCase();
    elevated.add(role);
    if (grant.expiresAt.getTime() < now.getTime()) continue;
    if (!isConditionSatisfiedNow(grant.condition, now)) continue;
    allowed.add(role);
  }

  if (elevated.size === 0) return roleNames;

  return roleNames.filter((name) => {
    const key = name.toUpperCase();
    return !elevated.has(key) || allowed.has(key);
  });
}

/**
 * 读取该用户的 ACTIVE 临时授权，并返回此刻仍然有效的角色名。
 * 查询失败时拒绝本次鉴权，不把无法核实的临时角色当作常驻角色；
 * 查询成功时过期授权立即失效，不依赖 cron 先删掉 UserRole。
 */
export async function applyActiveTempGrants(
  userId: number,
  roleNames: string[],
): Promise<string[]> {
  try {
    const grants = await prisma.tempGrant.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { grantedRole: true, condition: true, expiresAt: true },
    });
    return effectiveRoleNames(roleNames, grants);
  } catch (error) {
    console.error('临时授权有效性评估失败:', error);
    throw new Error('临时授权校验失败，请稍后重试');
  }
}

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

  const storedRoleNames = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
  // 临时授权（含「仅工作时间」）在鉴权边界生效：过期或条件不满足则不计该角色。
  // 产品约定临时授权只把 USER 提升为 ADMIN，不会和常驻 ADMIN 叠在同一人身上。
  const roleNames = await applyActiveTempGrants(user.id, storedRoleNames);

  const role = resolveRoleFromNames(roleNames);
  const tokenAuthVersion = session.authVersion ?? 0;

  if (tokenAuthVersion !== user.authVersion) {
    return null;
  }

  const { userRoles, ...rest } = user;
  void userRoles;
  return { ...rest, role };
}
