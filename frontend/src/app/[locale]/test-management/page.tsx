'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Col, Row, Statistic } from 'antd';
import { FileTextOutlined, AppstoreOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { getTestManagementDashboardStats } from '@/lib/api/test-management';
import type { DashboardStats } from '@/lib/api/test-management';

export default function TestManagementPage() {
  const t = useTranslations();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getTestManagementDashboardStats().then((res) => setStats(res.data)).catch((e) => console.warn('Failed to load dashboard stats', e));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('testManagement.dashboard')}</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title={t('testManagement.caseCount')} value={stats?.total_cases ?? 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('testManagement.suiteCount')} value={stats?.total_suites ?? 0} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('testManagement.planCount')} value={stats?.total_plans ?? 0} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('testManagement.activeReviews')} value={stats?.total_reviews ?? 0} prefix={<TeamOutlined />} /></Card>
        </Col>
      </Row>
      <div style={{ marginTop: 24, color: '#999', textAlign: 'center', padding: 40 }}>
        {t('testManagement.placeholderTip')}
      </div>
    </div>
  );
}
