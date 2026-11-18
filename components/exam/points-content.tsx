'use client';

import { Card, Statistic, Table, Tag, Typography } from 'antd';
import { selectPointsView, useExamSessionStore } from '@/lib/exam/session-store';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

const { Paragraph } = Typography;

export default function ExamPointsContent() {
  const points = useExamSessionStore(selectPointsView);

  return (
    <div style={{ padding: 16 }} data-testid="exam-points">
      <Card>
        <Statistic title="当前积分" value={points.balance} suffix={DEMO_DATA_LABEL} />
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          {points.latestDelta === null
            ? '还没有本次交卷产生的积分。下面两条是虚构的历史流水。'
            : `本次交卷记入 +${points.latestDelta}。历史流水同样是${DEMO_DATA_LABEL}，不是真实激励。`}
        </Paragraph>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={points.ledger}
          columns={[
            { title: '记录', dataIndex: 'title' },
            {
              title: '变动',
              dataIndex: 'delta',
              render: (delta: number) => <Tag color={delta >= 0 ? 'blue' : 'red'}>{delta >= 0 ? `+${delta}` : delta}</Tag>,
            },
            { title: '时间', dataIndex: 'at' },
            {
              title: '来源',
              dataIndex: 'dataSource',
              render: (source: string) => <Tag>{source}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
