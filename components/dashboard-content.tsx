'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Col,
  Empty,
  Row,
  Spin,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowUpOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
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

const { Text, Title } = Typography;

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
};

const PIE_COLORS = ['#1677ff', '#52c41a', '#fadb14', '#ff7a45', '#9254de', '#13c2c2', '#f5222d', '#faad14'];

interface StatsData {
  userCount: number;
  activeUserCount: number;
  roleCount: number;
  permissionCount: number;
  newUsersTrend: Array<{ date: string; count: number }>;
  auditActionCounts: Array<{ action: string; count: number }>;
  recentAuditLogs: Array<{
    id: number;
    actorUsername: string;
    action: string;
    targetLabel: string | null;
    createdAt: string;
  }>;
  loginFailCount: number;
}

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  publisherUsername: string;
  createdAt: string;
}

function KpiCard({
  title,
  value,
  icon,
  color,
  sub,
  tooltip,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  tooltip?: string;
}) {
  return (
    <Card bordered={false} style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
            {tooltip && (
              <Tooltip title={tooltip}>
                <span style={{ cursor: 'default', color: 'var(--text-tertiary)', fontSize: 12 }}>?</span>
              </Tooltip>
            )}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '10px 0 4px', color: 'var(--text-primary)' }}>
            {value}
          </div>
          {sub && <Text type="secondary" style={{ fontSize: 12 }}>{sub}</Text>}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardContent() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, announcementsRes] = await Promise.allSettled([
        request<StatsData>('/api/admin/stats'),
        request<{ list: AnnouncementItem[] }>('/api/admin/announcements', {
          params: { active: 'true', pageSize: 5 },
        }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (announcementsRes.status === 'fulfilled') setAnnouncements(announcementsRes.value.data.list);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60_000);
    return () => clearInterval(timer);
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
    <div style={{ padding: 0 }}>
      {/* 公告横幅 */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {announcements.map((ann) => (
            <Alert
              key={ann.id}
              type="info"
              showIcon
              banner
              message={
                <span>
                  <strong>{ann.title}</strong>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{ann.content}</Text>
                </span>
              }
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      )}

      {/* KPI 卡片行 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="注册用户总数"
            value={s?.userCount ?? 0}
            icon={<TeamOutlined />}
            color="#1677ff"
            sub={`活跃 ${s?.activeUserCount ?? 0} 人`}
            tooltip="系统中所有注册用户数量"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="角色数量"
            value={s?.roleCount ?? 0}
            icon={<SafetyCertificateOutlined />}
            color="#52c41a"
            sub="当前系统角色配置数"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="权限条目"
            value={s?.permissionCount ?? 0}
            icon={<LockOutlined />}
            color="#722ed1"
            sub="已配置的权限项总数"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="近 30 天登录失败"
            value={s?.loginFailCount ?? 0}
            icon={<WarningOutlined />}
            color={((s?.loginFailCount ?? 0) > 50) ? '#ff4d4f' : '#faad14'}
            sub="登录尝试失败累计次数"
            tooltip="来自 LoginAttempt 表的失败次数合计"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 近 30 天用户注册趋势 */}
        <Col xs={24} xl={16}>
          <Card bordered={false} title={<Text strong>近 30 天用户注册趋势</Text>}>
            {s?.newUsersTrend && s.newUsersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={s.newUsersTrend}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1677ff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReTooltip
                    formatter={(v: ValueType | undefined) => [`${v ?? 0} 人`, '新增用户']}
                    cursor={{ stroke: 'rgba(22,119,255,0.2)', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#1677ff"
                    strokeWidth={2}
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

        {/* 近 30 天审计事件分布 */}
        <Col xs={24} xl={8}>
          <Card bordered={false} title={<Text strong>近 30 天操作分布</Text>} style={{ height: '100%' }}>
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
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: ValueType | undefined, name: NameType | undefined) => [v ?? 0, name ?? '']} />
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
                        background: PIE_COLORS[idx % PIE_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>{ACTION_LABELS[r.action]?.label ?? r.action}</Text>
                  </div>
                  <Badge count={r.count} style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 近期审计事件 + 系统状态 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card bordered={false} title={<Text strong>最近操作记录</Text>}>
            {s?.recentAuditLogs && s.recentAuditLogs.length > 0 ? (
              <Timeline
                style={{ marginTop: 8 }}
                items={s.recentAuditLogs.map((log) => {
                  const meta = ACTION_LABELS[log.action];
                  return {
                    color: meta?.color === 'red' ? 'red' : meta?.color === 'warning' ? 'orange' : 'blue',
                    children: (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Tag
                            color={meta?.color ?? 'default'}
                            style={{ fontSize: 11, marginInlineEnd: 0 }}
                          >
                            {meta?.label ?? log.action}
                          </Tag>
                          <Text style={{ fontSize: 13 }}>
                            <strong>{log.actorUsername}</strong>
                            {log.targetLabel && ` → ${log.targetLabel}`}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </Text>
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description="暂无操作记录" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title={<Text strong>系统状态</Text>} style={{ height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  label: '总用户数',
                  value: s?.userCount ?? 0,
                  icon: <UserOutlined />,
                  color: '#1677ff',
                  sub: `其中活跃 ${s?.activeUserCount ?? 0} 人`,
                },
                {
                  label: '近30天新增',
                  value: s?.newUsersTrend.reduce((a, b) => a + b.count, 0) ?? 0,
                  icon: <ArrowUpOutlined />,
                  color: '#52c41a',
                  sub: '过去30天注册用户',
                },
                {
                  label: '角色 / 权限',
                  value: `${s?.roleCount ?? 0} / ${s?.permissionCount ?? 0}`,
                  icon: <SafetyCertificateOutlined />,
                  color: '#722ed1',
                  sub: '角色数 / 权限条目',
                },
                {
                  label: '登录失败 (30d)',
                  value: s?.loginFailCount ?? 0,
                  icon: <WarningOutlined />,
                  color: (s?.loginFailCount ?? 0) > 50 ? '#ff4d4f' : '#faad14',
                  sub: '登录尝试失败次数',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{item.value}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.label} · {item.sub}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 近 30 天每日分布柱图 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card bordered={false} title={<Text strong>近 30 天审计事件频次</Text>}>
            {s?.newUsersTrend ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={s.newUsersTrend}
                  barSize={10}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: ValueType | undefined) => [v ?? 0, '新增用户']} />
                  <Bar dataKey="count" fill="#1677ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
