import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { writeAuditLog } from '@/lib/audit-log';

const DEFAULT_PASSWORD = '123456';

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireRole(['SUPER_ADMIN']);
    const id = Number(context.params.id);

    if (id === currentUser.id) {
      return NextResponse.json(
        { code: 1, data: null, message: '不能重置自己的密码，请使用“修改密码”' },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, nickname: true },
    });
    if (!target) {
      return NextResponse.json({ code: 1, data: null, message: '用户不存在' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(DEFAULT_PASSWORD, 10) },
    });

    await writeAuditLog({
      actorId: currentUser.id,
      actorUsername: currentUser.username,
      action: 'user.reset_password',
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
    });

    return NextResponse.json({
      code: 0,
      data: { defaultPassword: DEFAULT_PASSWORD },
      message: '密码已重置为默认密码',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '未登录') {
        return NextResponse.json({ code: 1, data: null, message: '未登录' }, { status: 401 });
      }
      if (error.message === '无权限') {
        return NextResponse.json(
          { code: 1, data: null, message: '无权限，仅超级管理员可操作' },
          { status: 403 },
        );
      }
    }
    console.error('POST /api/users/[id]/password/reset error:', error);
    return NextResponse.json({ code: 1, data: null, message: '重置密码失败' }, { status: 500 });
  }
}
