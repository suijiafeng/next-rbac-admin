'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Space,
  Typography,
} from 'antd';
import { request } from '@/lib/request';

interface ProfileInfo {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  role: string;
  status: number;
  createdAt: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form] = Form.useForm();

  /**
   * 获取个人信息
   */
  const getProfile = async () => {
    try {
      setLoading(true);

      const result = await request<ProfileInfo>('/api/profile');

      form.setFieldsValue({
        username: result.data.username,
        nickname: result.data.nickname,
        email: result.data.email ?? '',
        role: result.data.role,
        status: result.data.status === 1 ? '启用' : '禁用',
        createdAt: new Date(result.data.createdAt).toLocaleString(),
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '获取个人信息失败',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  /**
   * 保存
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setSubmitLoading(true);

      await request('/api/profile', {
        method: 'PUT',
        data: {
          nickname: values.nickname,
          email: values.email,
        },
      });

      message.success('保存成功');

      setIsEdit(false);
      getProfile();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  /**
   * 渲染字段（核心逻辑）
   */
  const renderField = (
    name: string,
    isEdit: boolean,
    input?: React.ReactNode,
  ) => {
    const value = form.getFieldValue(name);

    if (isEdit && input) {
      return input;
    }

    return <span>{value || '-'}</span>;
  };

  return (
    <Card
      loading={loading}
      title="个人信息"
      extra={
        !isEdit ? (
          <Button type="primary" onClick={() => setIsEdit(true)}>
            编辑
          </Button>
        ) : (
          <Space>
            <Button
              onClick={() => {
                setIsEdit(false);
                getProfile(); // 🔥 取消恢复数据
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={submitLoading}
              onClick={handleSubmit}
            >
              保存
            </Button>
          </Space>
        )
      }
    >
      <Form form={form}>
        <Row gutter={24}>
          {/* 用户名 */}
          <Col span={12}>
            <Form.Item label="用户名">
              {renderField('username', false)}
            </Form.Item>
          </Col>

          {/* 昵称 */}
          <Col span={12}>
            <Form.Item
              label="昵称"
              name="nickname"
              rules={[{ required: true, message: '请输入昵称' }]}
            >
              {renderField('nickname', isEdit, <Input style={{width:"220px"}}/>)}
            </Form.Item>
          </Col>

          {/* 邮箱 */}
          <Col span={12}>
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                {
                  type: 'email',
                  message: '邮箱格式不正确',
                },
              ]}
            >
              {renderField('email', isEdit, <Input style={{width:"220px"}}/>)}
            </Form.Item>
          </Col>

          {/* 角色 */}
          <Col span={12}>
            <Form.Item label="角色">
              {renderField('role', false)}
            </Form.Item>
          </Col>

          {/* 状态 */}
          <Col span={12}>
            <Form.Item label="状态">
              {renderField('status', false)}
            </Form.Item>
          </Col>

          {/* 创建时间 */}
          <Col span={12}>
            <Form.Item label="创建时间">
              {renderField('createdAt', false)}
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}