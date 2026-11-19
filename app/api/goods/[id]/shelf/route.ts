import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { STAGE_SCHEMAS, validateBySchema } from '@/lib/goods/schema';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const { user } = await requirePermission(PERMISSIONS.GOODS_SUBMIT);
    const body = (await request.json()) as Record<string, unknown>;
    const errors = validateBySchema(STAGE_SCHEMAS.listing.fields, body);
    if (Object.keys(errors).length > 0) return apiError('上架字段不完整', 400);
    const id = Number(context.params.id);
    const item = await prisma.goodsItem.findUnique({ where: { id } });
    if (!item) return apiError('货品不存在', 404);
    if (item.reviewStatus !== 'APPROVED') return apiError('审核通过后才能上架', 400);
    const updated = await prisma.goodsItem.update({
      where: { id },
      data: {
        shelfChannel: String(body.shelfChannel),
        shelfTitle: String(body.shelfTitle).trim(),
        shelfPriceCents: Math.round(Number(body.shelfPriceYuan) * 100),
      },
    });
    await writeAuditLog({
      actorId: user.id,
      actorUsername: user.username,
      action: 'goods.shelf',
      targetType: 'goods',
      targetId: id,
      targetLabel: item.sku,
      detail: { dataSource: DEMO_DATA_LABEL },
    });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, item: updated }, '上架配置已保存');
  } catch (error) {
    return handleApiError(error, '保存上架失败', 'POST /api/goods/[id]/shelf error');
  }
}
