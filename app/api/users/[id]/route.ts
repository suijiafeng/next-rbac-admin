import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: userSelect,
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
    console.error('GET /api/users/[id] error:', error);

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '获取用户详情失败',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const id = Number(context.params.id);
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

    const currentUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!currentUser) {
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


    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        username,
        nickname,
        email: email || null,
        status: Number(status ?? 1),
      },
      select: userSelect,
    });


    return NextResponse.json({
      code: 0,
      data: updatedUser,
      message: '编辑成功',
    });
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '编辑用户失败',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const id = Number(context.params.id);

    const currentUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!currentUser) {
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

    await prisma.user.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      code: 0,
      data: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '删除用户失败',
      },
      {
        status: 500,
      },
    );
  }
}
