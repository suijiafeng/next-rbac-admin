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
import {
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
  LOCKOUT_DURATION_MINUTES,
} from '@/lib/login-attempt';

const DEFAULT_MAX_ATTEMPTS = 5;

function parseMaxAttempts(settingValue: string | undefined): number {
  const parsed = Number(settingValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError('用户名和密码不能为空', 400);
    }

    // 读取系统设置中的最大登录尝试次数
    const attemptsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'max_login_attempts' },
    });
    const maxAttempts = parseMaxAttempts(attemptsSetting?.value);

    // 检查是否已被锁定
    if (isLockedOut(username, maxAttempts)) {
      return apiError(
        `登录失败次数过多，请 ${LOCKOUT_DURATION_MINUTES} 分钟后再试`,
        429,
      );
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
      recordFailedAttempt(username);
      return apiError('用户名或密码错误', 401);
    }

    if (adminUser.status !== 1) {
      return apiError('账号待审核，请联系管理员', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      recordFailedAttempt(username);
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

    const sessionDurationSetting = await prisma.systemSetting.findUnique({
      where: { key: 'session_duration' },
    });
    const sessionDurationDays = Number(sessionDurationSetting?.value) || 7;
    const sessionMaxAge = sessionDurationDays * 24 * 60 * 60;

    // 登录成功，重置失败计数
    resetAttempts(username);

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

    const sessionToken = await createAdminSessionToken(
      {
        userId: adminUser.id,
        username: adminUser.username,
        nickname: adminUser.nickname ?? adminUser.username,
        role,
      },
      sessionMaxAge,
    );

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionToken,
      getAdminSessionCookieOptions(sessionMaxAge),
    );

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);

    return apiError('登录失败', 500);
  }
}
