'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import {
  GlobalOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';
import type { UserItem } from '@/types/user';
import type { PageResponse } from '@/types/request';
import type { TabsProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styles from '@/components/settings-content.module.css';

interface SystemSettings {
  site_name: string;
  site_description: string;
  site_logo: string;
  session_duration: string;
  max_login_attempts: string;
  allow_register: string;
}

const settingsLabelClassName = 'inline-block w-[110px]';

const getAdminColumns = (options: {
  operatingId: number | null;
  currentUserId: number | null;
  onToggleStatus: (user: UserItem) => void;
  onRemoveAdmin: (user: UserItem) => void;
}): ColumnsType<UserItem> => {
  const { operatingId, currentUserId, onToggleStatus, onRemoveAdmin } = options;

  return [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) => email || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) =>
        status === 1 ? (
          <Tag color="success">正常</Tag>
        ) : (
          <Space size={4}>
            <Tag color="warning">暂停</Tag>
            <Tooltip title="该用户已被暂停，管理员权限已自动撤销">
              <InfoCircleOutlined className="cursor-default text-slate-400" />
            </Tooltip>
          </Space>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_value: unknown, user: UserItem) => {
        const isBusy = operatingId === user.id;
        const isSelf = user.id === currentUserId;

        return (
          <Space size="small">
            <Popconfirm
              title={user.status === 1 ? '确认暂停该管理员？' : '确认启用该管理员？'}
              onConfirm={() => onToggleStatus(user)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" disabled={isBusy || isSelf}>
                {user.status === 1 ? '暂停' : '启用'}
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认撤销该管理员权限？"
              description="该用户将降为普通用户，账号本身不受影响"
              onConfirm={() => onRemoveAdmin(user)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger disabled={isBusy || isSelf}>
                撤销
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];
};

const SettingsContent = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [currentRole, setCurrentRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [adminUsers, setAdminUsers] = useState<UserItem[]>([]);
  const [normalUsers, setNormalUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [operatingId, setOperatingId] = useState<number | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<SystemSettings>('/api/settings');
      const settings = result.data;
      siteForm.setFieldsValue({
        site_name: settings.site_name,
        site_description: settings.site_description,
        site_logo: settings.site_logo,
      });
      securityForm.setFieldsValue({
        session_duration: Number(settings.session_duration),
        max_login_attempts: Number(settings.max_login_attempts),
        allow_register: settings.allow_register === 'true',
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, [siteForm, securityForm]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const result = await request<UserItem>('/api/profile');
      setCurrentRole(result.data.role);
      setCurrentUserId(result.data.id);
    } catch {
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const result = await request<PageResponse<UserItem>>('/api/users?pageSize=1000');
      const all = result.data.list;
      setAdminUsers(all.filter((u) => u.role === 'ADMIN'));
      setNormalUsers(all.filter((u) => u.role === 'USER'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, [loadSettings, loadCurrentUser]);

  const handleTabChange = (key: string) => {
    if (key === 'admin' && adminUsers.length === 0 && normalUsers.length === 0) {
      loadUsers();
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedUserId) return;
    try {
      setAddingAdmin(true);
      await request(`/api/users/${selectedUserId}/role`, {
        method: 'PATCH',
        data: { role: 'ADMIN' },
      });
      message.success('已添加为管理员');
      const user = normalUsers.find((u) => u.id === selectedUserId)!;
      setAdminUsers((prev) => [...prev, { ...user, role: 'ADMIN' }]);
      setNormalUsers((prev) => prev.filter((u) => u.id !== selectedUserId));
      setSelectedUserId(undefined);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (user: UserItem) => {
    try {
      setOperatingId(user.id);
      await request(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        data: { role: 'USER' },
      });
      message.success('已撤销管理员权限');
      setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
      setNormalUsers((prev) => [...prev, { ...user, role: 'USER' }]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setOperatingId(null);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    const isSuspending = user.status === 1;
    const newStatus = isSuspending ? 0 : 1;
    try {
      setOperatingId(user.id);
      await request(`/api/users/${user.id}`, {
        method: 'PUT',
        data: {
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          status: newStatus,
        },
      });
      if (isSuspending) {
        await request(`/api/users/${user.id}/role`, {
          method: 'PATCH',
          data: { role: 'USER' },
        });
        message.success('已暂停并降为普通用户');
        const updated = { ...user, status: newStatus, role: 'USER' };
        setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
        setNormalUsers((prev) => [...prev, updated]);
      } else {
        message.success('已启用');
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
        );
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setOperatingId(null);
    }
  };

  const handleSaveSite = async () => {
    try {
      const values = await siteForm.validateFields();
      setSaving(true);
      await request('/api/settings', { method: 'PUT', data: values });
      message.success('站点设置已保存');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      const values = await securityForm.validateFields();
      setSaving(true);
      await request('/api/settings', {
        method: 'PUT',
        data: {
          ...values,
          allow_register: String(values.allow_register),
        },
      });
      message.success('安全设置已保存');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setPasswordSaving(true);
      await request('/api/profile/password', {
        method: 'PUT',
        data: { oldPassword: values.oldPassword, newPassword: values.newPassword },
      });
      message.success('密码已修改，请重新登录');
      passwordForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const adminColumns = getAdminColumns({
    operatingId,
    currentUserId,
    onToggleStatus: handleToggleStatus,
    onRemoveAdmin: handleRemoveAdmin,
  });

  const tabItems: TabsProps['items'] = [
    {
      key: 'site',
      label: (
        <span>
          <GlobalOutlined className="mr-1.5" />
          站点设置
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          <Form form={siteForm} layout="vertical" className={styles.form}>
            <Form.Item
              label={<span className={settingsLabelClassName}>站点名称</span>}
              name="site_name"
              rules={[{ required: true, message: '请输入站点名称' }]}
            >
              <Input placeholder="请输入站点名称" />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>站点描述</span>}
              name="site_description"
            >
              <Input.TextArea
                placeholder="请输入站点描述"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>Logo URL</span>}
              name="site_logo"
              rules={[{ type: 'url', message: '请输入合法的 URL' }]}
            >
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>
            <Form.Item shouldUpdate={(prev, curr) => prev.site_logo !== curr.site_logo} noStyle>
              {({ getFieldValue, getFieldError }) => {
                const url = getFieldValue('site_logo');
                const hasError = getFieldError('site_logo').length > 0;
                if (!url || hasError) return null;
                return (
                  <Form.Item>
                    <div className={styles.logoPreview}>
                      <img src={url} alt="Logo 预览" className={styles.logoPreviewImg} />
                    </div>
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item className="mb-0">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveSite}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined className="mr-1.5" />
          安全设置
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          <Form form={securityForm} layout="vertical" className={styles.form}>
            <Form.Item
              label={<span className={settingsLabelClassName}>会话时长（天）</span>}
              name="session_duration"
              extra="用户登录后 Token 的有效期，超时后需重新登录"
              rules={[
                { required: true, message: '请输入会话时长' },
                { type: 'number', min: 1, max: 30, message: '请输入 1~30 之间的整数' },
              ]}
            >
              <InputNumber
                min={1}
                max={30}
                precision={0}
                className={styles.narrowNumberInput}
                addonAfter="天"
              />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>最大登录尝试次数</span>}
              name="max_login_attempts"
              extra="密码连续错误达到上限后，账号将被临时锁定"
              rules={[
                { required: true, message: '请输入最大登录尝试次数' },
                { type: 'number', min: 1, max: 20, message: '请输入 1~20 之间的整数' },
              ]}
            >
              <InputNumber
                min={1}
                max={20}
                precision={0}
                className={styles.narrowNumberInput}
                addonAfter="次"
              />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>允许用户注册</span>}
              name="allow_register"
              valuePropName="checked"
              extra="关闭后新用户将无法自行注册，仅可由管理员手动添加"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item className="mb-0">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveSecurity}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'password',
      label: (
        <span>
          <KeyOutlined className="mr-1.5" />
          修改密码
        </span>
      ),
      children: (
        <Card variant="borderless">
          <Form form={passwordForm} layout="vertical" className={styles.form}>
            <Form.Item
              label={<span className={settingsLabelClassName}>当前密码</span>}
              name="oldPassword"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>新密码</span>}
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不少于 6 位' },
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>确认新密码</span>}
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
            <Form.Item className="mb-0">
              <Button
                type="primary"
                icon={<KeyOutlined />}
                loading={passwordSaving}
                onClick={handleChangePassword}
              >
                确认修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    ...(currentRole === 'SUPER_ADMIN'
      ? [
          {
            key: 'admin',
            label: (
              <span>
                <TeamOutlined className="mr-1.5" />
                管理员设置
              </span>
            ),
            children: (
              <Card variant="borderless">
                <Space className={styles.adminToolbar}>
                  <Select
                    showSearch
                    placeholder="选择用户添加为管理员"
                    className={styles.adminUserSelect}
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={normalUsers.map((u) => ({
                      value: u.id,
                      label: `${u.username}（${u.nickname}）`,
                    }))}
                    loading={usersLoading}
                    allowClear
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedUserId}
                    loading={addingAdmin}
                    onClick={handleAddAdmin}
                  >
                    添加管理员
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={usersLoading}
                  dataSource={adminUsers}
                  columns={adminColumns}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                />
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Typography.Title level={4} className={styles.title}>
        系统设置
      </Typography.Title>
      <Tabs items={tabItems} onChange={handleTabChange} />
    </>
  );
};

export default SettingsContent;
