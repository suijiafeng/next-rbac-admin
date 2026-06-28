import { prisma } from '@/lib/prisma';
import { resolveRoleFromNames } from '@/lib/user-role';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { getCurrentAdminUser } from '@/lib/admin-user';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { userSelect, formatUser } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requirePermission(PERMISSIONS.USER_VIEW);

    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: userSelect,
    });

    if (!user) {
      return apiError('用户不存在', 404);
    }

    return apiSuccess(formatUser(user));
  } catch (error) {
    return handleApiError(error, '获取用户详情失败', 'GET /api/users/[id] error');
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    await requirePermission(PERMISSIONS.USER_EDIT);

    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    const body = await request.json();
    const { username, nickname, email, status } = body;
    const nextStatus = Number(status ?? 1);

    if (!username || !nickname) {
      return apiError('用户名和昵称不能为空', 400);
    }

    if (![0, 1].includes(nextStatus)) {
      return apiError('用户状态参数不合法', 400);
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!currentUser) {
      return apiError('用户不存在', 404);
    }


    const existedUser = await prisma.user.findFirst({
      where: {
        AND: [
          {
            id: {
              not: id,
            },
          },
          {
            OR: [
              { username },
              ...(email ? [{ email }] : []),
            ],
          },
        ],
      },
    });

    if (existedUser) {
      return apiError('用户名或邮箱已存在', 400);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        username,
        nickname,
        email: email || null,
        status: nextStatus,
      },
      select: userSelect,
    });

    const prevStatus = currentUser.status;
    if (prevStatus !== nextStatus) {
      const actor = await getCurrentAdminUser();
      if (actor) {
        await writeAuditLog({
          actorId: actor.id,
          actorUsername: actor.username,
          action: nextStatus === 0 ? 'user.suspend' : 'user.unsuspend',
          targetType: 'user',
          targetId: id,
          targetLabel: updatedUser.username,
        });
      }
    }

    return apiSuccess(formatUser(updatedUser), '编辑成功');
  } catch (error) {
    return handleApiError(error, '编辑用户失败', 'PUT /api/users/[id] error');
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.USER_DELETE);

    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    // 防止删除自己
    if (actor.id === id) {
      return apiError('不能删除自己的账号', 400);
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
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

    if (!currentUser) {
      return apiError('用户不存在', 404);
    }

    const currentUserRole = resolveRoleFromNames(
      currentUser.userRoles.map((item) => item.role.name),
    );

    if (currentUserRole === 'SUPER_ADMIN') {
      return apiError('超级管理员不能删除', 403);
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'user.delete',
      targetType: 'user',
      targetId: id,
      targetLabel: currentUser.username,
    });

    return apiSuccess(true, '删除成功');
  } catch (error) {
    return handleApiError(error, '删除用户失败', 'DELETE /api/users/[id] error');
  }
}
