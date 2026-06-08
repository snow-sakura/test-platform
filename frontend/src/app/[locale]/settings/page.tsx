'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import {
  Card, Form, Input, Button, Tabs, message, Spin, Typography, Tag, Row, Col,
  Descriptions, Space, Table, Modal, Select, Switch, Popconfirm, Checkbox, Popover,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, ApiOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { getSettings, upsertSetting, getConfigStatus } from '@/lib/api/settings';
import { getDifyConfigs, createDifyConfig, updateDifyConfig, testDifyConfig } from '@/lib/api/ai-evaluator';
import type { SystemSetting, ConfigStatus } from '@/lib/api/settings';
import type { DifyConfig } from '@/lib/api/ai-evaluator';

// Phase 2: AI generation config API
import {
  listModelConfigs, createModelConfig, updateModelConfig,
  deleteModelConfig, testModelConfig,
  listPromptConfigs, createPromptConfig, updatePromptConfig,
  deletePromptConfig, loadDefaultPrompt,
  listGenerationConfigs, createGenerationConfig, updateGenerationConfig,
  deleteGenerationConfig,
  type AIModelConfig, type AIModelConfigCreate, type AIModelConfigUpdate,
  type PromptConfig, type PromptConfigCreate, type PromptConfigUpdate,
  type GenerationConfig, type GenerationConfigCreate, type GenerationConfigUpdate,
} from '@/lib/api/requirement-analysis';

// Phase 3: notification config API
import {
  listNotificationConfigs, createNotificationConfig, updateNotificationConfig,
  deleteNotificationConfig, setDefaultNotificationConfig,
  type NotificationConfig, type NotificationConfigCreate, type NotificationConfigUpdate,
  type WebhookBot,
} from '@/lib/api/notification-configs';

// RBAC permission management API
import {
  listPermissions, listRoles, createRole, updateRole, deleteRole,
  listUsersWithRoles, assignUserRoles, getMyPermissions,
  type Permission, type Role, type UserWithRoles,
} from '@/lib/api/rbac';

const { Title } = Typography;
const { TextArea } = Input;

// ==================== config type constants ====================
const MODEL_VALUES = ['deepseek', 'qwen', 'siliconflow', 'openai', 'other'] as const;
const ROLE_VALUES = ['testcase_writer', 'testcase_reviewer'] as const;
const PROMPT_VALUES = ['testcase_writer', 'testcase_reviewer'] as const;
const LEVEL_VALUES = ['functional', 'performance', 'security', 'compatibility', 'ui', 'integration', 'e2e'] as const;
const PRIORITY_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const NOTIF_VALUES = ['feishu', 'dingtalk', 'wework', 'webhook', 'custom'] as const;

export default function SettingsPage() {
  const t = useTranslations();
  const MODEL_TYPES = [
    { label: 'DeepSeek', value: 'deepseek' }, { label: t('settings.llm.qwen'), value: 'qwen' },
    { label: 'SiliconFlow', value: 'siliconflow' }, { label: 'OpenAI', value: 'openai' }, { label: t('settings.llm.other'), value: 'other' },
  ];
  const ROLES = [
    { label: t('settings.llm.writer'), value: 'testcase_writer' }, { label: t('settings.llm.reviewer'), value: 'testcase_reviewer' },
  ];
  const PROMPT_TYPES = [
    { label: t('settings.llm.writerDesc'), value: 'testcase_writer' }, { label: t('settings.llm.reviewerDesc'), value: 'testcase_reviewer' },
  ];
  const TEST_LEVELS = [
    { label: t('aiGeneration.generationConfig.functional'), value: 'functional' },
    { label: t('aiGeneration.generationConfig.performance'), value: 'performance' },
    { label: t('aiGeneration.generationConfig.security'), value: 'security' },
    { label: t('aiGeneration.generationConfig.compatibility'), value: 'compatibility' },
    { label: t('aiGeneration.generationConfig.ui'), value: 'ui' },
    { label: t('aiGeneration.generationConfig.integration'), value: 'integration' },
    { label: t('aiGeneration.generationConfig.e2e'), value: 'e2e' },
  ];
  const PRIORITIES = [
    { label: t('aiGeneration.generationConfig.high'), value: 'HIGH' },
    { label: t('aiGeneration.generationConfig.medium'), value: 'MEDIUM' },
    { label: t('aiGeneration.generationConfig.low'), value: 'LOW' },
  ];
  const NOTIF_TYPES = [
    { label: t('apiTesting.notification.feishu'), value: 'feishu' },
    { label: t('apiTesting.notification.dingtalk'), value: 'dingtalk' },
    { label: t('apiTesting.notification.wechat'), value: 'wework' },
    { label: 'Webhook', value: 'webhook' },
    { label: t('aiGeneration.generationConfig.other'), value: 'custom' },
  ];
  // ====== existing config state ======
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [llmForm] = Form.useForm();
  const [feishuForm] = Form.useForm();
  const [difyForm] = Form.useForm();
  const [difyId, setDifyId] = useState<number | null>(null);
  const [testingDify, setTestingDify] = useState(false);

  // ====== AI model config ======
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [modelForm] = Form.useForm();
  const [testingModelId, setTestingModelId] = useState<number | null>(null);

  // ====== prompt config ======
  const [promptConfigs, setPromptConfigs] = useState<PromptConfig[]>([]);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const [promptForm] = Form.useForm();

  // ====== generation config ======
  const [genConfigs, setGenConfigs] = useState<GenerationConfig[]>([]);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [editingGen, setEditingGen] = useState<GenerationConfig | null>(null);
  const [genForm] = Form.useForm();

  // ====== notification config ======
  const [notifConfigs, setNotifConfigs] = useState<NotificationConfig[]>([]);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<NotificationConfig | null>(null);
  const [notifForm] = Form.useForm();

  // ====== RBAC permission management ======
  const [rbacPermissions, setRbacPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [myPermissions, setMyPermissions] = useState<{ username: string; is_superuser: boolean; permissions: string[] } | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm] = Form.useForm();
  const [userRoleModalOpen, setUserRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([
      getSettings(),
      getConfigStatus(),
      getDifyConfigs(),
    ])
      .then(([settingsRes, statusRes, difyRes]) => {
        setSettings(settingsRes.data);
        setStatus(statusRes.data);
        const map = Object.fromEntries(settingsRes.data.map((s) => [s.key, s.value]));
        llmForm.setFieldsValue({
          LLM_API_KEY: map.LLM_API_KEY || '',
          LLM_MODEL: map.LLM_MODEL || '',
          LLM_BASE_URL: map.LLM_BASE_URL || '',
        });
        feishuForm.setFieldsValue({ FEISHU_WEBHOOK_URL: map.FEISHU_WEBHOOK_URL || '' });
        const configs = difyRes.data || [];
        if (configs.length > 0) {
          const active = configs.find((c) => c.is_active) || configs[0];
          setDifyId(active.id);
          difyForm.setFieldsValue({ name: active.name, api_url: active.api_url, api_key: active.api_key });
        }
      })
      .catch(() => message.error(t('settings.llm.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  // ====== load extended configs ======
  useEffect(() => {
    listModelConfigs().then(r => setModelConfigs(r.data)).catch((e) => console.warn('load config failed', e));
    listPromptConfigs().then(r => setPromptConfigs(r.data)).catch((e) => console.warn('load config failed', e));
    listGenerationConfigs().then(r => setGenConfigs(r.data)).catch((e) => console.warn('load config failed', e));
    listNotificationConfigs().then(r => setNotifConfigs(r.data)).catch((e) => console.warn('load config failed', e));
    // RBAC data
    listPermissions().then(r => setRbacPermissions(r.data)).catch((e) => console.warn('load config failed', e));
    listRoles().then(r => setRoles(r.data)).catch((e) => console.warn('load config failed', e));
    listUsersWithRoles().then(r => setUsers(r.data)).catch((e) => console.warn('load config failed', e));
    getMyPermissions().then(r => setMyPermissions(r.data)).catch((e) => console.warn('load config failed', e));
  }, []);

  const saveSettings = async (keys: string[], values: Record<string, string>) => {
    setSaving(true);
    try {
      for (const key of keys) {
        const value = values[key];
        const existing = settings.find((s) => s.key === key);
        if (existing) { if (existing.value !== value) await upsertSetting({ key, value }); }
        else if (value) await upsertSetting({ key, value });
      }
      message.success(t('settings.llm.saveSuccess'));
      const res = await getSettings();
      setSettings(res.data);
      const statusRes = await getConfigStatus();
      setStatus(statusRes.data);
    } catch { message.error(t('settings.llm.saveFailed')); }
    finally { setSaving(false); }
  };

  const handleSaveDify = async () => {
    const values = await difyForm.validateFields();
    if (difyId) { await updateDifyConfig(difyId, values); message.success(t('settings.dify.saveSuccess')); }
    else { const res = await createDifyConfig({ ...values, is_active: true }); setDifyId(res.data.id); message.success(t('settings.dify.saveSuccess')); }
  };

  const handleTestDify = async () => {
    if (!difyId) return;
    setTestingDify(true);
    try { const res = await testDifyConfig(difyId); res.data.success ? message.success(t('settings.llm.testSuccess')) : message.error(res.data.message || t('settings.llm.testFailed')); }
    catch { message.error(t('settings.llm.testFailed')); }
    setTestingDify(false);
  };

  // ====================== AI 模型配置操作 ======================
  const reloadModels = async () => setModelConfigs((await listModelConfigs()).data);
  const handleSaveModel = async () => {
    const values = await modelForm.validateFields();
    if (editingModel) { await updateModelConfig(editingModel.id, values as AIModelConfigUpdate); message.success(t('aiGeneration.modelConfig.updateSuccess')); }
    else { await createModelConfig(values as AIModelConfigCreate); message.success(t('aiGeneration.modelConfig.createSuccess')); }
    setModelModalOpen(false); setEditingModel(null); modelForm.resetFields(); reloadModels();
  };
  const handleTestModel = async (id: number) => {
    setTestingModelId(id);
    try { const res = await testModelConfig(id); message.success(res.data.message || t('settings.llm.testSuccess')); }
    catch (e: any) { message.error(e?.response?.data?.detail || t('settings.llm.testFailed')); }
    setTestingModelId(null);
  };

  // ====================== 提示词配置操作 ======================
  const reloadPrompts = async () => setPromptConfigs((await listPromptConfigs()).data);
  const handleSavePrompt = async () => {
    const values = await promptForm.validateFields();
    if (editingPrompt) { await updatePromptConfig(editingPrompt.id, values as PromptConfigUpdate); message.success(t('aiGeneration.promptConfig.updateSuccess')); }
    else { await createPromptConfig(values as PromptConfigCreate); message.success(t('aiGeneration.promptConfig.createSuccess')); }
    setPromptModalOpen(false); setEditingPrompt(null); promptForm.resetFields(); reloadPrompts();
  };
  const handleLoadDefaultPrompt = async (r: PromptConfig) => {
    try { await loadDefaultPrompt(r.id); message.success(t('aiGeneration.promptConfig.defaultLoaded')); reloadPrompts(); }
    catch (e: any) { message.error(e?.response?.data?.detail || t('aiGeneration.promptConfig.loadFailed')); }
  };

  // ====================== 生成行为配置操作 ======================
  const reloadGens = async () => setGenConfigs((await listGenerationConfigs()).data);
  const handleSaveGen = async () => {
    const values = await genForm.validateFields();
    if (editingGen) { await updateGenerationConfig(editingGen.id, values as GenerationConfigUpdate); message.success(t('aiGeneration.generationConfig.updateSuccess')); }
    else { await createGenerationConfig(values as GenerationConfigCreate); message.success(t('aiGeneration.generationConfig.createSuccess')); }
    setGenModalOpen(false); setEditingGen(null); genForm.resetFields(); reloadGens();
  };

  // ====================== RBAC 操作 ======================
  const reloadRoles = async () => setRoles((await listRoles()).data);
  const reloadUsers = async () => setUsers((await listUsersWithRoles()).data);

  /** group permissions by module */
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    rbacPermissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [rbacPermissions]);

  const handleSaveRole = async () => {
    const values = await roleForm.validateFields();
    if (editingRole) {
      await updateRole(editingRole.id, values);
      message.success(t('common.updateSuccess'));
    } else {
      await createRole(values);
      message.success(t('common.createSuccess'));
    }
    setRoleModalOpen(false);
    setEditingRole(null);
    roleForm.resetFields();
    reloadRoles();
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await assignUserRoles(selectedUser.id, selectedRoleIds);
      message.success(t('common.updateSuccess'));
      setUserRoleModalOpen(false);
      setSelectedUser(null);
      reloadUsers();
    } catch { message.error(t('common.operationFailed')); }
    finally { setAssigning(false); }
  };

  // ====================== 通知配置操作 ======================
  const reloadNotifs = async () => setNotifConfigs((await listNotificationConfigs()).data);
  const handleSaveNotif = async () => {
    const values = await notifForm.validateFields();
    if (values.webhook_bots) {
      values.webhook_bots = values.webhook_bots.filter((b: WebhookBot) => b.name && b.url);
    }
    if (editingNotif) { await updateNotificationConfig(editingNotif.id, values as NotificationConfigUpdate); message.success(t('common.updateSuccess')); }
    else { await createNotificationConfig(values as NotificationConfigCreate); message.success(t('common.createSuccess')); }
    setNotifModalOpen(false); setEditingNotif(null); notifForm.resetFields(); reloadNotifs();
  };
  const handleSetDefaultNotif = async (id: number) => {
    await setDefaultNotificationConfig(id); message.success(t('apiTesting.notification.saveSuccess')); reloadNotifs();
  };

  const NotifWebhookEditor = ({ value, onChange }: { value?: WebhookBot[]; onChange?: (v: WebhookBot[]) => void }) => {
    const bots = value || [];
    const addBot = () => onChange?.([...bots, { name: '', url: '', enabled: true }]);
    const updateBot = (i: number, field: string, v: string | boolean) => {
      const next = [...bots];
      next[i] = { ...next[i], [field]: v };
      onChange?.(next);
    };
    const removeBot = (i: number) => onChange?.(bots.filter((_, idx) => idx !== i));
    return (
      <div>
        {(bots || []).map((bot, i) => (
          <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Input placeholder={t('settings.feishu.name')} value={bot.name} onChange={(e) => updateBot(i, 'name', e.target.value)} style={{ width: 140 }} />
            <Input placeholder="Webhook URL" value={bot.url} onChange={(e) => updateBot(i, 'url', e.target.value)} style={{ width: 300 }} />
            <Switch checked={bot.enabled} onChange={(v) => updateBot(i, 'enabled', v)} />
            <Button size="small" danger onClick={() => removeBot(i)}>{t('common.delete')}</Button>
          </Space>
        ))}
        <Button size="small" icon={<PlusOutlined />} onClick={addBot}>{t('settings.feishu.add')}</Button>
      </div>
    );
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('settings.title')}</Title>

      {/* config status overview */}
      {status && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {Object.entries(status).map(([key, cfg]) => (
            <Col span={8} key={key}>
              <Card size="small">
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label={cfg.label}>
                    {cfg.configured ? <Tag icon={<CheckCircleOutlined />} color="success">{t('common.yes')}</Tag> : <Tag icon={<CloseCircleOutlined />} color="default">{t('common.no')}</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Tabs
        items={[
          // ============ AI model config ============
          {
            key: 'model-config', label: t('settings.llm.title'),
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingModel(null); modelForm.resetFields(); modelForm.setFieldsValue({ role: 'testcase_writer', temperature: 0.7, max_tokens: 4096 }); setModelModalOpen(true); }}>{t('settings.llm.addConfig')}</Button>}>
                <Table dataSource={modelConfigs} rowKey="id" size="small"
                  columns={[
                    { title: t('settings.llm.name'), dataIndex: 'name' }, { title: t('settings.llm.provider'), dataIndex: 'model_type' },
                    { title: t('settings.llm.model'), dataIndex: 'model_name' }, { title: t('settings.llm.apiUrl'), dataIndex: 'api_base', ellipsis: true },
                    { title: t('settings.llm.enabled'), dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag> },
                    { title: t('common.action'), width: 180, render: (_: any, r: AIModelConfig) => (
                      <Space>
                        <Button size="small" icon={<ApiOutlined />} loading={testingModelId === r.id} onClick={() => handleTestModel(r.id)}>{t('settings.llm.test')}</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingModel(r); modelForm.setFieldsValue(r); setModelModalOpen(true); }}>{t('common.edit')}</Button>
                        <Popconfirm title={t('settings.llm.deleteConfirm')} onConfirm={async () => { await deleteModelConfig(r.id); message.success(t('settings.llm.deleted')); reloadModels(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingModel ? t('common.edit') : t('settings.llm.addConfig')} open={modelModalOpen} onOk={handleSaveModel} onCancel={() => { setModelModalOpen(false); setEditingModel(null); }} width={600}>
                  <Form form={modelForm} layout="vertical">
                    <Form.Item name="name" label={t('settings.llm.name')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="role" label={t('settings.llm.role')} rules={[{ required: true }]}><Select options={ROLES} /></Form.Item>
                    <Form.Item name="model_type" label={t('settings.llm.provider')} rules={[{ required: true }]}><Select options={MODEL_TYPES} /></Form.Item>
                    <Form.Item name="api_base" label={t('settings.llm.apiUrl')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="api_key" label={t('settings.llm.apiKey')}><Input.Password placeholder={editingModel ? t('aiGeneration.modelConfig.placeholderApiKey') : ''} /></Form.Item>
                    <Form.Item name="model_name" label={t('settings.llm.model')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Space><Form.Item name="temperature" label="Temperature"><Input type="number" step={0.1} /></Form.Item>
                    <Form.Item name="max_tokens" label="Max Tokens"><Input type="number" /></Form.Item></Space>
                    <Form.Item name="is_active" label={t('settings.llm.enabled')} valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ prompt config ============
          {
            key: 'prompt-config', label: t('aiGeneration.promptConfig.title'),
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPrompt(null); promptForm.resetFields(); promptForm.setFieldsValue({ prompt_type: 'testcase_writer' }); setPromptModalOpen(true); }}>{t('aiGeneration.promptConfig.addConfig')}</Button>}>
                <Table dataSource={promptConfigs} rowKey="id" size="small"
                  columns={[
                    { title: t('aiGeneration.promptConfig.name'), dataIndex: 'name' },
                    { title: t('aiGeneration.promptConfig.type'), dataIndex: 'prompt_type', render: (v: string) => PROMPT_TYPES.find(t => t.value === v)?.label || v },
                    { title: t('aiGeneration.promptConfig.contentPreview'), dataIndex: 'content', ellipsis: true, render: (v: string) => v?.substring(0, 80) },
                    { title: t('aiGeneration.promptConfig.enabled'), dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag> },
                    { title: t('common.action'), width: 200, render: (_: any, r: PromptConfig) => (
                      <Space>
                        <Button size="small" icon={<ReloadOutlined />} onClick={() => handleLoadDefaultPrompt(r)}>{t('aiGeneration.promptConfig.loadDefault')}</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingPrompt(r); promptForm.setFieldsValue(r); setPromptModalOpen(true); }}>{t('aiGeneration.promptConfig.edit')}</Button>
                        <Popconfirm title={t('aiGeneration.promptConfig.deleteConfirm')} onConfirm={async () => { await deletePromptConfig(r.id); message.success(t('aiGeneration.promptConfig.deleted')); reloadPrompts(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                  expandable={{ expandedRowRender: (r: PromptConfig) => <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 200, overflow: 'auto' }}>{r.content}</pre> }}
                />
                <Modal title={editingPrompt ? t('aiGeneration.promptConfig.editConfig') : t('aiGeneration.promptConfig.addConfig')} open={promptModalOpen} onOk={handleSavePrompt} onCancel={() => { setPromptModalOpen(false); setEditingPrompt(null); }} width={700}>
                  <Form form={promptForm} layout="vertical">
                    <Form.Item name="name" label={t('aiGeneration.promptConfig.name')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="prompt_type" label={t('aiGeneration.promptConfig.type')} rules={[{ required: true }]}><Select options={PROMPT_TYPES} /></Form.Item>
                    <Form.Item name="content" label={t('aiGeneration.promptConfig.content')} rules={[{ required: true }]}><TextArea rows={10} /></Form.Item>
                    <Form.Item name="is_active" label={t('aiGeneration.promptConfig.enabled')} valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ generation config ============
          {
            key: 'gen-config', label: t('aiGeneration.generationConfig.title'),
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGen(null); genForm.resetFields(); genForm.setFieldsValue({ test_level: 'functional', test_priority: 'MEDIUM', test_case_count: 10, auto_review: true, review_timeout: 300 }); setGenModalOpen(true); }}>{t('aiGeneration.generationConfig.addConfig')}</Button>}>
                <Table dataSource={genConfigs} rowKey="id" size="small"
                  columns={[
                    { title: t('aiGeneration.generationConfig.name'), dataIndex: 'name' }, { title: t('aiGeneration.generationConfig.testLevels'), dataIndex: 'test_level' },
                    { title: t('aiGeneration.generationConfig.defaultPriority'), dataIndex: 'test_priority', render: (v: string) => <Tag color={v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green'}>{v}</Tag> },
                    { title: t('aiGeneration.generationConfig.caseCount'), dataIndex: 'test_case_count' },
                    { title: t('aiGeneration.generationConfig.autoReview'), dataIndex: 'auto_review', render: (v: boolean) => v ? <Tag color="green">{t('aiGeneration.generationConfig.on')}</Tag> : <Tag>{t('aiGeneration.generationConfig.off')}</Tag> },
                    { title: t('aiGeneration.generationConfig.activate'), dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag> },
                    { title: t('common.action'), width: 140, render: (_: any, r: GenerationConfig) => (
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingGen(r); genForm.setFieldsValue(r); setGenModalOpen(true); }}>{t('aiGeneration.generationConfig.edit')}</Button>
                        <Popconfirm title={t('aiGeneration.generationConfig.deleteConfirm')} onConfirm={async () => { await deleteGenerationConfig(r.id); message.success(t('aiGeneration.generationConfig.deleted')); reloadGens(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingGen ? t('aiGeneration.generationConfig.editConfig') : t('aiGeneration.generationConfig.addConfig')} open={genModalOpen} onOk={handleSaveGen} onCancel={() => { setGenModalOpen(false); setEditingGen(null); }} width={500}>
                  <Form form={genForm} layout="vertical">
                    <Form.Item name="name" label={t('aiGeneration.generationConfig.name')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="test_level" label={t('aiGeneration.generationConfig.testLevels')}><Select options={TEST_LEVELS} /></Form.Item>
                    <Form.Item name="test_priority" label={t('aiGeneration.generationConfig.defaultPriority')}><Select options={PRIORITIES} /></Form.Item>
                    <Form.Item name="test_case_count" label={t('aiGeneration.generationConfig.caseCount')}><Input type="number" min={1} max={100} /></Form.Item>
                    <Form.Item name="auto_review" label={t('aiGeneration.generationConfig.autoReview')} valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="review_timeout" label={t('aiGeneration.generationConfig.reviewTimeout')}><Input type="number" min={30} max={3600} /></Form.Item>
                    <Form.Item name="is_active" label={t('aiGeneration.generationConfig.activate')} valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ notification config ============
          {
            key: 'notif-config', label: t('apiTesting.notification.title'),
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingNotif(null); notifForm.resetFields(); notifForm.setFieldsValue({ config_type: 'webhook', is_active: true }); setNotifModalOpen(true); }}>{t('apiTesting.notification.create')}</Button>}>
                <Table dataSource={notifConfigs} rowKey="id" size="small"
                  columns={[
                    { title: t('apiTesting.notification.name'), dataIndex: 'name' },
                    { title: t('apiTesting.notification.type'), dataIndex: 'config_type', render: (v: string) => NOTIF_TYPES.find(t => t.value === v)?.label || v },
                    { title: t('apiTesting.notification.bots'), dataIndex: 'webhook_bots', render: (v: WebhookBot[]) => v?.length || 0 },
                    { title: t('apiTesting.notification.default'), dataIndex: 'is_default', width: 60, render: (v: boolean) => v ? <Tag color="blue">{t('apiTesting.notification.default')}</Tag> : null },
                    { title: t('apiTesting.notification.enabled'), dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag> },
                    { title: t('common.action'), width: 200, render: (_: any, r: NotificationConfig) => (
                      <Space>
                        {!r.is_default && <Button size="small" onClick={() => handleSetDefaultNotif(r.id)}>{t('apiTesting.notification.default')}</Button>}
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingNotif(r); notifForm.setFieldsValue(r); setNotifModalOpen(true); }}>{t('apiTesting.notification.edit')}</Button>
                        <Popconfirm title={t('apiTesting.notification.deleteConfirm')} onConfirm={async () => { await deleteNotificationConfig(r.id); message.success(t('apiTesting.notification.deleted')); reloadNotifs(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingNotif ? t('apiTesting.notification.edit') : t('apiTesting.notification.create')} open={notifModalOpen} onOk={handleSaveNotif} onCancel={() => { setNotifModalOpen(false); setEditingNotif(null); }} width={600}>
                  <Form form={notifForm} layout="vertical">
                    <Form.Item name="name" label={t('apiTesting.notification.name')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="config_type" label={t('apiTesting.notification.type')}><Select options={NOTIF_TYPES} /></Form.Item>
                    <Form.Item name="webhook_bots" label={t('settings.feishu.webhookList')}>
                      <NotifWebhookEditor />
                    </Form.Item>
                    <Space>
                      <Form.Item name="is_default" label={t('apiTesting.notification.default')} valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="is_active" label={t('apiTesting.notification.enabled')} valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ RBAC ============
          {
            key: 'rbac', label: t('settings.tabs.rbac'),
            children: (
              <div>
                {/* current user permissions */}
                {myPermissions && (
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space>
                      <Typography.Text strong>{t('settings.rbac.currentUser')}: {myPermissions.username}</Typography.Text>
                      {myPermissions.is_superuser
                        ? <Tag color="red">{t('settings.rbac.superuser')}</Tag>
                        : <Tag color="blue">{myPermissions.permissions.length} {t('settings.rbac.permissionCount')}</Tag>
                      }
                      <Popover
                        title={t('settings.rbac.permissions')}
                        content={
                          <div style={{ maxHeight: 300, overflow: 'auto' }}>
                            {myPermissions.permissions.map(p => <div key={p}><Tag>{p}</Tag></div>)}
                          </div>
                        }
                        trigger="click"
                      >
                        <Button size="small">{t('settings.rbac.permissions')}</Button>
                      </Popover>
                    </Space>
                  </Card>
                )}

                {/* role management */}
                <Card
                  title={t('settings.rbac.roleManagement')}
                  style={{ marginBottom: 16 }}
                  extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRole(null); roleForm.resetFields(); roleForm.setFieldsValue({ permission_ids: [] }); setRoleModalOpen(true); }}>{t('settings.rbac.createRole')}</Button>}
                >
                  <Table dataSource={roles} rowKey="id" size="small"
                    columns={[
                      { title: t('settings.rbac.roleName'), dataIndex: 'name' },
                      { title: t('settings.rbac.description'), dataIndex: 'description', ellipsis: true },
                      { title: t('common.items'), dataIndex: 'user_count', width: 80 },
                      {
                        title: t('settings.rbac.systemRole'), dataIndex: 'is_system', width: 100,
                        render: (v: boolean) => v ? <Tag color="orange">{t('settings.rbac.systemRole')}</Tag> : <Tag>{t('settings.rbac.customRole')}</Tag>,
                      },
                      {
                        title: t('common.action'), width: 180,
                        render: (_: any, r: Role) => (
                          <Space>
                            <Button size="small" icon={<EditOutlined />}
                              onClick={() => {
                                setEditingRole(r);
                                roleForm.setFieldsValue({ name: r.name, description: r.description, permission_ids: r.permission_ids });
                                setRoleModalOpen(true);
                              }}
                            >{t('common.edit')}</Button>
                            {!r.is_system && (
                              <Popconfirm title={t('settings.rbac.deleteConfirm')} onConfirm={async () => {
                                await deleteRole(r.id);
                                message.success(t('settings.rbac.deleted'));
                                reloadRoles();
                              }}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (r: Role) => (
                        <div>
                          <Typography.Text type="secondary">{t('settings.rbac.permissions')}: </Typography.Text>
                          {r.permission_ids.map(pid => {
                            const perm = rbacPermissions.find(p => p.id === pid);
                            return perm ? <Tag key={pid} style={{ marginBottom: 4 }}>{perm.name} ({perm.codename})</Tag> : null;
                          })}
                          {r.permission_ids.length === 0 && <Tag>{t('settings.rbac.noPermissions')}</Tag>}
                        </div>
                      ),
                    }}
                  />
                </Card>

                {/* user role assignment */}
                <Card title={t('settings.rbac.userRoleAssignment')}>
                  <Table dataSource={users} rowKey="id" size="small"
                    columns={[
                      { title: t('settings.rbac.username'), dataIndex: 'username' },
                      { title: t('settings.rbac.email'), dataIndex: 'email', ellipsis: true },
                      {
                        title: t('settings.rbac.superuser'), dataIndex: 'is_superuser', width: 100,
                        render: (v: boolean) => v ? <Tag color="red">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag>,
                      },
                      {
                        title: t('settings.rbac.currentRoles'), dataIndex: 'role_names',
                        render: (names: string[]) => names.map(n => <Tag key={n}>{n}</Tag>),
                      },
                      {
                        title: t('common.action'), width: 120,
                        render: (_: any, u: UserWithRoles) => (
                          <Button size="small" type="link"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedRoleIds(u.role_ids);
                              setUserRoleModalOpen(true);
                            }}
                          >{t('settings.rbac.assignRoles')}</Button>
                        ),
                      },
                    ]}
                  />
                </Card>

                {/* role edit modal */}
                <Modal
                  title={editingRole ? t('settings.rbac.editRole') : t('settings.rbac.createRole')}
                  open={roleModalOpen}
                  onOk={handleSaveRole}
                  onCancel={() => { setRoleModalOpen(false); setEditingRole(null); }}
                  width={600}
                >
                  <Form form={roleForm} layout="vertical">
                    <Form.Item name="name" label={t('settings.rbac.roleName')} rules={[{ required: true, message: t('settings.rbac.roleName') }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="description" label={t('settings.rbac.description')}>
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="permission_ids" label={t('settings.rbac.permissions')}>
                      <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                          <div key={module} style={{ marginBottom: 12 }}>
                            <Typography.Text strong style={{ fontSize: 13, color: '#1677ff' }}>{module}</Typography.Text>
                            <Checkbox.Group
                              value={roleForm.getFieldValue('permission_ids') || []}
                              onChange={(checkedValues) => {
                                roleForm.setFieldsValue({ permission_ids: checkedValues });
                              }}
                              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}
                            >
                              {perms.map(p => (
                                <Checkbox key={p.id} value={p.id} style={{ lineHeight: '28px' }}>
                                  {p.name}
                                </Checkbox>
                              ))}
                            </Checkbox.Group>
                          </div>
                        ))}
                      </div>
                    </Form.Item>
                  </Form>
                </Modal>

                {/* user role assignment modal */}
                <Modal
                  title={`${t('settings.rbac.assignRoles')} - ${selectedUser?.username || ''}`}
                  open={userRoleModalOpen}
                  onOk={handleAssignRoles}
                  onCancel={() => { setUserRoleModalOpen(false); setSelectedUser(null); }}
                  confirmLoading={assigning}
                >
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{t('settings.rbac.assignRoles')}: </Typography.Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder={t('settings.rbac.roleName')}
                    value={selectedRoleIds}
                    onChange={setSelectedRoleIds}
                    options={roles.map(r => ({ label: `${r.name}${r.is_system ? ` (${t('settings.rbac.systemRole')})` : ''}`, value: r.id }))}
                  />
                </Modal>
              </div>
            ),
          },
          // ============ legacy tabs ============
          {
            key: 'llm', label: t('settings.tabs.llm'),
            children: (
              <Card>
                <Form form={llmForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="LLM_API_KEY" label="API Key"><Input.Password placeholder="sk-..." /></Form.Item>
                  <Form.Item name="LLM_MODEL" label={t('settings.llm.model')}><Input placeholder="gpt-4o / deepseek-chat" /></Form.Item>
                  <Form.Item name="LLM_BASE_URL" label={t('settings.llm.apiUrl')}><Input placeholder="https://api.openai.com/v1" /></Form.Item>
                  <Button type="primary" loading={saving} onClick={() => { const values = llmForm.getFieldsValue(); saveSettings(['LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL'], values); }}>{t('common.save')}</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'dify', label: t('settings.tabs.dify'),
            children: (
              <Card>
                <Form form={difyForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="name" label={t('settings.feishu.placeholderName')} rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="api_url" label={t('settings.dify.apiUrl')} rules={[{ required: true }]}><Input placeholder="https://dify.example.com/v1" /></Form.Item>
                  <Form.Item name="api_key" label={t('settings.dify.apiKey')} rules={[{ required: true }]}><Input.Password /></Form.Item>
                  <Space><Button type="primary" onClick={handleSaveDify}>{t('settings.dify.save')}</Button><Button loading={testingDify} onClick={handleTestDify} disabled={!difyId}>{t('settings.llm.test')}</Button></Space>
                </Form>
              </Card>
            ),
          },
          {
            key: 'feishu', label: t('settings.tabs.feishu'),
            children: (
              <Card>
                <Form form={feishuForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="FEISHU_WEBHOOK_URL" label={t('settings.feishu.webhookUrl')} extra={t('settings.feishu.webhookUrl')}><Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." /></Form.Item>
                  <Button type="primary" loading={saving} onClick={() => { const values = feishuForm.getFieldsValue(); saveSettings(['FEISHU_WEBHOOK_URL'], values); }}>{t('common.save')}</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'about', label: t('settings.tabs.about'),
            children: (
              <Card>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('settings.about.platformName')}>TestPlate</Descriptions.Item>
                  <Descriptions.Item label={t('settings.about.version')}>V5.0</Descriptions.Item>
                  <Descriptions.Item label={t('settings.about.backend')}>FastAPI + SQLAlchemy 2.0 + MySQL</Descriptions.Item>
                  <Descriptions.Item label={t('settings.about.frontend')}>Next.js 14 + Ant Design 5 + TypeScript</Descriptions.Item>
                  <Descriptions.Item label={t('settings.about.aiEngine')}>OpenAI Compatible API (GPT-4/DeepSeek/Qwen/Claude)</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
