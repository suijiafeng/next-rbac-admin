import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { validateAnswers } from '@/lib/exam/answers';
import { requireExamActor } from '@/lib/exam/guard';
import { getExamPaper, saveExamAttempt } from '@/lib/exam/repository';
import { gradePaper } from '@/lib/exam/score';
import { PERMISSIONS } from '@/constants/permission';
import { requirePermission } from '@/lib/permission';
import type { AnswerMap } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actorAuth = await requireExamActor();
    await requirePermission(PERMISSIONS.EXAM_TAKE);
    if (actorAuth.actor !== 'learner') {
      return apiError('只有学员可以交卷', 403);
    }

    const body = (await request.json()) as { paperId?: string; answers?: AnswerMap };
    if (!body.paperId || !body.answers || typeof body.answers !== 'object') {
      return apiError('参数不合法', 400);
    }

    const paper = await getExamPaper(body.paperId);
    if (!paper) return apiError('试卷不存在', 404);
    if (paper.status !== 'APPROVED') return apiError('试卷未发布，不能作答', 403);

    const validation = validateAnswers(paper.questions, body.answers);
    if (!validation.ok) {
      return apiError('还有题目未作答', 400);
    }

    const grade = gradePaper(paper, body.answers);
    await saveExamAttempt({
      paper,
      username: actorAuth.user.username,
      answers: body.answers,
      grade,
    });
    return apiSuccess({ dataSource: DEMO_DATA_LABEL, grade }, grade.passed ? '已通过' : '未通过');
  } catch (error) {
    return handleApiError(error, '交卷失败', 'POST /api/exams/attempts error');
  }
}
