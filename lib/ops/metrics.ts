export type OpsRange = '7d' | '30d' | '90d';
export type OpsView = 'finance' | 'business' | 'staff';

export interface OpsSnapshot {
  range: OpsRange;
  view: OpsView;
  dataSource: '演示数据';
  finance: { revenue: number; cost: number };
  business: { orders: number; conversion: number };
  staff: { headcount: number; attendance: number };
}

const TABLE: Record<OpsRange, Omit<OpsSnapshot, 'range' | 'view' | 'dataSource'>> = {
  '7d': {
    finance: { revenue: 12000, cost: 7000 },
    business: { orders: 80, conversion: 12 },
    staff: { headcount: 6, attendance: 98 },
  },
  '30d': {
    finance: { revenue: 48000, cost: 26000 },
    business: { orders: 320, conversion: 18 },
    staff: { headcount: 6, attendance: 95 },
  },
  '90d': {
    finance: { revenue: 120000, cost: 64000 },
    business: { orders: 900, conversion: 21 },
    staff: { headcount: 8, attendance: 93 },
  },
};

export function parseOpsRange(value?: string | null): OpsRange {
  if (value === '7d' || value === '90d') return value;
  return '30d';
}

export function parseOpsView(value?: string | null): OpsView {
  if (value === 'business' || value === 'staff') return value;
  return 'finance';
}

/** 按 URL 上的统计范围给出整屏指标。这些数字是手写演示值。 */
export function opsSnapshot(range: OpsRange, view: OpsView): OpsSnapshot {
  return {
    range,
    view,
    dataSource: '演示数据',
    ...TABLE[range],
  };
}
