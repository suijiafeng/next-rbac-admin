'use client';

import { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import AuthParticles from '@/components/auth/AuthParticles';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const router = useRouter();
  const { refreshAuth } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setSubmitting(true);
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
      router.replace('/dashboard');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <span className="login-blob3" />
      <AuthParticles />

      <div className="glass-card">
        <div className="glass-logo">✦</div>
        <div className="glass-title">后台登录</div>
        <div className="glass-sub">欢迎回来，请登录您的账户</div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          autoComplete="off"
          initialValues={{
            username: 'super_admin',
            password: '123456',
          }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
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
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="glass-foot">
          还没有账号？<Link href="/register">立即注册</Link>
        </div>
      </div>
    </div>
  );
}
