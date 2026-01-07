'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
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
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';
import type { UserItem } from '@/types/user';
import type { PageResponse } from '@/types/request';

interface SystemSettings {
  site_name: string;
  site_description: string;
  site_logo: string;
  session_duration: string;
  max_login_attempts: string;
  allow_register: string;
}

export default function SettingsContent() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [currentRole, setCurrentRole] = useState<string>('');

  // 管理员设置相关状态
  const [adminUsers, setAdminUsers] = useState<UserItem[]>([]);
  const [normalUsers, setNormalUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [operatingId, setOperatingId] = useState<number | null>(null);

  // 编辑弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm] = Form.useForm();
  const [editSaving, setEditSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<SystemSettings>('/api/settings');
      const s = result.data;
      siteForm.setFieldsValue({
        site_name: s.site_name,
        site_description: s.site_description,
        site_logo: s.site_logo,
      });
      securityForm.setFieldsValue({
        session_duration: Number(s.session_duration),
        max_login_attempts: Number(s.max_login_attempts),
        allow_register: s.allow_register === 'true',
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
    } catch {
      // ignore
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

  // 添加管理员
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

  // 删除管理员（降为普通用户）
  const handleRemoveAdmin = async (user: UserItem) => {
    try {
      setOperatingId(user.id);
      await request(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        data: { role: 'USER' },
      });
      message.success('已移除管理员权限');
      setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
      setNormalUsers((prev) => [...prev, { ...user, role: 'USER' }]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setOperatingId(null);
    }
  };

  // 暂停 / 启用
  const handleToggleStatus = async (user: UserItem) => {
    const isSuspending = user.status === 1;
    const newStatus = isSuspending ? 0 : 1;
    try {
      setOperatingId(user.id);
      // 更新状态
      await request(`/api/users/${user.id}`, {
        method: 'PUT',
        data: {
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          status: newStatus,
        },
      });
      // 暂停时同步降为普通用户
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

  // 打开编辑弹窗
  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    editForm.setFieldsValue({ nickname: user.nickname, email: user.email });
    setEditModalOpen(true);
  };

  // 保存编辑
  const handleEditSave = async () => {
    if (!editingUser) return;
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      await request(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        data: {
          username: editingUser.username,
          nickname: values.nickname,
          email: values.email || null,
          status: editingUser.status,
        },
      });
      message.success('编辑成功');
      setAdminUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, nickname: values.nickname, email: values.email || null }
            : u,
        ),
      );
      setEditModalOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setEditSaving(false);
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

  const labelStyle = { width: 110, display: 'inline-block' };

  const adminColumns = [
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
      render: (v: string | null) => v || '-',
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
              <InfoCircleOutlined className="text-slate-400 cursor-default" />
            </Tooltip>
          </Space>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserItem) => {
        const busy = operatingId === record.id;
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              disabled={busy}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title={record.status === 1 ? '确认暂停该管理员？' : '确认启用该管理员？'}
              onConfirm={() => handleToggleStatus(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" disabled={busy}>
                {record.status === 1 ? '暂停' : '启用'}
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认移除该管理员权限？"
              description="该用户将降为普通用户"
              onConfirm={() => handleRemoveAdmin(record)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger disabled={busy}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const tabs = [
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
          <Form form={siteForm} layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item
              label={<span style={labelStyle}>站点名称</span>}
              name="site_name"
              rules={[{ required: true, message: '请输入站点名称' }]}
            >
              <Input placeholder="请输入站点名称" />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>站点描述</span>}
              name="site_description"
            >
              <Input.TextArea
                placeholder="请输入站点描述"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>Logo URL</span>}
              name="site_logo"
              rules={[{ type: 'url', message: '请输入合法的 URL' }]}
            >
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
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
          <Form form={securityForm} layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item
              label={<span style={labelStyle}>会话时长（天）</span>}
              name="session_duration"
              rules={[
                { required: true, message: '请输入会话时长' },
                {
                  type: 'number',
                  min: 1,
                  max: 30,
                  message: '请输入 1~30 之间的整数',
                },
              ]}
            >
              <InputNumber
                min={1}
                max={30}
                precision={0}
                style={{ width: 160 }}
                addonAfter="天"
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>最大登录尝试次数</span>}
              name="max_login_attempts"
              rules={[
                { required: true, message: '请输入最大登录尝试次数' },
                {
                  type: 'number',
                  min: 1,
                  max: 20,
                  message: '请输入 1~20 之间的整数',
                },
              ]}
            >
              <InputNumber
                min={1}
                max={20}
                precision={0}
                style={{ width: 160 }}
                addonAfter="次"
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>允许用户注册</span>}
              name="allow_register"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
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
                <Space className="mb-4">
                  <Select
                    showSearch
                    placeholder="选择用户添加为管理员"
                    style={{ width: 260 }}
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
      <Typography.Title level={4} className="text-slate-900">
        系统设置
      </Typography.Title>
      <Tabs items={tabs} onChange={handleTabChange} />

      <Modal
        title="编辑管理员信息"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={editSaving}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="昵称"
            name="nickname"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: 'email', message: '请输入合法的邮箱' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
