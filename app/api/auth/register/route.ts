import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { apiError, apiSuccess } from '@/lib/api-response';
import {
  isLockedOut,
  recordFailedAttempt,
  LOCKOUT_DURATION_MINUTES,
} from '@/lib/login-attempt';

/** 同一 IP 在锁定窗口内最多尝试注册的次数（宽松，避免共享 IP 误伤） */
const REGISTER_MAX_ATTEMPTS_IP = 30;
/** 同一设备令牌在锁定窗口内最多尝试注册的次数（精准，针对单一设备） */
const REGISTER_MAX_ATTEMPTS_DEVICE = 10;

/** UUID v4 格式校验，防止攻击者注入任意字符串作为 key */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `register_ip:${ip}`;
}

function getDeviceKey(request: NextRequest): string | null {
  const token = request.headers.get('x-device-token');
  if (token && UUID_REGEX.test(token)) {
    return `register_dev:${token}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const ipKey = getClientIp(request);
    const deviceKey = getDeviceKey(request);

    // IP 维度检查（宽松阈值，减少共享 IP 误伤）
    if (await isLockedOut(ipKey, REGISTER_MAX_ATTEMPTS_IP)) {
      return apiError(
        `注册请求过于频繁，请 ${LOCKOUT_DURATION_MINUTES} 分钟后再试`,
        429,
      );
    }

    // 设备维度检查（精准阈值，仅当请求携带合法设备令牌时生效）
    if (deviceKey && await isLockedOut(deviceKey, REGISTER_MAX_ATTEMPTS_DEVICE)) {
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
      return apiError('用户名、昵称和密码不能为空', 400);
    }

    if (password !== confirmPassword) {
      return apiError('两次输入的密码不一致', 400);
    }

    if (password.length < 6) {
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
      // 用户名/邮箱已存在才计入失败次数，同时更新 IP 和设备两个维度
      await Promise.all([
        recordFailedAttempt(ipKey),
        deviceKey ? recordFailedAttempt(deviceKey) : Promise.resolve(),
      ]);
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
