import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { resolveRoleFromNames } from '@/lib/user-role';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

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

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return apiError('角色值无效，只能设置为 ADMIN 或 USER', 400);
    }

    if (id === currentUser.id) {
      return apiError('不能修改自己的角色', 400);
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
      return apiError('用户不存在', 404);
    }

    const currentTargetRole = resolveRoleFromNames(
      targetWithRoles.userRoles.map((item) => item.role.name),
    );

    if (currentTargetRole === 'SUPER_ADMIN') {
      return apiError('不能修改超级管理员的角色', 403);
    }

    const targetRole = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!targetRole) {
      return apiError('目标角色不存在', 400);
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

    await writeAuditLog({
      actorId: currentUser.id,
      actorUsername: currentUser.username,
      action: role === 'ADMIN' ? 'role.grant_admin' : 'role.revoke_admin',
      targetType: 'user',
      targetId: id,
      targetLabel: targetWithRoles.username,
      detail: { from: currentTargetRole, to: role },
    });

    return apiSuccess(
      updated
        ? {
            id: updated.id,
            username: updated.username,
            nickname: updated.nickname ?? '',
            email: updated.email,
            status: updated.status,
            role: resolveRoleFromNames(updated.userRoles.map((item) => item.role.name)),
          }
        : null,
      '角色更新成功',
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '无权限') {
        return apiError('无权限，仅超级管理员可操作', 403);
      }
    }

    return handleApiError(error, '角色更新失败', 'PATCH /api/users/[id]/role error');
  }
}
