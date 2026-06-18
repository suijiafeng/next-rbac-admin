import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { Role } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);

    const id = Number(context.params.id);
    if (!Number.isInteger(id) || id <= 0) return apiError('公告 ID 不合法', 400);

    const body = await request.json();
    const { title, content, active, startsAt, expiresAt } = body;

    if (!title || !content) return apiError('标题和内容不能为空', 400);

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return apiError('公告不存在', 404);

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        content,
        active: active !== false,
        startsAt: startsAt ? new Date(startsAt) : existing.startsAt,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
      },
    });

    return apiSuccess(updated, '公告已更新');
  } catch (error) {
    return handleApiError(error, '更新公告失败', 'PUT /api/admin/announcements/[id] error');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);

    const id = Number(context.params.id);
    if (!Number.isInteger(id) || id <= 0) return apiError('公告 ID 不合法', 400);

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return apiError('公告不存在', 404);

    await prisma.announcement.delete({ where: { id } });
    return apiSuccess(true, '公告已删除');
  } catch (error) {
    return handleApiError(error, '删除公告失败', 'DELETE /api/admin/announcements/[id] error');
  }
}
