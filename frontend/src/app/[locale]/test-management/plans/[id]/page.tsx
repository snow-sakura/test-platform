'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Card, Table, message, Spin, Tag, Space,
} from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getPlan } from '@/lib/api/test-management';
import type { TestPlan, TestRun } from '@/lib/api/test-management';

export default function PlanDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';
  const planId = Number(params.id);
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlan(planId).then((res) => setPlan(res.data)).catch(() => {
      message.error(t('testManagement.plan.loadFailed'));
      router.back();
    }).finally(() => setLoading(false));
  }, [planId]);

  // Actual plan detail should return runs list from backend, simplified for now
  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!plan) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Card title={plan.name}>
        <p style={{ color: '#666' }}>{plan.description || t('testManagement.plan.noDescription')}</p>
        <Space>
          <Tag color={plan.is_active ? 'success' : 'default'}>{plan.is_active ? t('testManagement.plan.active') : t('testManagement.plan.inactive')}</Tag>
          <span>{t('testManagement.plan.executionRounds')}：{plan.run_count}</span>
        </Space>

        <div style={{ marginTop: 24, color: '#999', textAlign: 'center', padding: 40 }}>
          {t('testManagement.plan.executionRoundsDesc')}
        </div>
      </Card>
    </div>
  );
}
