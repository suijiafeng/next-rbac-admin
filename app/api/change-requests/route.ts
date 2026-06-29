import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permission';
import { PERMISSIONS, Role } from '@/constants/permission';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { parsePagination } from '@/lib/pagination';
import { resolveRoleFromNames } from '@/lib/user-role';
import { writeAuditLog } from '@/lib/audit-log';
import { evalRoleChangeRisks, roleLabel } from '@/lib/governance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user: actor, role } = await requirePermission(PERMISSIONS.CHANGE_VIEW);

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      defaultPageSize: 20,
      maxPageSize: 200,
    });
    const scope = searchParams.get('scope') || 'todo'; // todo（待审批）| mine（我发起的）
    const status = searchParams.get('status') || '';

    // 审批权限只授予超级管理员
    const canApprove = role === Role.SUPER_ADMIN;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // 没有审批权限的人，或显式查看"我发起的"，都只能看到自己提交的请求
    if (scope === 'mine' || !canApprove) {
      where.requesterId = actor.id;
    } else if (scope === 'todo') {
      where.status = 'PENDING';
    }

    const [list, total] = await Promise.all([
      prisma.changeRequest.findMany({ where, orderBy: { id: 'desc' }, skip, take }),
      prisma.changeRequest.count({ where }),
    ]);

    return apiSuccess({ list, total, page, pageSize, canApprove });
  } catch (error) {
    return handleApiError(error, '获取变更请求失败', 'GET /api/change-requests error');
  }
}

export async function POST(request: Request) {
  try {
    const { user: actor } = await requirePermission(PERMISSIONS.CHANGE_SUBMIT);

    const body = await request.json();
    const { type, targetUserId, toRole, reason } = body as {
      type?: string;
      targetUserId?: number;
      toRole?: string;
      reason?: string;
    };

    if (type !== 'ASSIGN_ROLE') {
      return apiError('暂不支持的变更类型', 400);
    }
    if (!targetUserId || !['ADMIN', 'USER'].includes(toRole || '')) {
      return apiError('参数不合法：目标用户必填，目标角色仅支持 ADMIN / USER', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      select: {
        id: true,
        username: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!target) {
      return apiError('目标用户不存在', 404);
    }

    const fromRole = resolveRoleFromNames(target.userRoles.map((ur) => ur.role.name));
    if (fromRole === 'SUPER_ADMIN') {
      return apiError('不能变更超级管理员的角色', 403);
    }
    if (fromRole === toRole) {
      return apiError(`该用户已经是${roleLabel(toRole as string)}`, 400);
    }

    const risks = evalRoleChangeRisks({ fromRole, toRole: toRole as string });

    const changeRequest = await prisma.changeRequest.create({
      data: {
        type: 'ASSIGN_ROLE',
        status: 'PENDING',
        targetUserId: target.id,
        targetUsername: target.username,
        fromRole,
        toRole: toRole as string,
        reason: reason || null,
        risks: risks.length ? JSON.stringify(risks) : null,
        requesterId: actor.id,
        requesterUsername: actor.username,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'change.submit',
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
      detail: { from: fromRole, to: toRole, changeRequestId: changeRequest.id },
    });

    return apiSuccess(changeRequest, '已提交审批');
  } catch (error) {
    return handleApiError(error, '提交变更请求失败', 'POST /api/change-requests error');
  }
}
