'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { FormInstance, Rule } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd/es/upload';
import {
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  LockOutlined,
} from '@ant-design/icons';

import { request } from '@/lib/request';

const { Text } = Typography;

interface ProfileInfo {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  avatar: string | null;
  role: string;
  status: number;
  createdAt: string;
}

interface ProfileApiResponse {
  user: ProfileInfo;
  role: string;
  permissions: string[];
}

interface LoginHistoryItem {
  id: number;
  action: string;
  detail: string | null;
  createdAt: string;
}

type EditableField = 'nickname' | 'email';

// 只读展示行
function ReadonlyRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
      <Text type="secondary" style={{ width: 80, flexShrink: 0 }}>
        {label}
      </Text>
      <Space size={6}>
        <Text>{value || '-'}</Text>
        {onEdit && (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ fontSize: 13, color: 'var(--text-tertiary)' }} />}
            style={{ padding: '0 4px', height: 22 }}
            onClick={onEdit}
          />
        )}
      </Space>
    </div>
  );
}

// 编辑行（含表单校验 + 红色感叹号 Tooltip）
function EditableRow({
  label,
  fieldName,
  rules,
  form,
  submitLoading,
  onConfirm,
  onCancel,
}: {
  label: string;
  fieldName: EditableField;
  rules: Rule[];
  form: FormInstance<{ nickname: string; email: string }>;
  submitLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const errors: string[] = form.getFieldError(fieldName);
  const hasError = errors.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
      <Text type="secondary" style={{ width: 80, flexShrink: 0 }}>
        {label}
      </Text>
      <Space size={6} align="center">
        <Form.Item
          name={fieldName}
          rules={rules}
          validateTrigger={['onChange', 'onBlur']}
          style={{ margin: 0 }}
          noStyle
        >
          <Input
            style={{ width: 220 }}
            size="small"
            status={hasError ? 'error' : undefined}
            suffix={
              hasError ? (
                <Tooltip title={errors[0]} color="red">
                  <ExclamationCircleFilled style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                </Tooltip>
              ) : (
                <span />
              )
            }
          />
        </Form.Item>

        <Tooltip title="保存">
          <Button
            type="text"
            size="small"
            loading={submitLoading}
            icon={<CheckOutlined style={{ color: '#52c41a' }} />}
            style={{ padding: '0 4px', height: 22 }}
            onClick={onConfirm}
          />
        </Tooltip>

        <Tooltip title="取消">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined style={{ color: '#ff4d4f' }} />}
            style={{ padding: '0 4px', height: 22 }}
            onClick={onCancel}
          />
        </Tooltip>
      </Space>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  'user.login': '登录',
  'user.password_change': '修改密码',
};

function LoginHistoryTab() {
  const [list, setList] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await request<{ list: LoginHistoryItem[]; total: number }>(
        '/api/profile/login-history',
        { params: { page: p, pageSize } },
      );
      setList(res.data.list);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      message.error('获取操作记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<LoginHistoryItem> = [
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 120,
      render: (v: string) => (
        <Tag color={v === 'user.login' ? 'green' : 'gold'}>
          {ACTION_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'IP 地址',
      key: 'ip',
      width: 140,
      render: (_: unknown, record: LoginHistoryItem) => {
        try {
          const detail = record.detail ? JSON.parse(record.detail) as { ip?: string } : null;
          return <Text style={{ fontSize: 13 }}>{detail?.ip ?? '-'}</Text>;
        } catch {
          return '-';
        }
      },
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card title="操作记录" bordered={false}>
      <Table
        rowKey="id"
        size="small"
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
    </Card>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [, forceUpdate] = useState(0); // 触发重渲以显示校验错误

  const [form] = Form.useForm<{ nickname: string; email: string }>();

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<ProfileApiResponse>('/api/profile');
      const user = result.data.user;
      setProfile(user);
      form.setFieldsValue({
        nickname: user.nickname,
        email: user.email ?? '',
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取个人信息失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const handleEdit = (field: EditableField) => {
    form.setFields([
      { name: 'nickname', errors: [] },
      { name: 'email', errors: [] },
    ]);
    setEditingField(field);
  };

  const handleCancel = (field: EditableField) => {
    // 恢复原始值
    form.setFieldValue(field, profile?.[field] ?? '');
    // antd v5 用 resetFields 针对单字段
    form.setFields([{ name: field, errors: [] }]);
    setEditingField(null);
  };

  const handleConfirm = async (field: EditableField) => {
    try {
      const values = await form.validateFields([field]);

      if (!profile) return;

      setSubmitLoading(true);

      const payload = {
        nickname: field === 'nickname' ? values.nickname : (form.getFieldValue('nickname') || profile.nickname),
        email: field === 'email' ? (values.email || '') : (form.getFieldValue('email') || profile.email || ''),
      };

      const result = await request<ProfileInfo>('/api/profile', {
        method: 'PUT',
        data: payload,
      });

      message.success('保存成功');

      const user = result.data;
      setProfile(user);
      form.setFieldsValue({
        nickname: user.nickname,
        email: user.email ?? '',
      });
      setEditingField(null);
    } catch (error) {
      // validateFields 抛出校验错误时触发重渲以展示红色感叹号
      forceUpdate((n) => n + 1);
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAvatarUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json() as { code: number; data: { avatarUrl: string }; message: string };
      if (data.code !== 0) throw new Error(data.message);
      message.success('头像更新成功');
      setProfile((prev) => prev ? { ...prev, avatar: data.data.avatarUrl } : prev);
      onSuccess?.(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败');
      onError?.(error instanceof Error ? error : new Error('upload error'));
    } finally {
      setAvatarLoading(false);
    }
  };

  const displayValue = (key: keyof ProfileInfo) => {
    if (!profile) return '-';
    const v = profile[key];
    if (v === null || v === undefined || v === '') return '-';
    if (key === 'status') return v === 1 ? '启用' : '禁用';
    if (key === 'createdAt') return new Date(v as string).toLocaleString();
    return String(v);
  };

  const rows: Array<{
    label: string;
    key: keyof ProfileInfo;
    editable?: EditableField;
    rules?: Rule[];
  }> = [
      { label: '用户名', key: 'username' },
      {
        label: '昵称',
        key: 'nickname',
        editable: 'nickname',
        rules: [{ required: true, message: '请输入昵称' }],
      },
      {
        label: '邮箱',
        key: 'email',
        editable: 'email',
        rules: [{ type: 'email', message: '邮箱格式不正确' }],
      },
      { label: '角色', key: 'role' },
      { label: '状态', key: 'status' },
      { label: '创建时间', key: 'createdAt' },
    ];

  const displayName = profile?.nickname || profile?.username || '?';
  const avatarSrc = profile?.avatar || undefined;

  const infoTab = (
    <Card loading={loading} bordered={false}>
      {/* 头像区域 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            size={72}
            src={avatarSrc}
            style={{ background: '#1677ff', fontSize: 28, fontWeight: 700 }}
          >
            {!avatarSrc && displayName[0]?.toUpperCase()}
          </Avatar>
          <Upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            showUploadList={false}
            customRequest={handleAvatarUpload}
          >
            <Button
              type="text"
              size="small"
              loading={avatarLoading}
              icon={<CameraOutlined />}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: '#fff',
                padding: 0,
                minWidth: 0,
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Upload>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{displayName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>点击头像右下角相机图标上传新头像（JPG/PNG/WebP，≤2MB）</Text>
        </div>
      </div>

      <Form form={form} onFieldsChange={() => forceUpdate((n) => n + 1)}>
        <Row gutter={[24, 20]}>
          {rows.map((row) => (
            <Col span={12} key={row.key}>
              {row.editable && editingField === row.editable ? (
                <EditableRow
                  label={row.label}
                  fieldName={row.editable}
                  rules={row.rules || []}
                  form={form}
                  submitLoading={submitLoading}
                  onConfirm={() => handleConfirm(row.editable!)}
                  onCancel={() => handleCancel(row.editable!)}
                />
              ) : (
                <ReadonlyRow
                  label={row.label}
                  value={row.editable ? (form.getFieldValue(row.editable) || displayValue(row.key)) : displayValue(row.key)}
                  onEdit={row.editable && editingField === null ? () => handleEdit(row.editable!) : undefined}
                />
              )}
            </Col>
          ))}
        </Row>
      </Form>
    </Card>
  );

  return (
    <Tabs
      defaultActiveKey="info"
      items={[
        { key: 'info', label: '个人信息', children: infoTab },
        { key: 'password', label: '修改密码', children: <ChangePasswordCard /> },
        { key: 'history', label: '操作记录', children: <LoginHistoryTab /> },
      ]}
    />
  );
}

interface ChangePasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordCard() {
  const [pwForm] = Form.useForm<ChangePasswordFormValues>();
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      const values = await pwForm.validateFields();
      setPwLoading(true);
      await request('/api/profile/password', {
        method: 'POST',
        data: {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        },
      });
      message.success('密码修改成功');
      pwForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <LockOutlined />
          修改密码
        </Space>
      }
    >
      <Form
        form={pwForm}
        layout="vertical"
        style={{ maxWidth: 360 }}
        autoComplete="off"
      >
        <Form.Item
          label="旧密码"
          name="oldPassword"
          rules={[{ required: true, message: '请输入旧密码' }]}
        >
          <Input.Password placeholder="请输入当前密码" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于 6 位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码（至少 6 位）" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" loading={pwLoading} onClick={handleChangePassword}>
            确认修改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
