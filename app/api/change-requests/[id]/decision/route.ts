import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { roleLabel } from '@/lib/governance';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

/**
 * 应用一次角色变更：删除目标用户现有的 ADMIN/USER 角色，再 upsert 目标角色。
 * 复刻项目原有 PATCH /api/users/[id]/role 的事务写法，仅在"审批通过"时调用。
 */
async function applyRoleAssignment(userId: number, roleName: 'ADMIN' | 'USER') {
  const targetRole = await prisma.role.findUnique({ where: { name: roleName } });
  if (!targetRole) {
    throw new Error('目标角色不存在');
  }
  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { userId, role: { name: { in: ['ADMIN', 'USER'] } } },
    }),
    prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: targetRole.id } },
      update: {},
      create: { userId, roleId: targetRole.id },
    }),
  ]);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.CHANGE_APPROVE);

    const id = Number(context.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return apiError('变更 ID 不合法', 400);
    }

    const body = await request.json();
    const decision = body?.decision as 'approve' | 'reject';
    if (!['approve', 'reject'].includes(decision)) {
      return apiError('decision 只能是 approve 或 reject', 400);
    }

    const cr = await prisma.changeRequest.findUnique({ where: { id } });
    if (!cr) {
      return apiError('变更请求不存在', 404);
    }
    if (cr.status !== 'PENDING') {
      return apiError('该变更请求已处理', 409);
    }

    if (decision === 'reject') {
      await prisma.changeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decidedById: actor.id,
          decidedByUsername: actor.username,
          decidedAt: new Date(),
        },
      });
      await writeAuditLog({
        actorId: actor.id,
        actorUsername: actor.username,
        action: 'change.reject',
        targetType: 'user',
        targetId: cr.targetUserId,
        targetLabel: cr.targetUsername,
        detail: { from: cr.fromRole, to: cr.toRole, changeRequestId: cr.id },
      });
      return apiSuccess(true, '已驳回');
    }

    // approve：先应用变更，再标记状态并留痕
    if (cr.type === 'ASSIGN_ROLE' && (cr.toRole === 'ADMIN' || cr.toRole === 'USER')) {
      await applyRoleAssignment(cr.targetUserId, cr.toRole);
    }
    await prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decidedById: actor.id,
        decidedByUsername: actor.username,
        decidedAt: new Date(),
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'change.approve',
      targetType: 'user',
      targetId: cr.targetUserId,
      targetLabel: cr.targetUsername,
      detail: { from: cr.fromRole, to: cr.toRole, changeRequestId: cr.id },
    });

    return apiSuccess(true, `已通过并生效：${cr.targetUsername} → ${roleLabel(cr.toRole)}`);
  } catch (error) {
    return handleApiError(error, '处理审批失败', 'POST /api/change-requests/[id]/decision error');
  }
}
