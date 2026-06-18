'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
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
} from 'antd';
import {
  AuditOutlined,
  DownloadOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
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
  'user.create': { label: '新增用户', color: 'cyan' },
  'user.delete': { label: '删除用户', color: 'red' },
  'role.grant_admin': { label: '授予管理员', color: 'blue' },
  'role.revoke_admin': { label: '撤销管理员', color: 'orange' },
  'user.suspend': { label: '暂停用户', color: 'warning' },
  'user.unsuspend': { label: '启用用户', color: 'success' },
  'user.reset_password': { label: '重置密码', color: 'purple' },
  'user.login': { label: '用户登录', color: 'green' },
  'user.password_change': { label: '修改密码', color: 'gold' },
  'settings.update': { label: '修改设置', color: 'geekblue' },
};

// 角色显示元信息（中文名 + Tag 颜色）
const ROLE_META: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: '超级管理员', color: 'magenta' },
  ADMIN: { label: '管理员', color: 'blue' },
  USER: { label: '普通用户', color: 'default' },
};
const getRoleMeta = (roleName: string) =>
  ROLE_META[roleName] ?? { label: roleName, color: 'default' };

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getUserPermissionColumns = (options: {
  operatingId: number | null;
  currentUserId: number | null;
  onToggleStatus: (user: UserItem) => void;
  onChangeRole: (user: UserItem, targetRole: 'ADMIN' | 'USER') => void;
  onResetPassword: (user: UserItem) => void;
}): ColumnsType<UserItem> => {
  const { operatingId, currentUserId, onToggleStatus, onChangeRole, onResetPassword } = options;

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
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const meta = getRoleMeta(role);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
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
      width: 100,
      render: (status: number) =>
        status === 1 ? (
          <Tag color="success">正常</Tag>
        ) : (
          <Space size={4}>
            <Tag color="warning">已暂停</Tag>
            <Tooltip title="该用户已被暂停，登录将被拒绝">
              <InfoCircleOutlined
                className="cursor-default"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </Tooltip>
          </Space>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_value: unknown, user: UserItem) => {
        const isBusy = operatingId === user.id;
        const isSelf = user.id === currentUserId;
        const isSuperAdminRow = user.role === 'SUPER_ADMIN';

        // 角色切换目标：ADMIN ↔ USER；SUPER_ADMIN 不允许切换
        let roleSwitchNode: React.ReactNode = null;
        if (!isSuperAdminRow) {
          const targetRole: 'ADMIN' | 'USER' = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
          const targetLabel = ROLE_META[targetRole].label;
          const isDemote = user.role === 'ADMIN';
          roleSwitchNode = (
            <Popconfirm
              title={isDemote ? `确认将该用户降为${targetLabel}？` : `确认将该用户升为${targetLabel}？`}
              description={isDemote ? '该用户将失去管理员权限，账号本身不受影响' : '该用户将获得管理员权限'}
              onConfirm={() => onChangeRole(user, targetRole)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: isDemote, loading: isBusy }}
            >
              <Button type="link" size="small" danger={isDemote} disabled={isBusy || isSelf} loading={isBusy}>
                {isDemote ? '降为普通用户' : '升为管理员'}
              </Button>
            </Popconfirm>
          );
        }

        return (
          <Space size="small">
            <Popconfirm
              title={user.status === 1 ? '确认暂停该用户？' : '确认启用该用户？'}
              onConfirm={() => onToggleStatus(user)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ loading: isBusy }}
            >
              <Button type="link" size="small" disabled={isBusy || isSelf || isSuperAdminRow} loading={isBusy}>
                {user.status === 1 ? '暂停' : '启用'}
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认重置该用户密码？"
              description="重置后会生成随机临时密码，请通知用户尽快修改"
              onConfirm={() => onResetPassword(user)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ loading: isBusy }}
            >
              <Button type="link" size="small" disabled={isBusy || isSelf} loading={isBusy}>
                重置密码
              </Button>
            </Popconfirm>
            {roleSwitchNode}
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

  // —— 权限管理 tab：用户 + 角色 —— //
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string; description: string | null; userCount: number }>>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  // 当前筛选选中的角色名（默认 ADMIN）
  const [selectedRoleName, setSelectedRoleName] = useState<string>('ADMIN');
  const [usersLoading, setUsersLoading] = useState(false);
  const [operatingId, setOperatingId] = useState<number | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // —— 添加分配弹窗 —— //
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [candidates, setCandidates] = useState<UserItem[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | undefined>();
  // 弹窗里要分配的目标角色（后端 PATCH 仅接受 ADMIN/USER）
  const [addTargetRole, setAddTargetRole] = useState<'ADMIN' | 'USER'>('ADMIN');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('');
  const [auditDateRange, setAuditDateRange] = useState<[string, string] | null>(null);
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

  // 一次性拉取全量用户，前端按当前选中角色过滤
  const loadAllUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const result = await request<PageResponse<UserItem>>('/api/users', {
        params: { pageSize: 1000 },
      });
      setAllUsers(result.data.list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // 角色列表来自角色管理
  const loadRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const result = await request<Array<{ id: number; name: string; description: string | null; userCount: number }>>(
        '/api/roles',
      );
      setRoles(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取角色列表失败');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(
    async (
      page = 1,
      pageSize = 20,
      action = auditFilter,
      actorUsername = auditActorFilter,
      dateRange = auditDateRange,
    ) => {
      try {
        setAuditLoading(true);
        const result = await request<PageResponse<AuditLogItem>>('/api/admin/audit-logs', {
          params: {
            page,
            pageSize,
            action,
            actorUsername,
            startDate: dateRange?.[0] ?? '',
            endDate: dateRange?.[1] ?? '',
          },
        });
        setAuditLogs(result.data.list);
        setAuditPagination({ current: result.data.page, pageSize: result.data.pageSize, total: result.data.total });
      } catch (error) {
        message.error(error instanceof Error ? error.message : '获取审计日志失败');
      } finally {
        setAuditLoading(false);
      }
    },
    [auditFilter, auditActorFilter, auditDateRange],
  );

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, [loadSettings, loadCurrentUser]);

  const visibleUsers = useMemo(
    () => allUsers.filter((u) => u.role === selectedRoleName),
    [allUsers, selectedRoleName],
  );

  const handleTabChange = (key: string) => {
    if (key === 'permissions') {
      if (allUsers.length === 0) loadAllUsers();
      if (roles.length === 0) loadRoles();
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
    // 弹窗默认要分配的角色 = 当前筛选选中的角色（若是 SUPER_ADMIN 则降级为 ADMIN）
    setAddTargetRole(selectedRoleName === 'USER' ? 'USER' : 'ADMIN');
    try {
      setCandidatesLoading(true);
      // 拉取所有启用状态的用户作为候选（具体能否分配在 handleAddAdmin 里再判）
      const result = await request<PageResponse<UserItem>>('/api/users', {
        params: { pageSize: 100, status: 1 },
      });
      setCandidates(result.data.list);
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
        params: { pageSize: 100, status: 1, username: keyword },
      });
      setCandidates(result.data.list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '搜索失败');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedCandidateId) return;
    const target = candidates.find((u) => u.id === selectedCandidateId);
    // 防御：目标若已是该角色则提示
    if (target && target.role === addTargetRole) {
      message.info(`该用户已经是${ROLE_META[addTargetRole].label}`);
      return;
    }
    // 不能给 SUPER_ADMIN 改角色
    if (target && target.role === 'SUPER_ADMIN') {
      message.warning('超级管理员的角色不可修改');
      return;
    }
    try {
      setAddingAdmin(true);
      await request(`/api/users/${selectedCandidateId}/role`, {
        method: 'PATCH',
        data: { role: addTargetRole },
      });
      message.success(`已分配为${ROLE_META[addTargetRole].label}`);
      // 本地状态同步
      if (target) {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === target.id ? { ...u, role: addTargetRole } : u)),
        );
      } else {
        await loadAllUsers();
      }
      setAddAdminOpen(false);

    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleChangeRole = async (user: UserItem, targetRole: 'ADMIN' | 'USER') => {
    try {
      setOperatingId(user.id);
      await request(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        data: { role: targetRole },
      });
      message.success(`已切换为${ROLE_META[targetRole].label}`);
      setAllUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: targetRole } : u)),
      );
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
      message.success(isSuspending ? '已暂停该用户' : '已启用');
      setAllUsers((prev) =>
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

  const permissionColumns = getUserPermissionColumns({
    operatingId,
    currentUserId,
    onToggleStatus: handleToggleStatus,
    onChangeRole: handleChangeRole,
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
      ellipsis: true,
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
      // 安全设置表单在初始化时即写入数据，但该标签页默认不激活；
      // 强制渲染以保证 securityForm 始终与 Form 元素连接，避免 useForm 未连接告警
      forceRender: true,
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
              <InputNumber min={1} max={30} precision={0} className={styles.narrowNumberInput} suffix="天" />
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
              <InputNumber min={1} max={20} precision={0} className={styles.narrowNumberInput} suffix="次" />
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
            key: 'permissions',
            label: (
              <span>
                <SafetyCertificateOutlined className="mr-1.5" />
                权限
              </span>
            ),
            children: (
              <Card variant="borderless">
                <Space className={styles.adminToolbar} wrap>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddAdmin}>
                    添加
                  </Button>
                  {/* 角色筛选 —— 来自 /api/roles */}
                  <Segmented
                    value={selectedRoleName}
                    onChange={(v) => setSelectedRoleName(String(v))}
                    options={
                      roles.length > 0
                        ? roles.map((r) => {
                            const meta = getRoleMeta(r.name);
                            const count = allUsers.filter((u) => u.role === r.name).length;
                            return {
                              label: (
                                <span>
                                  {meta.label}
                                  <span style={{ marginLeft: 6, color: 'var(--text-tertiary)', fontSize: 12 }}>
                                    {count}
                                  </span>
                                </span>
                              ),
                              value: r.name,
                            };
                          })
                        : [
                            { label: '管理员', value: 'ADMIN' },
                            { label: '普通用户', value: 'USER' },
                          ]
                    }
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      loadAllUsers();
                      loadRoles();
                    }}
                    loading={usersLoading || rolesLoading}
                  >
                    刷新
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={usersLoading}
                  dataSource={visibleUsers}
                  columns={permissionColumns}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  locale={{
                    emptyText: (
                      <Empty
                        description={`暂无${getRoleMeta(selectedRoleName).label}`}
                      />
                    ),
                  }}
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
                <Space className={styles.adminToolbar} wrap style={{ marginBottom: 12 }}>
                  {/* 动作筛选 */}
                  <Select
                    allowClear
                    placeholder="按动作筛选"
                    style={{ width: 180 }}
                    value={auditFilter || undefined}
                    onChange={(v) => {
                      const next = v || '';
                      setAuditFilter(next);
                      loadAuditLogs(1, auditPagination.pageSize, next, auditActorFilter, auditDateRange);
                    }}
                    options={Object.entries(ACTION_LABELS).map(([value, meta]) => ({
                      value,
                      label: meta.label,
                    }))}
                  />
                  {/* 操作人筛选 */}
                  <Input
                    allowClear
                    placeholder="操作人用户名"
                    style={{ width: 150 }}
                    value={auditActorFilter}
                    onChange={(e) => setAuditActorFilter(e.target.value)}
                    onPressEnter={() => loadAuditLogs(1, auditPagination.pageSize, auditFilter, auditActorFilter, auditDateRange)}
                  />
                  {/* 时间范围 */}
                  <DatePicker.RangePicker
                    style={{ width: 240 }}
                    onChange={(_, strings) => {
                      const range = strings[0] && strings[1] ? [strings[0], strings[1]] as [string, string] : null;
                      setAuditDateRange(range);
                      loadAuditLogs(1, auditPagination.pageSize, auditFilter, auditActorFilter, range);
                    }}
                    format="YYYY-MM-DD"
                    placeholder={['开始日期', '结束日期']}
                  />
                  <Space size={8}>
                    <Button
                      type="primary"
                      onClick={() => loadAuditLogs(1, auditPagination.pageSize, auditFilter, auditActorFilter, auditDateRange)}
                      loading={auditLoading}
                    >
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        setAuditFilter('');
                        setAuditActorFilter('');
                        setAuditDateRange(null);
                        loadAuditLogs(1, auditPagination.pageSize, '', '', null);
                      }}
                    >
                      重置
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        if (auditLogs.length === 0) { message.info('暂无数据'); return; }
                        const headers = ['ID', '时间', '操作人', '动作', '对象类型', '对象', '详情'];
                        const escape = (v: unknown) => {
                          const s = v == null ? '' : String(v);
                          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                          return s;
                        };
                        const lines = [
                          headers.join(','),
                          ...auditLogs.map((r) => [
                            r.id,
                            formatDateTime(r.createdAt),
                            r.actorUsername,
                            ACTION_LABELS[r.action]?.label ?? r.action,
                            r.targetType,
                            r.targetLabel ?? r.targetId ?? '',
                            r.detail ?? '',
                          ].map(escape).join(',')),
                        ];
                        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        message.success(`已导出本页 ${auditLogs.length} 条`);
                      }}
                    >
                      导出本页 CSV
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => loadAuditLogs(auditPagination.current, auditPagination.pageSize, auditFilter, auditActorFilter, auditDateRange)}
                      loading={auditLoading}
                    >
                      刷新
                    </Button>
                  </Space>
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
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    pageSizeOptions: ['20', '50', '100'],
                    onChange: (page, pageSize) => loadAuditLogs(page, pageSize, auditFilter, auditActorFilter, auditDateRange),
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
      <Tabs items={tabItems} onChange={handleTabChange} />

      <Modal
        title={<><UserSwitchOutlined /> 分配角色</>}
        open={addAdminOpen}
        onCancel={() => setAddAdminOpen(false)}
        onOk={handleAddAdmin}
        okText="确认分配"
        okButtonProps={{ disabled: !selectedCandidateId, loading: addingAdmin }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {/* 1. 选择用户 */}
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>用户</div>
            <Input.Search
              allowClear
              placeholder="按用户名搜索"
              value={candidateKeyword}
              onChange={(e) => setCandidateKeyword(e.target.value)}
              onSearch={(value) => searchCandidates(value)}
              loading={candidatesLoading}
              style={{ marginBottom: 8 }}
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
                label: `${u.username}（${u.nickname || '-'}）${u.email ? ` · ${u.email}` : ''} · ${getRoleMeta(u.role).label}`,
                disabled: u.role === 'SUPER_ADMIN',
              }))}
              allowClear
              notFoundContent={candidatesLoading ? '加载中…' : '无匹配用户'}
            />
          </div>

          {/* 2. 选择目标角色（角色数据来自 /api/roles，过滤掉 SUPER_ADMIN —— 后端 PATCH 不接受） */}
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>目标角色</div>
            <Select
              style={{ width: '100%' }}
              value={addTargetRole}
              onChange={(v) => setAddTargetRole(v)}
              loading={rolesLoading}
              options={
                roles.length > 0
                  ? roles
                      .filter((r) => r.name === 'ADMIN' || r.name === 'USER')
                      .map((r) => ({
                        value: r.name as 'ADMIN' | 'USER',
                        label: (
                          <span>
                            <Tag color={getRoleMeta(r.name).color} style={{ marginRight: 8 }}>
                              {getRoleMeta(r.name).label}
                            </Tag>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                              {r.description || '—'}
                            </span>
                          </span>
                        ),
                      }))
                  : [
                      { value: 'ADMIN', label: <Tag color="blue">管理员</Tag> },
                      { value: 'USER', label: <Tag>普通用户</Tag> },
                    ]
              }
            />
          </div>

          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            候选列表显示所有「启用」用户；超级管理员不可被重新分配。提交后该用户的角色将被替换为所选角色。
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
