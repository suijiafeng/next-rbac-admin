import { prisma } from '@/lib/prisma';
import { resolveRoleFromNames } from '@/lib/user-role';
import { getCurrentAdminUser } from '@/lib/admin-user';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

function formatUser(user: {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{ role: { name: string } }>;
}) {
  const { userRoles, ...rest } = user;

  return {
    ...rest,
    nickname: rest.nickname ?? '',
    role: resolveRoleFromNames(userRoles.map((item) => item.role.name)),
  };
}

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
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
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

    return apiSuccess(true, '删除成功');
  } catch (error) {
    return handleApiError(error, '删除用户失败', 'DELETE /api/users/[id] error');
  }
}
