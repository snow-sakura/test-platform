'use client';

import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Tabs, message, Spin, Typography } from 'antd';
import { getSettings, upsertSetting } from '@/lib/api/settings';
import type { SystemSetting } from '@/lib/api/settings';

const { Title } = Typography;

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [llmForm] = Form.useForm();
  const [feishuForm] = Form.useForm();

  useEffect(() => {
    getSettings()
      .then((res) => {
        setSettings(res.data);
        const map = Object.fromEntries(res.data.map((s) => [s.key, s.value]));
        llmForm.setFieldsValue({
          LLM_API_KEY: map.LLM_API_KEY || '',
          LLM_MODEL: map.LLM_MODEL || '',
          LLM_BASE_URL: map.LLM_BASE_URL || '',
        });
        feishuForm.setFieldsValue({
          FEISHU_WEBHOOK_URL: map.FEISHU_WEBHOOK_URL || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (keys: string[], values: Record<string, string>) => {
    setSaving(true);
    try {
      for (const key of keys) {
        const value = values[key];
        const existing = settings.find((s) => s.key === key);
        if (existing) {
          if (existing.value !== value) {
            await upsertSetting({ key, value });
          }
        } else if (value) {
          await upsertSetting({ key, value });
        }
      }
      message.success('配置已保存并热更新');
      // refresh
      const res = await getSettings();
      setSettings(res.data);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin style={{ display: 'block', marginTop: 100 }} />;
  }

  const tabItems = [
    {
      key: 'llm',
      label: 'LLM 配置',
      children: (
        <Card>
          <Form form={llmForm} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item name="LLM_API_KEY" label="API Key" extra="支持 GPT-4 / DeepSeek / Kimi / Claude">
              <Input.Password placeholder="sk-..." />
            </Form.Item>
            <Form.Item name="LLM_MODEL" label="模型名称" extra="例如 gpt-4o / deepseek-chat / claude-sonnet-4">
              <Input placeholder="gpt-4o" />
            </Form.Item>
            <Form.Item name="LLM_BASE_URL" label="API 地址" extra="可选，默认为 OpenAI 兼容地址">
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>
            <Button
              type="primary"
              loading={saving}
              onClick={() => {
                const values = llmForm.getFieldsValue();
                saveSettings(['LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL'], values);
              }}
            >
              保存
            </Button>
          </Form>
        </Card>
      ),
    },
    {
      key: 'feishu',
      label: '飞书通知',
      children: (
        <Card>
          <Form form={feishuForm} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item
              name="FEISHU_WEBHOOK_URL"
              label="Webhook 地址"
              extra="飞书机器人 Webhook URL，用于异步任务完成通知"
            >
              <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
            </Form.Item>
            <Button
              type="primary"
              loading={saving}
              onClick={() => {
                const values = feishuForm.getFieldsValue();
                saveSettings(['FEISHU_WEBHOOK_URL'], values);
              }}
            >
              保存
            </Button>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>系统设置</Title>
      <Tabs items={tabItems} />
    </div>
  );
}
