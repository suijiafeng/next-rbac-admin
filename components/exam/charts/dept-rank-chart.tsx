'use client';

import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { summarizeRanking } from '@/lib/exam/dashboard';
import { selectRanking, useExamDashboardStore } from '@/lib/exam/dashboard-store';
import { useTheme } from '@/components/providers/ThemeProvider';
import { readChartInk } from '@/lib/chart-ink';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const { Text } = Typography;

export default function DeptRankChart() {
  const ranking = useExamDashboardStore(selectRanking);
  const { resolved } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ink = readChartInk();
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: [ink.rank],
      tooltip: { trigger: 'axis', backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } },
      grid: { left: 72, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'value', min: 0, max: 100, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: ink.grid, type: 'dashed' } }, axisLabel: { color: ink.muted, fontSize: 11 } },
      yAxis: { type: 'category', data: ranking.map((bar) => bar.department).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink.muted, fontSize: 11 } },
      series: [{ type: 'bar', data: ranking.map((bar) => bar.average).reverse(), name: '部门均分', itemStyle: { borderRadius: [0, 2, 2, 0] } }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [ranking, resolved]);

  return (
    <div>
      <div ref={ref} data-testid="chart-rank" style={{ height: 260 }} />
      <Text type="secondary" data-testid="chart-rank-summary">{summarizeRanking(ranking)}</Text>
    </div>
  );
}
