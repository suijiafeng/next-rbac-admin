import { PERMISSIONS } from '@/constants/permission';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import {
  buildDistribution,
  buildRanking,
  buildTrend,
  filterAttempts,
  parseDashboardFilter,
} from '@/lib/exam/dashboard';
import { listExamAttempts } from '@/lib/exam/repository';
import { requirePermission } from '@/lib/permission';
import { DEMO_CLOCK, DEMO_DATA_LABEL } from '@/lib/exam/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.EXAM_STATS);
    const { searchParams } = new URL(request.url);
    const filter = parseDashboardFilter({
      range: searchParams.get('range'),
      department: searchParams.get('department'),
      paperId: searchParams.get('paperId'),
    });
    const records = await listExamAttempts();
    const filtered = filterAttempts(records, filter, DEMO_CLOCK);
    return apiSuccess({
      dataSource: DEMO_DATA_LABEL,
      clock: DEMO_CLOCK,
      filter,
      records,
      trend: buildTrend(filtered),
      ranking: buildRanking(filtered),
      distribution: buildDistribution(filtered),
    });
  } catch (error) {
    return handleApiError(error, '获取考试看板失败', 'GET /api/exams/stats error');
  }
}
