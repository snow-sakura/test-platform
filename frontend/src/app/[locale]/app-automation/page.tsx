'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
  ProjectOutlined, MobileOutlined, AimOutlined, FileTextOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { getAppDashboardStats } from '@/lib/api/app-automation';
import type { AppDashboardStats } from '@/lib/api/app-automation';

export default function AppAutomationDashboard() {
  const [stats, setStats] = useState<AppDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => message.error('加载统计失败'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: '项目数', value: stats?.project_count ?? 0, icon: <ProjectOutlined />, color: '#1677ff' },
    { title: '设备数', value: stats?.device_count ?? 0, icon: <MobileOutlined />, color: '#52c41a' },
    { title: '元素数', value: stats?.element_count ?? 0, icon: <AimOutlined />, color: '#faad14' },
    { title: '用例数', value: stats?.case_count ?? 0, icon: <FileTextOutlined />, color: '#722ed1' },
    { title: '今日执行', value: stats?.today_executions ?? 0, icon: <PlayCircleOutlined />, color: '#ff4d4f' },
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
            <Statistic title="可用设备" value={stats?.available_devices ?? 0} />
          </Col>
          <Col span={8}>
            <Statistic title="执行通过率" value={stats?.pass_rate ?? 0} suffix="%" precision={1} />
          </Col>
          <Col span={8}>
            <Statistic title="总体状态" value={stats && stats.project_count > 0 ? '运行中' : '暂无数据'} />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
