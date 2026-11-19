import type {
  DashboardFilter,
  DashboardRange,
  DemoAttemptRecord,
  DistSlice,
  RankBar,
  TrendPoint,
} from '@/lib/exam/types';
import { DEMO_CLOCK } from '@/lib/exam/types';

const RANGE_DAYS: Record<DashboardRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export const DEFAULT_DASHBOARD_FILTER: DashboardFilter = {
  range: '30d',
  department: 'all',
  paperId: 'all',
};

export function parseDashboardFilter(input: {
  range?: string | null;
  department?: string | null;
  paperId?: string | null;
}): DashboardFilter {
  const range: DashboardRange = input.range === '7d' || input.range === '90d' ? input.range : '30d';
  return {
    range,
    department: input.department && input.department !== 'all' ? input.department : 'all',
    paperId: input.paperId && input.paperId !== 'all' ? input.paperId : 'all',
  };
}

export function filterAttempts(
  records: DemoAttemptRecord[],
  filter: DashboardFilter,
  clock: string = DEMO_CLOCK,
): DemoAttemptRecord[] {
  const end = Date.parse(clock);
  const start = end - RANGE_DAYS[filter.range] * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const at = Date.parse(record.submittedAt);
    if (Number.isNaN(at) || at < start || at > end) return false;
    if (filter.department !== 'all' && record.department !== filter.department) return false;
    if (filter.paperId !== 'all' && record.paperId !== filter.paperId) return false;
    return true;
  });
}

export function buildTrend(records: DemoAttemptRecord[]): TrendPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  records.forEach((record) => {
    const date = record.submittedAt.slice(0, 10);
    const current = buckets.get(date) ?? { sum: 0, count: 0 };
    current.sum += record.score;
    current.count += 1;
    buckets.set(date, current);
  });
  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      average: Math.round(bucket.sum / bucket.count),
      count: bucket.count,
    }));
}

export function buildRanking(records: DemoAttemptRecord[]): RankBar[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  records.forEach((record) => {
    const current = buckets.get(record.department) ?? { sum: 0, count: 0 };
    current.sum += record.score;
    current.count += 1;
    buckets.set(record.department, current);
  });
  return Array.from(buckets.entries())
    .map(([department, bucket]) => ({
      department,
      average: Math.round(bucket.sum / bucket.count),
      count: bucket.count,
    }))
    .sort((left, right) => right.average - left.average || left.department.localeCompare(right.department));
}

const DIST_BUCKETS = [
  { bucket: '0-59', match: (points: number) => points < 60 },
  { bucket: '60-79', match: (points: number) => points >= 60 && points < 80 },
  { bucket: '80-100', match: (points: number) => points >= 80 },
];

export function buildDistribution(records: DemoAttemptRecord[]): DistSlice[] {
  return DIST_BUCKETS.map((bucket) => ({
    bucket: bucket.bucket,
    count: records.filter((record) => bucket.match(record.points)).length,
  }));
}

export function summarizeTrend(points: TrendPoint[]): string {
  if (points.length === 0) return '样本 0';
  const count = points.reduce((sum, point) => sum + point.count, 0);
  const weighted = points.reduce((sum, point) => sum + point.average * point.count, 0);
  return `样本 ${count} · 均分 ${Math.round(weighted / count)}`;
}

export function summarizeRanking(bars: RankBar[]): string {
  if (bars.length === 0) return '样本 0';
  return bars.map((bar) => `${bar.department} ${bar.average}`).join(' / ');
}

export function summarizeDistribution(slices: DistSlice[]): string {
  return slices.map((slice) => `${slice.bucket}:${slice.count}`).join(' · ');
}
