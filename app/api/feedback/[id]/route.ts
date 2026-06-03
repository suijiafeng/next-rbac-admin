import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { visibleSubmitterRoles } from '@/lib/feedback';

export const dynamic = 'force-dynamic';

/** 查看反馈详情，并把它标记为「当前查看者已读」 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const me = await requireAdminUser();
    const id = Number(params.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ code: 1, data: null, message: '参数错误' }, { status: 400 });
    }

    const feedback = await prisma.feedback.findUnique({ where: { id } });

    if (!feedback) {
      return NextResponse.json({ code: 1, data: null, message: '反馈不存在' }, { status: 404 });
    }

    // 只有「严格高于」提交者角色的人能看
    const roles = visibleSubmitterRoles(me.role);
    if (!roles.includes(feedback.submitterRole as never)) {
      return NextResponse.json({ code: 1, data: null, message: '无权限' }, { status: 403 });
    }

    // 标记已读（幂等）
    await prisma.feedbackRead.upsert({
      where: { feedbackId_userId: { feedbackId: id, userId: me.id } },
      update: {},
      create: { feedbackId: id, userId: me.id },
    });

    return NextResponse.json({ code: 0, data: feedback, message: 'success' });
  } catch (error) {
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ code: 1, data: null, message: '未登录' }, { status: 401 });
    }
    console.error('GET /api/feedback/[id] error:', error);
    return NextResponse.json({ code: 1, data: null, message: '获取详情失败' }, { status: 500 });
  }
}
