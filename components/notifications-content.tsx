'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@/lib/request';
import { formatDateTime } from '@/lib/format';
import type { PageResponse } from '@/types/request';
import styles from '@/components/notifications-content.module.css';

const { Text } = Typography;

interface AuditLogItem {
  id: number;
  actorId: number | null;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  detail: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'user.create': { label: '新增用户', color: 'cyan' },
  'user.delete': { label: '删除用户', color: 'red' },
  'role.grant_admin': { label: '授予管理员', color: 'blue' },
  'role.revoke_admin': { label: '撤销管理员', color: 'orange' },
  'user.suspend': { label: '暂停用户', color: 'warning' },
  'user.unsuspend': { label: '启用用户', color: 'success' },
  'user.reset_password': { label: '重置密码', color: 'purple' },
  'user.password_change': { label: '修改密码', color: 'gold' },
  'settings.update': { label: '修改设置', color: 'geekblue' },
  'user.login': { label: '用户登录', color: 'green' },
};

const TARGET_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: '用户', color: 'blue' },
  settings: { label: '系统设置', color: 'purple' },
};

const ACTION_RISK: Record<string, { label: string; color: string }> = {
  'user.delete': { label: '高', color: 'red' },
  'role.grant_admin': { label: '高', color: 'volcano' },
  'role.revoke_admin': { label: '中', color: 'orange' },
  'user.suspend': { label: '中', color: 'gold' },
  'user.reset_password': { label: '中', color: 'gold' },
  'settings.update': { label: '中', color: 'geekblue' },
  'user.create': { label: '低', color: 'green' },
  'user.unsuspend': { label: '低', color: 'lime' },
  'user.password_change': { label: '低', color: 'cyan' },
  'user.login': { label: '低', color: 'success' },
};

const RISK_SCORE: Record<string, number> = {
  高: 100,
  中: 60,
  低: 20,
  未知: 0,
};

const PAGE_SIZE = 20;

function formatDetail(detail: string | null): string {
  if (!detail) return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}

function detailSummary(detail: string | null): string {
  if (!detail) return '-';
  try {
    const parsed = JSON.parse(detail) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>).slice(0, 3);
      if (entries.length === 0) return '空详情';
      return entries
        .map(([k, v]) => `${k}: ${v == null ? '-' : String(v)}`)
        .join(' · ');
    }
    if (Array.isArray(parsed)) return `数组数据(${parsed.length})`;
    return String(parsed);
  } catch {
    return detail;
  }
}

function getRiskMeta(action: string): { label: string; color: string } {
  return ACTION_RISK[action] ?? { label: '未知', color: 'default' };
}

export default function AuditLogsContent() {
  const [list, setList] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const [detail, setDetail] = useState<AuditLogItem | null>(null);

  const riskOverview = useMemo(() => {
    const high = list.filter((item) => getRiskMeta(item.action).label === '高').length;
    const medium = list.filter((item) => getRiskMeta(item.action).label === '中').length;
    const low = list.filter((item) => getRiskMeta(item.action).label === '低').length;

    return { high, medium, low };
  }, [list]);

  const load = useCallback(
    async (
      p = 1,
      size = pageSize,
      action = actionFilter,
      actor = actorFilter,
      range = dateRange,
    ) => {
      setLoading(true);
      try {
        const res = await request<PageResponse<AuditLogItem>>('/api/admin/audit-logs', {
          params: {
            page: p,
            pageSize: size,
            action,
            actorUsername: actor,
            startDate: range?.[0] ?? '',
            endDate: range?.[1] ?? '',
          },
        });
        setList(res.data.list);
        setTotal(res.data.total);
        setPage(p);
        setPageSize(size);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '获取审计日志失败');
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, actorFilter, dateRange, pageSize],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setActionFilter('');
    setActorFilter('');
    setDateRange(null);
    load(1, pageSize, '', '', null);
  };

  const handleExport = () => {
    if (list.length === 0) {
      message.info('暂无数据');
      return;
    }
    const headers = ['ID', '时间', '操作人', '动作', '风险', '对象类型', '对象', '摘要', '详情'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...list.map((r) =>
        [
          r.id,
          formatDateTime(r.createdAt),
          r.actorUsername,
          ACTION_LABELS[r.action]?.label ?? r.action,
          getRiskMeta(r.action).label,
          r.targetType,
          r.targetLabel ?? r.targetId ?? '',
          detailSummary(r.detail),
          r.detail ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${list.length} 条`);
  };

  const columns: ColumnsType<AuditLogItem> = [
    // {
    //   title: 'ID',
    //   dataIndex: 'id',
    //   width: 80,
    //   render: (id: number) => <Text type="secondary">#{id}</Text>,
    // },
        {
      title: '操作人',
      dataIndex: 'actorUsername',
      width: 140,
      render: (actorUsername: string, row) => (
        <Space size={6}>
          <Text>{actorUsername || 'system'}</Text>
          {row.actorId ? <Text type="secondary">#{row.actorId}</Text> : <Tag>系统</Tag>}
        </Space>
      ),
    },


    {
      title: '动作',
      dataIndex: 'action',
      width: 170,
      render: (action: string) => {
        const meta = ACTION_LABELS[action];
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{action}</Tag>;
      },
    },
    {
      title: '风险',
      dataIndex: 'action',
      width: 88,
      render: (action: string) => {
        const risk = getRiskMeta(action);
        return (
          <Space size={6}>
            <Tag color={risk.color}>{risk.label}</Tag>
          </Space>
        );
      },
      sorter: (a, b) => RISK_SCORE[getRiskMeta(a.action).label] - RISK_SCORE[getRiskMeta(b.action).label],
      defaultSortOrder: 'descend',
    },
    {
      title: '对象类型',
      dataIndex: 'targetType',
      width: 110,
      render: (targetType: string) => {
        const targetMeta = TARGET_TYPE_LABELS[targetType] ?? { label: targetType, color: 'default' };
        return <Tag color={targetMeta.color}>{targetMeta.label}</Tag>;
      },
    },
    {
      title: '对象',
      key: 'target',
      width: 220,
      render: (_v, row) => {
        const targetText = row.targetLabel || row.targetId || '-';

        return (
          <div>
            <div>
              {targetText}
             </div>
          </div>
        );
      },
    },
        {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '摘要',
      dataIndex: 'detail',
      width: 280,
      render: (detail: string | null) => {
        const summary = detailSummary(detail);
        return (
          <Tooltip title={summary === '-' ? undefined : summary}>
            <Text ellipsis className={styles.summaryText}>
              {summary}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '详情',
      dataIndex: 'detail',
      width: 110,
      render: (_v, row) =>
        row.detail ? (
          <Button type="link" size="small" onClick={() => setDetail(row)}>
            查看详情
          </Button>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card variant="borderless" className={styles.filterCard}>
        <div className={styles.filterRow}>
          <Select
            allowClear
            placeholder="按动作筛选"
            style={{ width: 180 }}
            value={actionFilter || undefined}
            onChange={(v) => {
              const next = v || '';
              setActionFilter(next);
              load(1, pageSize, next, actorFilter, dateRange);
            }}
            options={Object.entries(ACTION_LABELS).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          <Input
            allowClear
            placeholder="操作人用户名"
            style={{ width: 160 }}
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            onPressEnter={() => load(1, pageSize, actionFilter, actorFilter, dateRange)}
          />
          <DatePicker.RangePicker
            className={styles.filterControlDate}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
            onChange={(_, strings) => {
              const range =
                strings[0] && strings[1] ? ([strings[0], strings[1]] as [string, string]) : null;
              setDateRange(range);
              load(1, pageSize, actionFilter, actorFilter, range);
            }}
          />
          <Button
            type="primary"
            onClick={() => load(1, pageSize, actionFilter, actorFilter, dateRange)}
            loading={loading}
          >
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => load(page, pageSize, actionFilter, actorFilter, dateRange)}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </Card>

      <Card variant="borderless" className={styles.tableCard}>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={list}
          columns={columns}
          scroll={{ x: 1350 }}
          rowClassName={(record) => {
            const riskLabel = getRiskMeta(record.action).label;

            if (riskLabel === '高') {
              return styles.rowHigh;
            }

            if (riskLabel === '中') {
              return styles.rowMedium;
            }

            return '';
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, s) => load(p, s, actionFilter, actorFilter, dateRange),
          }}
        />
      </Card>

      <Modal
        title="审计详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={560}
      >
        {detail && (
          <div>
            <p style={{ margin: '4px 0' }}>
              <Text type="secondary">时间：</Text>
              {formatDateTime(detail.createdAt)}
            </p>
            <p style={{ margin: '4px 0' }}>
              <Text type="secondary">操作人：</Text>
              {detail.actorUsername}
            </p>
            <p style={{ margin: '4px 0' }}>
              <Text type="secondary">动作：</Text>
              {ACTION_LABELS[detail.action]?.label ?? detail.action}
            </p>
            <p style={{ margin: '4px 0' }}>
              <Text type="secondary">对象：</Text>
              {detail.targetLabel || detail.targetId || '-'}
            </p>
            {detail.detail && (
              <pre className={styles.detailBlock}>
                {formatDetail(detail.detail)}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
