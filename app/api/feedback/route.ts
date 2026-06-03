import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import {
  canSubmitFeedback,
  visibleSubmitterRoles,
} from '@/lib/feedback';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['bug', 'feature', 'experience', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function errResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === '未登录') {
      return NextResponse.json({ code: 1, data: null, message: '未登录' }, { status: 401 });
    }
    if (error.message === '无权限') {
      return NextResponse.json({ code: 1, data: null, message: '无权限' }, { status: 403 });
    }
  }
  console.error('feedback route error:', error);
  return NextResponse.json({ code: 1, data: null, message: '操作失败' }, { status: 500 });
}

/** 列出当前查看者可见（下级提交）的反馈，附带已读状态 */
export async function GET() {
  try {
    const me = await requireAdminUser();
    const roles = visibleSubmitterRoles(me.role);

    if (roles.length === 0) {
      return NextResponse.json({ code: 0, data: { list: [], unread: 0 }, message: 'success' });
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

    return NextResponse.json({ code: 0, data: { list: data, unread }, message: 'success' });
  } catch (error) {
    return errResponse(error);
  }
}

/** 提交反馈（仅非顶层角色可提交） */
export async function POST(request: Request) {
  try {
    const me = await requireAdminUser();

    if (!canSubmitFeedback(me.role)) {
      return NextResponse.json(
        { code: 1, data: null, message: '当前角色无需提交反馈' },
        { status: 403 },
      );
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
      return NextResponse.json({ code: 1, data: null, message: '标题不合法' }, { status: 400 });
    }
    if (content.length < 10 || content.length > 500) {
      return NextResponse.json({ code: 1, data: null, message: '描述需 10-500 字' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ code: 1, data: null, message: '反馈类型不合法' }, { status: 400 });
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ code: 1, data: null, message: '紧急程度不合法' }, { status: 400 });
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

    return NextResponse.json({ code: 0, data: { id: created.id }, message: 'success' });
  } catch (error) {
    return errResponse(error);
  }
}
