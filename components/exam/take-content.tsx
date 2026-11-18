'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Progress, Space, Tag, Typography, message } from 'antd';
import { ExamQuestionBody } from '@/components/exam/question-registry';
import { emptyPayload, validateAnswers } from '@/lib/exam/answers';
import {
  selectAnswers,
  selectDeadline,
  useExamSessionStore,
} from '@/lib/exam/session-store';
import { request } from '@/lib/request';
import type { GradeResult } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

const { Text, Title } = Typography;

function formatRemain(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ExamTakeContent() {
  const router = useRouter();
  const paper = useExamSessionStore((state) => state.paper);
  const answers = useExamSessionStore(selectAnswers);
  const deadline = useExamSessionStore(selectDeadline);
  const submittedAt = useExamSessionStore((state) => state.submittedAt);
  const lastSavedAt = useExamSessionStore((state) => state.lastSavedAt);
  const updateAnswer = useExamSessionStore((state) => state.updateAnswer);
  const commitGrade = useExamSessionStore((state) => state.commitGrade);
  const loadSaved = useExamSessionStore((state) => state.loadSaved);
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!useExamSessionStore.getState().paper) loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainMs = deadline === null ? null : deadline - now;
  const answered = useMemo(() => {
    if (!paper) return 0;
    const validation = validateAnswers(paper.questions, answers);
    return paper.questions.length - Object.keys(validation.errors).length;
  }, [answers, paper]);

  const submit = async () => {
    if (!paper || submitting || submittedAt) return;
    const validation = validateAnswers(paper.questions, answers);
    if (!validation.ok) {
      message.error(Object.values(validation.errors)[0] || '请完成全部题目');
      return;
    }
    setSubmitting(true);
    try {
      const res = await request<{ grade: GradeResult }>('/api/exams/attempts', {
        method: 'POST',
        data: { paperId: paper.id, answers },
      });
      commitGrade(res.data.grade);
      router.push('/exam-result');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '交卷失败');
      setSubmitting(false);
    }
  };

  if (!paper) {
    return (
      <div style={{ padding: 16 }}>
        <Alert
          type="warning"
          showIcon
          message="还没有进行中的试卷"
          description="请从试卷列表选择一张已发布的演示试卷。"
          action={<Button onClick={() => router.push('/exams')}>返回列表</Button>}
        />
      </div>
    );
  }

  const percent = Math.round((answered / paper.questions.length) * 100);

  return (
    <div style={{ padding: 16, paddingBottom: 88 }} data-testid="exam-take">
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>{paper.title}</Title>
            <Tag>{DEMO_DATA_LABEL}</Tag>
            {lastSavedAt && <Tag color="blue">进度已保存</Tag>}
          </Space>
          <Text type="secondary">{paper.summary}</Text>
          <Space wrap>
            <Text strong data-testid="exam-timer">
              剩余 {remainMs === null ? '--:--' : formatRemain(remainMs)}
            </Text>
            <Text>已作答 {answered}/{paper.questions.length}</Text>
          </Space>
          <Progress percent={percent} showInfo={false} />
        </Space>
      </Card>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {paper.questions.map((question, index) => {
          const record = answers[question.id];
          const payload = record?.payload ?? emptyPayload(question);
          return (
            <Card
              key={question.id}
              data-testid={`question-${question.id}`}
              title={`${index + 1}. ${question.stem}`}
              extra={<Text type="secondary">{question.score} 分</Text>}
            >
              <ExamQuestionBody
                question={question}
                payload={payload}
                disabled={Boolean(submittedAt) || submitting}
                onChange={(next) => updateAnswer(question, next)}
              />
            </Card>
          );
        })}
      </Space>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 16,
          padding: '12px 0',
          background: 'var(--bg-layout, #f5f5f5)',
        }}
      >
        <Button
          type="primary"
          size="large"
          block
          loading={submitting}
          data-testid="exam-submit"
          onClick={submit}
        >
          提交试卷
        </Button>
      </div>
    </div>
  );
}
