import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { Role } from '@/constants/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      defaultPageSize: 20,
      maxPageSize: 500,
    });
    const action = searchParams.get('action') || '';
    const actorUsername = searchParams.get('actorUsername') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (actorUsername) where.actorUsername = { contains: actorUsername };
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, '获取审计日志失败', 'GET /api/admin/audit-logs error');
  }
}

