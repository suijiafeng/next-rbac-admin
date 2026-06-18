import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { Role } from '@/constants/permission';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { generateInitialPassword } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireRole([Role.SUPER_ADMIN]);
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    if (id === currentUser.id) {
      return apiError('不能重置自己的密码，请使用"修改密码"', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, nickname: true },
    });
    if (!target) {
      return apiError('用户不存在', 404);
    }

    const temporaryPassword = generateInitialPassword();

    await prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(temporaryPassword, 10),
        authVersion: { increment: 1 },
      },
    });

    await writeAuditLog({
      actorId: currentUser.id,
      actorUsername: currentUser.username,
      action: 'user.reset_password',
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
    });

    return apiSuccess({ defaultPassword: temporaryPassword }, '密码已重置，请将临时密码告知用户');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '无权限') {
        return apiError('无权限，仅超级管理员可操作', 403);
      }
    }
    return handleApiError(error, '重置密码失败', 'POST /api/users/[id]/password/reset error');
  }
}
