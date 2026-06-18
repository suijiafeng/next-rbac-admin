'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Rate,
  Result,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BugOutlined,
  BulbOutlined,
  CustomerServiceOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { request } from '@/lib/request';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface FeedbackFormValues {
  type: 'bug' | 'feature' | 'experience' | 'other';
  priority: 'low' | 'medium' | 'high';
  title: string;
  content: string;
  contact?: string;
  satisfaction?: number;
}

const TYPE_OPTIONS = [
  { value: 'bug', label: '问题反馈', icon: <BugOutlined />, color: 'red' },
  { value: 'feature', label: '功能建议', icon: <BulbOutlined />, color: 'gold' },
  { value: 'experience', label: '体验吐槽', icon: <SmileOutlined />, color: 'blue' },
  { value: 'other', label: '其他', icon: <CustomerServiceOutlined />, color: 'default' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '不急' },
  { value: 'medium', label: '一般' },
  { value: 'high', label: '比较急' },
];

export default function FeedbackContent() {
  const [form] = Form.useForm<FeedbackFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values: FeedbackFormValues) => {
    setSubmitting(true);
    try {
      await request('/api/feedback', { method: 'POST', data: values });
      setSubmitted(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Result
            status="success"
            title="反馈已提交，感谢你的建议！"
            subTitle="我们会认真查看每一条反馈，如需跟进会通过你留的联系方式联系你。"
            extra={[
              <Button type="primary" key="again" onClick={handleReset}>
                再提交一条
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size={4} style={{ marginBottom: 20 }}>
          <Text type="secondary">
            使用过程中遇到问题，或者有想吐槽 / 想要的功能？告诉我们，让产品变得更好用。
          </Text>
        </Space>

        <Row gutter={32}>
          <Col xs={24} lg={15}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark="optional"
              initialValues={{ type: 'feature', priority: 'medium', satisfaction: 5 }}
            >
              <Form.Item
                label="反馈类型"
                name="type"
                rules={[{ required: true, message: '请选择反馈类型' }]}
              >
                <Select
                  options={TYPE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: (
                      <Space>
                        {o.icon}
                        {o.label}
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="标题"
                name="title"
                rules={[
                  { required: true, message: '请输入一句话标题' },
                  { max: 50, message: '标题最多 50 个字' },
                ]}
              >
                <Input placeholder="一句话概括你的反馈，例如：希望表格支持列宽拖拽" allowClear />
              </Form.Item>

              <Form.Item
                label="详细描述"
                name="content"
                rules={[
                  { required: true, message: '请描述具体情况' },
                  { min: 10, message: '再多写一点吧，至少 10 个字' },
                ]}
              >
                <TextArea
                  rows={6}
                  showCount
                  maxLength={500}
                  placeholder="描述具体场景、复现步骤或你期望的效果，越详细我们越好定位～"
                />
              </Form.Item>

              <Form.Item label="紧急程度" name="priority">
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>

              <Form.Item
                label="联系方式"
                name="contact"
                extra="选填。留下邮箱或手机号，方便我们跟进时联系你。"
                rules={[{ max: 50, message: '联系方式过长' }]}
              >
                <Input placeholder="邮箱 / 手机号（选填）" allowClear />
              </Form.Item>

              <Form.Item label="整体满意度" name="satisfaction">
                <Rate />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={submitting}
                  >
                    提交反馈
                  </Button>
                  <Button onClick={() => form.resetFields()} disabled={submitting}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Col>

          <Col xs={24} lg={9}>
            <Card
              size="small"
              type="inner"
              title="填写小贴士"
              style={{ background: 'var(--fill-quaternary, #fafafa)' }}
            >
              <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                一条好的反馈通常包含：
              </Paragraph>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Text>
                  <Tag color="blue">场景</Tag> 你在做什么的时候遇到的
                </Text>
                <Text>
                  <Tag color="orange">现象</Tag> 实际发生了什么
                </Text>
                <Text>
                  <Tag color="green">期望</Tag> 你希望它怎样
                </Text>
              </Space>
              <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
                问题类反馈建议附上复现步骤；功能建议可以说明使用场景，方便我们排优先级。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
