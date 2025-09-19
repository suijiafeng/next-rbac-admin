'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from 'antd';
import { request } from '@/lib/request';
import type { PageResponse } from '@/types/request';
import type { UserItem } from '@/types/user';
import UserModal, { UserFormValues } from '@/components/user-modal';

interface SearchParams {
  username: string;
  status?: number;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function UsersPage() {
  const [list, setList] = useState<UserItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<UserItem | null>(null);

  const isEdit = useMemo(() => Boolean(currentRow), [currentRow]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    username: '',
  });
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const getList = async (
    params?: Partial<SearchParams>,
    pageParams?: Partial<PaginationState>,
  ) => {
    try {
      setTableLoading(true);

      const nextSearchParams = {
        ...searchParams,
        ...params,
      };

      const nextPagination = {
        ...pagination,
        ...pageParams,
      };

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
      message.error(
        error instanceof Error ? error.message : '获取用户列表失败',
      );
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    // console.log('执行了多次')
    getList();
  }, []);

  const handleCreate = () => {
    setCurrentRow(null);
    setModalOpen(true);
  };

  const handleEdit = (record: UserItem) => {
    setCurrentRow(record);
    setModalOpen(true);
  };

  const handleDelete = async (record: UserItem) => {
    try {
      setTableLoading(true);

      await request(`/api/users/${record.id}`, {
        method: 'DELETE',
      });

      message.success('删除成功');

      const isLastItem = list.length === 1;
      const currentPage = pagination.current;

      getList(undefined, {
        current: isLastItem && currentPage > 1 ? currentPage - 1 : currentPage,
      });
    } catch (error) {
      console.error(error);
      message.error(
        error instanceof Error ? error.message : '删除失败',
      );
    } finally {
      setTableLoading(false);
    }
  };

 const handleSubmit = async (values: UserFormValues) => {
  try {
    setModalLoading(true);

    await request(
      isEdit ? `/api/users/${currentRow?.id}` : '/api/users',
      {
        method: isEdit ? 'PUT' : 'POST',
        data: values,
      },
    );

    message.success(isEdit ? '编辑成功' : '新增成功');
    setModalOpen(false);
    setCurrentRow(null);

    getList();
  } catch (error) {
    console.error(error);
    message.error(
      error instanceof Error ? error.message : '操作失败',
    );
  } finally {
    setModalLoading(false);
  }
};

  return (
    <>
      <Space
        direction="vertical"
        size={16}
        style={{ width: '100%' }}
      >
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            用户管理
          </Typography.Title>

          <Button type="primary" onClick={handleCreate}>
            新增用户
          </Button>
        </Space>
        <Form
          form={form}
          layout="inline"
          onFinish={(values) => {
            getList(
              {
                username: values.username || '',
                status: values.status,
              },
              {
                current: 1,
              },
            );
          }}
        >
          <Form.Item name="username" label="用户名">
            <Input placeholder="请输入用户名" allowClear />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="请选择状态"
              style={{ width: 160 }}
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>

              <Button
                onClick={() => {
                  form.resetFields();
                  getList(
                    {
                      username: '',
                      status: undefined,
                    },
                    {
                      current: 1,
                    },
                  );
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <Table
          rowKey="id"
          loading={tableLoading}
          dataSource={list}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(pageInfo) => {
            getList(undefined, {
              current: pageInfo.current || 1,
              pageSize: pageInfo.pageSize || 10,
            });
          }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 80,
            },
            {
              title: '用户名',
              dataIndex: 'username',
            },
            {
              title: '昵称',
              dataIndex: 'nickname',
            },
            {
              title: '邮箱',
              dataIndex: 'email',
              render: (value: string | null) => value || '-',
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: number) =>
                value === 1 ? (
                  <Tag color="success">启用</Tag>
                ) : (
                  <Tag>禁用</Tag>
                ),
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              render: (value: string) =>
                new Date(value).toLocaleString(),
            },
            {
              title: '操作',
              key: 'action',
              width: 180,
              render: (_value, record) => (
                <Space>
                  <Button
                    type="link"
                    onClick={() => {
                      handleEdit(record);
                    }}
                  >
                    编辑
                  </Button>

                  <Popconfirm
                    title="确认删除该用户吗？"
                    onConfirm={() => {
                      handleDelete(record);
                    }}
                  >
                    <Button type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <UserModal
        open={modalOpen}
        title={isEdit ? '编辑用户' : '新增用户'}
        loading={modalLoading}
        initialValues={currentRow || undefined}
        onCancel={() => {
          setModalOpen(false);
          setCurrentRow(null);
        }}
        onOk={handleSubmit}
      />
    </>
  );
}