'use client';

import { Button, Card, Form, Input, Typography, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const router = useRouter();
  const { refreshAuth } = useAuthContext();

  const handleLogin = async (values: { username: string; password: string }) => {

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message);
      }
      await refreshAuth();
      router.replace('/');
      router.refresh();

    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    }
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: " linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)),url('assets/bg.jpg')",
        objectFit: 'fill',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 80px rgba(0,0,0,1)',
          marginTop: 'clamp(-15vh,-50%,-200px)'
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
          autoComplete="off"
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
              autoComplete="off"
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
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              还没有账号？{' '}
              <Link href="/register" style={{ color: '#1677ff' }}>
                立即注册
              </Link>
            </Typography.Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
