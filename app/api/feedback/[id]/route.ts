import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { visibleSubmitterRoles } from '@/lib/feedback';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/** 查看反馈详情，并把它标记为「当前查看者已读」 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const me = await requireAdminUser();
    const id = Number(params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('参数错误', 400);
    }

    const feedback = await prisma.feedback.findUnique({ where: { id } });

    if (!feedback) {
      return apiError('反馈不存在', 404);
    }

    // 只有「严格高于」提交者角色的人能看
    const roles = visibleSubmitterRoles(me.role);
    if (!roles.includes(feedback.submitterRole as never)) {
      return apiError('无权限', 403);
    }

    // 标记已读（幂等）
    await prisma.feedbackRead.upsert({
      where: { feedbackId_userId: { feedbackId: id, userId: me.id } },
      update: {},
      create: { feedbackId: id, userId: me.id },
    });

    return apiSuccess(feedback);
  } catch (error) {
    return handleApiError(error, '获取详情失败', 'GET /api/feedback/[id] error');
  }
}
