'use client';

import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { summarizeTrend } from '@/lib/exam/dashboard';
import { selectTrend, useExamDashboardStore } from '@/lib/exam/dashboard-store';
import { useTheme } from '@/components/providers/ThemeProvider';
import { readChartInk } from '@/lib/chart-ink';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const { Text } = Typography;

export default function ScoreTrendChart() {
  const trend = useExamDashboardStore(selectTrend);
  const { resolved } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ink = readChartInk();
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: [ink.ink],
      tooltip: { trigger: 'axis', backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } },
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: trend.map((point) => point.date.slice(5)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink.muted, fontSize: 11 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: ink.grid, type: 'dashed' } }, axisLabel: { color: ink.muted, fontSize: 11 } },
      series: [{ type: 'line', smooth: false, symbol: 'none', lineStyle: { width: 1.5 }, data: trend.map((point) => point.average), name: '均分' }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [resolved, trend]);

  return (
    <div>
      <div ref={ref} data-testid="chart-trend" style={{ height: 260 }} />
      <Text type="secondary" data-testid="chart-trend-summary">{summarizeTrend(trend)}</Text>
    </div>
  );
}
