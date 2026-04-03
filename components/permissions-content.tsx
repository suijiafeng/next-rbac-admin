'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';

const { Text, Title } = Typography;

// ── Types ────────────────────────────────────────────────────

interface PermissionItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

interface RoleItem {
  id: number;
  name: string;
  description: string | null;
  userCount: number;
  permissions: PermissionItem[];
}

// ── Constants ────────────────────────────────────────────────

// Groups permission codes by their module prefix (before the dot)
const MODULE_LABELS: Record<string, string> = {
  user: '用户管理',
  role: '角色管理',
};

// System roles that are always present – name column is read-only for these
const SYSTEM_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'USER']);

const ROLE_TAG_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'blue',
  USER: 'default',
};

// ── Helper ───────────────────────────────────────────────────

function groupPermissions(permissions: PermissionItem[]) {
  const groups: Record<string, PermissionItem[]> = {};
  for (const p of permissions) {
    const module = p.code.split(/[:.]/)[0] ?? p.code;
    if (!groups[module]) groups[module] = [];
    groups[module].push(p);
  }
  return groups;
}

// ── Sub-components ───────────────────────────────────────────

function RoleCard({
  role,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  role: RoleItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const normalizedRoleName = role.name.toUpperCase();
  const isSystem = SYSTEM_ROLES.has(normalizedRoleName);
  const tagColor = ROLE_TAG_COLOR[normalizedRoleName] ?? 'geekblue';

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '14px 16px',
        borderRadius: 8,
        border: `1px solid ${selected ? '#1677ff' : '#f0f0f0'}`,
        background: selected ? '#e6f4ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={8} style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>{role.name}</Text>
            <Tag color={tagColor} style={{ borderRadius: 10, fontSize: 11, padding: '0 7px' }}>
              {isSystem ? '系统角色' : '自定义'}
            </Tag>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {role.description || '暂无描述'}
            </Text>
          </div>
          <div style={{ marginTop: 6 }}>
            <Space size={12}>
              <Space size={4}>
                <KeyOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{role.permissions.length} 个权限</Text>
              </Space>
              <Space size={4}>
                <TeamOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{role.userCount} 位用户</Text>
              </Space>
            </Space>
          </div>
        </div>
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="编辑描述">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
              style={{ color: '#8c8c8c' }}
            />
          </Tooltip>
          {!isSystem && (
            <Tooltip title="删除角色">
              <Popconfirm
                title="确认删除该角色？"
                description={role.userCount > 0 ? `该角色下有 ${role.userCount} 位用户，无法删除` : '删除后不可恢复'}
                onConfirm={onDelete}
                okText="删除"
                okButtonProps={{ danger: true, disabled: role.userCount > 0 }}
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function PermissionsContent() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  // ── Data loading ────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        request<RoleItem[]>('/api/roles'),
        request<PermissionItem[]>('/api/permissions'),
      ]);
      setRoles(rolesRes.data ?? []);
      setAllPermissions(permsRes.data ?? []);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Selected role sync ──────────────────────

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    if (selectedRole) {
      setCheckedIds(new Set(selectedRole.permissions.map((p) => p.id)));
      setDirty(false);
    }
  }, [selectedRole]);

  // Auto-select first role after load
  useEffect(() => {
    if (roles.length > 0 && selectedRoleId === null) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // ── Permission groups ───────────────────────

  const permissionGroups = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

  // ── Permission checkbox handlers ────────────

  function togglePermission(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setDirty(true);
  }

  function toggleModule(modulePermissions: PermissionItem[]) {
    const ids = modulePermissions.map((p) => p.id);
    const allChecked = ids.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const res = await request<RoleItem>(`/api/roles/${selectedRoleId}`, {
        method: 'PUT',
        data: { permissionIds: Array.from(checkedIds) },
      });
      setRoles((prev) => prev.map((r) => (r.id === selectedRoleId ? res.data! : r)));
      setDirty(false);
      message.success('权限配置已保存');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (selectedRole) {
      setCheckedIds(new Set(selectedRole.permissions.map((p) => p.id)));
      setDirty(false);
    }
  }

  // ── Modal handlers ──────────────────────────

  function openCreateModal() {
    setModalMode('create');
    setEditingRole(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEditModal(role: RoleItem) {
    setModalMode('edit');
    setEditingRole(role);
    form.setFieldsValue({ name: role.name, description: role.description ?? '' });
    setModalOpen(true);
  }

  async function handleModalOk() {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      if (modalMode === 'create') {
        const res = await request<RoleItem>('/api/roles', {
          method: 'POST',
          data: { name: values.name, description: values.description || null },
        });
        setRoles((prev) => [...prev, res.data!]);
        setSelectedRoleId(res.data!.id);
        message.success('角色创建成功');
      } else if (editingRole) {
        const res = await request<RoleItem>(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          data: { description: values.description || null },
        });
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? res.data! : r)));
        message.success('角色信息已更新');
      }

      setModalOpen(false);
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete(role: RoleItem) {
    try {
      await request(`/api/roles/${role.id}`, { method: 'DELETE' });
      const nextRoles = roles.filter((r) => r.id !== role.id);
      setRoles(nextRoles);
      if (selectedRoleId === role.id) {
        setSelectedRoleId(nextRoles[0]?.id ?? null);
      }
      message.success('角色已删除');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败');
    }
  }

  // ── Render ──────────────────────────────────

  return (
    <div style={{ padding: 0 }}>
      <Typography.Title level={4} className="text-slate-900">
        权限管理
      </Typography.Title>

      <Row gutter={[16, 16]} style={{ alignItems: 'stretch' }}>
        {/* Left: Role List */}
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            bordered={false}
            style={{ flex: 1 }}
            title={<Text strong>角色列表</Text>}
            extra={<Button size='small' icon={<PlusOutlined />} onClick={openCreateModal}>
              新建
            </Button>}
            loading={loading}
          >
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={role.id === selectedRoleId}
                onSelect={() => setSelectedRoleId(role.id)}
                onEdit={() => openEditModal(role)}
                onDelete={() => handleDelete(role)}
              />
            ))}
            {!loading && roles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Text type="secondary">暂无角色数据</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Right: Permission Assignment */}
        <Col xs={24} xl={16} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            bordered={false}
            style={{ flex: 1 }}
            title={
              selectedRole ? (
                <Space size={10}>
                  <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                  <span>
                    <Text strong>{selectedRole.name}</Text>
                    <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>权限配置</Text>
                  </span>
                </Space>
              ) : (
                <Text type="secondary">请先选择角色</Text>
              )
            }
            extra={
              dirty && (
                <Space>
                  <Button size="small" onClick={handleCancel}>取消</Button>
                  <Button size="small" type="primary" loading={saving} onClick={handleSave}>
                    保存配置
                  </Button>
                </Space>
              )
            }
            loading={loading}
          >
            {!selectedRole ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <SafetyCertificateOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                <Text type="secondary">从左侧选择一个角色以配置权限</Text>
              </div>
            ) : (
              <div>
                {Object.entries(permissionGroups).map(([module, perms]) => {
                  const checkedCount = perms.filter((p) => checkedIds.has(p.id)).length;
                  const allChecked = checkedCount === perms.length;
                  const indeterminate = checkedCount > 0 && checkedCount < perms.length;

                  return (
                    <div
                      key={module}
                      style={{
                        marginBottom: 16,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Module header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          background: '#fafafa',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Space size={8}>
                          <Checkbox
                            checked={allChecked}
                            indeterminate={indeterminate}
                            onChange={() => toggleModule(perms)}
                          />
                          <Text strong style={{ fontSize: 13 }}>
                            {MODULE_LABELS[module] ?? module}
                          </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {checkedCount} / {perms.length}
                        </Text>
                      </div>

                      {/* Permission checkboxes */}
                      <div style={{ padding: '12px 16px' }}>
                        <Row gutter={[8, 12]}>
                          {perms.map((p) => (
                            <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
                              <Checkbox
                                checked={checkedIds.has(p.id)}
                                onChange={() => togglePermission(p.id)}
                              >
                                <Text style={{ fontSize: 13 }}>{p.name}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                    {p.code}
                                  </Text>
                                </div>
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </div>
                  );
                })}

                {Object.keys(permissionGroups).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Text type="secondary">系统暂未定义权限项</Text>
                  </div>
                )}

                {dirty && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <Button onClick={handleCancel}>取消</Button>
                    <Button type="primary" loading={saving} onClick={handleSave}>
                      保存配置
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Create / Edit Modal */}
      <Modal
        title={modalMode === 'create' ? '新建角色' : '编辑角色'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading}
        okText={modalMode === 'create' ? '创建' : '保存'}
        cancelText="取消"
        destroyOnClose
        width={460}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="角色标识"
            name="name"
            rules={[{ required: true, message: '请输入角色标识' }]}
            tooltip="角色的唯一标识，如 editor、reviewer，创建后不可修改"
          >
            <Input
              placeholder="如：editor"
              disabled={modalMode === 'edit'}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item label="角色描述" name="description">
            <Input.TextArea rows={3} placeholder="简要描述该角色的职责和使用场景" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
