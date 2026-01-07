import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';

function apiError(message: string, status: number) {
  return NextResponse.json({ code: 1, data: null, message }, { status });
}

function handleError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    if (error.message === '未登录') return apiError('未登录', 401);
    if (error.message === '无权限') return apiError('无权限', 403);
  }
  return apiError(fallbackMessage, 500);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission(PERMISSIONS.ROLE_EDIT);

    const { id } = await params;
    const roleId = Number(id);
    const body = await request.json();
    const { description, permissionIds } = body as {
      description?: string;
      permissionIds?: number[];
    };

    const exists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!exists) return apiError('角色不存在', 404);

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: { description: description ?? null },
      });

      if (permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((pid) => ({ roleId, permissionId: pid })),
          });
        }
      }
    });

    const updated = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        rolePermissions: {
          select: { permission: { select: { id: true, code: true, name: true } } },
        },
        _count: { select: { userRoles: true } },
      },
    });

    return NextResponse.json({
      code: 0,
      data: {
        id: updated!.id,
        name: updated!.name,
        description: updated!.description,
        createdAt: updated!.createdAt,
        userCount: updated!._count.userRoles,
        permissions: updated!.rolePermissions.map((rp) => rp.permission),
      },
      message: '更新成功',
    });
  } catch (error) {
    return handleError(error, '更新角色失败');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission(PERMISSIONS.ROLE_DELETE);

    const { id } = await params;
    const roleId = Number(id);

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!role) return apiError('角色不存在', 404);
    if (role._count.userRoles > 0) return apiError('该角色下还有用户，不能删除', 400);

    await prisma.role.delete({ where: { id: roleId } });

    return NextResponse.json({ code: 0, data: null, message: '删除成功' });
  } catch (error) {
    return handleError(error, '删除角色失败');
  }
}
