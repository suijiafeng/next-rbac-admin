import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAdminUser();

    return NextResponse.json({
      code: 0,
      data: user,
      message: 'success',
    });
  } catch (error) {
    console.error('GET /api/profile error:', error);

    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '未登录',
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '获取个人信息失败',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await requireAdminUser();

    const body = await request.json();
    const { nickname, email } = body;

    if (!nickname) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '昵称不能为空',
        },
        {
          status: 400,
        },
      );
    }

    const existedUser = email
      ? await prisma.user.findFirst({
          where: {
            email,
            NOT: {
              id: currentUser.id,
            },
          },
        })
      : null;

    if (existedUser) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '邮箱已存在',
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        nickname,
        email: email || null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      code: 0,
      data: user,
      message: '保存成功',
    });
  } catch (error) {
    console.error('PUT /api/profile error:', error);

    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '未登录',
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '更新个人信息失败',
      },
      {
        status: 500,
      },
    );
  }
}
