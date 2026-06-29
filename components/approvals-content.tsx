'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowRightOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@/lib/request';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/constants/permission';
import {
  roleLabel,
  parseRisks,
  evalRoleChangeRisks,
  type Risk,
} from '@/lib/governance';

const { Text } = Typography;

interface ChangeRequestItem {
  id: number;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  targetUserId: number;
  targetUsername: string;
  fromRole: string;
  toRole: string;
  reason: string | null;
  risks: string | null;
  requesterUsername: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface UserOption {
  id: number;
  username: string;
  role: string;
}

interface GovStats {
  pending: number;
  approved: number;
  rejected: number;
  decided: number;
  totalChanges: number;
  activeGrants: number;
  expiredGrants: number;
  revokedGrants: number;
  autoReclaimRate: number | null;
}

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待审批' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已驳回' },
};

function RoleDiff({ from, to }: { from: string; to: string }) {
  return (
    <Space size={6}>
      <Tag>{roleLabel(from)}</Tag>
      <ArrowRightOutlined style={{ fontSize: 12, color: 'var(--color-primary, #1677ff)' }} />
      <Tag color="blue">{roleLabel(to)}</Tag>
    </Space>
  );
}

function RiskTags({ risks }: { risks: Risk[] }) {
  if (!risks.length) return <Text type="secondary">无</Text>;
  return (
    <Space size={4} wrap>
      {risks.map((r, i) => (
        <Tag key={i} color={r.level === 'high' ? 'red' : 'orange'}>
          {r.text}
        </Tag>
      ))}
    </Space>
  );
}

export default function ApprovalsContent() {
  const { hasPermission } = usePermission();
  const canApprove = hasPermission(PERMISSIONS.CHANGE_APPROVE);

  const [scope, setScope] = useState<'todo' | 'mine'>(canApprove ? 'todo' : 'mine');
  const [list, setList] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deciding, setDeciding] = useState<number | null>(null);
  const [stats, setStats] = useState<GovStats | null>(null);

  // 发起变更弹窗
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form] = Form.useForm<{ targetUserId: number; toRole: 'ADMIN' | 'USER'; reason?: string }>();
  const selectedUserId = Form.useWatch('targetUserId', form);
  const selectedToRole = Form.useWatch('toRole', form);

  const loadStats = useCallback(async () => {
    try {
      const res = await request<GovStats>('/api/governance/stats');
      setStats(res.data);
    } catch {
      // 指标加载失败不阻塞主流程
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ list: ChangeRequestItem[] }>('/api/change-requests', {
        params: { scope, pageSize: 100 },
      });
      setList(res.data.list);
      loadStats();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [scope, loadStats]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = async () => {
    form.resetFields();
    setOpen(true);
    try {
      const res = await request<{ list: UserOption[] }>('/api/users', {
        params: { pageSize: 100 },
      });
      // 仅允许对非超管发起变更
      setUsers(res.data.list.filter((u) => u.role !== 'SUPER_ADMIN'));
    } catch {
      setUsers([]);
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await request('/api/change-requests', {
        method: 'POST',
        data: {
          type: 'ASSIGN_ROLE',
          targetUserId: values.targetUserId,
          toRole: values.toRole,
          reason: values.reason,
        },
      });
      message.success('已提交审批');
      setOpen(false);
      if (scope !== 'mine') setScope('mine');
      else load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    setDeciding(id);
    try {
      const res = await request<boolean>(`/api/change-requests/${id}/decision`, {
        method: 'POST',
        data: { decision },
      });
      message.success(res.message || (decision === 'approve' ? '已通过' : '已驳回'));
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setDeciding(null);
    }
  };

  // 弹窗内实时预览：当前用户角色 → 目标角色 + 风险
  const fromRolePreview = users.find((u) => u.id === selectedUserId)?.role;
  const previewRisks =
    fromRolePreview && selectedToRole
      ? evalRoleChangeRisks({ fromRole: fromRolePreview, toRole: selectedToRole })
      : [];

  const columns: ColumnsType<ChangeRequestItem> = [
    { title: '申请人', dataIndex: 'requesterUsername', width: 120 },
    {
      title: '变更对象',
      dataIndex: 'targetUsername',
      width: 130,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '角色变更',
      key: 'diff',
      width: 200,
      render: (_, r) => <RoleDiff from={r.fromRole} to={r.toRole} />,
    },
    {
      title: '风险',
      key: 'risks',
      render: (_, r) => <RiskTags risks={parseRisks(r.risks)} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => {
        const t = STATUS_TAG[s] ?? { color: 'default', text: s };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, r) => {
        if (r.status !== 'PENDING') {
          return <Text type="secondary">{r.decidedByUsername ? `${r.decidedByUsername} 已处理` : '—'}</Text>;
        }
        if (!canApprove) return <Text type="secondary">待审批</Text>;
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              loading={deciding === r.id}
              onClick={() => decide(r.id, 'approve')}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              loading={deciding === r.id}
              onClick={() => decide(r.id, 'reject')}
            >
              驳回
            </Button>
          </Space>
        );
      },
    },
  ];

  const tabItems = canApprove
    ? [
        { key: 'todo', label: '待我审批' },
        { key: 'mine', label: '我发起的' },
      ]
    : [{ key: 'mine', label: '我发起的' }];

  return (
    <Card
      variant="borderless"
      title="审批中心"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          发起角色变更
        </Button>
      }
    >
      {stats && (
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={stats.pending ? { color: '#d46b08' } : undefined}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="已通过" value={stats.approved} valueStyle={{ color: '#389e0d' }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="已驳回" value={stats.rejected} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="生效中临时授权" value={stats.activeGrants} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="已自动回收" value={stats.expiredGrants} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title="按时回收率"
              value={stats.autoReclaimRate ?? '—'}
              suffix={stats.autoReclaimRate != null ? '%' : ''}
            />
          </Col>
        </Row>
      )}
      <Tabs
        activeKey={scope}
        onChange={(k) => setScope(k as 'todo' | 'mine')}
        items={tabItems}
      />
      <Table<ChangeRequestItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 980 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        expandable={{
          rowExpandable: (r) => Boolean(r.reason),
          expandedRowRender: (r) => (
            <Text type="secondary">变更理由：{r.reason || '（未填写）'}</Text>
          ),
        }}
      />

      <Modal
        title="发起角色变更"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="提交审批"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="目标用户"
            name="targetUserId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              showSearch
              placeholder="选择要变更角色的用户"
              optionFilterProp="label"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.username}（当前：${roleLabel(u.role)}）`,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="目标角色"
            name="toRole"
            rules={[{ required: true, message: '请选择目标角色' }]}
          >
            <Select
              placeholder="选择目标角色"
              options={[
                { value: 'ADMIN', label: '管理员 (ADMIN)' },
                { value: 'USER', label: '普通用户 (USER)' },
              ]}
            />
          </Form.Item>

          {fromRolePreview && selectedToRole && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                background: 'var(--fill-quaternary, #fafafa)',
                borderRadius: 8,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ marginRight: 8 }}>
                  变更预览：
                </Text>
                <RoleDiff from={fromRolePreview} to={selectedToRole} />
              </div>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>
                  风险：
                </Text>
                <RiskTags risks={previewRisks} />
              </div>
            </div>
          )}

          <Form.Item label="变更理由" name="reason">
            <Input.TextArea rows={3} placeholder="简要说明变更原因（便于审批与审计回溯）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
