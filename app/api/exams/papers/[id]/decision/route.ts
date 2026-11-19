import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';
import { permissionForActor, requireExamActor } from '@/lib/exam/guard';
import { canPerform, nextPaperStatus, permissionForAction } from '@/lib/exam/permissions';
import { presentPaper } from '@/lib/exam/present';
import { getExamPaper, updateExamPaperStatus } from '@/lib/exam/repository';
import { requirePermission } from '@/lib/permission';
import type { ExamAction } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

const AUDIT_ACTION = {
  submitReview: 'exam.submit',
  withdraw: 'exam.withdraw',
  approve: 'exam.approve',
  reject: 'exam.reject',
} as const;

type StatusAction = keyof typeof AUDIT_ACTION;

function isStatusAction(action: string): action is StatusAction {
  return action === 'submitReview' || action === 'withdraw' || action === 'approve' || action === 'reject';
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const actorAuth = await requireExamActor();
    const body = (await request.json()) as { action?: ExamAction };
    const action = body.action;
    if (!action) return apiError('不支持的操作', 400);
    if (action === 'edit') {
      await requirePermission(permissionForAction(action));
      return apiError('演示数据不支持修改题目正文，只能走审批状态', 400);
    }
    if (action === 'take') {
      return apiError('作答请走交卷接口', 400);
    }
    if (!isStatusAction(action)) {
      return apiError('不支持的操作', 400);
    }

    await requirePermission(permissionForAction(action));
    await requirePermission(permissionForActor(actorAuth.actor));

    const paper = await getExamPaper(context.params.id);
    if (!paper) return apiError('试卷不存在', 404);

    const isOwner = paper.authorUsername === actorAuth.user.username;
    if (!canPerform(actorAuth.actor, paper.status, action, isOwner)) {
      return apiError('当前角色在该审批状态下不能执行此操作', 403);
    }

    const status = nextPaperStatus(action, paper.status);
    if (!status) return apiError('状态不能这样流转', 400);

    const updated = await updateExamPaperStatus(paper.id, status);
    if (!updated) return apiError('试卷不存在', 404);

    await writeAuditLog({
      actorId: actorAuth.user.id,
      actorUsername: actorAuth.user.username,
      action: AUDIT_ACTION[action],
      targetType: 'exam',
      targetId: paper.id,
      targetLabel: paper.title,
      detail: { from: paper.status, to: status, dataSource: DEMO_DATA_LABEL },
    });

    return apiSuccess(
      {
        dataSource: DEMO_DATA_LABEL,
        paper: presentPaper(updated, actorAuth.actor, actorAuth.user.username),
      },
      action === 'approve' ? '已通过' : action === 'reject' ? '已驳回' : '已更新',
    );
  } catch (error) {
    return handleApiError(error, '审批操作失败', 'POST /api/exams/papers/[id]/decision error');
  }
}
