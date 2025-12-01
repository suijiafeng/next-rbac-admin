import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const currentUser = await requireRole(['SUPER_ADMIN']);
    const id = Number(context.params.id);
    const body = await request.json();
    const { role } = body;

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json(
        { code: 1, data: null, message: '角色值无效，只能设置为 ADMIN 或 USER' },
        { status: 400 },
      );
    }

    if (id === currentUser.id) {
      return NextResponse.json(
        { code: 1, data: null, message: '不能修改自己的角色' },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });

    if (!target) {
      return NextResponse.json(
        { code: 1, data: null, message: '用户不存在' },
        { status: 404 },
      );
    }

    if (target.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { code: 1, data: null, message: '不能修改超级管理员的角色' },
        { status: 403 },
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as 'ADMIN' | 'USER' },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json({ code: 0, data: updated, message: '角色更新成功' });
  } catch (error) {
    console.error('PATCH /api/users/[id]/role error:', error);

    if (error instanceof Error) {
      if (error.message === '未登录') {
        return NextResponse.json(
          { code: 1, data: null, message: '未登录' },
          { status: 401 },
        );
      }
      if (error.message === '无权限') {
        return NextResponse.json(
          { code: 1, data: null, message: '无权限，仅超级管理员可操作' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      { code: 1, data: null, message: '角色更新失败' },
      { status: 500 },
    );
  }
}
