'use client';

import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { summarizeDistribution } from '@/lib/exam/dashboard';
import { selectDistribution, useExamDashboardStore } from '@/lib/exam/dashboard-store';
import { useTheme } from '@/components/providers/ThemeProvider';
import { readChartInk } from '@/lib/chart-ink';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const { Text } = Typography;

export default function PointsDistChart() {
  const distribution = useExamDashboardStore(selectDistribution);
  const { resolved } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ink = readChartInk();
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: ink.ramp,
      tooltip: { trigger: 'item', backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } },
      legend: { bottom: 0, textStyle: { color: ink.muted, fontSize: 12 } },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          data: distribution.map((slice) => ({ name: slice.bucket, value: slice.count })),
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [distribution, resolved]);

  return (
    <div>
      <div ref={ref} data-testid="chart-dist" style={{ height: 260 }} />
      <Text type="secondary" data-testid="chart-dist-summary">{summarizeDistribution(distribution)}</Text>
    </div>
  );
}
