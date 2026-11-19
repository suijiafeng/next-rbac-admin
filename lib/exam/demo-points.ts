import type { PointsEntry } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

/** 积分页的历史流水。虚构演示数据，不是真实积分。 */
export const DEMO_POINTS_LEDGER: PointsEntry[] = [
  {
    id: 'demo-points-1',
    title: '演示记录 · 历史小测 A',
    delta: 20,
    at: '2026-10-02T08:00:00.000Z',
    dataSource: DEMO_DATA_LABEL,
  },
  {
    id: 'demo-points-2',
    title: '演示记录 · 历史小测 B',
    delta: 15,
    at: '2026-10-18T08:00:00.000Z',
    dataSource: DEMO_DATA_LABEL,
  },
];
