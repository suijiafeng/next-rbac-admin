'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Space,
  Tooltip,
  Typography,
  message,
  Avatar,
  Divider,
} from 'antd';
import type { FormInstance, Rule } from 'antd/es/form';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { request } from '@/lib/request';

const { Text } = Typography;

interface ProfileInfo {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  role: string;
  status: number;
  createdAt: string;
}

type EditableField = 'nickname' | 'email';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
};

const AVATAR_COLORS = [
  '#1677ff', '#52c41a', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
];
function avatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

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
  const errors = form.getFieldError(fieldName);
  const hasError = errors.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
      <Text type="secondary" style={{ width: 72, flexShrink: 0, fontSize: 13 }}>{label}</Text>
      <Space size={6} align="center">
        <Form.Item name={fieldName} rules={rules} validateTrigger={['onChange', 'onBlur']} style={{ margin: 0 }} noStyle>
          <Input
            size="small"
            style={{ width: 200 }}
            status={hasError ? 'error' : undefined}
            suffix={
              hasError ? (
                <Tooltip title={errors[0]} color="red">
                  <ExclamationCircleFilled style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                </Tooltip>
              ) : <span />
            }
          />
        </Form.Item>
        <Tooltip title="保存">
          <Button type="text" size="small" loading={submitLoading} icon={<CheckOutlined style={{ color: '#52c41a' }} />} style={{ padding: '0 4px', height: 22 }} onClick={onConfirm} />
        </Tooltip>
        <Tooltip title="取消">
          <Button type="text" size="small" icon={<CloseOutlined style={{ color: '#ff4d4f' }} />} style={{ padding: '0 4px', height: 22 }} onClick={onCancel} />
        </Tooltip>
      </Space>
    </div>
  );
}

function ReadonlyRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
      <Text type="secondary" style={{ width: 72, flexShrink: 0, fontSize: 13 }}>{label}</Text>
      <Space size={6}>
        <Text style={{ fontSize: 14 }}>{value || '—'}</Text>
        {onEdit && (
          <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />} style={{ padding: '0 4px', height: 22 }} onClick={onEdit} />
        )}
      </Space>
    </div>
  );
}

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [, forceUpdate] = useState(0);
  const [form] = Form.useForm<{ nickname: string; email: string }>();

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<ProfileInfo>('/api/profile');
      const user = result.data;
      setProfile(user);
      form.setFieldsValue({ nickname: user.nickname, email: user.email ?? '' });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取个人信息失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open) getProfile();
  }, [open, getProfile]);

  const handleEdit = (field: EditableField) => {
    form.setFields([{ name: 'nickname', errors: [] }, { name: 'email', errors: [] }]);
    setEditingField(field);
  };

  const handleCancel = (field: EditableField) => {
    form.setFieldValue(field, profile?.[field] ?? '');
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
      const result = await request<ProfileInfo>('/api/profile', { method: 'PUT', data: payload });
      message.success('保存成功');
      const user = result.data;
      setProfile(user);
      form.setFieldsValue({ nickname: user.nickname, email: user.email ?? '' });
      setEditingField(null);
    } catch (error) {
      forceUpdate((n) => n + 1);
      if (error instanceof Error) message.error(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const rows: Array<{ label: string; key: keyof ProfileInfo; editable?: EditableField; rules?: Rule[] }> = [
    { label: '用户名', key: 'username' },
    { label: '昵称', key: 'nickname', editable: 'nickname', rules: [{ required: true, message: '请输入昵称' }] },
    { label: '邮箱', key: 'email', editable: 'email', rules: [{ type: 'email', message: '邮箱格式不正确' }] },
    { label: '角色', key: 'role' },
    { label: '注册时间', key: 'createdAt' },
  ];

  const displayValue = (key: keyof ProfileInfo) => {
    if (!profile) return '—';
    const v = profile[key];
    if (v === null || v === undefined || v === '') return '—';
    if (key === 'role') return ROLE_LABEL[v as string] ?? String(v);
    if (key === 'createdAt') return new Date(v as string).toLocaleString('zh-CN');
    return String(v);
  };

  const bgColor = profile ? avatarColor(profile.username) : '#1677ff';
  const firstChar = profile ? (profile.nickname || profile.username)[0].toUpperCase() : '?';

  return (
    <Drawer
      title="个人信息"
      placement="right"
      width={360}
      open={open}
      onClose={() => { setEditingField(null); onClose(); }}
      loading={loading}
    >
      {profile && (
        <>
          {/* 头像区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Avatar size={56} style={{ backgroundColor: bgColor, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
              {firstChar}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>{profile.nickname}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                @{profile.username} · {ROLE_LABEL[profile.role] ?? profile.role}
              </div>
            </div>
          </div>

          <Divider style={{ margin: '0 0 16px' }} />

          {/* 字段列表 */}
          <Form form={form} onFieldsChange={() => forceUpdate((n) => n + 1)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rows.map((row) =>
                row.editable && editingField === row.editable ? (
                  <EditableRow
                    key={row.key}
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
                    key={row.key}
                    label={row.label}
                    value={row.editable ? (form.getFieldValue(row.editable) || displayValue(row.key)) : displayValue(row.key)}
                    onEdit={row.editable && editingField === null ? () => handleEdit(row.editable!) : undefined}
                  />
                )
              )}
            </div>
          </Form>
        </>
      )}
    </Drawer>
  );
}
