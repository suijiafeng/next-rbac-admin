'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import type { FormInstance, Rule } from 'antd/es/form';
import {
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
  role: string;
  status: number;
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [, forceUpdate] = useState(0); // 触发重渲以显示校验错误

  const [form] = Form.useForm<{ nickname: string; email: string }>();

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<ProfileInfo>('/api/profile');
      const user = result.data;
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

  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <Card loading={loading} title="个人信息">
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
      </Col>
      <Col span={24}>
        <ChangePasswordCard />
      </Col>
    </Row>
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
