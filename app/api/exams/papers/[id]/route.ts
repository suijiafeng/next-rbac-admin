import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { permissionForActor, requireExamActor } from '@/lib/exam/guard';
import { presentPaper } from '@/lib/exam/present';
import { getExamPaper } from '@/lib/exam/repository';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const actorAuth = await requireExamActor();
    await requirePermission(permissionForActor(actorAuth.actor));
    const paper = await getExamPaper(context.params.id);
    if (!paper) return apiError('试卷不存在', 404);
    if (actorAuth.actor === 'learner' && paper.status !== 'APPROVED') {
      return apiError('无权限', 403);
    }
    if (actorAuth.actor === 'author' && paper.authorUsername !== actorAuth.user.username) {
      return apiError('无权限', 403);
    }
    return apiSuccess({
      dataSource: DEMO_DATA_LABEL,
      paper: presentPaper(paper, actorAuth.actor, actorAuth.user.username),
    });
  } catch (error) {
    return handleApiError(error, '获取试卷失败', 'GET /api/exams/papers/[id] error');
  }
}
