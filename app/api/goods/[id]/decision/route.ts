import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

/**
 * 货品审核复用审批中心的分权：提交人不能批准自己的货品，
 * 只有 goods:review 能把 PENDING 收成 APPROVED / REJECTED。
 * 不写入 change_requests，那张表的列是角色变更专用的。
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const { user } = await requirePermission(PERMISSIONS.GOODS_REVIEW);
    const body = (await request.json()) as { decision?: 'approve' | 'reject' };
    if (body.decision !== 'approve' && body.decision !== 'reject') {
      return apiError('不支持的审批决定', 400);
    }
    const id = Number(context.params.id);
    const item = await prisma.goodsItem.findUnique({ where: { id } });
    if (!item) return apiError('货品不存在', 404);
    if (item.reviewStatus !== 'PENDING') return apiError('只有待审核货品可以审批', 400);
    if (item.authorUsername === user.username) return apiError('不能审批自己录入的货品', 403);
    const reviewStatus = body.decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.goodsItem.update({
      where: { id },
      data: { reviewStatus, reviewerUsername: user.username },
    });
    await writeAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      action: body.decision === 'approve' ? 'goods.approve' : 'goods.reject',
      targetType: 'goods',
      targetId: id,
      targetLabel: item.sku,
      detail: { dataSource: DEMO_DATA_LABEL },
    });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, item: updated }, body.decision === 'approve' ? '已通过' : '已驳回');
  } catch (error) {
    return handleApiError(error, '货品审批失败', 'POST /api/goods/[id]/decision error');
  }
}
