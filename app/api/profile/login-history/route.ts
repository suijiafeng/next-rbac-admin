import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const currentUser = await requireAdminUser();

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, { defaultPageSize: 20 });

    const where = {
      actorId: currentUser.id,
      action: { in: ['user.login', 'user.password_change'] },
    };

    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        select: {
          id: true,
          action: true,
          detail: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    return handleApiError(error, '获取操作记录失败', 'GET /api/profile/login-history error');
  }
}
