'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from '@/components/providers/ThemeProvider';
import { readChartInk } from '@/lib/chart-ink';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer]);

export const OPS_CHUNK_STAFF = 'OPS_CHUNK_STAFF';

export default function StaffCharts(props: { range: string; headcount: number; attendance: number }) {
  const headRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  useEffect(() => {
    if (!headRef.current || !attendanceRef.current) return;
    const ink = readChartInk();
    const axis = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink.muted, fontSize: 11 } };
    const headChart = echarts.init(headRef.current);
    const attendanceChart = echarts.init(attendanceRef.current);
    headChart.setOption({
      color: [ink.ink],
      tooltip: { trigger: 'axis', backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } },
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['编制'], ...axis },
      yAxis: { type: 'value', ...axis, splitLine: { lineStyle: { color: ink.grid, type: 'dashed' } } },
      series: [{ type: 'bar', data: [props.headcount] }],
    });
    attendanceChart.setOption({
      color: [ink.ink, ink.muted],
      tooltip: { trigger: 'item', backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        data: [
          { name: '出勤', value: props.attendance },
          { name: '其他', value: Math.max(0, 100 - props.attendance) },
        ],
      }],
    });
    return () => {
      headChart.dispose();
      attendanceChart.dispose();
    };
  }, [props.attendance, props.headcount, props.range, resolved]);

  return (
    <div data-testid="ops-staff-charts">
      <span style={{ display: 'none' }}>{OPS_CHUNK_STAFF}</span>
      <p data-testid="ops-chart-headcount">{props.range} 编制 {props.headcount}</p>
      <div ref={headRef} style={{ height: 220 }} />
      <p data-testid="ops-chart-attendance">{props.range} 出勤 {props.attendance}</p>
      <div ref={attendanceRef} style={{ height: 220 }} />
    </div>
  );
}
