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
      <style jsx global>{`
        .login-wrap {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            linear-gradient(rgba(8, 12, 28, 0.62), rgba(8, 12, 28, 0.78)),
            url('/assets/bg.jpg') center / cover no-repeat;
          background-color: #0b1020;
        }
        /* 动态渐变光斑背景 */
        .login-wrap::before,
        .login-wrap::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          z-index: 0;
        }
        .login-wrap::before {
          width: 520px;
          height: 520px;
          background: radial-gradient(circle at 30% 30%, #6366f1, #8b5cf6 45%, transparent 70%);
          top: -120px;
          left: -100px;
          animation: float1 14s ease-in-out infinite;
        }
        .login-wrap::after {
          width: 560px;
          height: 560px;
          background: radial-gradient(circle at 60% 40%, #06b6d4, #3b82f6 50%, transparent 72%);
          bottom: -160px;
          right: -120px;
          animation: float2 18s ease-in-out infinite;
        }
        .login-blob3 {
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.4;
          background: radial-gradient(circle at 50% 50%, #ec4899, #f43f5e 55%, transparent 72%);
          top: 40%;
          left: 50%;
          z-index: 0;
          animation: float3 16s ease-in-out infinite;
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, 60px) scale(1.15); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-90px, -50px) scale(1.1); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-40%, -40px) scale(1.2); }
        }

        /* 玻璃拟态卡片 */
        .glass-card {
          position: relative;
          z-index: 1;
          width: 400px;
          max-width: calc(100vw - 32px);
          padding: 44px 40px 36px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          animation: cardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .glass-logo {
          width: 56px;
          height: 56px;
          margin: 0 auto 18px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          color: #fff;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5);
        }
        .glass-title {
          text-align: center;
          color: #fff;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }
        .glass-sub {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          margin-bottom: 30px;
        }

        /* 输入框玻璃化 */
        .glass-card .ant-input-affix-wrapper {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 10px 14px;
          transition: all 0.25s;
        }
        .glass-card .ant-input-affix-wrapper:hover {
          border-color: rgba(139, 92, 246, 0.7);
        }
        .glass-card .ant-input-affix-wrapper-focused,
        .glass-card .ant-input-affix-wrapper:focus-within {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
          background: rgba(255, 255, 255, 0.1);
        }
        .glass-card .ant-input {
          background: transparent !important;
          color: #fff;
        }
        .glass-card .ant-input::placeholder { color: rgba(255,255,255,0.45); }
        .glass-card .ant-input-prefix { color: rgba(255,255,255,0.7); margin-inline-end: 10px; }
        .glass-card .ant-input-password-icon { color: rgba(255,255,255,0.7); }
        .glass-card .ant-form-item-label > label { color: rgba(255,255,255,0.85); }

        /* 渐变发光按钮 */
        .glass-card .ant-btn-primary {
          height: 46px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 2px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6 50%, #06b6d4);
          background-size: 200% auto;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5);
          transition: all 0.4s;
        }
        .glass-card .ant-btn-primary:hover {
          background-position: right center;
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.7);
          transform: translateY(-1px);
        }
        .glass-foot {
          text-align: center;
          margin-top: 22px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }
        .glass-foot a { color: #a5b4fc; font-weight: 600; }
        .glass-foot a:hover { color: #c7d2fe; }
      `}</style>

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
            username: 'admin',
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
