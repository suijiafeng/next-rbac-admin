'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';
import { formatDateTime } from '@/lib/format';
import type { PageResponse } from '@/types/request';
import type { UserItem } from '@/types/user';
import UserModal, { UserFormValues } from '@/components/user-modal';
import styles from '@/components/users-content.module.css';

interface SearchParams {
  username: string;
  status?: number;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface UserTableColumnsOptions {
  onEdit: (record: UserItem) => void;
  onDelete: (record: UserItem) => void;
}

function getUserTableColumns(options: UserTableColumnsOptions): ColumnsType<UserItem> {
  const { onEdit, onDelete } = options;

  return [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 64,
      render: (value: number) => (
        <Typography.Text
          className="font-mono text-xs font-medium"
          style={{ color: 'var(--text-tertiary)' }}
        >
          #{value}
        </Typography.Text>
      ),
    },
    {
      title: '用户名',
      width: 120,
      dataIndex: 'username',
    },
    {
      title: '昵称',
      width: 100,
      dataIndex: 'nickname',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 220,
      render: (value: string | null) =>
        value ? (
          <Space size={5}>
            <MailOutlined className="text-xs" style={{ color: 'var(--text-tertiary)' }} />
            <Typography.Text
              className="text-[13px]"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text
            className="text-[13px]"
            style={{ color: 'var(--text-disabled)' }}
          >
            —
          </Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 88,
      render: (value: number) =>
        value === 1 ? (
          <Tag
            className="m-0 rounded-full border-0 px-[10px] py-px text-xs font-medium"
            style={{
              background: 'var(--color-success-bg)',
              color: 'var(--color-success-text)',
            }}
          >
            启用
          </Tag>
        ) : (
          <Tag
            className="m-0 rounded-full border-0 px-[10px] py-px text-xs font-medium"
            style={{ background: 'var(--tag-muted-bg)', color: 'var(--tag-muted-text)' }}
          >
            禁用
          </Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 155,
      render: (value: string) => {
        const d = new Date(value);

        return (
          <div className="leading-[1.45]">
            <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              {d.toLocaleDateString('zh-CN')}
            </div>
            <div className="mt-px text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={0}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="text-[13px] !text-indigo-600"
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="删除后不可恢复，确认继续？"
            okText="确认删除"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelText="取消"
            placement="topRight"
            onConfirm={() => onDelete(record)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="text-[13px]"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

export default function UsersPage() {
  const [list, setList] = useState<UserItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<UserItem | null>(null);
  const [tableScrollY, setTableScrollY] = useState(400);

  // —— 批量操作 —— //
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);
  const [bulkTargetRole, setBulkTargetRole] = useState<'ADMIN' | 'USER'>('USER');

  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const bulkBarRef = useRef<HTMLDivElement>(null);

  const isEdit = useMemo(() => Boolean(currentRow), [currentRow]);
  const [searchParams, setSearchParams] = useState<SearchParams>({ username: '' });
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 动态计算表格可滚动高度（适配紧凑主题）
  // 各部分尺寸（紧凑算法 + 当前 module.css 样式）：
  //   表头  ≈ 38px (header padding 10+10 + 文字 18)
  //   表格上方 margin ≈ 14 (mt-3.5)
  //   分页+ margin-top ≈ 44 (32 控件高 + 12 margin)
  //   底部缓冲 ≈ 4
  const calcHeight = useCallback(() => {
    if (!containerRef.current || !toolbarRef.current) return;
    const containerH = containerRef.current.clientHeight;
    const toolbarH = toolbarRef.current.offsetHeight;
    const bulkH = bulkBarRef.current?.offsetHeight ?? 0;
    const TABLE_HEADER = 38;
    const TABLE_GAP_TOP = 14;
    const PAGINATION = 55; // border-top(1) + padding-top(10) + 控件高(32) + padding-bottom(12)
    const BOTTOM_BUFFER = 0;
    const scrollY = containerH - toolbarH - bulkH - TABLE_HEADER - TABLE_GAP_TOP - PAGINATION - BOTTOM_BUFFER;
    setTableScrollY(Math.max(scrollY, 200));
  }, []);

  useEffect(() => {
    calcHeight();
    const ro = new ResizeObserver(calcHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    // window resize 兜底（容器宽变化不一定触发 RO）
    window.addEventListener('resize', calcHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calcHeight);
    };
  }, [calcHeight]);

  // 批量浮条出现/消失时重算
  useEffect(() => {
    calcHeight();
  }, [selectedKeys.length, calcHeight]);

  const getList = useCallback(async (
    params?: Partial<SearchParams>,
    pageParams?: Partial<PaginationState>,
  ) => {
    try {
      setTableLoading(true);

      const nextSearchParams = { ...searchParams, ...params };
      const nextPagination = { ...pagination, ...pageParams };

      const result = await request<PageResponse<UserItem>>('/api/users', {
        method: 'GET',
        params: {
          page: nextPagination.current,
          pageSize: nextPagination.pageSize,
          username: nextSearchParams.username,
          status: nextSearchParams.status,
        },
      });

      setList(result.data.list || []);
      setSearchParams(nextSearchParams);
      setPagination({
        current: result.data.page || 1,
        pageSize: result.data.pageSize || 10,
        total: result.data.total || 0,
      });
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [pagination, searchParams]);

  useEffect(() => {
    getList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(() => {
    setCurrentRow(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: UserItem) => {
    setCurrentRow(record);
    setModalOpen(true);
  }, []);

  const handleDelete = async (record: UserItem) => {
    try {
      setTableLoading(true);
      await request(`/api/users/${record.id}`, { method: 'DELETE' });
      message.success('删除成功');
      const isLastItem = list.length === 1;
      getList(undefined, {
        current: isLastItem && pagination.current > 1 ? pagination.current - 1 : pagination.current,
      });
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSubmit = async (values: UserFormValues) => {
    try {
      setModalLoading(true);
      await request(isEdit ? `/api/users/${currentRow?.id}` : '/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        data: values,
      });
      message.success(isEdit ? '编辑成功' : '新增成功');
      setModalOpen(false);
      setCurrentRow(null);
      getList();
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── 批量操作 ──────────────────────────────────────────────
  const selectedRows = useMemo(
    () => list.filter((u) => selectedKeys.includes(u.id)),
    [list, selectedKeys],
  );

  /**
   * 通用批量执行：并行调用 + 汇总成功/失败
   */
  const runBulk = async (
    actionName: string,
    fn: (user: UserItem) => Promise<unknown>,
    targets: UserItem[],
  ) => {
    if (targets.length === 0) return;
    setBulkLoading(true);
    const results = await Promise.allSettled(targets.map(fn));
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = results.length - fulfilled;
    if (rejected === 0) {
      message.success(`${actionName} 成功，共 ${fulfilled} 条`);
    } else if (fulfilled === 0) {
      message.error(`${actionName} 全部失败，共 ${rejected} 条`);
    } else {
      message.warning(`${actionName} 完成：成功 ${fulfilled} 条，失败 ${rejected} 条`);
    }
    setBulkLoading(false);
    setSelectedKeys([]);
    getList();
  };

  const handleBulkToggleStatus = (targetStatus: 0 | 1) => {
    const targets = selectedRows.filter((u) => u.status !== targetStatus);
    if (targets.length === 0) {
      message.info(targetStatus === 1 ? '所选用户已是启用状态' : '所选用户已是禁用状态');
      return;
    }
    runBulk(
      targetStatus === 1 ? '批量启用' : '批量禁用',
      (u) =>
        request(`/api/users/${u.id}`, {
          method: 'PUT',
          data: {
            username: u.username,
            nickname: u.nickname,
            email: u.email,
            status: targetStatus,
          },
        }),
      targets,
    );
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: `确认删除选中的 ${selectedRows.length} 个用户？`,
      content: '删除后不可恢复',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () =>
        runBulk(
          '批量删除',
          (u) => request(`/api/users/${u.id}`, { method: 'DELETE' }),
          selectedRows,
        ),
    });
  };

  const handleBulkAssignRole = () => {
    // 过滤掉 SUPER_ADMIN（后端 PATCH 拒绝）
    const targets = selectedRows.filter((u) => u.role !== 'SUPER_ADMIN' && u.role !== bulkTargetRole);
    if (targets.length === 0) {
      message.info(`所选用户已经是 ${bulkTargetRole === 'ADMIN' ? '管理员' : '普通用户'}（或为超管，不可改）`);
      setBulkRoleModalOpen(false);
      return;
    }
    runBulk(
      `提交角色变更审批（${bulkTargetRole === 'ADMIN' ? '管理员' : '普通用户'}）`,
      (u) =>
        request(`/api/change-requests`, {
          method: 'POST',
          data: {
            type: 'ASSIGN_ROLE',
            targetUserId: u.id,
            toRole: bulkTargetRole,
            reason: '用户管理页发起的角色调整',
          },
        }),
      targets,
    );
    setBulkRoleModalOpen(false);
  };

  /**
   * CSV 导出（客户端实现，仅导出选中行；若未选中则导出当前页）
   */
  const handleExportCsv = () => {
    const rows = selectedRows.length > 0 ? selectedRows : list;
    if (rows.length === 0) {
      message.info('暂无数据可导出');
      return;
    }
    const headers = ['ID', '用户名', '昵称', '邮箱', '角色', '状态', '创建时间'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      // CSV 字段转义：含 , " \n 时用双引号包裹，内部 " 替换为 ""
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((u) =>
        [
          u.id,
          u.username,
          u.nickname,
          u.email,
          u.role,
          u.status === 1 ? '启用' : '禁用',
          formatDateTime(u.createdAt),
        ]
          .map(escape)
          .join(','),
      ),
    ];
    // Excel 兼容：加 UTF-8 BOM
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${rows.length} 条`);
  };

  const columns = getUserTableColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <>
      <Card
        variant="borderless"
        title={(
          <Space size={6}>
            <span>用户管理</span>
            <Tooltip title="管理用户账号、状态与批量操作，角色调整将按审批流程生效。">
              <InfoCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
            </Tooltip>
          </Space>
        )}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增用户
          </Button>
        }
      >
        <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
          <div ref={toolbarRef}>
            <div style={{ marginBottom: 12 }}>
              <Form
                form={form}
                layout="inline"
                onFinish={(values) => {
                  getList({ username: values.username || '', status: values.status }, { current: 1 });
                }}
              >
                <Form.Item name="username" label="用户名" className={styles.formItemInline}>
                  <Input
                    placeholder="搜索用户名"
                    allowClear
                    className="w-[190px] rounded-md"
                    prefix={(
                      <SearchOutlined
                        className="text-[13px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      />
                    )}
                  />
                </Form.Item>

                <Form.Item name="status" label="状态" className={styles.formItemInline}>
                  <Select
                    allowClear
                    placeholder="全部状态"
                    className="w-[130px]"
                    options={[
                      { label: '启用', value: 1 },
                      { label: '禁用', value: 0 },
                    ]}
                  />
                </Form.Item>

                <Form.Item className={styles.formItemInline}>
                  <Space size={8}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      className="rounded-md"
                      loading={tableLoading}
                    >
                      查询
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      className="rounded-md"
                      disabled={tableLoading}
                      onClick={() => {
                        form.resetFields();
                        getList({ username: '', status: undefined }, { current: 1 });
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          </div>

          {/* 批量操作浮条：选中后出现 */}
          {selectedKeys.length > 0 && (
            <div
              ref={bulkBarRef}
              style={{
                marginBottom: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--fill-quaternary, #fafafa)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                  已选 {selectedKeys.length} 项
                </span>
                <Button type="link" size="small" onClick={() => setSelectedKeys([])}>
                  取消选择
                </Button>
              </div>
              <Space size={4} wrap>
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleBulkToggleStatus(1)}
                  loading={bulkLoading}
                >
                  批量启用
                </Button>
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  onClick={() => handleBulkToggleStatus(0)}
                  loading={bulkLoading}
                >
                  批量禁用
                </Button>
                <Button
                  size="small"
                  icon={<UserSwitchOutlined />}
                  onClick={() => setBulkRoleModalOpen(true)}
                  loading={bulkLoading}
                >
                  分配角色
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleExportCsv}
                >
                  导出 CSV
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBulkDelete}
                  loading={bulkLoading}
                >
                  批量删除
                </Button>
              </Space>
            </div>
          )}

          <Card variant="borderless" className="min-h-0 flex-1" styles={{ body: {height: '100%', display: 'flex', flexDirection: 'column' } }}>
          <Table
            rowKey="id"
            loading={tableLoading}
            dataSource={list}
            scroll={{ x: 800, y: tableScrollY }}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: (keys) => setSelectedKeys(keys),
              preserveSelectedRowKeys: true,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              size: 'small',
            }}
            onChange={(pageInfo) => {
              getList(undefined, {
                current: pageInfo.current || 1,
                pageSize: pageInfo.pageSize || 10,
              });
            }}
            columns={columns}
          />
          </Card>
        </div>
      </Card>

      <UserModal
        open={modalOpen}
        title={isEdit ? '编辑用户' : '新增用户'}
        loading={modalLoading}
        initialValues={currentRow || undefined}
        onCancel={() => { setModalOpen(false); setCurrentRow(null); }}
        onOk={handleSubmit}
      />

      {/* 批量分配角色弹窗 */}
      <Modal
        title={<><UserSwitchOutlined /> 批量分配角色</>}
        open={bulkRoleModalOpen}
        onCancel={() => setBulkRoleModalOpen(false)}
        onOk={handleBulkAssignRole}
        okText="提交审批"
        okButtonProps={{ loading: bulkLoading }}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          将为所选 <b style={{ color: 'var(--color-primary)' }}>{selectedKeys.length}</b> 个用户
          <b>发起角色变更审批</b>，通过后才生效（超级管理员将被自动跳过）
        </div>
        <Radio.Group
          value={bulkTargetRole}
          onChange={(e) => setBulkTargetRole(e.target.value)}
          options={[
            { label: '管理员 (ADMIN)', value: 'ADMIN' },
            { label: '普通用户 (USER)', value: 'USER' },
          ]}
          optionType="button"
          buttonStyle="solid"
        />
      </Modal>
    </>
  );
}
