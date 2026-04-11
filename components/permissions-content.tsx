'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
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
import styles from '@/components/permissions-content.module.css';

const { Text, Title } = Typography;

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

interface RoleCardProps {
  role: RoleItem;
  selected: boolean;
  deleting?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

type RoleModalValues = {
  name: string;
  description?: string;
};

const moduleLabels: Record<string, string> = {
  user: '用户管理',
  role: '角色管理',
};

const systemRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'USER']);

const roleTagColorMap: Record<string, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'blue',
  USER: 'default',
};

const groupPermissionsByModule = (permissionList: PermissionItem[]) => {
  return permissionList.reduce<Record<string, PermissionItem[]>>((permissionGroupMap, permissionItem) => {
    const moduleKey = permissionItem.code.split(/[:.]/)[0] ?? permissionItem.code;

    if (!permissionGroupMap[moduleKey]) {
      permissionGroupMap[moduleKey] = [];
    }

    permissionGroupMap[moduleKey].push(permissionItem);
    return permissionGroupMap;
  }, {});
};

const RoleCard = ({
  role,
  selected,
  deleting = false,
  onSelect,
  onEdit,
  onDelete,
}: RoleCardProps) => {
  const normalizedRoleName = role.name.toUpperCase();
  const isSystemRole = systemRoles.has(normalizedRoleName);
  const roleTagColor = roleTagColorMap[normalizedRoleName] ?? 'geekblue';

  return (
    <div
      onClick={onSelect}
      className={`${styles.roleCard} ${selected ? styles.roleCardSelected : ''}`}
    >
      <div className={styles.roleCardHeader}>
        <div className={styles.roleMeta}>
          <Space size={8} className={styles.roleTitleRow}>
            <Text strong className="text-sm">
              {role.name}
            </Text>
            <Tag color={roleTagColor} className={styles.roleTag}>
              {isSystemRole ? '系统角色' : '自定义'}
            </Tag>
          </Space>
          <Text type="secondary" className={styles.mutedText}>
            {role.description || '暂无描述'}
          </Text>
          <div className={styles.roleStats}>
            <Space size={12}>
              <Space size={4}>
                <KeyOutlined className="text-xs" style={{ color: 'var(--text-tertiary)' }} />
                <Text type="secondary" className={styles.mutedText}>
                  {role.permissions.length} 个权限
                </Text>
              </Space>
              <Space size={4}>
                <TeamOutlined className="text-xs" style={{ color: 'var(--text-tertiary)' }} />
                <Text type="secondary" className={styles.mutedText}>
                  {role.userCount} 位用户
                </Text>
              </Space>
            </Space>
          </div>
        </div>

        <Space size={4} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="编辑描述">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
              className={styles.iconButton}
            />
          </Tooltip>
          {!isSystemRole && (
            <Tooltip title="删除角色">
              <Popconfirm
                title="确认删除该角色？"
                description={role.userCount > 0 ? `该角色下有 ${role.userCount} 位用户，无法删除` : '删除后不可恢复'}
                onConfirm={onDelete}
                okText="删除"
                okButtonProps={{ danger: true, disabled: role.userCount > 0, loading: deleting }}
                cancelText="取消"
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleting} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );
};

const PermissionsContent = () => {
  const [roleList, setRoleList] = useState<RoleItem[]>([]);
  const [permissionList, setPermissionList] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedPermissionIds, setCheckedPermissionIds] = useState<Set<number>>(new Set());
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [submittingRoleModal, setSubmittingRoleModal] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);
  const [roleForm] = Form.useForm<RoleModalValues>();

  const selectedRole = useMemo(() => {
    return roleList.find((role) => role.id === selectedRoleId) ?? null;
  }, [roleList, selectedRoleId]);

  const isSelectedSuperAdminRole = selectedRole?.name.toUpperCase() === 'SUPER_ADMIN';

  const groupedPermissions = useMemo(() => {
    return groupPermissionsByModule(permissionList);
  }, [permissionList]);

  const loadData = useCallback(async () => {
    setLoadingData(true);

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        request<RoleItem[]>('/api/roles'),
        request<PermissionItem[]>('/api/permissions'),
      ]);

      setRoleList(rolesResponse.data ?? []);
      setPermissionList(permissionsResponse.data ?? []);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedRole && roleList.length > 0) {
      setSelectedRoleId(roleList[0].id);
    }
  }, [roleList, selectedRole]);

  useEffect(() => {
    if (!selectedRole) {
      return;
    }

    setCheckedPermissionIds(new Set(selectedRole.permissions.map((permission) => permission.id)));
    setHasPendingChanges(false);
  }, [selectedRole]);

  const togglePermission = useCallback((permissionId: number) => {
    if (isSelectedSuperAdminRole) {
      return;
    }

    setCheckedPermissionIds((previousPermissionIds) => {
      const nextPermissionIds = new Set(previousPermissionIds);

      if (nextPermissionIds.has(permissionId)) {
        nextPermissionIds.delete(permissionId);
      } else {
        nextPermissionIds.add(permissionId);
      }

      return nextPermissionIds;
    });

    setHasPendingChanges(true);
  }, [isSelectedSuperAdminRole]);

  const toggleModulePermissions = useCallback((modulePermissionList: PermissionItem[]) => {
    if (isSelectedSuperAdminRole) {
      return;
    }

    const modulePermissionIds = modulePermissionList.map((permission) => permission.id);
    const hasCheckedAllPermissions = modulePermissionIds.every((permissionId) => checkedPermissionIds.has(permissionId));

    setCheckedPermissionIds((previousPermissionIds) => {
      const nextPermissionIds = new Set(previousPermissionIds);

      modulePermissionIds.forEach((permissionId) => {
        if (hasCheckedAllPermissions) {
          nextPermissionIds.delete(permissionId);
        } else {
          nextPermissionIds.add(permissionId);
        }
      });

      return nextPermissionIds;
    });

    setHasPendingChanges(true);
  }, [checkedPermissionIds, isSelectedSuperAdminRole]);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId || isSelectedSuperAdminRole) {
      return;
    }

    setSavingConfig(true);

    try {
      const roleResponse = await request<RoleItem>(`/api/roles/${selectedRoleId}`, {
        method: 'PUT',
        data: { permissionIds: Array.from(checkedPermissionIds) },
      });

      setRoleList((previousRoleList) =>
        previousRoleList.map((role) => (role.id === selectedRoleId ? roleResponse.data : role)),
      );
      setHasPendingChanges(false);
      message.success('权限配置已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingConfig(false);
    }
  }, [checkedPermissionIds, isSelectedSuperAdminRole, selectedRoleId]);

  const handleCancel = useCallback(() => {
    if (!selectedRole) {
      return;
    }

    setCheckedPermissionIds(new Set(selectedRole.permissions.map((permission) => permission.id)));
    setHasPendingChanges(false);
  }, [selectedRole]);

  const openCreateModal = useCallback(() => {
    setRoleModalMode('create');
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  }, [roleForm]);

  const openEditModal = useCallback((role: RoleItem) => {
    setRoleModalMode('edit');
    setEditingRole(role);
    roleForm.setFieldsValue({ name: role.name, description: role.description ?? '' });
    setRoleModalOpen(true);
  }, [roleForm]);

  const handleRoleModalOk = useCallback(async () => {
    try {
      const roleFormValues = await roleForm.validateFields();
      setSubmittingRoleModal(true);

      if (roleModalMode === 'create') {
        const roleResponse = await request<RoleItem>('/api/roles', {
          method: 'POST',
          data: {
            name: roleFormValues.name,
            description: roleFormValues.description || null,
          },
        });

        setRoleList((previousRoleList) => [...previousRoleList, roleResponse.data]);
        setSelectedRoleId(roleResponse.data.id);
        message.success('角色创建成功');
      }

      if (roleModalMode === 'edit' && editingRole) {
        const roleResponse = await request<RoleItem>(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          data: { description: roleFormValues.description || null },
        });

        setRoleList((previousRoleList) =>
          previousRoleList.map((role) => (role.id === editingRole.id ? roleResponse.data : role)),
        );
        message.success('角色信息已更新');
      }

      setRoleModalOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmittingRoleModal(false);
    }
  }, [editingRole, roleForm, roleModalMode]);

  const handleDelete = useCallback(async (role: RoleItem) => {
    setDeletingRoleId(role.id);
    try {
      await request(`/api/roles/${role.id}`, { method: 'DELETE' });

      const nextRoleList = roleList.filter((roleItem) => roleItem.id !== role.id);
      setRoleList(nextRoleList);

      if (selectedRoleId === role.id) {
        setSelectedRoleId(nextRoleList[0]?.id ?? null);
      }

      message.success('角色已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingRoleId(null);
    }
  }, [roleList, selectedRoleId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ color: 'var(--text-primary)' }}>
            权限管理
          </Title>
          <Text type="secondary" className={styles.mutedText}>
            管理系统角色及其对应的操作权限
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建角色
        </Button>
      </div>

      <Row gutter={[16, 16]} className={styles.layoutRow}>
        <Col xs={24} xl={8} className={styles.stretchCol}>
          <Card
            bordered={false}
            className={styles.fillCard}
            style={{ height: '100%' }}
            title={<Text strong>角色列表</Text>}
            extra={<Text type="secondary" className={styles.mutedText}>{roleList.length} 个角色</Text>}
            loading={loadingData}
          >
            {roleList.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={role.id === selectedRoleId}
                deleting={deletingRoleId === role.id}
                onSelect={() => setSelectedRoleId(role.id)}
                onEdit={() => openEditModal(role)}
                onDelete={() => handleDelete(role)}
              />
            ))}

            {!loadingData && roleList.length === 0 && (
              <div className={styles.emptyState}>
                <Text type="secondary">暂无角色数据</Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={16} className={styles.stretchCol}>
          <Card
            bordered={false}
            className={styles.fillCard}
            style={{ height: '100%' }}
            title={
              selectedRole ? (
                <Space size={10} className={styles.permissionHeader}>
                  <SafetyCertificateOutlined className="text-[#1677ff]" />
                  <span>
                    <Text strong>{selectedRole.name}</Text>
                    <Text type="secondary" className={styles.permissionHeaderSuffix}>
                      权限配置
                    </Text>
                  </span>
                </Space>
              ) : (
                <Text type="secondary">请先选择角色</Text>
              )
            }
            loading={loadingData}
          >
            {!selectedRole ? (
              <div className={styles.permissionEmpty}>
                <SafetyCertificateOutlined className={styles.permissionEmptyIcon} />
                <Text type="secondary">从左侧选择一个角色以配置权限</Text>
              </div>
            ) : (
              <div>
                {isSelectedSuperAdminRole && (
                  <div className={styles.lockNotice}>
                    超级管理员拥有全部权限，权限配置不可收回。
                  </div>
                )}

                {Object.entries(groupedPermissions).map(([moduleKey, modulePermissionList]) => {
                  const checkedPermissionCount = modulePermissionList.filter((permission) =>
                    checkedPermissionIds.has(permission.id),
                  ).length;
                  const checkedAllPermissions = checkedPermissionCount === modulePermissionList.length;
                  const moduleIndeterminate = checkedPermissionCount > 0 && checkedPermissionCount < modulePermissionList.length;

                  return (
                    <div key={moduleKey} className={styles.moduleCard}>
                      <div className={styles.moduleHeader}>
                        <Space size={8}>
                          <Checkbox
                            checked={checkedAllPermissions}
                            indeterminate={moduleIndeterminate}
                            disabled={isSelectedSuperAdminRole}
                            onChange={() => toggleModulePermissions(modulePermissionList)}
                          />
                          <Text strong className="text-[13px]">
                            {moduleLabels[moduleKey] ?? moduleKey}
                          </Text>
                        </Space>
                        <Text type="secondary" className={styles.mutedText}>
                          {checkedPermissionCount} / {modulePermissionList.length}
                        </Text>
                      </div>

                      <div className={styles.moduleBody}>
                        <Row gutter={[8, 12]}>
                          {modulePermissionList.map((permission) => (
                            <Col key={permission.id} xs={24} sm={12} md={8} lg={6}>
                              <Checkbox
                                checked={checkedPermissionIds.has(permission.id)}
                                disabled={isSelectedSuperAdminRole}
                                onChange={() => togglePermission(permission.id)}
                              >
                                <Text className="text-[13px]">{permission.name}</Text>
                                <div>
                                  <Text type="secondary" className={styles.codeText}>
                                    {permission.code}
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

                {Object.keys(groupedPermissions).length === 0 && (
                  <div className={styles.emptyState}>
                    <Text type="secondary">系统暂未定义权限项</Text>
                  </div>
                )}

                {hasPendingChanges && !isSelectedSuperAdminRole && (
                  <div className={styles.footerActions}>
                    <Button onClick={handleCancel}>取消</Button>
                    <Button type="primary" loading={savingConfig} onClick={handleSave}>
                      保存配置
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={roleModalMode === 'create' ? '新建角色' : '编辑角色'}
        open={roleModalOpen}
        onOk={handleRoleModalOk}
        onCancel={() => setRoleModalOpen(false)}
        confirmLoading={submittingRoleModal}
        okText={roleModalMode === 'create' ? '创建' : '保存'}
        cancelText="取消"
        destroyOnClose
        width={460}
      >
        <Form form={roleForm} layout="vertical" className={styles.modalForm}>
          <Form.Item
            label="角色标识"
            name="name"
            rules={[{ required: true, message: '请输入角色标识' }]}
            tooltip="角色的唯一标识，如 editor、reviewer，创建后不可修改"
          >
            <Input
              placeholder="如：editor"
              disabled={roleModalMode === 'edit'}
              className={styles.roleNameInput}
            />
          </Form.Item>
          <Form.Item label="角色描述" name="description">
            <Input.TextArea rows={3} placeholder="简要描述该角色的职责和使用场景" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionsContent;
