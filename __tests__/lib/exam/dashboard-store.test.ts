import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_ATTEMPTS } from '@/lib/exam/demo-data';
import { DEFAULT_DASHBOARD_FILTER } from '@/lib/exam/dashboard';
import {
  selectDistribution,
  selectRanking,
  selectTrend,
  useExamDashboardStore,
} from '@/lib/exam/dashboard-store';

beforeEach(() => {
  useExamDashboardStore.setState({
    filter: { ...DEFAULT_DASHBOARD_FILTER },
    records: [],
    ready: false,
  });
});

describe('看板筛选与三图 selector', () => {
  it('切换部门后趋势、排名、积分分布一起变', () => {
    useExamDashboardStore.getState().setRecords(DEMO_ATTEMPTS);
    const before = useExamDashboardStore.getState();
    const trend = selectTrend(before);
    const ranking = selectRanking(before);
    const distribution = selectDistribution(before);

    useExamDashboardStore.getState().setFilter({ department: '演示部门乙' });
    const after = useExamDashboardStore.getState();
    expect(selectTrend(after)).not.toEqual(trend);
    expect(selectRanking(after)).not.toEqual(ranking);
    expect(selectDistribution(after)).not.toEqual(distribution);
    expect(selectRanking(after)).toEqual([{ department: '演示部门乙', average: 48, count: 3 }]);
    expect(selectDistribution(after)).toEqual([
      { bucket: '0-59', count: 3 },
      { bucket: '60-79', count: 0 },
      { bucket: '80-100', count: 0 },
    ]);
  });

  it('同一筛选重复读取 selector 时结果引用保持稳定', () => {
    useExamDashboardStore.getState().setRecords(DEMO_ATTEMPTS);
    const state = useExamDashboardStore.getState();
    expect(selectTrend(state)).toBe(selectTrend(state));
  });
});
