import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const currentUser = await requireAdminUser();

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return apiError('旧密码和新密码不能为空', 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return apiError('新密码长度不能少于 6 位', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return apiError('用户不存在', 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return apiError('旧密码不正确', 400);
    }

    if (oldPassword === newPassword) {
      return apiError('新密码不能与旧密码相同', 400);
    }

    // 改密时 authVersion +1，使其它设备上的旧会话立即失效
    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        authVersion: { increment: 1 },
      },
      select: { authVersion: true },
    });

    writeAuditLog({
      actorId: currentUser.id,
      actorUsername: currentUser.username,
      action: 'user.password_change',
      targetType: 'user',
      targetId: currentUser.id,
      targetLabel: currentUser.username,
    });

    // 用最新 authVersion 给当前设备重新签发会话，避免改密后把自己也登出
    const response = apiSuccess(null, '密码修改成功');
    const sessionToken = await createAdminSessionToken({
      userId: currentUser.id,
      username: currentUser.username,
      nickname: currentUser.nickname ?? currentUser.username,
      role: currentUser.role,
      authVersion: updated.authVersion,
    });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionToken,
      getAdminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return handleApiError(error, '修改密码失败', 'POST /api/profile/password error');
  }
}
