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

    const body = await request.json();
    const { targetUserId, grantedRole, hours, reason, businessHoursOnly } = body as {
      targetUserId?: number;
      grantedRole?: string;
      hours?: number;
      reason?: string;
      businessHoursOnly?: boolean;
    };

    if (!targetUserId || grantedRole !== 'ADMIN') {
      return apiError('参数不合法：当前仅支持临时授予「管理员」', 400);
    }
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 72) {
      return apiError('时长需在 1~72 小时之间', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      select: {
        id: true,
        username: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!target) {
      return apiError('目标用户不存在', 404);
    }

    const fromRole = resolveRoleFromNames(target.userRoles.map((ur) => ur.role.name));
    if (fromRole !== 'USER') {
      return apiError('临时授权仅用于把「普通用户」临时提升为管理员', 400);
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      return apiError('ADMIN 角色不存在', 400);
    }

    const expiresAt = new Date(Date.now() + h * 60 * 60 * 1000);
    const condition = businessHoursOnly ? JSON.stringify(BUSINESS_HOURS) : null;

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: target.id, roleId: adminRole.id } },
      update: {},
      create: { userId: target.id, roleId: adminRole.id },
    });

    const grant = await prisma.tempGrant.create({
      data: {
        userId: target.id,
        username: target.username,
        grantedRole: 'ADMIN',
        fromRole,
        condition,
        reason: reason || null,
        status: 'ACTIVE',
        grantedById: actor.id,
        grantedByUsername: actor.username,
        expiresAt,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'temp.grant',
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
      detail: { grantedRole: 'ADMIN', hours: h, expiresAt, businessHoursOnly: Boolean(businessHoursOnly) },
    });

    return apiSuccess(grant, `已临时授予 ${target.username} ${roleLabel('ADMIN')}（${h} 小时后自动回收）`);
  } catch (error) {
    return handleApiError(error, '授予临时权限失败', 'POST /api/temp-grants error');
  }
}
