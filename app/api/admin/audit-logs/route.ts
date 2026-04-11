import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole(['SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });
    const action = searchParams.get('action') || '';

    const where = action ? { action } : {};

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
