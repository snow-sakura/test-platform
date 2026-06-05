'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Form, Input, Select, message, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { createCase } from '@/lib/api/test-management';

export default function CreateCasePage() {
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
      message.error('缺少项目 ID');
      return;
    }
    const values = await form.validateFields();
    // 过滤空步骤
    const validSteps = steps.filter((s) => s.action.trim());
    setLoading(true);
    try {
      await createCase(Number(projectId), { ...values, steps: validSteps });
      message.success('创建成功');
      const locale = window.location.pathname.split('/')[1];
      router.push(`/${locale}/test-management/cases`);
    } catch {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回用例列表
      </Button>
      <Card title="新建测试用例">
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="用例标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="用例描述（可选）" />
          </Form.Item>
          <Form.Item name="preconditions" label="前置条件">
            <Input.TextArea rows={2} placeholder="前置条件（可选）" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
              <Select style={{ width: 120 }}
                options={[
                  { label: '高', value: 'HIGH' },
                  { label: '中', value: 'MEDIUM' },
                  { label: '低', value: 'LOW' },
                ]}
              />
            </Form.Item>
            <Form.Item name="case_type" label="用例类型">
              <Select style={{ width: 120 }} allowClear placeholder="选择类型"
                options={[
                  { label: '功能', value: '功能' },
                  { label: '性能', value: '性能' },
                  { label: '安全', value: '安全' },
                  { label: '兼容性', value: '兼容性' },
                  { label: 'UI', value: 'UI' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>

        <Divider orientation="left">测试步骤</Divider>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 30, paddingTop: 6, fontWeight: 'bold', color: '#999' }}>{idx + 1}</div>
            <div style={{ flex: 3 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>操作</div>
              <Input.TextArea
                rows={2} value={step.action}
                onChange={(e) => updateStep(idx, 'action', e.target.value)}
                placeholder="操作描述"
              />
            </div>
            <div style={{ flex: 3 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>预期结果</div>
              <Input.TextArea
                rows={2} value={step.expected_result}
                onChange={(e) => updateStep(idx, 'expected_result', e.target.value)}
                placeholder="预期结果"
              />
            </div>
            {steps.length > 1 && (
              <Button type="text" danger size="small" onClick={() => removeStep(idx)}
                style={{ marginTop: 20 }}
              >
                删除
              </Button>
            )}
          </div>
        ))}
        <Button type="dashed" onClick={addStep} style={{ width: '100%', marginTop: 8 }}>+ 添加步骤</Button>

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" loading={loading} onClick={handleSubmit}>保存</Button>
            <Button onClick={() => router.back()}>取消</Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
