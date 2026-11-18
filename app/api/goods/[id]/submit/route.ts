import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: { id: string } }) {
  try {
    const { user } = await requirePermission(PERMISSIONS.GOODS_SUBMIT);
    const id = Number(context.params.id);
    const item = await prisma.goodsItem.findUnique({ where: { id } });
    if (!item) return apiError('货品不存在', 404);
    if (item.authorUsername !== user.username) return apiError('只能提交自己录入的货品', 403);
    if (item.reviewStatus !== 'DRAFT' && item.reviewStatus !== 'REJECTED') {
      return apiError('当前状态不能提交审核', 400);
    }
    const updated = await prisma.goodsItem.update({
      where: { id },
      data: { reviewStatus: 'PENDING' },
    });
    await writeAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      action: 'goods.submit',
      targetType: 'goods',
      targetId: id,
      targetLabel: item.sku,
      detail: { dataSource: DEMO_DATA_LABEL },
    });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, item: updated }, '已提交审核');
  } catch (error) {
    return handleApiError(error, '提交审核失败', 'POST /api/goods/[id]/submit error');
  }
}
