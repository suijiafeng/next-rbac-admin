import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { removeUserRole } from '@/lib/temp-grant';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.TEMP_REVOKE);

    const id = Number(context.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return apiError('ID 不合法', 400);
    }

    const grant = await prisma.tempGrant.findUnique({ where: { id } });
    if (!grant) {
      return apiError('临时授权不存在', 404);
    }
    if (grant.status !== 'ACTIVE') {
      return apiError('该授权已结束', 409);
    }

    await removeUserRole(grant.userId, grant.grantedRole);
    await prisma.tempGrant.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedByUsername: actor.username,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'temp.revoke',
      targetType: 'user',
      targetId: grant.userId,
      targetLabel: grant.username,
      detail: { grantedRole: grant.grantedRole },
    });

    return apiSuccess(true, '已回收');
  } catch (error) {
    return handleApiError(error, '回收失败', 'POST /api/temp-grants/[id]/revoke error');
  }
}
