'use client';

import { useState } from 'react';
import { Button, Form, Input, Result, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AuthParticles from '@/components/auth/AuthParticles';

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
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (values: RegisterFormValues) => {
    setSubmitting(true);
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
    } finally {
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
          padding: 24px 0;
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
          width: 420px;
          max-width: calc(100vw - 32px);
          padding: 28px 36px 24px;
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
          width: 46px;
          height: 46px;
          margin: 0 auto 12px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: #fff;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5);
        }
        .glass-title {
          text-align: center;
          color: #fff;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .glass-sub {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          margin-bottom: 18px;
        }
        /* 收紧表单纵向间距 */
        .glass-card .ant-form-item {
          margin-bottom: 14px;
        }
        .glass-card .ant-form-vertical .ant-form-item-label {
          padding-bottom: 2px;
        }
        .glass-card .ant-form-item-label > label {
          height: 22px;
          font-size: 13px;
        }

        /* 输入框玻璃化 */
        .glass-card .ant-input-affix-wrapper {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 7px 14px;
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
          height: 42px;
          margin-top: 2px;
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
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }
        .glass-foot a { color: #a5b4fc; font-weight: 600; }
        .glass-foot a:hover { color: #c7d2fe; }

        /* Result 成功页文字适配深色 */
        .glass-card .ant-result-title { color: #fff; }
        .glass-card .ant-result-subtitle { color: rgba(255,255,255,0.65); }
      `}</style>

      <span className="login-blob3" />
      <AuthParticles />

      <div className="glass-card">
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
            <div className="glass-logo">✦</div>
            <div className="glass-title">注册账号</div>
            <div className="glass-sub">创建您的账户，开启后台之旅</div>

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
                <Button type="primary" htmlType="submit" block loading={submitting}>
                  注 册
                </Button>
              </Form.Item>

              <div className="glass-foot">
                已有账号？<Link href="/login">立即登录</Link>
              </div>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
