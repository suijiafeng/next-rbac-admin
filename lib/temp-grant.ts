import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit-log';

/**
 * 移除某用户的某个（临时提升的）角色。
 * 仅用于临时授权回收：授予时只针对"用户当前不具备的角色"，故回收时直接删除是安全的。
 */
export async function removeUserRole(userId: number, roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return;
  await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
}

/**
 * 扫描所有到期的临时授权并自动回收：
 * 移除提升的角色 → 置为 EXPIRED → 写一条 temp.expire 审计（actor 记为 system）。
 * 被 GET /api/temp-grants（懒回收）与 /api/cron/expire-grants（定时兜底）复用。
 */
export async function expireDueGrants(): Promise<number> {
  const due = await prisma.tempGrant.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
  });

  for (const grant of due) {
    await removeUserRole(grant.userId, grant.grantedRole);
    await prisma.tempGrant.update({
      where: { id: grant.id },
      data: { status: 'EXPIRED', revokedAt: new Date() },
    });
    await writeAuditLog({
      actorId: null,
      actorUsername: 'system',
      action: 'temp.expire',
      targetType: 'user',
      targetId: grant.userId,
      targetLabel: grant.username,
      detail: { grantedRole: grant.grantedRole, expiresAt: grant.expiresAt },
    });
  }

  return due.length;
}
