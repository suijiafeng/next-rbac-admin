'use client';

import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { summarizeRanking } from '@/lib/exam/dashboard';
import { selectRanking, useExamDashboardStore } from '@/lib/exam/dashboard-store';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const { Text } = Typography;

export default function DeptRankChart() {
  const ranking = useExamDashboardStore(selectRanking);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: ['#69b1ff'],
      tooltip: { trigger: 'axis' },
      grid: { left: 72, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'value', min: 0, max: 100 },
      yAxis: { type: 'category', data: ranking.map((bar) => bar.department).reverse() },
      series: [{ type: 'bar', data: ranking.map((bar) => bar.average).reverse(), name: '部门均分' }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [ranking]);

  return (
    <div>
      <div ref={ref} data-testid="chart-rank" style={{ height: 260 }} />
      <Text type="secondary" data-testid="chart-rank-summary">{summarizeRanking(ranking)}</Text>
    </div>
  );
}
