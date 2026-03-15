'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Segmented,
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
  AuditOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  TeamOutlined,
  UserSwitchOutlined,
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
  maintenance_mode: string;
}

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

const settingsLabelClassName = 'inline-block w-[110px]';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'role.grant_admin': { label: '授予管理员', color: 'blue' },
  'role.revoke_admin': { label: '撤销管理员', color: 'orange' },
  'user.suspend': { label: '暂停用户', color: 'warning' },
  'user.unsuspend': { label: '启用用户', color: 'success' },
  'user.reset_password': { label: '重置密码', color: 'purple' },
  'settings.update': { label: '修改设置', color: 'geekblue' },
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getAdminColumns = (options: {
  operatingId: number | null;
  currentUserId: number | null;
  onToggleStatus: (user: UserItem) => void;
  onRemoveAdmin: (user: UserItem) => void;
  onResetPassword: (user: UserItem) => void;
}): ColumnsType<UserItem> => {
  const { operatingId, currentUserId, onToggleStatus, onRemoveAdmin, onResetPassword } = options;

  return [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 140 },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 140 },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) => email || '-',
    },
    {
      title: '加入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: number) =>
        status === 1 ? (
          <Tag color="success">正常</Tag>
        ) : (
          <Space size={4}>
            <Tag color="warning">已暂停</Tag>
            <Tooltip title="该用户已被暂停，登录将被拒绝">
              <InfoCircleOutlined className="cursor-default text-slate-400" />
            </Tooltip>
          </Space>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
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
              title="重置该用户密码为默认值 123456？"
              description="重置后请通知用户尽快修改密码"
              onConfirm={() => onResetPassword(user)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" disabled={isBusy || isSelf}>
                重置密码
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

  const [siteDirty, setSiteDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  const [adminUsers, setAdminUsers] = useState<UserItem[]>([]);
  const [adminScope, setAdminScope] = useState<'active' | 'all'>('active');
  const [usersLoading, setUsersLoading] = useState(false);
  const [operatingId, setOperatingId] = useState<number | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [candidates, setCandidates] = useState<UserItem[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | undefined>();
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>('');
  const [auditPagination, setAuditPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [auditDetail, setAuditDetail] = useState<AuditLogItem | null>(null);

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

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
        maintenance_mode: settings.maintenance_mode === 'true',
      });
      setMaintenanceOn(settings.maintenance_mode === 'true');
      setSiteDirty(false);
      setSecurityDirty(false);
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

  const loadAdmins = useCallback(async () => {
    try {
      setUsersLoading(true);
      const result = await request<PageResponse<UserItem>>('/api/users', {
        params: { pageSize: 1000 },
      });
      const admins = result.data.list.filter((u) => u.role === 'ADMIN');
      setAdminUsers(admins);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取管理员列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(
    async (page = 1, pageSize = 20, action = auditFilter) => {
      try {
        setAuditLoading(true);
        const result = await request<PageResponse<AuditLogItem>>('/api/admin/audit-logs', {
          params: { page, pageSize, action },
        });
        setAuditLogs(result.data.list);
        setAuditPagination({ current: result.data.page, pageSize: result.data.pageSize, total: result.data.total });
      } catch (error) {
        message.error(error instanceof Error ? error.message : '获取审计日志失败');
      } finally {
        setAuditLoading(false);
      }
    },
    [auditFilter],
  );

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, [loadSettings, loadCurrentUser]);

  const visibleAdmins = useMemo(
    () => (adminScope === 'all' ? adminUsers : adminUsers.filter((u) => u.status === 1)),
    [adminUsers, adminScope],
  );

  const handleTabChange = (key: string) => {
    if (key === 'admin' && adminUsers.length === 0) {
      loadAdmins();
    }
    if (key === 'audit' && auditLogs.length === 0) {
      loadAuditLogs(1, auditPagination.pageSize, auditFilter);
    }
  };

  const openAddAdmin = async () => {
    setAddAdminOpen(true);
    setCandidateKeyword('');
    setSelectedCandidateId(undefined);
    setCandidates([]);
    try {
      setCandidatesLoading(true);
      const result = await request<PageResponse<UserItem>>('/api/users', {
        params: { pageSize: 50, status: 1 },
      });
      setCandidates(result.data.list.filter((u) => u.role === 'USER'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取候选用户失败');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const searchCandidates = async (keyword: string) => {
    try {
      setCandidatesLoading(true);
      const result = await request<PageResponse<UserItem>>('/api/users', {
        params: { pageSize: 50, status: 1, username: keyword },
      });
      setCandidates(result.data.list.filter((u) => u.role === 'USER'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '搜索失败');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedCandidateId) return;
    const target = candidates.find((u) => u.id === selectedCandidateId);
    try {
      setAddingAdmin(true);
      await request(`/api/users/${selectedCandidateId}/role`, {
        method: 'PATCH',
        data: { role: 'ADMIN' },
      });
      message.success('已添加为管理员');
      if (target) {
        setAdminUsers((prev) => [...prev, { ...target, role: 'ADMIN' }]);
      } else {
        await loadAdmins();
      }
      setAddAdminOpen(false);

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
      message.success(isSuspending ? '已暂停该管理员' : '已启用');
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
      );

    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setOperatingId(null);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    try {
      setOperatingId(user.id);
      const result = await request<{ defaultPassword: string }>(`/api/users/${user.id}/password/reset`, {
        method: 'POST',
      });
      Modal.success({
        title: '密码已重置',
        content: `用户 ${user.username} 的密码已重置为：${result.data.defaultPassword}`,
      });
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
      setSiteDirty(false);

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
          session_duration: values.session_duration,
          max_login_attempts: values.max_login_attempts,
          allow_register: String(values.allow_register),
          maintenance_mode: String(values.maintenance_mode),
        },
      });
      message.success('安全设置已保存');
      setSecurityDirty(false);
      setMaintenanceOn(Boolean(values.maintenance_mode));

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
    onResetPassword: handleResetPassword,
  });

  const auditColumns: ColumnsType<AuditLogItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '操作人',
      dataIndex: 'actorUsername',
      key: 'actorUsername',
      width: 140,
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (action: string) => {
        const meta = ACTION_LABELS[action];
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{action}</Tag>;
      },
    },
    {
      title: '对象',
      key: 'target',
      render: (_v, row) => {
        const t = row.targetLabel || row.targetId || '-';
        return <span>{row.targetType === 'settings' ? `设置：${t}` : t}</span>;
      },
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      width: 120,
      render: (_v, row) =>
        row.detail ? (
          <Button type="link" size="small" onClick={() => setAuditDetail(row)}>
            查看详情
          </Button>
        ) : (
          '-'
        ),
    },
  ];

  const tabItems: TabsProps['items'] = [
    {
      key: 'site',
      label: (
        <span>
          <GlobalOutlined className="mr-1.5" />
          站点设置
          {siteDirty && <span className={styles.dirtyBadge}>· 未保存</span>}
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          <Form
            form={siteForm}
            layout="vertical"
            className={styles.form}
            onValuesChange={() => setSiteDirty(true)}
          >
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
              <Input.TextArea placeholder="请输入站点描述" autoSize={{ minRows: 2, maxRows: 4 }} />
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                disabled={!siteDirty}
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
          {securityDirty && <span className={styles.dirtyBadge}>· 未保存</span>}
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          {maintenanceOn && (
            <Alert
              type="warning"
              showIcon
              className={styles.maintenanceAlert}
              message="维护模式已开启"
              description="当前仅超级管理员可登录系统，普通用户与管理员将被拒绝。如需对外恢复服务，请关闭维护模式后保存。"
            />
          )}
          <Form
            form={securityForm}
            layout="vertical"
            className={styles.form}
            onValuesChange={() => setSecurityDirty(true)}
          >
            <Form.Item
              label={<span className={settingsLabelClassName}>会话时长（天）</span>}
              name="session_duration"
              extra="用户登录后 Token 的有效期，超时后需重新登录"
              rules={[
                { required: true, message: '请输入会话时长' },
                { type: 'number', min: 1, max: 30, message: '请输入 1~30 之间的整数' },
              ]}
            >
              <InputNumber min={1} max={30} precision={0} className={styles.narrowNumberInput} addonAfter="天" />
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
              <InputNumber min={1} max={20} precision={0} className={styles.narrowNumberInput} addonAfter="次" />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>允许用户注册</span>}
              name="allow_register"
              valuePropName="checked"
              extra="关闭后新用户将无法自行注册，仅可由管理员手动添加"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item
              label={<span className={settingsLabelClassName}>维护模式</span>}
              name="maintenance_mode"
              valuePropName="checked"
              extra="开启后仅超级管理员可登录系统，其余用户登录将被拒绝"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item className="mb-0">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!securityDirty}
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
              <Button type="primary" icon={<KeyOutlined />} loading={passwordSaving} onClick={handleChangePassword}>
                确认修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'admin',
            label: (
              <span>
                <TeamOutlined className="mr-1.5" />
                管理员
              </span>
            ),
            children: (
              <Card variant="borderless">
                <Space className={styles.adminToolbar} wrap>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddAdmin}>
                    添加管理员
                  </Button>
                  <Segmented
                    value={adminScope}
                    onChange={(v) => setAdminScope(v as 'active' | 'all')}
                    options={[
                      { label: '仅启用', value: 'active' },
                      { label: '全部（含暂停）', value: 'all' },
                    ]}
                  />
                  <Button icon={<ReloadOutlined />} onClick={loadAdmins} loading={usersLoading}>
                    刷新
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={usersLoading}
                  dataSource={visibleAdmins}
                  columns={adminColumns}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  locale={{ emptyText: <Empty description="暂无管理员" /> }}
                />
              </Card>
            ),
          },
          {
            key: 'audit',
            label: (
              <span>
                <AuditOutlined className="mr-1.5" />
                操作审计
              </span>
            ),
            children: (
              <Card variant="borderless">
                <Space className={styles.adminToolbar} wrap>
                  <Select
                    allowClear
                    placeholder="按动作筛选"
                    style={{ width: 200 }}
                    value={auditFilter || undefined}
                    onChange={(v) => {
                      const next = v || '';
                      setAuditFilter(next);
                      loadAuditLogs(1, auditPagination.pageSize, next);
                    }}
                    options={Object.entries(ACTION_LABELS).map(([value, meta]) => ({
                      value,
                      label: meta.label,
                    }))}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => loadAuditLogs(auditPagination.current, auditPagination.pageSize, auditFilter)}
                    loading={auditLoading}
                  >
                    刷新
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={auditLoading}
                  dataSource={auditLogs}
                  columns={auditColumns}
                  size="middle"
                  pagination={{
                    current: auditPagination.current,
                    pageSize: auditPagination.pageSize,
                    total: auditPagination.total,
                    showSizeChanger: false,
                    onChange: (page, pageSize) => loadAuditLogs(page, pageSize, auditFilter),
                  }}
                />
              </Card>
            ),
          },
        ]
      : []),
  ];

  const detailEntries = (() => {
    if (!auditDetail?.detail) return [] as Array<[string, string]>;
    try {
      const parsed = JSON.parse(auditDetail.detail);
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)] as [string, string]);
      }
      return [['value', String(parsed)] as [string, string]];
    } catch {
      return [['raw', auditDetail.detail] as [string, string]];
    }
  })();

  return (
    <>
      <Typography.Title level={4} className={styles.title}>
        系统设置
      </Typography.Title>

      <Tabs items={tabItems} onChange={handleTabChange} />

      <Modal
        title={<><UserSwitchOutlined /> 添加管理员</>}
        open={addAdminOpen}
        onCancel={() => setAddAdminOpen(false)}
        onOk={handleAddAdmin}
        okText="确认添加"
        okButtonProps={{ disabled: !selectedCandidateId, loading: addingAdmin }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Input.Search
            allowClear
            placeholder="按用户名搜索"
            value={candidateKeyword}
            onChange={(e) => setCandidateKeyword(e.target.value)}
            onSearch={(value) => searchCandidates(value)}
            loading={candidatesLoading}
          />
          <Select
            showSearch
            placeholder="从候选用户中选择"
            style={{ width: '100%' }}
            value={selectedCandidateId}
            onChange={setSelectedCandidateId}
            loading={candidatesLoading}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={candidates.map((u) => ({
              value: u.id,
              label: `${u.username}（${u.nickname || '-'}）${u.email ? ` · ${u.email}` : ''}`,
            }))}
            allowClear
            notFoundContent={candidatesLoading ? '加载中…' : '无匹配用户'}
          />
          <div className="text-xs text-slate-500">
            仅显示状态为「启用」且角色为普通用户的账号。被授予后将立即拥有管理员权限。
          </div>
        </Space>
      </Modal>

      <Modal
        title="操作详情"
        open={!!auditDetail}
        onCancel={() => setAuditDetail(null)}
        footer={null}
        destroyOnHidden
      >
        {auditDetail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="时间">{formatDateTime(auditDetail.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="操作人">{auditDetail.actorUsername}</Descriptions.Item>
            <Descriptions.Item label="动作">
              {ACTION_LABELS[auditDetail.action]?.label || auditDetail.action}
            </Descriptions.Item>
            <Descriptions.Item label="对象">
              {auditDetail.targetType === 'settings' ? `设置：${auditDetail.targetLabel || '-'}` : auditDetail.targetLabel || auditDetail.targetId || '-'}
            </Descriptions.Item>
            {detailEntries.map(([k, v]) => (
              <Descriptions.Item key={k} label={k}>
                <span className="break-all">{v}</span>
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default SettingsContent;
