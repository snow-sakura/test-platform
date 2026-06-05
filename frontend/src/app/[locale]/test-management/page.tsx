'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { FileTextOutlined, AppstoreOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { getTestManagementDashboardStats } from '@/lib/api/test-management';
import type { DashboardStats } from '@/lib/api/test-management';

export default function TestManagementPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getTestManagementDashboardStats().then((res) => setStats(res.data)).catch((e) => console.warn('加载仪表盘统计失败', e));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>测试管理仪表盘</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="测试用例" value={stats?.total_cases ?? 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="测试套件" value={stats?.total_suites ?? 0} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="测试计划" value={stats?.total_plans ?? 0} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="进行中评审" value={stats?.total_reviews ?? 0} prefix={<TeamOutlined />} /></Card>
        </Col>
      </Row>
      <div style={{ marginTop: 24, color: '#999', textAlign: 'center', padding: 40 }}>
        请通过上方 Tab 切换至具体管理功能
      </div>
    </div>
  );
}
