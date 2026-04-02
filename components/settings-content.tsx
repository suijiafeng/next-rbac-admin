'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import {
  GlobalOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';

interface SystemSettings {
  site_name: string;
  site_description: string;
  site_logo: string;
  session_duration: string;
  max_login_attempts: string;
  allow_register: string;
}

export default function SettingsContent() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteForm] = Form.useForm();
  const [securityForm] = Form.useForm();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<SystemSettings>('/api/settings');
      const s = result.data;
      siteForm.setFieldsValue({
        site_name: s.site_name,
        site_description: s.site_description,
        site_logo: s.site_logo,
      });
      securityForm.setFieldsValue({
        session_duration: Number(s.session_duration),
        max_login_attempts: Number(s.max_login_attempts),
        allow_register: s.allow_register === 'true',
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, [siteForm, securityForm]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSite = async () => {
    try {
      const values = await siteForm.validateFields();
      setSaving(true);
      await request('/api/settings', { method: 'PUT', data: values });
      message.success('站点设置已保存');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      const values = await securityForm.validateFields();
      setSaving(true);
      await request('/api/settings', {
        method: 'PUT',
        data: {
          ...values,
          allow_register: String(values.allow_register),
        },
      });
      message.success('安全设置已保存');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { width: 110, display: 'inline-block' };

  const tabs = [
    {
      key: 'site',
      label: (
        <span>
          <GlobalOutlined className="mr-1.5" />
          站点设置
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          <Form form={siteForm} layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item
              label={<span style={labelStyle}>站点名称</span>}
              name="site_name"
              rules={[{ required: true, message: '请输入站点名称' }]}
            >
              <Input placeholder="请输入站点名称" />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>站点描述</span>}
              name="site_description"
            >
              <Input.TextArea
                placeholder="请输入站点描述"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>Logo URL</span>}
              name="site_logo"
              rules={[{ type: 'url', message: '请输入合法的 URL' }]}
            >
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveSite}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined className="mr-1.5" />
          安全设置
        </span>
      ),
      children: (
        <Card loading={loading} variant="borderless">
          <Form form={securityForm} layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item
              label={<span style={labelStyle}>会话时长（天）</span>}
              name="session_duration"
              rules={[
                { required: true, message: '请输入会话时长' },
                {
                  type: 'number',
                  min: 1,
                  max: 30,
                  message: '请输入 1~30 之间的整数',
                },
              ]}
            >
              <InputNumber
                min={1}
                max={30}
                precision={0}
                style={{ width: 160 }}
                addonAfter="天"
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>最大登录尝试次数</span>}
              name="max_login_attempts"
              rules={[
                { required: true, message: '请输入最大登录尝试次数' },
                {
                  type: 'number',
                  min: 1,
                  max: 20,
                  message: '请输入 1~20 之间的整数',
                },
              ]}
            >
              <InputNumber
                min={1}
                max={20}
                precision={0}
                style={{ width: 160 }}
                addonAfter="次"
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>允许用户注册</span>}
              name="allow_register"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveSecurity}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={4} className="!mb-4 !text-base !font-semibold !text-slate-900">
        系统设置
      </Typography.Title>
      <Tabs items={tabs} />
    </>
  );
}
