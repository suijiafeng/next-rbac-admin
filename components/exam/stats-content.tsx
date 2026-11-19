'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Alert, Card, Col, Radio, Row, Space, Spin, Typography, message } from 'antd';
import { request } from '@/lib/request';
import { DEMO_DEPARTMENTS } from '@/lib/exam/demo-meta';
import { selectFilter, useExamDashboardStore } from '@/lib/exam/dashboard-store';
import type { DashboardRange, DemoAttemptRecord } from '@/lib/exam/types';
import { DEMO_CLOCK, DEMO_DATA_LABEL } from '@/lib/exam/types';

const { Text, Title } = Typography;

const ScoreTrendChart = dynamic(() => import('@/components/exam/charts/score-trend-chart'), {
  ssr: false,
  loading: () => <Spin />,
});
const DeptRankChart = dynamic(() => import('@/components/exam/charts/dept-rank-chart'), {
  ssr: false,
  loading: () => <Spin />,
});
const PointsDistChart = dynamic(() => import('@/components/exam/charts/points-dist-chart'), {
  ssr: false,
  loading: () => <Spin />,
});

const PAPERS = [
  { id: 'all', label: '全部试卷' },
  { id: 'demo-intro', label: '入门' },
  { id: 'demo-compare', label: '对照' },
];

export default function ExamStatsContent() {
  const filter = useExamDashboardStore(selectFilter);
  const setFilter = useExamDashboardStore((state) => state.setFilter);
  const setRecords = useExamDashboardStore((state) => state.setRecords);
  const ready = useExamDashboardStore((state) => state.ready);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    request<{ records: DemoAttemptRecord[] }>('/api/exams/stats')
      .then((res) => {
        if (!cancelled) setRecords(res.data.records);
      })
      .catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : '看板加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setRecords]);

  return (
    <div style={{ padding: 16 }} data-testid="exam-stats">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>成绩看板</Title>
          <Text type="secondary">
            {DEMO_DATA_LABEL} · 统计时钟 {DEMO_CLOCK.slice(0, 10)} · 三张图共用同一组筛选
          </Text>
        </div>
        <Alert
          type="warning"
          showIcon
          message="图上的分数、部门和人数都是手写的演示样本，不是真实考试指标。"
        />
        <Card size="small" title="筛选">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Text type="secondary">时间范围</Text>
              <div>
                <Radio.Group
                  value={filter.range}
                  onChange={(event) => setFilter({ range: event.target.value as DashboardRange })}
                >
                  <Radio.Button value="7d" data-testid="filter-range-7d">近 7 天</Radio.Button>
                  <Radio.Button value="30d" data-testid="filter-range-30d">近 30 天</Radio.Button>
                  <Radio.Button value="90d" data-testid="filter-range-90d">近 90 天</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div>
              <Text type="secondary">部门</Text>
              <div>
                <Radio.Group
                  value={filter.department}
                  onChange={(event) => setFilter({ department: event.target.value })}
                >
                  <Radio.Button value="all" data-testid="filter-dept-all">全部</Radio.Button>
                  {DEMO_DEPARTMENTS.map((department) => (
                    <Radio.Button
                      key={department}
                      value={department}
                      data-testid={`filter-dept-${department}`}
                    >
                      {department}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </div>
            <div>
              <Text type="secondary">试卷</Text>
              <div>
                <Radio.Group
                  value={filter.paperId}
                  onChange={(event) => setFilter({ paperId: event.target.value })}
                >
                  {PAPERS.map((paper) => (
                    <Radio.Button key={paper.id} value={paper.id} data-testid={`filter-paper-${paper.id}`}>
                      {paper.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </div>
          </Space>
        </Card>
        {loading || !ready ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="成绩趋势" size="small"><ScoreTrendChart /></Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="部门排名" size="small"><DeptRankChart /></Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="积分分布" size="small"><PointsDistChart /></Card>
            </Col>
          </Row>
        )}
      </Space>
    </div>
  );
}
