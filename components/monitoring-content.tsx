'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Card,
  Col,
  Progress,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  AlertOutlined,
  AreaChartOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  GlobalOutlined,
  InfoCircleFilled,
  ThunderboltOutlined,
  WarningFilled,
} from '@ant-design/icons';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';

const { Text, Title } = Typography;

type Period = '1h' | '24h' | '7d';

const kpiByPeriod = {
  '1h': { pv: 18234, uv: 4290, conversion: 6.8, latency: 182, errors: 12, availability: 99.98 },
  '24h': { pv: 286540, uv: 58230, conversion: 7.4, latency: 196, errors: 84, availability: 99.93 },
  '7d': { pv: 1826540, uv: 328230, conversion: 7.1, latency: 203, errors: 316, availability: 99.9 },
} as const;

type KpiKey = keyof typeof kpiByPeriod['24h'];

const trafficSourceData = [
  { name: '自然搜索', value: 38, color: '#1677ff' },
  { name: '活动投放', value: 24, color: '#9254de' },
  { name: '直接访问', value: 18, color: '#52c41a' },
  { name: '社媒分享', value: 12, color: '#faad14' },
  { name: '外部链接', value: 8, color: '#ff7a45' },
];

const regionData = [
  { region: '华东', visits: 98200, orders: 7420 },
  { region: '华南', visits: 86300, orders: 6580 },
  { region: '华北', visits: 73420, orders: 6010 },
  { region: '西南', visits: 46880, orders: 3290 },
  { region: '华中', visits: 42110, orders: 3012 },
  { region: '东北', visits: 18620, orders: 1104 },
];

const trendDataMap: Record<Period, { time: string; traffic: number; conversion: number }[]> = {
  '1h': [
    { time: '00', traffic: 320, conversion: 4.8 },
    { time: '10', traffic: 480, conversion: 5.4 },
    { time: '20', traffic: 620, conversion: 6.3 },
    { time: '30', traffic: 710, conversion: 6.9 },
    { time: '40', traffic: 680, conversion: 6.7 },
    { time: '50', traffic: 750, conversion: 7.2 },
  ],
  '24h': [
    { time: '00:00', traffic: 3200, conversion: 5.2 },
    { time: '04:00', traffic: 2800, conversion: 4.8 },
    { time: '08:00', traffic: 6200, conversion: 6.2 },
    { time: '12:00', traffic: 8400, conversion: 7.4 },
    { time: '16:00', traffic: 7900, conversion: 7.1 },
    { time: '20:00', traffic: 9100, conversion: 8.0 },
    { time: '23:00', traffic: 6400, conversion: 6.3 },
  ],
  '7d': [
    { time: '周一', traffic: 52400, conversion: 6.8 },
    { time: '周二', traffic: 58800, conversion: 7.1 },
    { time: '周三', traffic: 63200, conversion: 7.4 },
    { time: '周四', traffic: 60100, conversion: 7.0 },
    { time: '周五', traffic: 71800, conversion: 7.6 },
    { time: '周六', traffic: 84200, conversion: 8.1 },
    { time: '周日', traffic: 78500, conversion: 7.7 },
  ],
};

const warnings = [
  { level: '高', title: '支付回调波动', desc: '近 10 分钟支付回调失败率提升至 2.6%', status: '处理中' },
  { level: '中', title: '华北节点延迟升高', desc: '接口响应中位数提升到 240ms', status: '观察中' },
  { level: '低', title: '活动页跳出偏高', desc: '新首页活动页跳出率较昨日上升 4.2%', status: '待分析' },
];

const auditData = [
  { key: 1, api: '/api/profile', qps: 182, p95: 124, errorRate: '0.03%', status: '稳定' },
  { key: 2, api: '/api/users', qps: 96, p95: 168, errorRate: '0.08%', status: '稳定' },
  { key: 3, api: '/api/settings', qps: 28, p95: 142, errorRate: '0.02%', status: '稳定' },
  { key: 4, api: '/api/auth/login', qps: 14, p95: 286, errorRate: '0.42%', status: '关注' },
];

type LevelKey = '高' | '中' | '低';
const LEVEL_CFG: Record<LevelKey, { color: string; bg: string; border: string; tagColor: 'error' | 'warning' | 'processing'; icon: ReactNode }> = {
  '高': { color: '#ff4d4f', bg: '#fff1f0', border: '#ffccc7', tagColor: 'error', icon: <ExclamationCircleFilled style={{ color: '#ff4d4f' }} /> },
  '中': { color: '#faad14', bg: '#fffbe6', border: '#ffe58f', tagColor: 'warning', icon: <WarningFilled style={{ color: '#faad14' }} /> },
  '低': { color: '#1677ff', bg: '#e6f4ff', border: '#91caff', tagColor: 'processing', icon: <InfoCircleFilled style={{ color: '#1677ff' }} /> },
};

type KpiCardConfig = {
  title: string;
  key: KpiKey;
  icon: ReactNode;
  color: string;
  bg: string;
  up: boolean;
  trend: string;
  suffix: string;
  decimal?: number;
  progress?: boolean;
};

const KPI_CARDS: KpiCardConfig[] = [
  { title: 'PV', key: 'pv', icon: <GlobalOutlined />, color: '#1677ff', bg: '#e6f4ff', up: true, trend: '较上周期 8.2%', suffix: '' },
  { title: 'UV', key: 'uv', icon: <AreaChartOutlined />, color: '#9254de', bg: '#f9f0ff', up: true, trend: '较上周期 5.4%', suffix: '' },
  { title: '支付转化率', key: 'conversion', icon: <ThunderboltOutlined />, color: '#52c41a', bg: '#f6ffed', up: true, trend: '较上周期 +0.6%', suffix: '%', decimal: 1 },
  { title: '接口 P95', key: 'latency', icon: <ClockCircleOutlined />, color: '#13c2c2', bg: '#e6fffb', up: false, trend: '较上周期 −12ms', suffix: 'ms' },
  { title: '异常次数', key: 'errors', icon: <AlertOutlined />, color: '#ff4d4f', bg: '#fff1f0', up: true, trend: '较上周期 +3 次', suffix: '' },
  { title: '系统可用性', key: 'availability', icon: <CheckCircleOutlined />, color: '#52c41a', bg: '#f6ffed', up: false, trend: '运行正常', suffix: '%', decimal: 2, progress: true },
];

export default function MonitoringContent() {
  const [period, setPeriod] = useState<Period>('24h');
  const kpi = kpiByPeriod[period];
  const trendData = useMemo(() => trendDataMap[period], [period]);

  return (
    <div style={{ padding: 0 }}>
      <div className='flex justify-between align-items-center pb-2'>
        <Typography.Title level={4} className="text-slate-900">
          数据监控
        </Typography.Title>
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[
            { label: '近 1 小时', value: '1h' },
            { label: '近 24 小时', value: '24h' },
            { label: '近 7 天', value: '7d' },
          ]}
        />
      </div>
      <Row gutter={[16, 16]} style={{ alignItems: 'stretch' }}>
        {KPI_CARDS.map((c) => {
          const val = kpi[c.key] as number;
          const display = c.decimal != null ? val.toFixed(c.decimal) : val.toLocaleString();
          return (
            <Col key={c.key} xs={24} sm={12} xl={4} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card bordered={false} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{c.title}</Text>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: c.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.color, fontSize: 15, flexShrink: 0,
                  }}>
                    {c.icon}
                  </div>
                </div>
                <div style={{ margin: '10px 0 4px', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                  {display}
                  {c.suffix && (
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8c8c', marginLeft: 2 }}>{c.suffix}</span>
                  )}
                </div>
                {c.progress && (
                  <Progress
                    percent={Math.round(val)}
                    showInfo={false}
                    strokeColor="#52c41a"
                    size="small"
                    style={{ marginBottom: 4 }}
                  />
                )}
                <Text style={{ fontSize: 12, color: c.up ? '#cf1322' : '#389e0d' }}>
                  {c.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {c.trend}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ── Trend Chart + Traffic Source ───────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, alignItems: 'stretch' }}>
        <Col xs={24} xl={16} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            bordered={false}
            style={{ flex: 1 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span>流量与转化趋势</span>
                <Space size={16}>
                  <Space size={6}>
                    <span style={{ width: 14, height: 3, borderRadius: 2, background: '#1677ff', display: 'inline-block' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>流量 (PV)</Text>
                  </Space>
                  <Space size={6}>
                    <span style={{ width: 14, height: 3, borderRadius: 2, background: '#52c41a', display: 'inline-block' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>转化率 (%)</Text>
                  </Space>
                </Space>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} />
                <YAxis yAxisId="traffic" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <YAxis yAxisId="conversion" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Area
                  yAxisId="traffic"
                  type="monotone"
                  dataKey="traffic"
                  name="流量(PV)"
                  stroke="#1677ff"
                  strokeWidth={2.5}
                  fill="url(#trafficGrad)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Area
                  yAxisId="conversion"
                  type="monotone"
                  dataKey="conversion"
                  name="转化率(%)"
                  stroke="#52c41a"
                  strokeWidth={2.5}
                  fill="url(#conversionGrad)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card bordered={false} title="流量来源" style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={trafficSourceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {trafficSourceData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v) => [`${v}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 10, marginTop: 4 }}>
              {trafficSourceData.map((item) => (
                <div
                  key={item.name}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}
                >
                  <Space size={8}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                    <Text style={{ fontSize: 13 }}>{item.name}</Text>
                  </Space>
                  <Space size={12}>
                    <Progress
                      percent={item.value}
                      showInfo={false}
                      strokeColor={item.color}
                      style={{ width: 64, margin: 0 }}
                      size="small"
                    />
                    <Text strong style={{ fontSize: 13, minWidth: 32, textAlign: 'right' }}>{item.value}%</Text>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Regional Distribution + API Audit ──────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, alignItems: 'stretch' }}>
        <Col xs={24} xl={10} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card bordered={false} title="地区访问分布" style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={regionData}
                layout="vertical"
                barSize={8}
                barGap={4}
                margin={{ top: 4, right: 16, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} />
                <YAxis dataKey="region" type="category" axisLine={false} tickLine={false} width={44} tick={{ fontSize: 13 }} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="visits" name="访问量" fill="#1677ff" radius={[0, 4, 4, 0]} />
                <Bar dataKey="orders" name="订单量" fill="#9254de" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 8 }}>
              {[{ label: '访问量', color: '#1677ff' }, { label: '订单量', color: '#9254de' }].map((l) => (
                <Space key={l.label} size={6}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{l.label}</Text>
                </Space>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card bordered={false} title="接口巡检" style={{ flex: 1 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={auditData}
              columns={[
                {
                  title: '接口',
                  dataIndex: 'api',
                  render: (v: string) => (
                    <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
                  ),
                },
                {
                  title: 'QPS',
                  dataIndex: 'qps',
                  width: 68,
                  render: (v: number) => <Text strong>{v}</Text>,
                },
                {
                  title: 'P95 延迟',
                  dataIndex: 'p95',
                  width: 90,
                  render: (v: number) => (
                    <Text style={{
                      color: v > 250 ? '#ff4d4f' : v > 180 ? '#faad14' : '#52c41a',
                      fontWeight: 500,
                    }}>
                      {v}ms
                    </Text>
                  ),
                },
                {
                  title: '错误率',
                  dataIndex: 'errorRate',
                  width: 76,
                  render: (v: string) => {
                    const n = parseFloat(v);
                    return (
                      <Text style={{
                        color: n > 0.3 ? '#ff4d4f' : n > 0.1 ? '#faad14' : '#52c41a',
                        fontWeight: 500,
                      }}>
                        {v}
                      </Text>
                    );
                  },
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 72,
                  render: (v: string) => (
                    <Tag color={v === '关注' ? 'gold' : 'success'} style={{ borderRadius: 4 }}>
                      {v}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Alerts + Timeline ──────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, alignItems: 'stretch' }}>
        <Col xs={24} xl={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card bordered={false} title="异常告警" style={{ flex: 1 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {warnings.map((w) => {
                const cfg = LEVEL_CFG[w.level as LevelKey];
                return (
                  <div
                    key={w.title}
                    style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      gap: 10,
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 13 }}>{w.title}</Text>
                        <Tag color={cfg.tagColor} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>
                          {w.status}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{w.desc}</Text>
                    </div>
                  </div>
                );
              })}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={12} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card bordered={false} title="监控时间线" style={{ flex: 1 }}>
            <Timeline
              style={{ marginTop: 8 }}
              items={[
                {
                  color: '#52c41a',
                  dot: <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
                  children: (
                    <div>
                      <Text strong style={{ fontSize: 13 }}>活动页流量恢复正常</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>10:12 · 流量指标已回归基线水平</Text>
                      </div>
                    </div>
                  ),
                },
                {
                  color: '#1677ff',
                  children: (
                    <div>
                      <Text strong style={{ fontSize: 13 }}>登录接口发布完成</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>09:40 · P95 延迟下降 8ms</Text>
                      </div>
                    </div>
                  ),
                },
                {
                  color: '#ff4d4f',
                  dot: <ExclamationCircleFilled style={{ fontSize: 14, color: '#ff4d4f' }} />,
                  children: (
                    <div>
                      <Text strong style={{ fontSize: 13 }}>支付回调异常触发告警</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>08:56 · 支付失败率超过阈值</Text>
                      </div>
                    </div>
                  ),
                },
                {
                  color: '#d9d9d9',
                  children: (
                    <div>
                      <Text strong style={{ fontSize: 13 }}>新一轮巡检任务开始执行</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>08:30 · 定时巡检任务启动</Text>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

    </div>
  );
}
