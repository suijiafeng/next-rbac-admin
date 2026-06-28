import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { apiError, apiSuccess } from '@/lib/api-response';
import {
  isLockedOut,
  recordFailedAttempt,
  LOCKOUT_DURATION_MINUTES,
} from '@/lib/login-attempt';

/** 同一 IP 在锁定窗口内最多尝试注册的次数 */
const REGISTER_MAX_ATTEMPTS = 10;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `register_ip:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    // IP 频率限制：同一 IP 10 次/15 分钟
    const ipKey = getClientIp(request);
    if (await isLockedOut(ipKey, REGISTER_MAX_ATTEMPTS)) {
      return apiError(
        `注册请求过于频繁，请 ${LOCKOUT_DURATION_MINUTES} 分钟后再试`,
        429,
      );
    }

    // 检查系统是否开放注册
    const allowRegisterSetting = await prisma.systemSetting.findUnique({
      where: { key: 'allow_register' },
    });
    const allowRegister = allowRegisterSetting?.value === 'true';

    if (!allowRegister) {
      return apiError('当前系统未开放注册，请联系管理员', 403);
    }

    const body = await request.json();
    const { username, nickname, password, confirmPassword, email } = body;

    if (!username || !nickname || !password) {
      await recordFailedAttempt(ipKey);
      return apiError('用户名、昵称和密码不能为空', 400);
    }

    if (password !== confirmPassword) {
      await recordFailedAttempt(ipKey);
      return apiError('两次输入的密码不一致', 400);
    }

    if (password.length < 6) {
      await recordFailedAttempt(ipKey);
      return apiError('密码长度不能少于 6 位', 400);
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
      await recordFailedAttempt(ipKey);
      return apiError('用户名或邮箱已存在', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      return apiError('默认用户角色不存在', 500);
    }

    // 新注册用户默认 status: 0，等待管理员审核后启用
    const user = await prisma.user.create({
      data: {
        username,
        nickname,
        email: email || null,
        password: hashedPassword,
        status: 0,
        userRoles: {
          create: {
            roleId: userRole.id,
          },
        },
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
      },
    });

    return apiSuccess(user, '注册成功，请等待管理员审核');
  } catch (error) {
    console.error('POST /api/auth/register error:', error);

    return apiError('注册失败，请稍后重试', 500);
  }
}
