import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission(PERMISSIONS.ROLE_EDIT);

    const { id } = await params;
    const roleId = Number(id);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return apiError('角色 ID 不合法', 400);
    }

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

    return apiSuccess(
      {
        id: updated!.id,
        name: updated!.name,
        description: updated!.description,
        createdAt: updated!.createdAt,
        userCount: updated!._count.userRoles,
        permissions: updated!.rolePermissions.map((rp) => rp.permission),
      },
      '更新成功',
    );
  } catch (error) {
    return handleApiError(error, '更新角色失败', 'PUT /api/roles/[id] error');
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

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return apiError('角色 ID 不合法', 400);
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!role) return apiError('角色不存在', 404);
    if (role._count.userRoles > 0) return apiError('该角色下还有用户，不能删除', 400);

    await prisma.role.delete({ where: { id: roleId } });

    return apiSuccess(null, '删除成功');
  } catch (error) {
    return handleApiError(error, '删除角色失败', 'DELETE /api/roles/[id] error');
  }
}
