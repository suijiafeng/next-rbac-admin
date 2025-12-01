import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { resolveRoleFromNames } from '@/lib/user-role';
import bcrypt from 'bcryptjs';

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

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.USER_VIEW);

    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 10);
    const username = searchParams.get('username') || '';
    const status = searchParams.get('status');

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
            status: Number(status),
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({
        where,
      }),
    ]);

    return NextResponse.json({
      code: 0,
      data: {
        list: list.map(formatUser),
        total,
        page,
        pageSize,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('GET /api/users error:', error);

    if (error instanceof Error) {
      if (error.message === '未登录') {
        return NextResponse.json(
          { code: 1, data: null, message: '未登录' },
          { status: 401 },
        );
      }

      if (error.message === '无权限') {
        return NextResponse.json(
          { code: 1, data: null, message: '无权限' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '获取用户列表失败',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.USER_CREATE);

    const body = await request.json();
    const { username, nickname, email, status, role } = body;

    if (!username || !nickname) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '用户名和昵称不能为空',
        },
        {
          status: 400,
        },
      );
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
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '用户名或邮箱已存在',
        },
        {
          status: 400,
        },
      );
    }

    const targetRole = await prisma.role.findUnique({
      where: { name: role || 'USER' },
    });

    if (!targetRole) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '角色不存在',
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        nickname,
        email: email || null,
        password: await bcrypt.hash('123456', 10),
        status: Number(status ?? 1),
        userRoles: {
          create: {
            roleId: targetRole.id,
          },
        },
      },
      select: userSelect,
    });

    return NextResponse.json({
      code: 0,
      data: formatUser(user),
      message: '新增成功',
    });
  } catch (error) {
    console.error('POST /api/users error:', error);

    if (error instanceof Error) {
      if (error.message === '未登录') {
        return NextResponse.json(
          { code: 1, data: null, message: '未登录' },
          { status: 401 },
        );
      }

      if (error.message === '无权限') {
        return NextResponse.json(
          { code: 1, data: null, message: '无权限' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '新增用户失败',
      },
      {
        status: 500,
      },
    );
  }
}
