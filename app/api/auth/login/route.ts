import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '用户名和密码不能为空',
        },
        {
          status: 400,
        },
      );
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        username,
        status: 1,
      },
    });
    if (!adminUser || !adminUser.password) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '该用户不存在',
        },
        {
          status: 401,
        },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          code: 1,
          data: null,
          message: '用户名或密码错误',
        },
        {
          status: 401,
        },
      );
    }

    const response = NextResponse.json({
      code: 0,
      data: {
        id: adminUser.id,
        username: adminUser.username,
        nickname: adminUser.nickname,
        role: adminUser.role,
      },
      message: '登录成功',
    });
    const sessionToken = await createAdminSessionToken({
      userId: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname,
      role: adminUser.role,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionToken,
      getAdminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);

    return NextResponse.json(
      {
        code: 1,
        data: null,
        message: '登录失败',
      },
      {
        status: 500,
      },
    );
  }
}
