'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
  ProjectOutlined, MobileOutlined, AimOutlined, FileTextOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { getAppDashboardStats } from '@/lib/api/app-automation';
import type { AppDashboardStats } from '@/lib/api/app-automation';

export default function AppAutomationDashboard() {
  const t = useTranslations();
  const [stats, setStats] = useState<AppDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => message.error(t('appAutomation.stats.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: t('appAutomation.stats.projects'), value: stats?.project_count ?? 0, icon: <ProjectOutlined />, color: '#1677ff' },
    { title: t('appAutomation.stats.devices'), value: stats?.device_count ?? 0, icon: <MobileOutlined />, color: '#52c41a' },
    { title: t('appAutomation.stats.elements'), value: stats?.element_count ?? 0, icon: <AimOutlined />, color: '#faad14' },
    { title: t('appAutomation.stats.cases'), value: stats?.case_count ?? 0, icon: <FileTextOutlined />, color: '#722ed1' },
    { title: t('appAutomation.stats.todayExecutions'), value: stats?.today_executions ?? 0, icon: <PlayCircleOutlined />, color: '#ff4d4f' },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.title} xs={24} sm={12} lg={8}>
            <Card loading={loading}>
              <Statistic title={card.title} value={card.value} prefix={card.icon} valueStyle={{ color: card.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 16 }} loading={loading}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic title={t('appAutomation.stats.availableDevices')} value={stats?.available_devices ?? 0} />
          </Col>
          <Col span={8}>
            <Statistic title={t('appAutomation.stats.passRate')} value={stats?.pass_rate ?? 0} suffix="%" precision={1} />
          </Col>
          <Col span={8}>
            <Statistic title={t('appAutomation.stats.overallStatus')} value={stats && stats.project_count > 0 ? t('appAutomation.stats.running') : t('common.noData')} />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
