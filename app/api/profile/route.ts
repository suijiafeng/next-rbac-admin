import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 第一版先写死，后面再替换成真实登录态解析
    const adminUserId = 1;

    const user = await prisma.adminUser.findUnique({
      where: {
        id: adminUserId,
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

    if (!user) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '用户不存在',
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      code: 0,
      data: user,
      message: 'success',
    });
  } catch (error) {
    console.error('GET /api/profile error:', error);

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
    const adminUserId = 1;
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
      ? await prisma.adminUser.findFirst({
          where: {
            email,
            NOT: {
              id: adminUserId,
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

    const user = await prisma.adminUser.update({
      where: {
        id: adminUserId,
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