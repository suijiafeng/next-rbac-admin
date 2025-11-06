'use client';

import { useState } from 'react';
import { Button, Card, Form, Input, Result, Typography, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface RegisterFormValues {
  username: string;
  nickname: string;
  email?: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (values: RegisterFormValues) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.code !== 0) {
        message.error(result.message || '注册失败');
        return;
      }

      setRegistered(true);
    } catch (error) {
      console.error(error);
      message.error('注册失败');
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
        objectFit:'fill',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 80px rgba(0,0,0,1)',
           marginTop:  'clamp(-15vh,-50%,-200px)'
        }}
      >
        {registered ? (
          <Result
            status="success"
            title="注册申请已提交"
            subTitle="您的账号正在等待管理员审核，审核通过后即可登录。"
            extra={
              <Link href="/login">
                <Button type="primary">返回登录</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Typography.Title
              level={3}
              style={{ textAlign: 'center', marginBottom: 32 }}
            >
              注册账号
            </Typography.Title>

            <Form form={form} layout="vertical" onFinish={handleRegister} autoComplete="off">
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少 3 个字符' },
                  { max: 20, message: '用户名最多 20 个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="off" />
              </Form.Item>

              <Form.Item
                label="昵称"
                name="nickname"
                rules={[
                  { required: true, message: '请输入昵称' },
                  { max: 20, message: '昵称最多 20 个字符' },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入昵称" autoComplete="off" />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱（可选）" autoComplete="off" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少 6 位' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入密码（至少 6 位）" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                label="确认密码"
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" autoComplete="new-password" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 8 }}>
                <Button type="primary" htmlType="submit" block>
                  注册
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  已有账号？{' '}
                  <Link href="/login" style={{ color: '#1677ff' }}>
                    立即登录
                  </Link>
                </Typography.Text>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
