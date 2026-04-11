import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permission';
import { writeAuditLog } from '@/lib/audit-log';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const DEFAULT_PASSWORD = '123456';

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireRole(['SUPER_ADMIN']);
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return apiError('用户 ID 不合法', 400);
    }

    if (id === currentUser.id) {
      return apiError('不能重置自己的密码，请使用“修改密码”', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, nickname: true },
    });
    if (!target) {
      return apiError('用户不存在', 404);
    }

    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(DEFAULT_PASSWORD, 10) },
    });

    await writeAuditLog({
      actorId: currentUser.id,
      actorUsername: currentUser.username,
      action: 'user.reset_password',
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
    });

    return apiSuccess({ defaultPassword: DEFAULT_PASSWORD }, '密码已重置为默认密码');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '无权限') {
        return apiError('无权限，仅超级管理员可操作', 403);
      }
    }
    return handleApiError(error, '重置密码失败', 'POST /api/users/[id]/password/reset error');
  }
}
