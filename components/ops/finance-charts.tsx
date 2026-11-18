'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export const OPS_CHUNK_FINANCE = 'OPS_CHUNK_FINANCE';

export default function FinanceCharts(props: { range: string; revenue: number; cost: number }) {
  const revenueRef = useRef<HTMLDivElement>(null);
  const costRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revenueRef.current || !costRef.current) return;
    const revenueChart = echarts.init(revenueRef.current);
    const costChart = echarts.init(costRef.current);
    const points = [0.4, 0.7, 0.9, 1].map((ratio) => Math.round(props.revenue * ratio));
    revenueChart.setOption({
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['1', '2', '3', '4'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: points, smooth: true }],
    });
    costChart.setOption({
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['成本'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [props.cost] }],
    });
    const onResize = () => {
      revenueChart.resize();
      costChart.resize();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      revenueChart.dispose();
      costChart.dispose();
    };
  }, [props.cost, props.range, props.revenue]);

  return (
    <div data-testid="ops-finance-charts">
      <span style={{ display: 'none' }}>{OPS_CHUNK_FINANCE}</span>
      <p data-testid="ops-chart-revenue">{props.range} 收入 {props.revenue}</p>
      <div ref={revenueRef} style={{ height: 220 }} />
      <p data-testid="ops-chart-cost">{props.range} 成本 {props.cost}</p>
      <div ref={costRef} style={{ height: 220 }} />
    </div>
  );
}
