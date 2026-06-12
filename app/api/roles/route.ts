import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

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

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, '获取角色列表失败', 'GET /api/roles error');
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

    return apiSuccess(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        createdAt: role.createdAt,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
      '创建成功',
    );
  } catch (error) {
    return handleApiError(error, '创建角色失败', 'POST /api/roles error');
  }
}
