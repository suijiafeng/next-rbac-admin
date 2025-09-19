'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import UserModal, { UserFormValues } from '@/components/user-modal';
import type { UserItem } from '@/types/user';

export default function UsersPage() {
  const [list, setList] = useState<UserItem[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<UserItem | null>(null);

  const isEdit = useMemo(() => Boolean(currentRow), [currentRow]);

  const getList = async () => {
    try {
      setTableLoading(true);

      const response = await fetch('/api/users');
      const result = await response.json();

      if (result.code !== 0) {
        message.error(result.message || '获取用户列表失败');
        return;
      }

      setList(result.data || []);
    } catch (error) {
      console.error(error);
      message.error('获取用户列表失败');
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

      const response = await fetch(`/api/users/${record.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.code !== 0) {
        message.error(result.message || '删除失败');
        return;
      }

      message.success('删除成功');
      getList();
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSubmit = async (values: UserFormValues) => {
    try {
      setModalLoading(true);

      const response = await fetch(
        isEdit ? `/api/users/${currentRow?.id}` : '/api/users',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        },
      );

      const result = await response.json();

      if (result.code !== 0) {
        message.error(result.message || '操作失败');
        return;
      }

      message.success(isEdit ? '编辑成功' : '新增成功');
      setModalOpen(false);
      setCurrentRow(null);
      getList();
    } catch (error) {
      console.error(error);
      message.error('操作失败');
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

        <Table
          rowKey="id"
          loading={tableLoading}
          dataSource={list}
          pagination={{
            pageSize: 10,
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