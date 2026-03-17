'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Typography,
  Tabs,
  DatePicker,
  Progress,
  Space,
  Table,
  Badge,
  Tooltip,
  Dropdown,
  message,
} from 'antd';
import {
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EllipsisOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Mock data ─────────────────────────────────────────────────────────────

const salesMonthly = [
  { month: '1月', value: 780 },
  { month: '2月', value: 1180 },
  { month: '3月', value: 650 },
  { month: '4月', value: 520 },
  { month: '5月', value: 1080 },
  { month: '6月', value: 1200 },
  { month: '7月', value: 800 },
  { month: '8月', value: 700 },
  { month: '9月', value: 430 },
  { month: '10月', value: 790 },
  { month: '11月', value: 510 },
  { month: '12月', value: 980 },
];

const visitMonthly = [
  { month: '1月', value: 1200 },
  { month: '2月', value: 980 },
  { month: '3月', value: 1400 },
  { month: '4月', value: 860 },
  { month: '5月', value: 1600 },
  { month: '6月', value: 1350 },
  { month: '7月', value: 1100 },
  { month: '8月', value: 900 },
  { month: '9月', value: 700 },
  { month: '10月', value: 1050 },
  { month: '11月', value: 820 },
  { month: '12月', value: 1300 },
];

const visitSparkline = [
  { v: 300 }, { v: 500 }, { v: 350 }, { v: 700 }, { v: 450 },
  { v: 600 }, { v: 400 }, { v: 750 }, { v: 500 }, { v: 680 },
];

const searchSparkline = [
  { v: 200 }, { v: 350 }, { v: 280 }, { v: 420 }, { v: 320 },
  { v: 510 }, { v: 380 }, { v: 450 }, { v: 300 }, { v: 490 },
];

const avgSearchSparkline = [
  { v: 500 }, { v: 400 }, { v: 480 }, { v: 360 }, { v: 420 },
  { v: 310 }, { v: 390 }, { v: 350 }, { v: 430 }, { v: 370 },
];

const paymentBars = [
  { v: 60 }, { v: 90 }, { v: 70 }, { v: 110 }, { v: 80 },
  { v: 130 }, { v: 100 }, { v: 150 }, { v: 90 }, { v: 120 },
  { v: 140 }, { v: 160 }, { v: 110 }, { v: 80 }, { v: 130 },
];

const storeRanking = [
  { rank: 1, name: '工专路 0 号店', value: 323234 },
  { rank: 2, name: '工专路 1 号店', value: 323234 },
  { rank: 3, name: '工专路 2 号店', value: 323234 },
  { rank: 4, name: '工专路 3 号店', value: 323234 },
  { rank: 5, name: '工专路 4 号店', value: 323234 },
  { rank: 6, name: '工专路 5 号店', value: 323234 },
  { rank: 7, name: '工专路 6 号店', value: 323234 },
];

const PIE_COLORS = ['#1677ff', '#52c41a', '#fadb14', '#ff7a45', '#9254de', '#13c2c2'];

const categoryData = [
  { name: '家用电器', value: 4544 },
  { name: '母婴产品', value: 1231 },
  { name: '个护健康', value: 3113 },
  { name: '服饰箱包', value: 2341 },
  { name: '食用酒水', value: 3321 },
  { name: '其他', value: 1231 },
];

const categoryDataMap = {
  all: categoryData,
  online: [
    { name: '家用电器', value: 5288 },
    { name: '母婴产品', value: 1420 },
    { name: '个护健康', value: 3550 },
    { name: '服饰箱包', value: 2810 },
    { name: '食用酒水', value: 2480 },
    { name: '其他', value: 920 },
  ],
  store: [
    { name: '家用电器', value: 2980 },
    { name: '母婴产品', value: 1180 },
    { name: '个护健康', value: 2640 },
    { name: '服饰箱包', value: 1860 },
    { name: '食用酒水', value: 3960 },
    { name: '其他', value: 1310 },
  ],
} as const;

const searchKeywords = Array.from({ length: 50 }, (_, i) => ({
  key: i + 1,
  rank: i + 1,
  keyword: `搜索关键词-${i}`,
  users: 120 + ((i * 137) % 900),
  growth: (i * 17) % 100,
  up: i % 4 !== 0,
}));


function TrendTag({ value, up }: { value: string; up: boolean }) {
  return (
    <Text style={{ fontSize: 12, color: up ? '#f5222d' : '#52c41a' }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {value}
    </Text>
  );
}

function Sparkline({ data }: { data: { v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={50}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9254de" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9254de" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#9254de"
          strokeWidth={1.5}
          fill="url(#sparkGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MiniBarChart({ data }: { data: { v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={50}>
      <BarChart data={data} barSize={4} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="v" fill="#1677ff" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}


export default function DashboardContent() {
  const [chartTab, setChartTab] = useState('sales');
  const [period, setPeriod] = useState('year');
  const [categoryChannel, setCategoryChannel] = useState<'all' | 'online' | 'store'>('all');

  const chartData = chartTab === 'sales' ? salesMonthly : visitMonthly;
  const currentCategoryData = useMemo(() => categoryDataMap[categoryChannel], [categoryChannel]);

  const searchDropdownItems = [
    { key: 'refresh', label: '刷新数据' },
    { key: 'export', label: '导出报表' },
    { key: 'detail', label: '查看详情' },
  ];

  const categoryDropdownItems = [
    { key: 'all', label: '切换到全部渠道' },
    { key: 'online', label: '切换到线上' },
    { key: 'store', label: '切换到门店' },
  ];

  return (
    <div style={{ padding: 0 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>总销售额</Text>
              <Tooltip title="总销售额是当前所有订单金额之和">
                <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
              </Tooltip>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 4px' }}>
              ¥ 126,560
            </div>
            <Space size={16}>
              <span><Text type="secondary" style={{ fontSize: 12 }}>周同比</Text> <TrendTag value="12%" up /></span>
              <span><Text type="secondary" style={{ fontSize: 12 }}>日同比</Text> <TrendTag value="11%" up={false} /></span>
            </Space>
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 12, paddingTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>日销售额</Text>
              <Text strong style={{ marginLeft: 8, fontSize: 12 }}>¥ 12,423</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>访问量</Text>
              <Tooltip title="最近30天的网站总访问量">
                <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
              </Tooltip>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 4px' }}>
              8,846
            </div>
            <Sparkline data={visitSparkline} />
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>日访问量</Text>
              <Text strong style={{ marginLeft: 8, fontSize: 12 }}>1,234</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>支付笔数</Text>
              <Tooltip title="当前已成功支付的订单数量">
                <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
              </Tooltip>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 4px' }}>
              6,560
            </div>
            <MiniBarChart data={paymentBars} />
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>转化率</Text>
              <Text strong style={{ marginLeft: 8, fontSize: 12 }}>60%</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>运营活动效果</Text>
              <Tooltip title="当前运营活动整体效果评分">
                <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
              </Tooltip>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '12px 0 8px' }}>
              78%
            </div>
            <Progress
              percent={78}
              showInfo={false}
              strokeColor={{ from: '#108ee9', to: '#52c41a' }}
              style={{ marginBottom: 8 }}
            />
            <Space size={16}>
              <span><Text type="secondary" style={{ fontSize: 12 }}>周同比</Text> <TrendTag value="12%" up /></span>
              <span><Text type="secondary" style={{ fontSize: 12 }}>日同比</Text> <TrendTag value="11%" up={false} /></span>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Tabs
                activeKey={chartTab}
                onChange={setChartTab}
                style={{ marginBottom: 0 }}
                items={[
                  { key: 'sales', label: '销售额' },
                  { key: 'visits', label: '访问量' },
                ]}
              />
              <Space>
                {(['today', 'week', 'month', 'year'] as const).map((p) => (
                  <span
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      cursor: 'pointer',
                      padding: '2px 10px',
                      borderRadius: 4,
                      fontSize: 13,
                      color: period === p ? 'var(--color-primary)' : 'var(--text-secondary)',
                      fontWeight: period === p ? 600 : 400,
                    }}
                  >
                    {p === 'today' ? '今日' : p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
                  </span>
                ))}
                <RangePicker
                  size="small"
                  defaultValue={[dayjs('2026-01-01'), dayjs('2026-12-31')]}
                  style={{ marginLeft: 4 }}
                />
              </Space>
            </div>

            <ResponsiveContainer width="100%" height={260} style={{ marginTop: 16 }}>
              <BarChart data={chartData} barSize={28} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <ReTooltip cursor={{ fill: 'rgba(22,119,255,0.06)' }} />
                <Bar dataKey="value" fill="#1677ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} style={{ height: '100%' }}>
            <Text strong style={{ fontSize: 14 }}>门店销售额排名</Text>
            <div style={{ marginTop: 16 }}>
              {storeRanking.map((item) => (
                <div
                  key={item.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: item.rank <= 3 ? 'var(--text-primary)' : 'var(--bg-subtle)',
                      color: item.rank <= 3 ? 'var(--bg-container)' : 'var(--text-tertiary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginRight: 10,
                    }}
                  >
                    {item.rank}
                  </span>
                  <Text style={{ flex: 1, fontSize: 13 }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {item.value.toLocaleString()}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <Card
            bordered={false}
            title={<Text strong>线上热门搜索</Text>}
            extra={
              <Dropdown
                menu={{
                  items: searchDropdownItems,
                  onClick: ({ key }) => {
                    if (key === 'refresh') message.success('热门搜索数据已刷新');
                    if (key === 'export') message.success('已开始导出热门搜索报表');
                    if (key === 'detail') message.info('可继续补充热门搜索详情页');
                  },
                }}
                trigger={['click']}
              >
                <EllipsisOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Dropdown>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  搜索用户数 <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
                </Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>17.1</span>
                  <ArrowUpOutlined style={{ color: '#f5222d', fontSize: 12 }} />
                </div>
                <Sparkline data={searchSparkline} />
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  人均搜索次数 <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
                </Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>26.2</span>
                  <ArrowDownOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                </div>
                <Sparkline data={avgSearchSparkline} />
              </Col>
            </Row>

            <Table
              style={{ marginTop: 16 }}
              size="small"
              dataSource={searchKeywords}
              pagination={{ pageSize: 5, showSizeChanger: false, size: 'small' }}
              columns={[
                {
                  title: '排名',
                  dataIndex: 'rank',
                  width: 52,
                  render: (v: number) => <Text type="secondary">{v}</Text>,
                },
                {
                  title: '搜索关键词',
                  dataIndex: 'keyword',
                },
                {
                  title: (
                    <span>
                      用户数{' '}
                      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, verticalAlign: 'middle', marginLeft: 2 }}>
                        <CaretUpOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
                        <CaretDownOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
                      </span>
                    </span>
                  ),
                  dataIndex: 'users',
                  align: 'right' as const,
                },
                {
                  title: (
                    <span>
                      周涨幅{' '}
                      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, verticalAlign: 'middle', marginLeft: 2 }}>
                        <CaretUpOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
                        <CaretDownOutlined style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
                      </span>
                    </span>
                  ),
                  dataIndex: 'growth',
                  align: 'right' as const,
                  render: (v: number, row: { up: boolean }) => (
                    <span style={{ color: row.up ? '#f5222d' : '#52c41a' }}>
                      {v}%{' '}
                      {row.up
                        ? <CaretUpOutlined style={{ fontSize: 10 }} />
                        : <CaretDownOutlined style={{ fontSize: 10 }} />}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<Text strong>销售额类别占比</Text>}
            extra={
              <Space size={4}>
                {['全部渠道', '线上', '门店'].map((c, i) => (
                  <Badge
                    key={c}
                    count={c}
                    onClick={() => setCategoryChannel(i === 0 ? 'all' : i === 1 ? 'online' : 'store')}
                    style={{
                      backgroundColor:
                        categoryChannel === (i === 0 ? 'all' : i === 1 ? 'online' : 'store')
                          ? 'var(--color-primary)'
                          : 'transparent',
                      color:
                        categoryChannel === (i === 0 ? 'all' : i === 1 ? 'online' : 'store')
                          ? '#fff'
                          : 'var(--text-secondary)',
                      border:
                        categoryChannel === (i === 0 ? 'all' : i === 1 ? 'online' : 'store')
                          ? 'none'
                          : '1px solid var(--border-base)',
                      borderRadius: 4,
                      padding: '0 8px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  />
                ))}
                <Dropdown
                  menu={{
                    items: categoryDropdownItems,
                    onClick: ({ key }) => {
                      setCategoryChannel(key as 'all' | 'online' | 'store');
                    },
                  }}
                  trigger={['click']}
                >
                  <EllipsisOutlined style={{ fontSize: 18, cursor: 'pointer', marginLeft: 4 }} />
                </Dropdown>
              </Space>
            }
          >
            <Text type="secondary" style={{ fontSize: 12 }}>销售额</Text>
            <ResponsiveContainer width="100%" height={390}>
              <PieChart>
                <Pie
                  data={currentCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                    if (midAngle == null) return null;
                    const RADIAN = Math.PI / 180;
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    const sx = cx + (outerRadius + 10) * cos;
                    const sy = cy + (outerRadius + 10) * sin;
                    const mx = cx + (outerRadius + 30) * cos;
                    const my = cy + (outerRadius + 30) * sin;
                    const ex = mx + (cos >= 0 ? 1 : -1) * 20;
                    const ey = my;
                    const textAnchor = cos >= 0 ? 'start' : 'end';
                    return (
                      <g>
                        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="rgba(128,128,128,0.5)" fill="none" strokeWidth={1} />
                        <circle cx={ex} cy={ey} r={2} fill="rgba(128,128,128,0.5)" />
                        <text x={ex + (cos >= 0 ? 4 : -4)} y={ey} textAnchor={textAnchor} fill="rgba(128,128,128,0.9)" fontSize={12}>
                          {name}:{' '}
                        </text>
                        <text x={ex + (cos >= 0 ? 4 : -4)} y={ey} dy={14} textAnchor={textAnchor} fill="rgba(128,128,128,0.7)" fontSize={11}>
                          {value.toLocaleString()}
                        </text>
                      </g>
                    );
                  }}
                  labelLine={false}
                >
                  {currentCategoryData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
