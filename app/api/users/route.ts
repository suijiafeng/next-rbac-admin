import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import bcrypt from 'bcryptjs';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';
import { userSelect, formatUser, generateInitialPassword } from '@/lib/user-helpers';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.USER_VIEW);

    const { searchParams } = new URL(request.url);

    const { page, pageSize, skip, take } = parsePagination(searchParams);
    const username = searchParams.get('username') || '';
    const status = searchParams.get('status');
    const parsedStatus = Number(status);

    if (status !== null && status !== '' && ![0, 1].includes(parsedStatus)) {
      return apiError('用户状态参数不合法', 400);
    }

    const where = {
      ...(username
        ? {
            username: {
              contains: username,
            },
          }
        : {}),
      ...(status !== null && status !== ''
        ? {
            status: parsedStatus,
          }
        : {}),
    };

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: {
          id: 'asc',
        },
        skip,
        take,
      }),
      prisma.user.count({
        where,
      }),
    ]);

    return apiSuccess({
      list: list.map(formatUser),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error, '获取用户列表失败', 'GET /api/users error');
  }
}

export async function POST(request: Request) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.USER_CREATE);

    const body = await request.json();
    const { username, nickname, email, status, role } = body;
    const userStatus = Number(status ?? 1);

    if (!username || !nickname) {
      return apiError('用户名和昵称不能为空', 400);
    }

    if (![0, 1].includes(userStatus)) {
      return apiError('用户状态参数不合法', 400);
    }

    const existedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existedUser) {
      return apiError('用户名或邮箱已存在', 400);
    }

    const targetRole = await prisma.role.findUnique({
      where: { name: role || 'USER' },
    });

    if (!targetRole) {
      return apiError('角色不存在', 400);
    }

    // 非超级管理员不能创建超级管理员账号（防止权限提升）
    if (targetRole.name === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      return apiError('无权限创建超级管理员账号', 403);
    }

    const initialPassword = generateInitialPassword();

    const user = await prisma.user.create({
      data: {
        username,
        nickname,
        email: email || null,
        password: await bcrypt.hash(initialPassword, 10),
        status: userStatus,
        userRoles: {
          create: {
            roleId: targetRole.id,
          },
        },
      },
      select: userSelect,
    });

    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'user.create',
      targetType: 'user',
      targetId: user.id,
      targetLabel: user.username,
    });

    return apiSuccess(
      { ...formatUser(user), initialPassword },
      '新增成功',
    );
  } catch (error) {
    return handleApiError(error, '新增用户失败', 'POST /api/users error');
  }
}
