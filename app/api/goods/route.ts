import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { validateBySchema, STAGE_SCHEMAS } from '@/lib/goods/schema';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage') || 'entry';
    if (stage === 'review') {
      await requirePermission(PERMISSIONS.GOODS_REVIEW);
    } else {
      await requirePermission(PERMISSIONS.GOODS_SUBMIT);
    }
    const where =
      stage === 'review'
        ? { reviewStatus: 'PENDING' }
        : stage === 'listing'
          ? { reviewStatus: 'APPROVED' }
          : {};
    const list = await prisma.goodsItem.findMany({ where, orderBy: { id: 'desc' } });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, stage, list });
  } catch (error) {
    return handleApiError(error, '获取货品失败', 'GET /api/goods error');
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requirePermission(PERMISSIONS.GOODS_SUBMIT);
    const body = (await request.json()) as Record<string, unknown>;
    const errors = validateBySchema(STAGE_SCHEMAS.entry.fields, body);
    if (Object.keys(errors).length > 0) {
      return apiError('请按字段约定填写货品', 400);
    }
    const sku = String(body.sku).trim();
    const exists = await prisma.goodsItem.findUnique({ where: { sku } });
    if (exists) return apiError('编码已存在', 400);
    const created = await prisma.goodsItem.create({
      data: {
        sku,
        name: String(body.name).trim(),
        category: String(body.category),
        priceCents: Math.round(Number(body.priceYuan) * 100),
        stock: Math.round(Number(body.stock)),
        reviewStatus: 'DRAFT',
        authorUsername: user.username,
        dataSource: DEMO_DATA_LABEL,
      },
    });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, item: created }, '已保存草稿');
  } catch (error) {
    return handleApiError(error, '保存货品失败', 'POST /api/goods error');
  }
}
