import { apiSuccess, handleApiError } from '@/lib/api-response';
import { papersForActor } from '@/lib/exam/present';
import { permissionForActor, requireExamActor } from '@/lib/exam/guard';
import { listExamPapers } from '@/lib/exam/repository';
import { requirePermission } from '@/lib/permission';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actorAuth = await requireExamActor();
    await requirePermission(permissionForActor(actorAuth.actor));
    const papers = papersForActor(await listExamPapers(), actorAuth.actor, actorAuth.user.username);
    return apiSuccess({
      dataSource: DEMO_DATA_LABEL,
      actor: actorAuth.actor,
      list: papers,
    });
  } catch (error) {
    return handleApiError(error, '获取试卷失败', 'GET /api/exams/papers error');
  }
}
