'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
  ProjectOutlined, AimOutlined, FileTextOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import { getUiDashboardStats } from '@/lib/api/ui-automation';
import type { UiDashboardStats } from '@/lib/api/ui-automation';

export default function UiAutomationDashboard() {
  const [stats, setStats] = useState<UiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUiDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => message.error('加载统计失败'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: '项目数', value: stats?.project_count ?? 0, icon: <ProjectOutlined />, color: '#1677ff' },
    { title: '元素数', value: stats?.element_count ?? 0, icon: <AimOutlined />, color: '#52c41a' },
    { title: '脚本数', value: stats?.script_count ?? 0, icon: <FileTextOutlined />, color: '#faad14' },
    { title: '今日执行', value: stats?.today_executions ?? 0, icon: <PlayCircleOutlined />, color: '#ff4d4f' },
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
            <Statistic title="执行通过率" value={stats?.pass_rate ?? 0} suffix="%" precision={1} />
          </Col>
          <Col span={12}>
            <Statistic
              title="总体状态"
              value={stats && stats.project_count > 0 ? '运行中' : '暂无数据'}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
