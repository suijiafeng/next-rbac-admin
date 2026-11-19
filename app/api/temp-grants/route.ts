import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';
import { resolveRoleFromNames } from '@/lib/user-role';
import { writeAuditLog } from '@/lib/audit-log';
import { expireDueGrants } from '@/lib/temp-grant';
import { roleLabel, BUSINESS_HOURS } from '@/lib/governance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.TEMP_VIEW);

    // 列表拉取前先回收到期项，保证展示与实际权限一致
    await expireDueGrants();

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      defaultPageSize: 20,
      maxPageSize: 200,
    });

    const [list, total] = await Promise.all([
      prisma.tempGrant.findMany({ orderBy: { id: 'desc' }, skip, take }),
      prisma.tempGrant.count(),
    ]);

    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, '获取临时授权失败', 'GET /api/temp-grants error');
  }
}

export async function POST(request: Request) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.TEMP_GRANT);

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return apiError('参数不合法', 400);
    const { targetUserId, grantedRole, hours, reason, businessHoursOnly } = body as Record<string, unknown>;
    if (typeof targetUserId !== 'number' || !Number.isSafeInteger(targetUserId) || targetUserId <= 0
      || grantedRole !== 'ADMIN') return apiError('参数不合法：当前仅支持临时授予「管理员」', 400);
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0 || hours > 72) {
      return apiError('时长需在 1~72 小时之间', 400);
    }
    if ((reason != null && typeof reason !== 'string')
      || (businessHoursOnly !== undefined && typeof businessHoursOnly !== 'boolean')) return apiError('参数类型不合法', 400);

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const condition = businessHoursOnly ? JSON.stringify(BUSINESS_HOURS) : null;
    // 验证也在事务内；串行化隔离使同一用户的并发授予不会产生重叠临时角色。
    const grant = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true, userRoles: { select: { role: { select: { name: true } } } } },
      });
      if (!target) throw new TempGrantError('目标用户不存在', 404);
      const fromRole = resolveRoleFromNames(target.userRoles.map((ur) => ur.role.name));
      if (fromRole !== 'USER') throw new TempGrantError('临时授权仅用于把「普通用户」临时提升为管理员', 400);
      const adminRole = await tx.role.findUnique({ where: { name: 'ADMIN' } });
      if (!adminRole) throw new TempGrantError('ADMIN 角色不存在', 400);

      await tx.userRole.upsert({
        where: { userId_roleId: { userId: target.id, roleId: adminRole.id } },
        update: {}, create: { userId: target.id, roleId: adminRole.id },
      });
      const created = await tx.tempGrant.create({ data: {
        userId: target.id, username: target.username, grantedRole: 'ADMIN', fromRole,
        condition, reason: typeof reason === 'string' ? reason : null, status: 'ACTIVE',
        grantedById: actor.id, grantedByUsername: actor.username, expiresAt,
      } });
      await writeAuditLog({
        actorId: actor.id, actorUsername: actor.username, action: 'temp.grant', targetType: 'user',
        targetId: target.id, targetLabel: target.username,
        detail: { grantedRole: 'ADMIN', hours, expiresAt, businessHoursOnly: Boolean(businessHoursOnly) },
      }, tx);
      return created;
    }, { isolationLevel: 'Serializable' });

    return apiSuccess(grant, `已临时授予 ${grant.username} ${roleLabel('ADMIN')}（${hours} 小时后自动回收）`);
  } catch (error) {
    if (error instanceof TempGrantError) return apiError(error.message, error.status);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return apiError('授权状态已变化，请刷新后重试', 409);
    }
    return handleApiError(error, '授予临时权限失败', 'POST /api/temp-grants error');
  }
}

class TempGrantError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
