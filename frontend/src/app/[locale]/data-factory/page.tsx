'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import {
  Card, Row, Col, Typography, Tag, message, Table, Input, Button, Modal, Space,
  Statistic, Select, InputNumber, Switch, Tabs, Empty, Tooltip, Drawer, Collapse,
} from 'antd';
import {
  CopyOutlined, DeleteOutlined, ThunderboltOutlined, HistoryOutlined,
  AppstoreOutlined, CodeOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import {
  getDataFactoryCategories, executeTool, batchExecuteTool,
  getDataFactoryRecords, deleteDataFactoryRecord, getDataFactoryStats,
  getVariableFunctions,
} from '@/lib/api/data-factory';
import type { ToolCategory, ToolInfo, ToolParam, DataFactoryRecord, UsageStats, VariableFunction } from '@/lib/api/data-factory';

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function DataFactoryPage() {
  const t = useTranslations();
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('testdata');
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(5);
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [records, setRecords] = useState<DataFactoryRecord[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [activeTab, setActiveTab] = useState('tools');
  const [funcDrawerOpen, setFuncDrawerOpen] = useState(false);
  const [variableFunctions, setVariableFunctions] = useState<VariableFunction[]>([]);

  // scene view: organize by test scenario
  const scenes = [
    { key: 'user', label: t('dataFactory.userData'), icon: '👤', description: 'Generate mock user data', categories: ['testdata', 'personal'] },
    { key: 'order', icon: '📦', label: t('dataFactory.orderData'), description: 'Build order test data', categories: ['testdata'] },
    { key: 'payment', icon: '💰', label: t('dataFactory.paymentData'), description: 'Generate payment test data', categories: ['testdata'] },
    { key: 'address', icon: '📍', label: t('dataFactory.addressData'), description: 'Generate address test data', categories: ['personal', 'text'] },
    { key: 'person', icon: '🆔', label: t('dataFactory.identityData'), description: 'Generate identity test data', categories: ['personal'] },
    { key: 'phone', icon: '📱', label: t('dataFactory.phoneData'), description: 'Generate phone number test data', categories: ['personal'] },
    { key: 'log', icon: '📋', label: t('dataFactory.logData'), description: 'Generate log test data', categories: ['text'] },
    { key: 'code', icon: '🔢', label: t('dataFactory.barcodeData'), description: 'Generate barcode/code data', categories: ['barcode'] },
  ];

  useEffect(() => {
    getDataFactoryCategories().then((r) => setCategories(r.data || [])).catch((e) => console.warn(t('dataFactory.loadCategoriesFailed'), e));
    getDataFactoryStats().then((r) => setStats(r.data)).catch((e) => console.warn(t('dataFactory.loadStatsFailed'), e));
    getVariableFunctions().then((r) => setVariableFunctions(r.data || [])).catch((e) => console.warn(t('dataFactory.loadVariablesFailed'), e));
    loadRecords();
  }, []);

  const loadRecords = async (page = 1) => {
    try {
      const res = await getDataFactoryRecords({ page, page_size: 20 });
      setRecords(res.data.results || []);
      setRecordTotal(res.data.count || 0);
    } catch { /* ignore */ }
  };

  const currentCategory = categories.find((c) => c.name === selectedCategory);

  // init param defaults when selecting tool
  const handleSelectTool = useCallback((tool: ToolInfo) => {
    setSelectedTool(tool);
    const defaults: Record<string, unknown> = {};
    tool.params.forEach((p) => {
      if (p.default !== undefined && p.default !== null) {
        defaults[p.name] = p.default;
      } else {
        defaults[p.name] = '';
      }
    });
    setParamValues(defaults);
    setResult('');
    setBatchResults([]);
  }, []);

  const handleExecute = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    try {
      const res = await executeTool({
        tool_name: selectedTool.name,
        params: Object.fromEntries(
          Object.entries(paramValues).filter(([_, v]) => v !== '' && v !== undefined)
        ),
      });
      setResult(res.data.output);
    } catch {
      message.error(t('dataFactory.executeFailed'));
    }
    finally { setExecuting(false); }
  };

  const handleBatchExecute = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    try {
      const res = await batchExecuteTool({
        tool_name: selectedTool.name,
        params: Object.fromEntries(
          Object.entries(paramValues).filter(([_, v]) => v !== '' && v !== undefined)
        ),
        count: batchCount,
      });
      setBatchResults(res.data.results.map((r) => r.output || r.error || ''));
    } catch {
      message.error(t('dataFactory.batchFailed'));
    }
    finally {
      setExecuting(false);
      setBatchOpen(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t('dataFactory.copied'));
    } catch {
      message.error(t('dataFactory.copyFailed'));
    }
  };

  const renderParamInput = (param: ToolParam) => {
    const value = paramValues[param.name] ?? '';

    if (param.options) {
      return (
        <Select style={{ width: '100%' }}
          value={value as string}
          onChange={(v) => setParamValues({ ...paramValues, [param.name]: v })}
          options={param.options}
        />
      );
    }
    if (param.type === 'number') {
      return (
        <InputNumber style={{ width: '100%' }}
          value={value as number}
          onChange={(v) => setParamValues({ ...paramValues, [param.name]: v })}
          placeholder={param.placeholder}
        />
      );
    }
    if (param.type === 'text') {
      return (
        <TextArea rows={3}
          value={value as string}
          onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
          placeholder={param.placeholder}
        />
      );
    }
    if (param.type === 'boolean') {
      return (
        <Switch checked={value as boolean}
          onChange={(v) => setParamValues({ ...paramValues, [param.name]: v })}
        />
      );
    }
    return (
      <Input value={value as string}
        onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
        placeholder={param.placeholder}
      />
    );
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 左侧：分类 + 工具列表 */}
        <Col span={6}>
          <Card size="small" title={t('dataFactory.categories')} style={{ marginBottom: 8 }}>
            <Row gutter={[4, 4]}>
              {categories.map((cat) => (
                <Col span={24} key={cat.name}>
                  <Button block type={selectedCategory === cat.name ? 'primary' : 'default'}
                    size="small"
                    onClick={() => { setSelectedCategory(cat.name); setSelectedTool(null); }}
                  >
                    {cat.label} ({cat.tools.length})
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'tools', label: t('dataFactory.tools'), children: (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {currentCategory?.tools.map((tool) => (
                    <Card key={tool.name} size="small" hoverable
                      style={{ marginBottom: 4, borderColor: selectedTool?.name === tool.name ? '#1677ff' : undefined }}
                      onClick={() => handleSelectTool(tool)}
                    >
                      <Text strong>{tool.label}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{tool.description}</Text>
                    </Card>
                  ))}
                  {(!currentCategory || currentCategory.tools.length === 0) && (
                    <Empty description={t('dataFactory.noTools')} />
                  )}
                </div>
              )},
              { key: 'scenes', label: t('dataFactory.tabScene'), children: (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <Row gutter={[4, 4]}>
                    {scenes.map((scene) => (
                      <Col span={12} key={scene.key}>
                        <Card size="small" hoverable
                          onClick={() => {
                            // switch to recommended category
                            const cat = categories.find((c) => scene.categories.includes(c.name));
                            if (cat) setSelectedCategory(cat.name);
                            setActiveTab('tools');
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>{scene.icon}</Text>
                          <br />
                          <Text strong style={{ fontSize: 13 }}>{scene.label}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>{scene.description}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )},
              { key: 'records', label: t('dataFactory.tabHistory'), children: (
                <Table dataSource={records} rowKey="id" size="small" pagination={false}
                  columns={[
                    { title: t('dataFactory.tools'), dataIndex: 'tool_name', width: 100 },
                    { title: t('dataFactory.result'), dataIndex: 'output_data', ellipsis: true },
                    { title: t('dataFactory.time'), dataIndex: 'created_at', width: 80 },
                  ]}
                />
              )},
            ]}
          />
        </Col>

        {/* 右侧：工具详情 + 执行 */}
        <Col span={18}>
          {selectedTool ? (
            <Row gutter={16}>
              <Col span={12}>
                <Card title={selectedTool.label} extra={
                  <Space>
                    <Tag>{selectedTool.name}</Tag>
                    <Button size="small" icon={<ThunderboltOutlined />} type="primary"
                      loading={executing} onClick={handleExecute}
                    >{t('dataFactory.execute')}</Button>
                    <Button size="small" onClick={() => setBatchOpen(true)}>{t('dataFactory.batchExecute')}</Button>
                    <Button size="small" icon={<CodeOutlined />} onClick={() => setFuncDrawerOpen(true)}>{t('dataFactory.variableHelper')}</Button>
                  </Space>
                }>
                  <p><Text type="secondary">{selectedTool.description}</Text></p>
                  {selectedTool.params.map((param) => (
                    <div key={param.name} style={{ marginBottom: 12 }}>
                      <Text strong>{param.label}</Text>
                      {param.required && <Text type="danger"> *</Text>}
                      <div style={{ marginTop: 4 }}>{renderParamInput(param)}</div>
                    </div>
                  ))}
                </Card>
              </Col>
              <Col span={12}>
                <Card title={t('dataFactory.executionResult')} extra={
                  result ? <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(result)}>{t('dataFactory.copy')}</Button> : null
                }>
                  {result ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                      {result}
                    </pre>
                  ) : (
                    <Text type="secondary">{t('dataFactory.execute')}...</Text>
                  )}
                </Card>
              </Col>
            </Row>
          ) : (
            <Card>
              <Empty description={t('dataFactory.tools')} />
            </Card>
          )}

          {/* 批量结果 */}
          {batchResults.length > 0 && (
            <Card title={t('dataFactory.batchResults')} style={{ marginTop: 16 }} size="small">
              <Button size="small" icon={<CopyOutlined />}
                onClick={() => copyToClipboard(batchResults.join('\n---\n'))}
              >{t('dataFactory.copyAll')}</Button>
              <div style={{ marginTop: 8 }}>
                {batchResults.map((r, i) => (
                  <Card key={i} size="small" style={{ marginBottom: 4 }}>
                    <Space>
                      <Tag>#{i + 1}</Tag>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{r}</pre>
                    </Space>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* 使用统计 */}
          {stats && (
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={6}><Card size="small"><Statistic title={t('dataFactory.totalExecutions')} value={stats.total_executions} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title={t('dataFactory.today')} value={stats.today_executions} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title={t('dataFactory.toolCount')} value={stats.tool_count} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title={t('dataFactory.categoryCount')} value={stats.category_count} /></Card></Col>
            </Row>
          )}
        </Col>
      </Row>

      {/* 批量生成弹窗 */}
      <Modal title={t('dataFactory.batchGenerate')} open={batchOpen} onOk={handleBatchExecute}
        onCancel={() => setBatchOpen(false)} confirmLoading={executing}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>{t('dataFactory.generateCount')}</Text>
          <InputNumber min={1} max={100} value={batchCount} onChange={(v) => setBatchCount(v || 5)}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>

      {/* 变量函数助手 Drawer */}
      <Drawer
        title={<span><CodeOutlined /> {t('dataFactory.variableHelpers')}</span>}
        open={funcDrawerOpen}
        onClose={() => setFuncDrawerOpen(false)}
        width={400}
      >
        {variableFunctions.length === 0 ? (
          <Empty description={t('dataFactory.noVariables')} />
        ) : (
          <Collapse
            items={Object.entries(
              variableFunctions.reduce<Record<string, VariableFunction[]>>((acc, fn) => {
                const cat = fn.category || t('dataFactory.others');
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(fn);
                return acc;
              }, {})
            ).map(([cat, fns]) => ({
              key: cat,
              label: cat,
              children: fns.map((fn) => (
                <Card
                  key={fn.name}
                  size="small"
                  hoverable
                  style={{ marginBottom: 6, cursor: 'pointer' }}
                  onClick={() => {
                    navigator.clipboard.writeText(fn.example).then(() => {
                      message.success(`${t('dataFactory.syntaxCopied')}: ${fn.example}`);
                    }).catch(() => message.error(t('dataFactory.copyFailed')));
                  }}
                >
                  <Space>
                    <Tag color="blue">{fn.label}</Tag>
                    <Text code style={{ fontSize: 12 }}>{fn.example}</Text>
                  </Space>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{fn.description}</Text>
                </Card>
              )),
            }))}
            size="small"
            defaultActiveKey={[]}
          />
        )}
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            <InfoCircleOutlined /> {t('dataFactory.clickToCopy')}
          </Text>
        </div>
      </Drawer>
    </div>
  );
}
