'use client';

import { Suspense, lazy } from 'react';
import type { OpsSnapshot, OpsView } from '@/lib/ops/metrics';

const FinanceCharts = lazy(() => import('@/components/ops/finance-charts'));
const BusinessCharts = lazy(() => import('@/components/ops/business-charts'));
const StaffCharts = lazy(() => import('@/components/ops/staff-charts'));

export default function OpsCharts({ snapshot }: { snapshot: OpsSnapshot }) {
  const view: OpsView = snapshot.view;
  return (
    <Suspense fallback={<p data-testid="ops-chart-fallback">图表按当前视图加载</p>}>
      {view === 'finance' && (
        <FinanceCharts range={snapshot.range} revenue={snapshot.finance.revenue} cost={snapshot.finance.cost} />
      )}
      {view === 'business' && (
        <BusinessCharts range={snapshot.range} orders={snapshot.business.orders} conversion={snapshot.business.conversion} />
      )}
      {view === 'staff' && (
        <StaffCharts range={snapshot.range} headcount={snapshot.staff.headcount} attendance={snapshot.staff.attendance} />
      )}
    </Suspense>
  );
}
