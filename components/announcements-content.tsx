'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { request } from '@/lib/request';
import { formatDate } from '@/lib/format';
import type { PageResponse } from '@/types/request';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  publisherUsername: string;
  active: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

interface AnnouncementFormValues {
  title: string;
  content: string;
  active: boolean;
  startsAt?: unknown;
  expiresAt?: unknown;
}

export default function AnnouncementsContent() {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form] = Form.useForm<AnnouncementFormValues>();

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await request<PageResponse<AnnouncementItem>>('/api/admin/announcements', {
        params: { page: p, pageSize },
      });
      setList(res.data.list);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      message.error('获取公告列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setModalOpen(true);
  };

  const handleEdit = (record: AnnouncementItem) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      active: record.active,
      startsAt: record.startsAt ? dayjs(record.startsAt) : undefined,
      expiresAt: record.expiresAt ? dayjs(record.expiresAt) : undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (record: AnnouncementItem) => {
    try {
      await request(`/api/admin/announcements/${record.id}`, { method: 'DELETE' });
      message.success('公告已删除');
      load(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);
      const payload = {
        title: values.title,
        content: values.content,
        active: values.active,
        startsAt: values.startsAt ? dayjs(values.startsAt as Parameters<typeof dayjs>[0]).toISOString() : undefined,
        expiresAt: values.expiresAt ? dayjs(values.expiresAt as Parameters<typeof dayjs>[0]).toISOString() : null,
      };
      if (editing) {
        await request(`/api/admin/announcements/${editing.id}`, { method: 'PUT', data: payload });
        message.success('公告已更新');
      } else {
        await request('/api/admin/announcements', { method: 'POST', data: payload });
        message.success('公告已发布');
      }
      setModalOpen(false);
      load(page);
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const columns: ColumnsType<AnnouncementItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (v: string, row: AnnouncementItem) => (
        <Space size={6}>
          {row.active ? <Tag color="green">生效</Tag> : <Tag>未启用</Tag>}
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '发布人',
      dataIndex: 'publisherUsername',
      width: 100,
    },
    {
      title: '生效时间',
      dataIndex: 'startsAt',
      width: 140,
      render: (v: string) => formatDate(v),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 140,
      render: (v: string | null) => v ? formatDate(v) : <Text type="secondary">永久</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: AnnouncementItem) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确认删除该公告？"
            onConfirm={() => handleDelete(record)}
            okText="删除"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
          公告管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => load(page)} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>发布公告</Button>
        </Space>
      </div>

      <Card bordered={false}>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={list}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => load(p),
            size: 'small',
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑公告' : '发布公告'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? '保存' : '发布'}
        okButtonProps={{ loading: modalLoading }}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="公告标题" maxLength={100} showCount />
          </Form.Item>
          <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={4} placeholder="公告内容" maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="是否生效" name="active" valuePropName="checked">
            <Switch checkedChildren="生效" unCheckedChildren="停用" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }}>
            <Form.Item label="生效时间" name="startsAt" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="过期时间" name="expiresAt" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="留空为永久" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
