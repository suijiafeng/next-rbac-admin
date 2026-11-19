'use client';

import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { summarizeDistribution } from '@/lib/exam/dashboard';
import { selectDistribution, useExamDashboardStore } from '@/lib/exam/dashboard-store';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const { Text } = Typography;

export default function PointsDistChart() {
  const distribution = useExamDashboardStore(selectDistribution);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      color: ['#ff7875', '#ffc53d', '#95de64'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
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
  }, [distribution]);

  return (
    <div>
      <div ref={ref} data-testid="chart-dist" style={{ height: 260 }} />
      <Text type="secondary" data-testid="chart-dist-summary">{summarizeDistribution(distribution)}</Text>
    </div>
  );
}
