import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

/** SUPER_ADMIN 通知中心：聚合最近的关键审计事件 */
export async function GET(request: Request) {
  try {
    await requireRole(['SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, { defaultPageSize: 20 });
    const action = searchParams.get('action') || '';

    const criticalActions = [
      'user.create',
      'user.delete',
      'user.suspend',
      'user.unsuspend',
      'user.reset_password',
      'role.grant_admin',
      'role.revoke_admin',
      'settings.update',
      'user.login',
    ];

    const where = {
      action: action ? action : { in: criticalActions },
    };

    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        select: {
          id: true,
          actorUsername: true,
          action: true,
          targetType: true,
          targetLabel: true,
          detail: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, '获取通知失败', 'GET /api/admin/notifications error');
  }
}
