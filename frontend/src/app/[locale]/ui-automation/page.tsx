'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
  ProjectOutlined, AimOutlined, FileTextOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import { getUiDashboardStats } from '@/lib/api/ui-automation';
import type { UiDashboardStats } from '@/lib/api/ui-automation';

export default function UiAutomationDashboard() {
  const t = useTranslations();
  const [stats, setStats] = useState<UiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUiDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => message.error(t('uiAutomation.stats.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: t('uiAutomation.stats.projects'), value: stats?.project_count ?? 0, icon: <ProjectOutlined />, color: '#1677ff' },
    { title: t('uiAutomation.stats.elements'), value: stats?.element_count ?? 0, icon: <AimOutlined />, color: '#52c41a' },
    { title: t('uiAutomation.stats.scripts'), value: stats?.script_count ?? 0, icon: <FileTextOutlined />, color: '#faad14' },
    { title: t('uiAutomation.stats.todayExecutions'), value: stats?.today_executions ?? 0, icon: <PlayCircleOutlined />, color: '#ff4d4f' },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.title} xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 16 }} loading={loading}>
        <Row gutter={24}>
          <Col span={12}>
            <Statistic title={t('uiAutomation.stats.passRate')} value={stats?.pass_rate ?? 0} suffix="%" precision={1} />
          </Col>
          <Col span={12}>
            <Statistic
              title={t('uiAutomation.stats.overallStatus')}
              value={stats && stats.project_count > 0 ? t('uiAutomation.stats.running') : t('common.noData')}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
