'use client';

import { create } from 'zustand';
import {
  buildDistribution,
  buildRanking,
  buildTrend,
  DEFAULT_DASHBOARD_FILTER,
  filterAttempts,
} from '@/lib/exam/dashboard';
import type {
  DashboardFilter,
  DemoAttemptRecord,
  DistSlice,
  RankBar,
  TrendPoint,
} from '@/lib/exam/types';

export interface ExamDashboardState {
  filter: DashboardFilter;
  records: DemoAttemptRecord[];
  ready: boolean;
  setFilter: (patch: Partial<DashboardFilter>) => void;
  setRecords: (records: DemoAttemptRecord[]) => void;
}

export const useExamDashboardStore = create<ExamDashboardState>((set) => ({
  filter: DEFAULT_DASHBOARD_FILTER,
  records: [],
  ready: false,
  setFilter: (patch) => set((state) => ({ filter: { ...state.filter, ...patch } })),
  setRecords: (records) => set({ records, ready: true }),
}));

function filtered(state: ExamDashboardState): DemoAttemptRecord[] {
  return filterAttempts(state.records, state.filter);
}

export function selectFilter(state: ExamDashboardState): DashboardFilter {
  return state.filter;
}

/**
 * selector 按 records + filter 的引用缓存派生结果。
 * 筛选对象没变时返回同一份数组，避免 useSyncExternalStore 因新引用反复渲染。
 */
function cachedDerive<T>(
  cache: { records?: DemoAttemptRecord[]; filter?: DashboardFilter; value?: T },
  state: ExamDashboardState,
  build: (rows: DemoAttemptRecord[]) => T,
): T {
  if (cache.records === state.records && cache.filter === state.filter && cache.value !== undefined) {
    return cache.value;
  }
  const value = build(filtered(state));
  cache.records = state.records;
  cache.filter = state.filter;
  cache.value = value;
  return value;
}

const trendCache: { records?: DemoAttemptRecord[]; filter?: DashboardFilter; value?: TrendPoint[] } = {};
const rankingCache: { records?: DemoAttemptRecord[]; filter?: DashboardFilter; value?: RankBar[] } = {};
const distributionCache: { records?: DemoAttemptRecord[]; filter?: DashboardFilter; value?: DistSlice[] } = {};

export function selectTrend(state: ExamDashboardState): TrendPoint[] {
  return cachedDerive(trendCache, state, buildTrend);
}

export function selectRanking(state: ExamDashboardState): RankBar[] {
  return cachedDerive(rankingCache, state, buildRanking);
}

export function selectDistribution(state: ExamDashboardState): DistSlice[] {
  return cachedDerive(distributionCache, state, buildDistribution);
}
