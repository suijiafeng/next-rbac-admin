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

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLE_VIEW);

    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        rolePermissions: {
          select: {
            permission: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { userRoles: true } },
      },
    });

    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      userCount: r._count.userRoles,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }));

    return NextResponse.json({ code: 0, data, message: 'success' });
  } catch (error) {
    return handleError(error, '获取角色列表失败');
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ROLE_CREATE);

    const body = await request.json();
    const { name, description, permissionIds } = body as {
      name: string;
      description?: string;
      permissionIds?: number[];
    };

    if (!name?.trim()) {
      return apiError('角色标识不能为空', 400);
    }

    const exists = await prisma.role.findUnique({ where: { name } });
    if (exists) return apiError('角色标识已存在', 400);

    const role = await prisma.role.create({
      data: {
        name,
        description: description ?? null,
        rolePermissions: permissionIds?.length
          ? { create: permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
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
        id: role.id,
        name: role.name,
        description: role.description,
        createdAt: role.createdAt,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
      message: '创建成功',
    });
  } catch (error) {
    return handleError(error, '创建角色失败');
  }
}
