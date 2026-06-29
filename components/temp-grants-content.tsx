'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { InfoCircleOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@/lib/request';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/constants/permission';
import {
  roleLabel,
  evalTempGrantRisks,
  conditionLabel,
  isConditionSatisfiedNow,
  type Risk,
} from '@/lib/governance';

const { Text } = Typography;

interface TempGrantItem {
  id: number;
  userId: number;
  username: string;
  grantedRole: string;
  fromRole: string;
  condition: string | null;
  reason: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  grantedByUsername: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedByUsername: string | null;
}

interface UserOption {
  id: number;
  username: string;
  role: string;
}

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  ACTIVE: { color: 'processing', text: '生效中' },
  EXPIRED: { color: 'default', text: '已过期' },
  REVOKED: { color: 'error', text: '已回收' },
};

const HOUR_OPTIONS = [1, 2, 4, 8, 24].map((h) => ({ value: h, label: `${h} 小时` }));

function remaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '已到期';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `剩 ${h} 小时 ${m} 分` : `剩 ${m} 分`;
}

export default function TempGrantsContent() {
  const { hasPermission } = usePermission();
  const canRevoke = hasPermission(PERMISSIONS.TEMP_REVOKE);

  const [list, setList] = useState<TempGrantItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form] = Form.useForm<{
    targetUserId: number;
    hours: number;
    reason?: string;
    businessHoursOnly?: boolean;
  }>();
  const hours = Form.useWatch('hours', form);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ list: TempGrantItem[] }>('/api/temp-grants', {
        params: { pageSize: 100 },
      });
      setList(res.data.list);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
      // 临时授权仅用于把普通用户临时提升为管理员
      setUsers(res.data.list.filter((u) => u.role === 'USER'));
    } catch {
      setUsers([]);
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = await request('/api/temp-grants', {
        method: 'POST',
        data: {
          targetUserId: values.targetUserId,
          grantedRole: 'ADMIN',
          hours: values.hours,
          reason: values.reason,
          businessHoursOnly: values.businessHoursOnly || false,
        },
      });
      message.success(res.message || '已授予');
      setOpen(false);
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '授予失败');
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id: number) => {
    setRevoking(id);
    try {
      await request(`/api/temp-grants/${id}/revoke`, { method: 'POST' });
      message.success('已回收');
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '回收失败');
    } finally {
      setRevoking(null);
    }
  };

  const previewRisks: Risk[] = hours
    ? evalTempGrantRisks({ grantedRole: 'ADMIN', hours })
    : [];

  const columns: ColumnsType<TempGrantItem> = [
    { title: '用户', dataIndex: 'username', width: 130, render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '临时角色',
      dataIndex: 'grantedRole',
      width: 110,
      render: (v: string) => <Tag color="blue">{roleLabel(v)}</Tag>,
    },
    {
      title: '生效约束',
      dataIndex: 'condition',
      width: 190,
      render: (c: string | null, r) => {
        if (!c) return <Text type="secondary">无约束</Text>;
        const label = conditionLabel(c);
        if (r.status !== 'ACTIVE') return <Tag>{label}</Tag>;
        const effective = isConditionSatisfiedNow(c);
        return (
          <Space direction="vertical" size={0}>
            <Tag color="geekblue">{label}</Tag>
            <Text type={effective ? 'success' : 'secondary'} style={{ fontSize: 12 }}>
              {effective ? '● 时段内 · 生效中' : '○ 时段外 · 已挂起'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const t = STATUS_TAG[s] ?? { color: 'default', text: s };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    { title: '授予人', dataIndex: 'grantedByUsername', width: 120 },
    {
      title: '到期时间',
      dataIndex: 'expiresAt',
      width: 220,
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text>{new Date(v).toLocaleString('zh-CN')}</Text>
          {r.status === 'ACTIVE' && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {remaining(v)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, r) => {
        if (r.status !== 'ACTIVE') {
          return <Text type="secondary">—</Text>;
        }
        if (!canRevoke) return <Text type="secondary">生效中</Text>;
        return (
          <Button
            type="link"
            size="small"
            danger
            icon={<ThunderboltOutlined />}
            loading={revoking === r.id}
            onClick={() => revoke(r.id)}
          >
            立即回收
          </Button>
        );
      },
    },
  ];

  return (
    <Card
      variant="borderless"
      title={
        <Space size={6}>
          <span>临时授权</span>
          <Tooltip title="把普通用户临时提升为管理员，到期由系统自动回收（每次拉取列表与定时任务都会扫描回收）。">
            <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
          </Tooltip>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          授予临时权限
        </Button>
      }
    >
      <Table<TempGrantItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 920 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        expandable={{
          rowExpandable: (r) => Boolean(r.reason),
          expandedRowRender: (r) => <Text type="secondary">授予理由：{r.reason || '（未填写）'}</Text>,
        }}
      />

      <Modal
        title="授予临时权限"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="确认授予"
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
              placeholder="选择要临时提升的普通用户"
              optionFilterProp="label"
              options={users.map((u) => ({ value: u.id, label: u.username }))}
              notFoundContent="没有可提升的普通用户"
            />
          </Form.Item>
          <Form.Item label="临时角色">
            <Input value="管理员 (ADMIN)" disabled />
          </Form.Item>
          <Form.Item
            label="有效时长"
            name="hours"
            rules={[{ required: true, message: '请选择时长' }]}
          >
            <Select placeholder="选择有效时长" options={HOUR_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="仅工作时间内生效（ABAC 约束）"
            name="businessHoursOnly"
            valuePropName="checked"
            tooltip="开启后，该临时管理员权限仅在 09:00–21:00 生效；时段外自动挂起，到期前不会删除记录"
          >
            <Switch checkedChildren="仅工作时间" unCheckedChildren="不限时段" />
          </Form.Item>

          {hours ? (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                background: 'var(--fill-quaternary, #fafafa)',
                borderRadius: 8,
              }}
            >
              <Text type="secondary" style={{ marginRight: 8 }}>
                风险：
              </Text>
              {previewRisks.length ? (
                <Space size={4} wrap>
                  {previewRisks.map((r, i) => (
                    <Tag key={i} color={r.level === 'high' ? 'red' : 'orange'}>
                      {r.text}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">无</Text>
              )}
            </div>
          ) : null}

          <Form.Item label="授予理由" name="reason">
            <Input.TextArea rows={3} placeholder="简要说明授予原因（便于审计回溯）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
