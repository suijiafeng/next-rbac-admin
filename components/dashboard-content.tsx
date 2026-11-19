'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import {
  InfoCircleOutlined,
  ReloadOutlined,
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
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { request } from '@/lib/request';
import { useTheme } from '@/components/providers/ThemeProvider';

const { Text } = Typography;

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-base)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-elevated)',
  },
  labelStyle: { color: 'var(--text-primary)' },
  itemStyle: { color: 'var(--text-primary)' },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'user.create': { label: '新增用户', color: 'cyan' },
  'user.delete': { label: '删除用户', color: 'red' },
  'role.grant_admin': { label: '授予管理员', color: 'blue' },
  'role.revoke_admin': { label: '撤销管理员', color: 'orange' },
  'user.suspend': { label: '暂停用户', color: 'warning' },
  'user.unsuspend': { label: '启用用户', color: 'success' },
  'user.reset_password': { label: '重置密码', color: 'purple' },
  'settings.update': { label: '修改设置', color: 'geekblue' },
  'user.login': { label: '用户登录', color: 'green' },
  'user.password_change': { label: '修改密码', color: 'gold' },
  'change.submit': { label: '发起变更', color: 'blue' },
  'change.approve': { label: '审批通过', color: 'green' },
  'change.reject': { label: '审批驳回', color: 'red' },
  'temp.grant': { label: '临时授权', color: 'geekblue' },
  'temp.revoke': { label: '回收授权', color: 'orange' },
  'temp.expire': { label: '到期回收', color: 'default' },
  'exam.submit': { label: '提交试卷审批', color: 'blue' },
  'exam.withdraw': { label: '撤回试卷', color: 'orange' },
  'exam.approve': { label: '试卷通过', color: 'green' },
  'exam.reject': { label: '试卷驳回', color: 'red' },
};

const PIE_LIGHT = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];
const PIE_DARK = ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b'];

interface StatsData {
  userCount: number;
  activeUserCount: number;
  roleCount: number;
  permissionCount: number;
  newUsersTrend: Array<{ date: string; count: number }>;
  auditActionCounts: Array<{ action: string; count: number }>;
  loginFailCount: number;
}

export default function DashboardContent() {
  const { resolved } = useTheme();
  const pieColors = resolved === 'dark' ? PIE_DARK : PIE_LIGHT;
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const statsRes = await request<StatsData>('/api/admin/stats');
      setStats(statsRes.data);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      // 标签页隐藏时暂停轮询，避免后台无谓请求
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 60_000);

    // 从后台切回前台时立即刷新一次
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const s = stats;

  return (
    <Card
      variant="borderless"
      title={
        <Space size={6}>
          <span>治理概览</span>
          <Tooltip title="查看治理与系统核心指标，支持轮询自动刷新与手动刷新。">
            <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
          </Tooltip>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          刷新数据
        </Button>
      }
    >
      <div style={{ padding: 0 }}>
      {/* 近 30 天用户注册趋势（独占） */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card variant="borderless" title={<Text strong>近 30 天用户注册趋势</Text>}>
            {s?.newUsersTrend && s.newUsersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={s.newUsersTrend}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-stroke)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--chart-stroke)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--chart-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--chart-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReTooltip
                    {...chartTooltipProps}
                    formatter={(v: ValueType | undefined) => [`${v ?? 0} 人`, '新增用户']}
                    cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
                  />
                  <Area
                    type="linear"
                    dataKey="count"
                    stroke="var(--chart-stroke)"
                    strokeWidth={1.5}
                    fill="url(#regGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无注册数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* 近 30 天新增用户趋势（独占） */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card variant="borderless" title={<Text strong>近 30 天新增用户趋势</Text>}>
            {s?.newUsersTrend ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={s.newUsersTrend}
                  barSize={10}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--chart-muted)' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-muted)' }} tickLine={false} axisLine={false} />
                  <ReTooltip
                    {...chartTooltipProps}
                    formatter={(v: ValueType | undefined) => [v ?? 0, '新增用户']}
                  />
                  <Bar dataKey="count" fill="var(--chart-stroke)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>
        </Col>
      </Row>

      {/* 底部面板：操作分布 / 系统状态 各占 50% */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <Card variant="borderless" title={<Text strong>近 30 天操作分布</Text>} style={{ height: '100%' }}>
            {s?.auditActionCounts && s.auditActionCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={s.auditActionCounts.map((r) => ({
                      name: ACTION_LABELS[r.action]?.label ?? r.action,
                      value: r.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {s.auditActionCounts.map((_, idx) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    {...chartTooltipProps}
                    formatter={(v: ValueType | undefined, name: NameType | undefined) => [v ?? 0, name ?? '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无操作记录" style={{ padding: '40px 0' }} />
            )}

            <div style={{ marginTop: 8 }}>
              {s?.auditActionCounts.slice(0, 5).map((r, idx) => (
                <div key={r.action} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: pieColors[idx % pieColors.length],
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>{ACTION_LABELS[r.action]?.label ?? r.action}</Text>
                  </div>
                  <Badge count={r.count} style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card variant="borderless" title={<Text strong>系统状态</Text>} style={{ height: '100%' }}>
            <div className="stat-strip">
              {[
                {
                  label: '总用户数',
                  value: s?.userCount ?? 0,
                  sub: `活跃 ${s?.activeUserCount ?? 0} 人`,
                  warn: false,
                },
                {
                  label: '近 30 天新增',
                  value: s?.newUsersTrend.reduce((a, b) => a + b.count, 0) ?? 0,
                  sub: '注册用户',
                  warn: false,
                },
                {
                  label: '角色 / 权限',
                  value: `${s?.roleCount ?? 0} / ${s?.permissionCount ?? 0}`,
                  sub: '角色数 / 权限条目',
                  warn: false,
                },
                {
                  label: '登录失败',
                  value: s?.loginFailCount ?? 0,
                  sub: '近 30 天',
                  warn: (s?.loginFailCount ?? 0) > 0,
                },
              ].map((item) => (
                <div key={item.label} className="stat-cell">
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-value" style={item.warn ? { color: 'var(--color-danger)' } : undefined}>{item.value}</div>
                  <div className="stat-sub">{item.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
      </div>
    </Card>
  );
}
