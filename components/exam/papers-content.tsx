'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Col, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { request } from '@/lib/request';
import { useExamSessionStore } from '@/lib/exam/session-store';
import type { ExamAction, ExamActor, PublicPaper } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

const { Paragraph, Text, Title } = Typography;

const STATUS_TAG: Record<PublicPaper['status'], { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PENDING: { color: 'processing', text: '待审批' },
  APPROVED: { color: 'success', text: '已发布' },
  REJECTED: { color: 'error', text: '已驳回' },
};

const ACTION_BUTTON: Record<ExamAction, { text: string; type?: 'primary'; danger?: boolean }> = {
  take: { text: '开始作答', type: 'primary' },
  edit: { text: '编辑题目' },
  submitReview: { text: '提交审批', type: 'primary' },
  withdraw: { text: '撤回' },
  approve: { text: '通过', type: 'primary' },
  reject: { text: '驳回', danger: true },
};

const ACTOR_LABEL: Record<ExamActor, string> = {
  learner: '学员',
  author: '出题人',
  reviewer: '审核人',
};

export default function ExamPapersContent() {
  const router = useRouter();
  const startPaper = useExamSessionStore((state) => state.startPaper);
  const [list, setList] = useState<PublicPaper[]>([]);
  const [actor, setActor] = useState<ExamActor | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ actor: ExamActor; list: PublicPaper[] }>('/api/exams/papers');
      setActor(res.data.actor);
      setList(res.data.list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (paper: PublicPaper, action: ExamAction) => {
    if (action === 'take') {
      startPaper(paper);
      router.push('/exam-take');
      return;
    }
    setPendingId(`${paper.id}:${action}`);
    try {
      const res = await request(`/api/exams/papers/${paper.id}/decision`, {
        method: 'POST',
        data: { action },
      });
      message.success(res.message || '已更新');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>培训考试</Title>
          <Text type="secondary">
            {actor ? `当前身份：${ACTOR_LABEL[actor]}` : '加载身份中'}
            {' · '}
            {DEMO_DATA_LABEL}
            {' · 个人演示 suijiafeng'}
          </Text>
        </div>
        <Alert
          type="info"
          showIcon
          message="这些试卷是演示数据，不是真实考试安排。发布需要审批：出题人提交，审核人通过或驳回，学员只能作答已发布的卷。"
        />
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
        ) : (
          <Row gutter={[16, 16]}>
            {list.map((paper) => {
              const status = STATUS_TAG[paper.status];
              return (
                <Col xs={24} lg={12} key={paper.id}>
                  <Card
                    data-testid={`paper-${paper.id}`}
                    title={paper.title}
                    extra={<Tag color={status.color}>{status.text}</Tag>}
                  >
                    <Paragraph type="secondary" style={{ minHeight: 44 }}>{paper.summary}</Paragraph>
                    <Space size={8} wrap style={{ marginBottom: 12 }}>
                      <Tag>{DEMO_DATA_LABEL}</Tag>
                      <Tag>出题人 {paper.authorUsername}</Tag>
                      <Tag>{Math.round(paper.durationSec / 60)} 分钟</Tag>
                      <Tag>及格 {paper.passScore} 分</Tag>
                    </Space>
                    <Space wrap>
                      {paper.actions.map((action) => {
                        const meta = ACTION_BUTTON[action];
                        return (
                          <Button
                            key={action}
                            type={meta.type}
                            danger={meta.danger}
                            loading={pendingId === `${paper.id}:${action}`}
                            data-testid={`action-${paper.id}-${action}`}
                            onClick={() => runAction(paper, action)}
                          >
                            {meta.text}
                          </Button>
                        );
                      })}
                      {paper.actions.length === 0 && <Text type="secondary">当前状态没有可执行操作</Text>}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Space>
    </div>
  );
}
