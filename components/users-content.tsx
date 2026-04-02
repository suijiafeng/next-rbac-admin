'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Button,
  Form,
  Input,
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
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';
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
        <Typography.Text className="font-mono text-xs font-medium text-slate-400">
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
            <MailOutlined className="text-xs text-slate-400" />
            <Typography.Text className="text-[13px] !text-slate-700">{value}</Typography.Text>
          </Space>
        ) : (
          <Typography.Text className="text-[13px] !text-slate-300">—</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 88,
      render: (value: number) =>
        value === 1 ? (
          <Tag className="m-0 rounded-full border-0 bg-green-100 px-[10px] py-px text-xs font-medium text-green-600">
            启用
          </Tag>
        ) : (
          <Tag className="m-0 rounded-full border-0 bg-slate-100 px-[10px] py-px text-xs font-medium text-slate-400">
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
            <div className="text-[13px] text-slate-700">{d.toLocaleDateString('zh-CN')}</div>
            <div className="mt-px text-[11px] text-slate-400">
              {d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={2}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="rounded-[5px] px-2 py-[3px] text-[13px] !text-indigo-600"
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
              className="rounded-[5px] px-2 py-[3px] text-[13px]"
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

  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const isEdit = useMemo(() => Boolean(currentRow), [currentRow]);
  const [searchParams, setSearchParams] = useState<SearchParams>({ username: '' });
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 动态计算表格可滚动高度
  const calcHeight = useCallback(() => {
    if (!containerRef.current || !toolbarRef.current) return;
    const containerH = containerRef.current.clientHeight;
    const toolbarH = toolbarRef.current.offsetHeight;
    // 减去: toolbar + 表头(45) + 分页(56) + 间距(16)
    const scrollY = containerH - toolbarH - 45 - 56 - 16;
    setTableScrollY(Math.max(scrollY, 180));
  }, []);

  useEffect(() => {
    calcHeight();
    const ro = new ResizeObserver(calcHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [calcHeight]);

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

  const columns = getUserTableColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <>
      <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
        {/* ── 工具栏 ── */}
        <div  ref={toolbarRef}>
          {/* 标题行 */}
          <div className="pb-3.5 flex items-center justify-between">
            <div>
              <Typography.Title level={4} className="!m-0 !text-base !font-semibold !text-slate-900">
                用户管理
              </Typography.Title>
              <Typography.Text type="secondary" className="mt-0.5 block text-xs">
              </Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              className="rounded-md font-medium shadow-sm"
            >
              新增用户
            </Button>
          </div>

          {/* 搜索栏 */}
          <div className="pb-3.5  border-b  px-3.5 py-2.5">
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
                  prefix={<SearchOutlined className="text-[13px] text-slate-400" />}
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
                  >
                    查询
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    className="rounded-md"
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

        {/* ── 表格 ── */}
        <div className="min-h-0 flex-1 mt-3.5">
          <Table
            className={styles.table}
            rowKey="id"
            loading={tableLoading}
            dataSource={list}
            scroll={{ x: 800, y: tableScrollY }}
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
        </div>
      </div>

      <UserModal
        open={modalOpen}
        title={isEdit ? '编辑用户' : '新增用户'}
        loading={modalLoading}
        initialValues={currentRow || undefined}
        onCancel={() => { setModalOpen(false); setCurrentRow(null); }}
        onOk={handleSubmit}
      />
    </>
  );
}
