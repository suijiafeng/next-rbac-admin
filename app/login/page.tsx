'use client';

import { Button, Card, Form, Input, Typography, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.code !== 0) {
        message.error(result.message || '登录失败');
        return;
      }

      message.success('登录成功');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error(error);
      message.error('登录失败');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        <Typography.Title
          level={3}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          后台登录
        </Typography.Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          initialValues={{
            username: 'admin',
            password: '123456',
          }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              {
                required: true,
                message: '请输入密码',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}