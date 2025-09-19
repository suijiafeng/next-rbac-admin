import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
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
        list,
        total,
        page,
        pageSize,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('GET /api/users error:', error);

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
    const body = await request.json();
    const { username, nickname, email, status } = body;

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

    const user = await prisma.user.create({
      data: {
        username,
        nickname,
        email: email || null,
        status: Number(status ?? 1),
      },
    });

    return NextResponse.json({
      code: 0,
      data: user,
      message: '新增成功',
    });
  } catch (error) {
    console.error('POST /api/users error:', error);

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