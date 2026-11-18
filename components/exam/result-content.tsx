'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Result, Space, Table, Tag, Typography } from 'antd';
import { selectGrade, useExamSessionStore } from '@/lib/exam/session-store';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

const { Text } = Typography;

export default function ExamResultContent() {
  const router = useRouter();
  const grade = useExamSessionStore(selectGrade);

  if (!grade) {
    return (
      <div style={{ padding: 16 }}>
        <Result
          status="info"
          title="还没有本次成绩"
          subTitle="成绩来自刚才的交卷。请先完成一张演示试卷。"
          extra={<Button onClick={() => router.push('/exams')}>去试卷列表</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }} data-testid="exam-result">
      <Card>
        <Result
          status={grade.passed ? 'success' : 'warning'}
          title={<span data-testid="exam-score">{grade.earned}</span>}
          subTitle={`${grade.paperTitle} · 满分 ${grade.total} · ${grade.passed ? '及格' : '未及格'} · 本次积分 +${grade.pointsAwarded}`}
          extra={[
            <Button key="points" type="primary" onClick={() => router.push('/exam-points')}>
              查看积分
            </Button>,
            <Button key="back" onClick={() => router.push('/exams')}>返回列表</Button>,
          ]}
        />
        <Space style={{ marginBottom: 12 }}>
          <Tag>{DEMO_DATA_LABEL}</Tag>
          <Text type="secondary">判分在服务端完成，这一页只读取成绩 selector。</Text>
        </Space>
        <Table
          rowKey="questionId"
          pagination={false}
          dataSource={grade.items}
          columns={[
            { title: '题目', dataIndex: 'questionId' },
            { title: '得分', dataIndex: 'earned' },
            { title: '满分', dataIndex: 'full' },
            {
              title: '结果',
              dataIndex: 'correct',
              render: (correct: boolean) => (
                <Tag color={correct ? 'success' : 'error'}>{correct ? '正确' : '错误'}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
