'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@/lib/request';
import type { PageResponse } from '@/types/request';

const { Title, Text } = Typography;

interface NotificationItem {
  id: number;
  actorUsername: string;
  action: string;
  targetType: string;
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
  'settings.update': { label: '修改设置', color: 'geekblue' },
  'user.login': { label: '用户登录', color: 'green' },
  'user.password_change': { label: '修改密码', color: 'gold' },
};

export default function NotificationsContent() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async (p = 1, action = actionFilter) => {
    setLoading(true);
    try {
      const res = await request<PageResponse<NotificationItem>>('/api/admin/notifications', {
        params: { page: p, pageSize, action },
      });
      setList(res.data.list);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [actionFilter, pageSize]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<NotificationItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作人',
      dataIndex: 'actorUsername',
      width: 120,
    },
    {
      title: '事件类型',
      dataIndex: 'action',
      width: 140,
      render: (v: string) => {
        const meta = ACTION_LABELS[v];
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: '操作对象',
      key: 'target',
      render: (_: unknown, row: NotificationItem) => (
        <Text style={{ fontSize: 13 }}>
          {row.targetLabel ?? row.targetType ?? '-'}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          通知中心
        </Title>
        <Space>
          <Select
            allowClear
            placeholder="按事件类型筛选"
            style={{ width: 180 }}
            value={actionFilter || undefined}
            onChange={(v) => {
              const next = v || '';
              setActionFilter(next);
              load(1, next);
            }}
            options={Object.entries(ACTION_LABELS).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load(1, actionFilter)} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {Object.entries(ACTION_LABELS).slice(0, 4).map(([action, meta]) => {
          const count = list.filter((item) => item.action === action).length;
          return (
            <Col key={action} xs={12} sm={6}>
              <Card size="small" bordered={false}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{meta.label}</Text>
                  <Badge count={count} style={{ backgroundColor: count > 0 ? '#1677ff' : '#d9d9d9' }} />
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card bordered={false}>
        {list.length === 0 && !loading ? (
          <Empty description="暂无通知" />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            loading={loading}
            dataSource={list}
            columns={columns}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p) => load(p),
              size: 'small',
            }}
          />
        )}
      </Card>
    </div>
  );
}
