import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { resolveRoleFromNames } from '@/lib/user-role';

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

    const targetWithRoles = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!targetWithRoles) {
      return NextResponse.json(
        { code: 1, data: null, message: '用户不存在' },
        { status: 404 },
      );
    }

    const currentTargetRole = resolveRoleFromNames(
      targetWithRoles.userRoles.map((item) => item.role.name),
    );

    if (currentTargetRole === 'SUPER_ADMIN') {
      return NextResponse.json(
        { code: 1, data: null, message: '不能修改超级管理员的角色' },
        { status: 403 },
      );
    }

    const targetRole = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!targetRole) {
      return NextResponse.json(
        { code: 1, data: null, message: '目标角色不存在' },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({
        where: {
          userId: id,
          role: {
            name: {
              in: ['ADMIN', 'USER'],
            },
          },
        },
      }),
      prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: id,
            roleId: targetRole.id,
          },
        },
        update: {},
        create: {
          userId: id,
          roleId: targetRole.id,
        },
      }),
    ]);

    const updated = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      code: 0,
      data: updated
        ? {
            id: updated.id,
            username: updated.username,
            nickname: updated.nickname ?? '',
            email: updated.email,
            status: updated.status,
            role: resolveRoleFromNames(updated.userRoles.map((item) => item.role.name)),
          }
        : null,
      message: '角色更新成功',
    });
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
