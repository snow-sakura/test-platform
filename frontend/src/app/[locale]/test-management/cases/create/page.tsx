'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Form, Input, Select, message, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { createCase } from '@/lib/api/test-management';

export default function CreateCasePage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project_id');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<{ step_number: number; action: string; expected_result: string }[]>([
    { step_number: 1, action: '', expected_result: '' },
  ]);

  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, action: '', expected_result: '' }]);
  };

  const updateStep = (idx: number, field: string, value: string) => {
    const newSteps = steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setSteps(newSteps);
  };

  const removeStep = (idx: number) => {
    const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    setSteps(newSteps);
  };

  const handleSubmit = async () => {
    if (!projectId) {
      message.error(t('common.projectRequired'));
      return;
    }
    const values = await form.validateFields();
    // Filter empty steps
    const validSteps = steps.filter((s) => s.action.trim());
    setLoading(true);
    try {
      await createCase(Number(projectId), { ...values, steps: validSteps });
      message.success(t('common.createSuccess'));
      const locale = window.location.pathname.split('/')[1];
      router.push(`/${locale}/test-management/cases`);
    } catch {
      message.error(t('common.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('common.back')}
      </Button>
      <Card title={t('testManagement.case.create')}>
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item name="title" label={t('testManagement.case.titleLabel')} rules={[{ required: true, message: t('project.titleRequired') }]}>
            <Input placeholder={t('testManagement.case.titleLabel')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder={t('common.description') + ' (' + t('common.optional') + ')'} />
          </Form.Item>
          <Form.Item name="preconditions" label={t('testManagement.case.precondition')}>
            <Input.TextArea rows={2} placeholder={t('testManagement.case.precondition') + ' (' + t('common.optional') + ')'} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="priority" label={t('common.priority')} initialValue="MEDIUM">
              <Select style={{ width: 120 }}
                options={[
                  { label: t('testManagement.case.high'), value: 'HIGH' },
                  { label: t('testManagement.case.medium'), value: 'MEDIUM' },
                  { label: t('testManagement.case.low'), value: 'LOW' },
                ]}
              />
            </Form.Item>
            <Form.Item name="case_type" label={t('testManagement.case.caseType')}>
              <Select style={{ width: 120 }} allowClear placeholder={t('common.selectPlaceholder')}
                options={[
                  { label: t('testManagement.case.functional'), value: '功能' },
                  { label: t('testManagement.case.performance'), value: '性能' },
                  { label: t('testManagement.case.security'), value: '安全' },
                  { label: t('testManagement.case.compatibility'), value: '兼容性' },
                  { label: 'UI', value: 'UI' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>

        <Divider orientation="left">{t('testManagement.case.steps')}</Divider>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 30, paddingTop: 6, fontWeight: 'bold', color: '#999' }}>{idx + 1}</div>
            <div style={{ flex: 3 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{t('testManagement.case.stepDesc')}</div>
              <Input.TextArea
                rows={2} value={step.action}
                onChange={(e) => updateStep(idx, 'action', e.target.value)}
                placeholder={t('testManagement.case.stepDesc')}
              />
            </div>
            <div style={{ flex: 3 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{t('testManagement.case.expectedResult')}</div>
              <Input.TextArea
                rows={2} value={step.expected_result}
                onChange={(e) => updateStep(idx, 'expected_result', e.target.value)}
                placeholder={t('testManagement.case.expectedResult')}
              />
            </div>
            {steps.length > 1 && (
              <Button type="text" danger size="small" onClick={() => removeStep(idx)}
                style={{ marginTop: 20 }}
              >
                {t('common.delete')}
              </Button>
            )}
          </div>
        ))}
        <Button type="dashed" onClick={addStep} style={{ width: '100%', marginTop: 8 }}>{t('testManagement.case.addStep')}</Button>

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" loading={loading} onClick={handleSubmit}>{t('common.save')}</Button>
            <Button onClick={() => router.back()}>{t('common.cancel')}</Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
