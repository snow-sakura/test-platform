'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import {
  ApiOutlined, FileTextOutlined, ThunderboltOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { getDashboardStats } from '@/lib/api/api-testing';
import type { DashboardStats } from '@/lib/api/api-testing';

/** API testing dashboard page */
export default function ApiTestingDashboardPage() {
  const t = useTranslations('apiTesting');
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
      <h3 style={{ marginBottom: 16 }}>{t('dashboard')}</h3>
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={t('stats.projects')} value={stats.project_count} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={t('stats.interfaces')} value={stats.request_count} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={t('stats.suites')} value={stats.suite_count} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={t('stats.todayExecutions')} value={stats.today_executions} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
