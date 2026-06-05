'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Card, Table, message, Spin, Tag, Space,
} from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getPlan } from '@/lib/api/test-management';
import type { TestPlan, TestRun } from '@/lib/api/test-management';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';
  const planId = Number(params.id);
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlan(planId).then((res) => setPlan(res.data)).catch(() => {
      message.error('加载失败');
      router.back();
    }).finally(() => setLoading(false));
  }, [planId]);

  // 实际 plan 详情应从后端返回 runs 列表，当前简化处理
  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!plan) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回执行列表
      </Button>

      <Card title={plan.name}>
        <p style={{ color: '#666' }}>{plan.description || '暂无描述'}</p>
        <Space>
          <Tag color={plan.is_active ? 'success' : 'default'}>{plan.is_active ? '激活' : '未激活'}</Tag>
          <span>执行轮次：{plan.run_count}</span>
        </Space>

        <div style={{ marginTop: 24, color: '#999', textAlign: 'center', padding: 40 }}>
          执行轮次管理将在后续版本完善
        </div>
      </Card>
    </div>
  );
}
