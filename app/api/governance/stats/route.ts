import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.CHANGE_VIEW);

    const [pending, approved, rejected, activeGrants, expiredGrants, revokedGrants] =
      await Promise.all([
        prisma.changeRequest.count({ where: { status: 'PENDING' } }),
        prisma.changeRequest.count({ where: { status: 'APPROVED' } }),
        prisma.changeRequest.count({ where: { status: 'REJECTED' } }),
        prisma.tempGrant.count({ where: { status: 'ACTIVE' } }),
        prisma.tempGrant.count({ where: { status: 'EXPIRED' } }),
        prisma.tempGrant.count({ where: { status: 'REVOKED' } }),
      ]);

    return apiSuccess({
      pending,
      approved,
      rejected,
      decided: approved + rejected,
      totalChanges: pending + approved + rejected,
      activeGrants,
      expiredGrants,
      revokedGrants,
      // 临时授权按时自动回收率：已过期(自动回收) / (已过期 + 被提前手动回收)
      autoReclaimRate:
        expiredGrants + revokedGrants > 0
          ? Math.round((expiredGrants / (expiredGrants + revokedGrants)) * 100)
          : null,
    });
  } catch (error) {
    return handleApiError(error, '获取治理指标失败', 'GET /api/governance/stats error');
  }
}
