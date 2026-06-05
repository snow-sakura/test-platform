'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card, Tabs, Form, Select, Input, InputNumber, Button, Typography, message, Space, Tag,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';

import { generateConfigTemplate, MODULE_TYPE_OPTIONS } from '@/lib/api/ci-cd';

const { Text } = Typography;

const CI_TABS = [
  { key: 'gitlab', label: 'GitLab CI' },
  { key: 'github', label: 'GitHub Actions' },
  { key: 'jenkins', label: 'Jenkins' },
];

export default function CiCdConfigPage() {
  const t = useTranslations();
  const [ciType, setCiType] = useState('gitlab');
  const [template, setTemplate] = useState<{ filename: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const configs = values.module_configs?.length > 0 ? values.module_configs : [{ module_type: 'api_testing', suite_id: 1 }];
      const res = await generateConfigTemplate({
        ci_type: ciType,
        platform_url: values.platform_url || 'http://localhost:8000',
        token_name: values.token_name || 'TESTPLATE_TOKEN',
        branch: values.branch || 'main',
        module_configs: configs,
      });
      setTemplate(res.data);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('生成配置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card size="small" title="CI 配置模板生成">
        <Tabs activeKey={ciType} onChange={setCiType} items={CI_TABS} style={{ marginBottom: 16 }} />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            platform_url: 'http://localhost:8000', token_name: 'TESTPLATE_TOKEN',
            branch: 'main', module_configs: [{ module_type: 'api_testing', suite_id: undefined }],
          }}
          style={{ maxWidth: 600 }}
        >
          <Form.Item name="platform_url" label={t('ciCd.platformUrl')} rules={[{ required: true }]}>
            <Input placeholder="http://localhost:8000" />
          </Form.Item>
          <Form.Item name="token_name" label="Token 环境变量名" rules={[{ required: true }]}>
            <Input placeholder="TESTPLATE_TOKEN" />
          </Form.Item>
          <Form.Item name="branch" label={t('ciCd.branch')} rules={[{ required: true }]}>
            <Input placeholder="main" />
          </Form.Item>

          <Form.List name="module_configs">
            {(fields, { add, remove }) => (
              <div>
                {fields.map(({ key, name, ...rest }, index) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...rest} name={[name, 'module_type']} rules={[{ required: true, message: '请选择模块' }]}>
                      <Select style={{ width: 140 }} options={MODULE_TYPE_OPTIONS} placeholder="模块类型" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'suite_id']} rules={[{ required: true, message: '请输入 ID' }]}>
                      <InputNumber style={{ width: 120 }} placeholder="套件/计划 ID" min={1} />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ module_type: 'api_testing' })} style={{ marginBottom: 16 }}>
                  + 添加模块
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item>
            <Button type="primary" onClick={handleGenerate} loading={loading}>{t('ciCd.generateConfig')}</Button>
          </Form.Item>
        </Form>

        {template && (
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Tag color="blue">{template.filename}</Tag>
              <Button size="small" icon={<CopyOutlined />} onClick={() => {
                navigator.clipboard.writeText(template.content);
                message.success(t('ciCd.copied'));
              }}>{t('ciCd.copyConfig')}</Button>
            </Space>
            <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 6, fontSize: 13, overflow: 'auto', maxHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {template.content}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
