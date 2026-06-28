import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminUser();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      userCount,
      activeUserCount,
      roleCount,
      permissionCount,
      newUsersRaw,
      auditActionCounts,
      recentAuditLogs,
      loginFailCount,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),

      // 启用中用户数
      prisma.user.count({ where: { status: 1 } }),

      // 角色数
      prisma.role.count(),

      // 权限数
      prisma.permission.count(),

      // 近30天每日新增用户
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // 审计日志 action 分布（近30天）
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { _count: { action: 'desc' } },
      }),

      // 最近10条审计日志
      prisma.auditLog.findMany({
        orderBy: { id: 'desc' },
        take: 10,
        select: {
          id: true,
          actorUsername: true,
          action: true,
          targetType: true,
          targetLabel: true,
          createdAt: true,
        },
      }),

      // 近30天登录失败计数
      prisma.loginAttempt.aggregate({
        _sum: { count: true },
        where: { updatedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // 将新增用户按日期聚合
    const dayMap = new Map<string, number>();
    const pad = (n: number) => String(n).padStart(2, '0');
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      const key = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      dayMap.set(key, 0);
    }
    newUsersRaw.forEach((u) => {
      const d = u.createdAt;
      const key = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
    });
    const newUsersTrend = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

    return apiSuccess({
      userCount,
      activeUserCount,
      roleCount,
      permissionCount,
      newUsersTrend,
      auditActionCounts: auditActionCounts.map((r) => ({
        action: r.action,
        count: r._count.action,
      })),
      recentAuditLogs,
      loginFailCount: loginFailCount._sum.count ?? 0,
    });
  } catch (error) {
    return handleApiError(error, '获取统计数据失败', 'GET /api/admin/stats error');
  }
}
