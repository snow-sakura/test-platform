'use client';

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

// Phase 2: AI 用例生成配置 API
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

// Phase 3: 通知配置 API
import {
  listNotificationConfigs, createNotificationConfig, updateNotificationConfig,
  deleteNotificationConfig, setDefaultNotificationConfig,
  type NotificationConfig, type NotificationConfigCreate, type NotificationConfigUpdate,
  type WebhookBot,
} from '@/lib/api/notification-configs';

// RBAC 权限管理 API
import {
  listPermissions, listRoles, createRole, updateRole, deleteRole,
  listUsersWithRoles, assignUserRoles, getMyPermissions,
  type Permission, type Role, type UserWithRoles,
} from '@/lib/api/rbac';

const { Title } = Typography;
const { TextArea } = Input;

// ==================== 配置类型常量 ====================
const MODEL_TYPES = [
  { label: 'DeepSeek', value: 'deepseek' }, { label: '通义千问 (Qwen)', value: 'qwen' },
  { label: 'SiliconFlow', value: 'siliconflow' }, { label: 'OpenAI', value: 'openai' }, { label: '其他', value: 'other' },
];
const ROLES = [
  { label: '测试用例 Writer', value: 'testcase_writer' }, { label: '测试用例 Reviewer', value: 'testcase_reviewer' },
];
const PROMPT_TYPES = [
  { label: 'Writer（用例生成）', value: 'testcase_writer' }, { label: 'Reviewer（用例评审）', value: 'testcase_reviewer' },
];
const TEST_LEVELS = [
  { label: '功能测试', value: 'functional' }, { label: '性能测试', value: 'performance' },
  { label: '安全测试', value: 'security' }, { label: '兼容性测试', value: 'compatibility' },
  { label: 'UI 测试', value: 'ui' }, { label: '集成测试', value: 'integration' }, { label: '端到端测试', value: 'e2e' },
];
const PRIORITIES = [
  { label: '高 (HIGH)', value: 'HIGH' }, { label: '中 (MEDIUM)', value: 'MEDIUM' }, { label: '低 (LOW)', value: 'LOW' },
];
const NOTIF_TYPES = [
  { label: '飞书', value: 'feishu' }, { label: '钉钉', value: 'dingtalk' },
  { label: '企业微信', value: 'wework' }, { label: 'Webhook', value: 'webhook' }, { label: '自定义', value: 'custom' },
];

export default function SettingsPage() {
  // ====== 现有配置状态 ======
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [llmForm] = Form.useForm();
  const [feishuForm] = Form.useForm();
  const [difyForm] = Form.useForm();
  const [difyId, setDifyId] = useState<number | null>(null);
  const [testingDify, setTestingDify] = useState(false);

  // ====== AI 模型配置 ======
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [modelForm] = Form.useForm();
  const [testingModelId, setTestingModelId] = useState<number | null>(null);

  // ====== 提示词配置 ======
  const [promptConfigs, setPromptConfigs] = useState<PromptConfig[]>([]);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const [promptForm] = Form.useForm();

  // ====== 生成行为配置 ======
  const [genConfigs, setGenConfigs] = useState<GenerationConfig[]>([]);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [editingGen, setEditingGen] = useState<GenerationConfig | null>(null);
  const [genForm] = Form.useForm();

  // ====== 通知配置 ======
  const [notifConfigs, setNotifConfigs] = useState<NotificationConfig[]>([]);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<NotificationConfig | null>(null);
  const [notifForm] = Form.useForm();

  // ====== RBAC 权限管理 ======
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
      .catch(() => message.error('加载配置失败'))
      .finally(() => setLoading(false));
  }, []);

  // ====== 加载扩展配置 ======
  useEffect(() => {
    listModelConfigs().then(r => setModelConfigs(r.data)).catch((e) => console.warn('加载配置失败', e));
    listPromptConfigs().then(r => setPromptConfigs(r.data)).catch((e) => console.warn('加载配置失败', e));
    listGenerationConfigs().then(r => setGenConfigs(r.data)).catch((e) => console.warn('加载配置失败', e));
    listNotificationConfigs().then(r => setNotifConfigs(r.data)).catch((e) => console.warn('加载配置失败', e));
    // RBAC 数据
    listPermissions().then(r => setRbacPermissions(r.data)).catch((e) => console.warn('加载配置失败', e));
    listRoles().then(r => setRoles(r.data)).catch((e) => console.warn('加载配置失败', e));
    listUsersWithRoles().then(r => setUsers(r.data)).catch((e) => console.warn('加载配置失败', e));
    getMyPermissions().then(r => setMyPermissions(r.data)).catch((e) => console.warn('加载配置失败', e));
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
      message.success('配置已保存');
      const res = await getSettings();
      setSettings(res.data);
      const statusRes = await getConfigStatus();
      setStatus(statusRes.data);
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleSaveDify = async () => {
    const values = await difyForm.validateFields();
    if (difyId) { await updateDifyConfig(difyId, values); message.success('Dify 配置已更新'); }
    else { const res = await createDifyConfig({ ...values, is_active: true }); setDifyId(res.data.id); message.success('Dify 配置已创建'); }
  };

  const handleTestDify = async () => {
    if (!difyId) return;
    setTestingDify(true);
    try { const res = await testDifyConfig(difyId); res.data.success ? message.success('连接成功') : message.error(res.data.message || '连接失败'); }
    catch { message.error('连接失败'); }
    setTestingDify(false);
  };

  // ====================== AI 模型配置操作 ======================
  const reloadModels = async () => setModelConfigs((await listModelConfigs()).data);
  const handleSaveModel = async () => {
    const values = await modelForm.validateFields();
    if (editingModel) { await updateModelConfig(editingModel.id, values as AIModelConfigUpdate); message.success('更新成功'); }
    else { await createModelConfig(values as AIModelConfigCreate); message.success('创建成功'); }
    setModelModalOpen(false); setEditingModel(null); modelForm.resetFields(); reloadModels();
  };
  const handleTestModel = async (id: number) => {
    setTestingModelId(id);
    try { const res = await testModelConfig(id); message.success(res.data.message || '连接成功'); }
    catch (e: any) { message.error(e?.response?.data?.detail || '连接失败'); }
    setTestingModelId(null);
  };

  // ====================== 提示词配置操作 ======================
  const reloadPrompts = async () => setPromptConfigs((await listPromptConfigs()).data);
  const handleSavePrompt = async () => {
    const values = await promptForm.validateFields();
    if (editingPrompt) { await updatePromptConfig(editingPrompt.id, values as PromptConfigUpdate); message.success('更新成功'); }
    else { await createPromptConfig(values as PromptConfigCreate); message.success('创建成功'); }
    setPromptModalOpen(false); setEditingPrompt(null); promptForm.resetFields(); reloadPrompts();
  };
  const handleLoadDefaultPrompt = async (r: PromptConfig) => {
    try { await loadDefaultPrompt(r.id); message.success('已加载默认提示词'); reloadPrompts(); }
    catch (e: any) { message.error(e?.response?.data?.detail || '加载失败'); }
  };

  // ====================== 生成行为配置操作 ======================
  const reloadGens = async () => setGenConfigs((await listGenerationConfigs()).data);
  const handleSaveGen = async () => {
    const values = await genForm.validateFields();
    if (editingGen) { await updateGenerationConfig(editingGen.id, values as GenerationConfigUpdate); message.success('更新成功'); }
    else { await createGenerationConfig(values as GenerationConfigCreate); message.success('创建成功'); }
    setGenModalOpen(false); setEditingGen(null); genForm.resetFields(); reloadGens();
  };

  // ====================== RBAC 操作 ======================
  const reloadRoles = async () => setRoles((await listRoles()).data);
  const reloadUsers = async () => setUsers((await listUsersWithRoles()).data);

  /** 权限按模块分组 */
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
      message.success('角色已更新');
    } else {
      await createRole(values);
      message.success('角色已创建');
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
      message.success('角色分配已更新');
      setUserRoleModalOpen(false);
      setSelectedUser(null);
      reloadUsers();
    } catch { message.error('分配失败'); }
    finally { setAssigning(false); }
  };

  // ====================== 通知配置操作 ======================
  const reloadNotifs = async () => setNotifConfigs((await listNotificationConfigs()).data);
  const handleSaveNotif = async () => {
    const values = await notifForm.validateFields();
    if (values.webhook_bots) {
      values.webhook_bots = values.webhook_bots.filter((b: WebhookBot) => b.name && b.url);
    }
    if (editingNotif) { await updateNotificationConfig(editingNotif.id, values as NotificationConfigUpdate); message.success('更新成功'); }
    else { await createNotificationConfig(values as NotificationConfigCreate); message.success('创建成功'); }
    setNotifModalOpen(false); setEditingNotif(null); notifForm.resetFields(); reloadNotifs();
  };
  const handleSetDefaultNotif = async (id: number) => {
    await setDefaultNotificationConfig(id); message.success('已设为默认'); reloadNotifs();
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
            <Input placeholder="机器人名称" value={bot.name} onChange={(e) => updateBot(i, 'name', e.target.value)} style={{ width: 140 }} />
            <Input placeholder="Webhook URL" value={bot.url} onChange={(e) => updateBot(i, 'url', e.target.value)} style={{ width: 300 }} />
            <Switch checked={bot.enabled} onChange={(v) => updateBot(i, 'enabled', v)} />
            <Button size="small" danger onClick={() => removeBot(i)}>删除</Button>
          </Space>
        ))}
        <Button size="small" icon={<PlusOutlined />} onClick={addBot}>添加机器人</Button>
      </div>
    );
  };

  if (loading) return <Spin style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>配置中心</Title>

      {/* 配置状态概览 */}
      {status && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {Object.entries(status).map(([key, cfg]) => (
            <Col span={8} key={key}>
              <Card size="small">
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label={cfg.label}>
                    {cfg.configured ? <Tag icon={<CheckCircleOutlined />} color="success">已配置</Tag> : <Tag icon={<CloseCircleOutlined />} color="default">未配置</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Tabs
        items={[
          // ============ AI 模型配置 ============
          {
            key: 'model-config', label: 'AI 模型配置',
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingModel(null); modelForm.resetFields(); modelForm.setFieldsValue({ role: 'testcase_writer', temperature: 0.7, max_tokens: 4096 }); setModelModalOpen(true); }}>新增</Button>}>
                <Table dataSource={modelConfigs} rowKey="id" size="small"
                  columns={[
                    { title: '名称', dataIndex: 'name' }, { title: '类型', dataIndex: 'model_type' },
                    { title: '模型', dataIndex: 'model_name' }, { title: 'API', dataIndex: 'api_base', ellipsis: true },
                    { title: '启用', dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
                    { title: '操作', width: 180, render: (_: any, r: AIModelConfig) => (
                      <Space>
                        <Button size="small" icon={<ApiOutlined />} loading={testingModelId === r.id} onClick={() => handleTestModel(r.id)}>测试</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingModel(r); modelForm.setFieldsValue(r); setModelModalOpen(true); }}>编辑</Button>
                        <Popconfirm title="确定删除？" onConfirm={async () => { await deleteModelConfig(r.id); message.success('已删除'); reloadModels(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingModel ? '编辑' : '新增'} open={modelModalOpen} onOk={handleSaveModel} onCancel={() => { setModelModalOpen(false); setEditingModel(null); }} width={600}>
                  <Form form={modelForm} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={ROLES} /></Form.Item>
                    <Form.Item name="model_type" label="类型" rules={[{ required: true }]}><Select options={MODEL_TYPES} /></Form.Item>
                    <Form.Item name="api_base" label="API 地址" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="api_key" label="密钥"><Input.Password placeholder={editingModel ? '留空不修改' : ''} /></Form.Item>
                    <Form.Item name="model_name" label="模型名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Space><Form.Item name="temperature" label="Temperature"><Input type="number" step={0.1} /></Form.Item>
                    <Form.Item name="max_tokens" label="Max Tokens"><Input type="number" /></Form.Item></Space>
                    <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ 提示词配置 ============
          {
            key: 'prompt-config', label: '提示词配置',
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPrompt(null); promptForm.resetFields(); promptForm.setFieldsValue({ prompt_type: 'testcase_writer' }); setPromptModalOpen(true); }}>新增</Button>}>
                <Table dataSource={promptConfigs} rowKey="id" size="small"
                  columns={[
                    { title: '名称', dataIndex: 'name' },
                    { title: '类型', dataIndex: 'prompt_type', render: (v: string) => PROMPT_TYPES.find(t => t.value === v)?.label || v },
                    { title: '内容', dataIndex: 'content', ellipsis: true, render: (v: string) => v?.substring(0, 80) },
                    { title: '启用', dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
                    { title: '操作', width: 200, render: (_: any, r: PromptConfig) => (
                      <Space>
                        <Button size="small" icon={<ReloadOutlined />} onClick={() => handleLoadDefaultPrompt(r)}>默认</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingPrompt(r); promptForm.setFieldsValue(r); setPromptModalOpen(true); }}>编辑</Button>
                        <Popconfirm title="确定删除？" onConfirm={async () => { await deletePromptConfig(r.id); message.success('已删除'); reloadPrompts(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                  expandable={{ expandedRowRender: (r: PromptConfig) => <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 200, overflow: 'auto' }}>{r.content}</pre> }}
                />
                <Modal title={editingPrompt ? '编辑' : '新增'} open={promptModalOpen} onOk={handleSavePrompt} onCancel={() => { setPromptModalOpen(false); setEditingPrompt(null); }} width={700}>
                  <Form form={promptForm} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="prompt_type" label="类型" rules={[{ required: true }]}><Select options={PROMPT_TYPES} /></Form.Item>
                    <Form.Item name="content" label="内容" rules={[{ required: true }]}><TextArea rows={10} /></Form.Item>
                    <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ 生成行为配置 ============
          {
            key: 'gen-config', label: '生成行为配置',
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGen(null); genForm.resetFields(); genForm.setFieldsValue({ test_level: 'functional', test_priority: 'MEDIUM', test_case_count: 10, auto_review: true, review_timeout: 300 }); setGenModalOpen(true); }}>新增</Button>}>
                <Table dataSource={genConfigs} rowKey="id" size="small"
                  columns={[
                    { title: '名称', dataIndex: 'name' }, { title: '级别', dataIndex: 'test_level' },
                    { title: '优先级', dataIndex: 'test_priority', render: (v: string) => <Tag color={v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green'}>{v}</Tag> },
                    { title: '数量', dataIndex: 'test_case_count' },
                    { title: '自动评审', dataIndex: 'auto_review', render: (v: boolean) => v ? <Tag color="green">开</Tag> : <Tag>关</Tag> },
                    { title: '激活', dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
                    { title: '操作', width: 140, render: (_: any, r: GenerationConfig) => (
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingGen(r); genForm.setFieldsValue(r); setGenModalOpen(true); }}>编辑</Button>
                        <Popconfirm title="确定删除？" onConfirm={async () => { await deleteGenerationConfig(r.id); message.success('已删除'); reloadGens(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingGen ? '编辑' : '新增'} open={genModalOpen} onOk={handleSaveGen} onCancel={() => { setGenModalOpen(false); setEditingGen(null); }} width={500}>
                  <Form form={genForm} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="test_level" label="级别"><Select options={TEST_LEVELS} /></Form.Item>
                    <Form.Item name="test_priority" label="优先级"><Select options={PRIORITIES} /></Form.Item>
                    <Form.Item name="test_case_count" label="数量"><Input type="number" min={1} max={100} /></Form.Item>
                    <Form.Item name="auto_review" label="自动评审" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="review_timeout" label="超时(s)"><Input type="number" min={30} max={3600} /></Form.Item>
                    <Form.Item name="is_active" label="激活" valuePropName="checked"><Switch /></Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ 通知配置 ============
          {
            key: 'notif-config', label: '通知配置',
            children: (
              <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingNotif(null); notifForm.resetFields(); notifForm.setFieldsValue({ config_type: 'webhook', is_active: true }); setNotifModalOpen(true); }}>新增</Button>}>
                <Table dataSource={notifConfigs} rowKey="id" size="small"
                  columns={[
                    { title: '名称', dataIndex: 'name' },
                    { title: '类型', dataIndex: 'config_type', render: (v: string) => NOTIF_TYPES.find(t => t.value === v)?.label || v },
                    { title: '机器人数', dataIndex: 'webhook_bots', render: (v: WebhookBot[]) => v?.length || 0 },
                    { title: '默认', dataIndex: 'is_default', width: 60, render: (v: boolean) => v ? <Tag color="blue">默认</Tag> : null },
                    { title: '启用', dataIndex: 'is_active', width: 60, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
                    { title: '操作', width: 200, render: (_: any, r: NotificationConfig) => (
                      <Space>
                        {!r.is_default && <Button size="small" onClick={() => handleSetDefaultNotif(r.id)}>设为默认</Button>}
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingNotif(r); notifForm.setFieldsValue(r); setNotifModalOpen(true); }}>编辑</Button>
                        <Popconfirm title="确定删除？" onConfirm={async () => { await deleteNotificationConfig(r.id); message.success('已删除'); reloadNotifs(); }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                  ]}
                />
                <Modal title={editingNotif ? '编辑通知' : '新增通知'} open={notifModalOpen} onOk={handleSaveNotif} onCancel={() => { setNotifModalOpen(false); setEditingNotif(null); }} width={600}>
                  <Form form={notifForm} layout="vertical">
                    <Form.Item name="name" label="配置名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="config_type" label="通知类型"><Select options={NOTIF_TYPES} /></Form.Item>
                    <Form.Item name="webhook_bots" label="Webhook 机器人列表">
                      <NotifWebhookEditor />
                    </Form.Item>
                    <Space>
                      <Form.Item name="is_default" label="设为默认" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          // ============ 权限管理（RBAC） ============
          {
            key: 'rbac', label: '权限管理',
            children: (
              <div>
                {/* 当前用户权限概览 */}
                {myPermissions && (
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space>
                      <Typography.Text strong>当前用户：{myPermissions.username}</Typography.Text>
                      {myPermissions.is_superuser
                        ? <Tag color="red">超级管理员</Tag>
                        : <Tag color="blue">{myPermissions.permissions.length} 项权限</Tag>
                      }
                      <Popover
                        title="权限列表"
                        content={
                          <div style={{ maxHeight: 300, overflow: 'auto' }}>
                            {myPermissions.permissions.map(p => <div key={p}><Tag>{p}</Tag></div>)}
                          </div>
                        }
                        trigger="click"
                      >
                        <Button size="small">查看权限详情</Button>
                      </Popover>
                    </Space>
                  </Card>
                )}

                {/* 角色管理 */}
                <Card
                  title="角色管理"
                  style={{ marginBottom: 16 }}
                  extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRole(null); roleForm.resetFields(); roleForm.setFieldsValue({ permission_ids: [] }); setRoleModalOpen(true); }}>新建角色</Button>}
                >
                  <Table dataSource={roles} rowKey="id" size="small"
                    columns={[
                      { title: '角色名称', dataIndex: 'name' },
                      { title: '描述', dataIndex: 'description', ellipsis: true },
                      { title: '用户数', dataIndex: 'user_count', width: 80 },
                      {
                        title: '系统角色', dataIndex: 'is_system', width: 100,
                        render: (v: boolean) => v ? <Tag color="orange">系统</Tag> : <Tag>自定义</Tag>,
                      },
                      {
                        title: '操作', width: 180,
                        render: (_: any, r: Role) => (
                          <Space>
                            <Button size="small" icon={<EditOutlined />}
                              onClick={() => {
                                setEditingRole(r);
                                roleForm.setFieldsValue({ name: r.name, description: r.description, permission_ids: r.permission_ids });
                                setRoleModalOpen(true);
                              }}
                            >编辑</Button>
                            {!r.is_system && (
                              <Popconfirm title="确定删除此角色？" onConfirm={async () => {
                                await deleteRole(r.id);
                                message.success('已删除');
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
                          <Typography.Text type="secondary">权限：</Typography.Text>
                          {r.permission_ids.map(pid => {
                            const perm = rbacPermissions.find(p => p.id === pid);
                            return perm ? <Tag key={pid} style={{ marginBottom: 4 }}>{perm.name} ({perm.codename})</Tag> : null;
                          })}
                          {r.permission_ids.length === 0 && <Tag>无权限</Tag>}
                        </div>
                      ),
                    }}
                  />
                </Card>

                {/* 用户角色分配 */}
                <Card title="用户角色分配">
                  <Table dataSource={users} rowKey="id" size="small"
                    columns={[
                      { title: '用户名', dataIndex: 'username' },
                      { title: '邮箱', dataIndex: 'email', ellipsis: true },
                      {
                        title: '超级用户', dataIndex: 'is_superuser', width: 100,
                        render: (v: boolean) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag>,
                      },
                      {
                        title: '当前角色', dataIndex: 'role_names',
                        render: (names: string[]) => names.map(n => <Tag key={n}>{n}</Tag>),
                      },
                      {
                        title: '操作', width: 120,
                        render: (_: any, u: UserWithRoles) => (
                          <Button size="small" type="link"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedRoleIds(u.role_ids);
                              setUserRoleModalOpen(true);
                            }}
                          >分配角色</Button>
                        ),
                      },
                    ]}
                  />
                </Card>

                {/* 角色编辑弹窗 */}
                <Modal
                  title={editingRole ? '编辑角色' : '新建角色'}
                  open={roleModalOpen}
                  onOk={handleSaveRole}
                  onCancel={() => { setRoleModalOpen(false); setEditingRole(null); }}
                  width={600}
                >
                  <Form form={roleForm} layout="vertical">
                    <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="permission_ids" label="权限">
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

                {/* 用户角色分配弹窗 */}
                <Modal
                  title={`分配角色 - ${selectedUser?.username || ''}`}
                  open={userRoleModalOpen}
                  onOk={handleAssignRoles}
                  onCancel={() => { setUserRoleModalOpen(false); setSelectedUser(null); }}
                  confirmLoading={assigning}
                >
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>选择一个或多个角色分配给该用户：</Typography.Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="选择角色"
                    value={selectedRoleIds}
                    onChange={setSelectedRoleIds}
                    options={roles.map(r => ({ label: `${r.name}${r.is_system ? ' (系统)' : ''}`, value: r.id }))}
                  />
                </Modal>
              </div>
            ),
          },
          // ============ 原有 Tab ============
          {
            key: 'llm', label: 'LLM 配置',
            children: (
              <Card>
                <Form form={llmForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="LLM_API_KEY" label="API Key"><Input.Password placeholder="sk-..." /></Form.Item>
                  <Form.Item name="LLM_MODEL" label="模型名称"><Input placeholder="gpt-4o / deepseek-chat" /></Form.Item>
                  <Form.Item name="LLM_BASE_URL" label="API 地址"><Input placeholder="https://api.openai.com/v1" /></Form.Item>
                  <Button type="primary" loading={saving} onClick={() => { const values = llmForm.getFieldsValue(); saveSettings(['LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL'], values); }}>保存</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'dify', label: 'AI 评测师（Dify）',
            children: (
              <Card>
                <Form form={difyForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="name" label="配置名称" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="api_url" label="API 地址" rules={[{ required: true }]}><Input placeholder="https://dify.example.com/v1" /></Form.Item>
                  <Form.Item name="api_key" label="API Key" rules={[{ required: true }]}><Input.Password /></Form.Item>
                  <Space><Button type="primary" onClick={handleSaveDify}>保存</Button><Button loading={testingDify} onClick={handleTestDify} disabled={!difyId}>测试连接</Button></Space>
                </Form>
              </Card>
            ),
          },
          {
            key: 'feishu', label: '飞书通知',
            children: (
              <Card>
                <Form form={feishuForm} layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item name="FEISHU_WEBHOOK_URL" label="Webhook 地址" extra="飞书机器人 URL"><Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." /></Form.Item>
                  <Button type="primary" loading={saving} onClick={() => { const values = feishuForm.getFieldsValue(); saveSettings(['FEISHU_WEBHOOK_URL'], values); }}>保存</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'about', label: '关于',
            children: (
              <Card>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="平台名称">TestPlate</Descriptions.Item>
                  <Descriptions.Item label="版本">V5.0</Descriptions.Item>
                  <Descriptions.Item label="后端">FastAPI + SQLAlchemy 2.0 + MySQL</Descriptions.Item>
                  <Descriptions.Item label="前端">Next.js 14 + Ant Design 5 + TypeScript</Descriptions.Item>
                  <Descriptions.Item label="AI 引擎">OpenAI 兼容 API（GPT-4/DeepSeek/Qwen/Claude）</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
