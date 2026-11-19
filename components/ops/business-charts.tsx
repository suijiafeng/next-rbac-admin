'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from '@/components/providers/ThemeProvider';
import { readChartInk } from '@/lib/chart-ink';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export const OPS_CHUNK_BUSINESS = 'OPS_CHUNK_BUSINESS';

export default function BusinessCharts(props: { range: string; orders: number; conversion: number }) {
  const ordersRef = useRef<HTMLDivElement>(null);
  const conversionRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  useEffect(() => {
    if (!ordersRef.current || !conversionRef.current) return;
    const ink = readChartInk();
    const axis = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink.muted, fontSize: 11 } };
    const tip = { trigger: 'axis' as const, backgroundColor: ink.surface, borderColor: ink.grid, textStyle: { color: ink.text, fontSize: 12 } };
    const ordersChart = echarts.init(ordersRef.current);
    const conversionChart = echarts.init(conversionRef.current);
    ordersChart.setOption({
      color: [ink.ink],
      tooltip: tip,
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['订单'], ...axis },
      yAxis: { type: 'value', ...axis, splitLine: { lineStyle: { color: ink.grid, type: 'dashed' } } },
      series: [{ type: 'bar', data: [props.orders] }],
    });
    conversionChart.setOption({
      color: [ink.ink],
      tooltip: tip,
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: ['转化'], ...axis },
      yAxis: { type: 'value', max: 100, ...axis, splitLine: { lineStyle: { color: ink.grid, type: 'dashed' } } },
      series: [{ type: 'line', smooth: false, symbol: 'none', data: [props.conversion] }],
    });
    return () => {
      ordersChart.dispose();
      conversionChart.dispose();
    };
  }, [props.conversion, props.orders, props.range, resolved]);

  return (
    <div data-testid="ops-business-charts">
      <span style={{ display: 'none' }}>{OPS_CHUNK_BUSINESS}</span>
      <p data-testid="ops-chart-orders">{props.range} 订单 {props.orders}</p>
      <div ref={ordersRef} style={{ height: 220 }} />
      <p data-testid="ops-chart-conversion">{props.range} 转化 {props.conversion}</p>
      <div ref={conversionRef} style={{ height: 220 }} />
    </div>
  );
}
