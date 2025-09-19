'use client';

import { Card, Col, Row, Statistic, Typography } from 'antd';

const { Title } = Typography;

export default function DashboardContent() {
  return (
    <>
      <Title level={4}>仪表盘</Title>

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="用户总数" value={128} />
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Statistic title="今日新增" value={12} />
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Statistic title="运行状态" value="正常" />
          </Card>
        </Col>
      </Row>
    </>
  );
}
