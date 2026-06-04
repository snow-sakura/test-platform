'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import {
  ApiOutlined, FileTextOutlined, ThunderboltOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { getDashboardStats } from '@/lib/api/api-testing';
import type { DashboardStats } from '@/lib/api/api-testing';

/** 接口测试仪表盘页面 */
export default function ApiTestingDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    project_count: 0, request_count: 0, suite_count: 0, today_executions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>接口测试仪表盘</h3>
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="API 项目" value={stats.project_count} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="接口总数" value={stats.request_count} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="测试套件" value={stats.suite_count} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="今日执行" value={stats.today_executions} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
