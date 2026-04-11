import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import {
  canSubmitFeedback,
  visibleSubmitterRoles,
} from '@/lib/feedback';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['bug', 'feature', 'experience', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/** 列出当前查看者可见（下级提交）的反馈，附带已读状态 */
export async function GET() {
  try {
    const me = await requireAdminUser();
    const roles = visibleSubmitterRoles(me.role);

    if (roles.length === 0) {
      return apiSuccess({ list: [], unread: 0 });
    }

    const list = await prisma.feedback.findMany({
      where: { submitterRole: { in: roles } },
      orderBy: { id: 'desc' },
      include: {
        reads: { where: { userId: me.id }, select: { id: true } },
      },
    });

    const data = list.map((f) => {
      const { reads, ...rest } = f;
      return { ...rest, read: reads.length > 0 };
    });
    const unread = data.filter((f) => !f.read).length;

    return apiSuccess({ list: data, unread });
  } catch (error) {
    return handleApiError(error, '操作失败', 'GET /api/feedback error');
  }
}

/** 提交反馈（仅非顶层角色可提交） */
export async function POST(request: Request) {
  try {
    const me = await requireAdminUser();

    if (!canSubmitFeedback(me.role)) {
      return apiError('当前角色无需提交反馈', 403);
    }

    const body = await request.json();
    const title = String(body?.title ?? '').trim();
    const content = String(body?.content ?? '').trim();
    const type = String(body?.type ?? '');
    const priority = String(body?.priority ?? 'medium');
    const contact = body?.contact ? String(body.contact).trim() : null;
    const satisfaction =
      body?.satisfaction == null ? null : Number(body.satisfaction);

    if (!title || title.length > 50) {
      return apiError('标题不合法', 400);
    }
    if (content.length < 10 || content.length > 500) {
      return apiError('描述需 10-500 字', 400);
    }
    if (!VALID_TYPES.includes(type)) {
      return apiError('反馈类型不合法', 400);
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return apiError('紧急程度不合法', 400);
    }

    const created = await prisma.feedback.create({
      data: {
        submitterId: me.id,
        submitterUsername: me.username,
        submitterNickname: me.nickname ?? null,
        submitterRole: me.role,
        type,
        priority,
        title,
        content,
        contact,
        satisfaction: Number.isFinite(satisfaction) ? satisfaction : null,
      },
    });

    return apiSuccess({ id: created.id });
  } catch (error) {
    return handleApiError(error, '操作失败', 'POST /api/feedback error');
  }
}
