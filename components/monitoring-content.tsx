'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
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
import styles from '@/components/monitoring-content.module.css';

const { Text, Title } = Typography;

type MonitoringPeriod = '1h' | '24h' | '7d';
type KpiMetricKey = 'pv' | 'uv' | 'conversion' | 'latency' | 'errors' | 'availability';

interface TrendDataPoint {
  time: string;
  traffic: number;
  conversion: number;
}

interface TrafficSourceItem {
  name: string;
  value: number;
  color: string;
}

interface RegionItem {
  region: string;
  visits: number;
  orders: number;
}

interface WarningItem {
  level: '高' | '中' | '低';
  title: string;
  desc: string;
  status: string;
}

interface AuditItem {
  key: number;
  api: string;
  qps: number;
  p95: number;
  errorRate: string;
  status: string;
}

interface KpiCardConfig {
  title: string;
  metricKey: KpiMetricKey;
  icon: ReactNode;
  iconClassName: string;
  up: boolean;
  trend: string;
  suffix: string;
  decimal?: number;
  progress?: boolean;
}

interface LegendItem {
  label: string;
  colorClassName: string;
}

interface TimelineEntry {
  color: string;
  title: string;
  description: string;
  dot?: ReactNode;
}

const kpiByPeriod = {
  '1h': { pv: 18234, uv: 4290, conversion: 6.8, latency: 182, errors: 12, availability: 99.98 },
  '24h': { pv: 286540, uv: 58230, conversion: 7.4, latency: 196, errors: 84, availability: 99.93 },
  '7d': { pv: 1826540, uv: 328230, conversion: 7.1, latency: 203, errors: 316, availability: 99.9 },
} as const;

const trafficSourceData: TrafficSourceItem[] = [
  { name: '自然搜索', value: 38, color: '#1677ff' },
  { name: '活动投放', value: 24, color: '#9254de' },
  { name: '直接访问', value: 18, color: '#52c41a' },
  { name: '社媒分享', value: 12, color: '#faad14' },
  { name: '外部链接', value: 8, color: '#ff7a45' },
];

const regionData: RegionItem[] = [
  { region: '华东', visits: 98200, orders: 7420 },
  { region: '华南', visits: 86300, orders: 6580 },
  { region: '华北', visits: 73420, orders: 6010 },
  { region: '西南', visits: 46880, orders: 3290 },
  { region: '华中', visits: 42110, orders: 3012 },
  { region: '东北', visits: 18620, orders: 1104 },
];

const trendDataMap: Record<MonitoringPeriod, TrendDataPoint[]> = {
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

const warningList: WarningItem[] = [
  { level: '高', title: '支付回调波动', desc: '近 10 分钟支付回调失败率提升至 2.6%', status: '处理中' },
  { level: '中', title: '华北节点延迟升高', desc: '接口响应中位数提升到 240ms', status: '观察中' },
  { level: '低', title: '活动页跳出偏高', desc: '新首页活动页跳出率较昨日上升 4.2%', status: '待分析' },
];

const auditData: AuditItem[] = [
  { key: 1, api: '/api/profile', qps: 182, p95: 124, errorRate: '0.03%', status: '稳定' },
  { key: 2, api: '/api/users', qps: 96, p95: 168, errorRate: '0.08%', status: '稳定' },
  { key: 3, api: '/api/settings', qps: 28, p95: 142, errorRate: '0.02%', status: '稳定' },
  { key: 4, api: '/api/auth/login', qps: 14, p95: 286, errorRate: '0.42%', status: '关注' },
];

const warningLevelConfig = {
  高: {
    cardClassName: styles.warningLevelHigh,
    tagColor: 'error' as const,
    icon: <ExclamationCircleFilled className={`${styles.smallIcon} ${styles.iconError}`} />,
  },
  中: {
    cardClassName: styles.warningLevelMedium,
    tagColor: 'warning' as const,
    icon: <WarningFilled className={`${styles.smallIcon} ${styles.iconWarn}`} />,
  },
  低: {
    cardClassName: styles.warningLevelLow,
    tagColor: 'processing' as const,
    icon: <InfoCircleFilled className={`${styles.smallIcon} ${styles.iconInfo}`} />,
  },
};

const kpiCardConfigList: KpiCardConfig[] = [
  { title: 'PV', metricKey: 'pv', icon: <GlobalOutlined />, iconClassName: 'bg-blue-50 text-blue-600', up: true, trend: '较上周期 8.2%', suffix: '' },
  { title: 'UV', metricKey: 'uv', icon: <AreaChartOutlined />, iconClassName: 'bg-violet-50 text-violet-600', up: true, trend: '较上周期 5.4%', suffix: '' },
  { title: '支付转化率', metricKey: 'conversion', icon: <ThunderboltOutlined />, iconClassName: 'bg-green-50 text-green-600', up: true, trend: '较上周期 +0.6%', suffix: '%', decimal: 1 },
  { title: '接口 P95', metricKey: 'latency', icon: <ClockCircleOutlined />, iconClassName: 'bg-cyan-50 text-cyan-600', up: false, trend: '较上周期 −12ms', suffix: 'ms' },
  { title: '异常次数', metricKey: 'errors', icon: <AlertOutlined />, iconClassName: 'bg-red-50 text-red-500', up: true, trend: '较上周期 +3 次', suffix: '' },
  { title: '系统可用性', metricKey: 'availability', icon: <CheckCircleOutlined />, iconClassName: 'bg-green-50 text-green-600', up: false, trend: '运行正常', suffix: '%', decimal: 2, progress: true },
];

const regionLegendItems: LegendItem[] = [
  { label: '访问量', colorClassName: 'bg-[#1677ff]' },
  { label: '订单量', colorClassName: 'bg-[#9254de]' },
];

const timelineItems: TimelineEntry[] = [
  {
    color: '#52c41a',
    title: '活动页流量恢复正常',
    description: '10:12 · 流量指标已回归基线水平',
    dot: <CheckCircleOutlined className={`${styles.smallIcon} ${styles.iconInfo}`} />,
  },
  {
    color: '#1677ff',
    title: '登录接口发布完成',
    description: '09:40 · P95 延迟下降 8ms',
  },
  {
    color: '#ff4d4f',
    title: '支付回调异常触发告警',
    description: '08:56 · 支付失败率超过阈值',
    dot: <ExclamationCircleFilled className={`${styles.smallIcon} ${styles.iconError}`} />,
  },
  {
    color: '#d9d9d9',
    title: '新一轮巡检任务开始执行',
    description: '08:30 · 定时巡检任务启动',
  },
];

const getMetricColorClassName = (value: number, warningThreshold: number, errorThreshold: number) => {
  if (value > errorThreshold) {
    return styles.metricError;
  }

  if (value > warningThreshold) {
    return styles.metricWarn;
  }

  return styles.metricGood;
};

const MonitoringTrendLegend = () => {
  return (
    <Space size={16}>
      <Space size={6}>
        <span className={`${styles.legendSwatch} ${styles.legendBlue}`} />
        <Text type="secondary" className="text-xs">流量 (PV)</Text>
      </Space>
      <Space size={6}>
        <span className={`${styles.legendSwatch} ${styles.legendGreen}`} />
        <Text type="secondary" className="text-xs">转化率 (%)</Text>
      </Space>
    </Space>
  );
};

const MonitoringContent = () => {
  const [period, setPeriod] = useState<MonitoringPeriod>('24h');

  const periodMetrics = kpiByPeriod[period];
  const trendData = useMemo(() => trendDataMap[period], [period]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title level={4} className="text-slate-900">
          数据监控
        </Title>
        <Segmented
          value={period}
          onChange={(value) => setPeriod(value as MonitoringPeriod)}
          options={[
            { label: '近 1 小时', value: '1h' },
            { label: '近 24 小时', value: '24h' },
            { label: '近 7 天', value: '7d' },
          ]}
        />
      </div>

      <Row gutter={[16, 16]} className={styles.stretchRow}>
        {kpiCardConfigList.map((cardConfig) => {
          const metricValue = periodMetrics[cardConfig.metricKey];
          const displayValue = cardConfig.decimal != null
            ? metricValue.toFixed(cardConfig.decimal)
            : metricValue.toLocaleString();

          return (
            <Col key={cardConfig.metricKey} xs={24} sm={12} xl={4} className={styles.stretchCol}>
              <Card bordered={false} className={styles.fillCard} style={{ height: '100%' }}>
                <div className={styles.kpiCardHeader}>
                  <Text type="secondary" className="text-[13px]">{cardConfig.title}</Text>
                  <div className={`${styles.kpiIcon} ${cardConfig.iconClassName}`}>
                    {cardConfig.icon}
                  </div>
                </div>

                <div className={styles.kpiValue}>
                  {displayValue}
                  {cardConfig.suffix ? (
                    <span className={styles.kpiSuffix}>{cardConfig.suffix}</span>
                  ) : null}
                </div>

                {cardConfig.progress ? (
                  <Progress
                    percent={Math.round(metricValue)}
                    showInfo={false}
                    strokeColor="#52c41a"
                    size="small"
                    className="mb-1"
                  />
                ) : null}

                <Text className={cardConfig.up ? styles.trendTextUp : styles.trendTextDown}>
                  {cardConfig.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {cardConfig.trend}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]} className={`mt-4 ${styles.stretchRow}`}>
        <Col xs={24} xl={16} className={styles.stretchCol}>
          <Card
            bordered={false}
            className={styles.fillCard}
            style={{ height: '100%' }}
            title={
              <div className={styles.trendTitle}>
                <span>流量与转化趋势</span>
                <MonitoringTrendLegend />
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

        <Col xs={24} xl={8} className={styles.stretchCol}>
          <Card bordered={false} title="流量来源" className={styles.fillCard} style={{ height: '100%' }}>
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
                  {trafficSourceData.map((sourceItem) => (
                    <Cell key={sourceItem.name} fill={sourceItem.color} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [`${value}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className={styles.sourceList}>
              {trafficSourceData.map((sourceItem) => (
                <div key={sourceItem.name} className={styles.sourceRow}>
                  <Space size={8}>
                    <span className={styles.sourceDot} style={{ backgroundColor: sourceItem.color }} />
                    <Text className="text-[13px]">{sourceItem.name}</Text>
                  </Space>
                  <Space size={12}>
                    <Progress
                      percent={sourceItem.value}
                      showInfo={false}
                      strokeColor={sourceItem.color}
                      className={styles.progressTiny}
                      size="small"
                    />
                    <Text strong className="min-w-8 text-right text-[13px]">{sourceItem.value}%</Text>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={`mt-4 ${styles.stretchRow}`}>
        <Col xs={24} xl={10} className={styles.stretchCol}>
          <Card bordered={false} title="地区访问分布" className={styles.fillCard} style={{ height: '100%' }}>
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
            <div className={styles.legendRow}>
              {regionLegendItems.map((legendItem) => (
                <Space key={legendItem.label} size={6}>
                  <span className={`${styles.legendSquare} ${legendItem.colorClassName}`} />
                  <Text type="secondary" className="text-xs">{legendItem.label}</Text>
                </Space>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={14} className={styles.stretchCol}>
          <Card bordered={false} title="接口巡检" className={styles.fillCard} style={{ height: '100%' }}>
            <Table
              size="small"
              pagination={false}
              dataSource={auditData}
              columns={[
                {
                  title: '接口',
                  dataIndex: 'api',
                  render: (apiPath: string) => <Text className={styles.apiText}>{apiPath}</Text>,
                },
                {
                  title: 'QPS',
                  dataIndex: 'qps',
                  width: 68,
                  render: (qpsValue: number) => <Text strong>{qpsValue}</Text>,
                },
                {
                  title: 'P95 延迟',
                  dataIndex: 'p95',
                  width: 90,
                  render: (latencyValue: number) => (
                    <Text className={getMetricColorClassName(latencyValue, 180, 250)}>
                      {latencyValue}ms
                    </Text>
                  ),
                },
                {
                  title: '错误率',
                  dataIndex: 'errorRate',
                  width: 76,
                  render: (errorRateValue: string) => {
                    const numericErrorRate = parseFloat(errorRateValue);
                    return (
                      <Text className={getMetricColorClassName(numericErrorRate, 0.1, 0.3)}>
                        {errorRateValue}
                      </Text>
                    );
                  },
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 72,
                  render: (statusText: string) => (
                    <Tag color={statusText === '关注' ? 'gold' : 'success'} className="rounded">
                      {statusText}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={`mt-4 ${styles.stretchRow}`}>
        <Col xs={24} xl={12} className={styles.stretchCol}>
          <Card bordered={false} title="异常告警" className={styles.fillCard} style={{ height: '100%' }}>
            <Space direction="vertical" size={10} className="w-full">
              {warningList.map((warningItem) => {
                const levelConfig = warningLevelConfig[warningItem.level];

                return (
                  <div
                    key={warningItem.title}
                    className={`${styles.warningCard} ${levelConfig.cardClassName}`}
                  >
                    <div className={styles.warningIcon}>{levelConfig.icon}</div>
                    <div className={styles.warningContent}>
                      <div className={styles.warningHeader}>
                        <Text strong className="text-[13px]">{warningItem.title}</Text>
                        <Tag color={levelConfig.tagColor} className={styles.statusTag}>
                          {warningItem.status}
                        </Tag>
                      </div>
                      <Text type="secondary" className="text-xs">{warningItem.desc}</Text>
                    </div>
                  </div>
                );
              })}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={12} className={styles.stretchCol}>
          <Card bordered={false} title="监控时间线" className={styles.fillCard} style={{ height: '100%' }}>
            <Timeline
              className="mt-2"
              items={timelineItems.map((timelineItem) => ({
                color: timelineItem.color,
                dot: timelineItem.dot,
                children: (
                  <div>
                    <Text strong className="text-[13px]">{timelineItem.title}</Text>
                    <div className={styles.timelineText}>
                      <Text type="secondary" className="text-xs">{timelineItem.description}</Text>
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MonitoringContent;
