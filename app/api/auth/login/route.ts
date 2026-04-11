import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from '@/lib/session';
import { getPermissionsByRole, type Role } from '@/lib/permission';
import { resolveRoleFromNames } from '@/lib/user-role';
import { apiError } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError('用户名和密码不能为空', 400);
    }

    const adminUser = await prisma.user.findFirst({
      where: { username },
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

    if (!adminUser || !adminUser.password) {
      return apiError('用户名或密码错误', 401);
    }

    if (adminUser.status !== 1) {
      return apiError('账号待审核，请联系管理员', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      return apiError('用户名或密码错误', 401);
    }

    const role = resolveRoleFromNames(adminUser.userRoles.map((item) => item.role.name)) as Role;
    const permissions = getPermissionsByRole(role);

    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });
    if (maintenanceSetting?.value === 'true' && role !== 'SUPER_ADMIN') {
      return apiError('系统处于维护模式，仅超级管理员可登录', 503);
    }

    const response = NextResponse.json({
      code: 0,
      data: {
        id: adminUser.id,
        username: adminUser.username,
        nickname: adminUser.nickname,
        role,
        permissions,
      },
      message: '登录成功',
    });

    const sessionToken = await createAdminSessionToken({
      userId: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname ?? adminUser.username,
      role,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionToken,
      getAdminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);

    return apiError('登录失败', 500);
  }
}
