import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLE_VIEW);

    const permissions = await prisma.permission.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, code: true, name: true, description: true },
    });

    return apiSuccess(permissions);
  } catch (error) {
    return handleApiError(error, '获取权限列表失败', 'GET /api/permissions error');
  }
}
