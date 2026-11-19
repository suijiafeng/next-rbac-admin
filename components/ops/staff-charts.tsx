'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer]);

export const OPS_CHUNK_STAFF = 'OPS_CHUNK_STAFF';

export default function StaffCharts(props: { range: string; headcount: number; attendance: number }) {
  const headRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!headRef.current || !attendanceRef.current) return;
    const headChart = echarts.init(headRef.current);
    const attendanceChart = echarts.init(attendanceRef.current);
    headChart.setOption({
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['编制'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [props.headcount] }],
    });
    attendanceChart.setOption({
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
  }, [props.attendance, props.headcount, props.range]);

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
