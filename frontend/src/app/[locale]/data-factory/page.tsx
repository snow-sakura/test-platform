'use client';

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

  // 场景视图：按测试场景组织推荐工具
  const scenes = [
    { key: 'user', label: '用户数据生成', icon: '👤', description: '生成注册/登录表单所需的模拟用户数据', categories: ['testdata', 'personal'] },
    { key: 'order', icon: '📦', label: '订单数据生成', description: '构造订单号、金额、状态等订单流程测试数据', categories: ['testdata'] },
    { key: 'payment', icon: '💰', label: '支付数据生成', description: '生成支付流水号、交易记录等支付场景数据', categories: ['testdata'] },
    { key: 'address', icon: '📍', label: '地址数据生成', description: '生成省市/街道/邮编等地址信息', categories: ['personal', 'text'] },
    { key: 'person', icon: '🆔', label: '身份信息生成', description: '生成姓名/身份证/邮箱等个人身份数据', categories: ['personal'] },
    { key: 'phone', icon: '📱', label: '手机号码生成', description: '生成各运营商手机号段测试号码', categories: ['personal'] },
    { key: 'log', icon: '📋', label: '日志数据生成', description: '生成系统日志/错误日志等文本数据', categories: ['text'] },
    { key: 'code', icon: '🔢', label: '编码/条码生成', description: '生成条形码/二维码/序列号等编码数据', categories: ['barcode'] },
  ];

  useEffect(() => {
    getDataFactoryCategories().then((r) => setCategories(r.data || [])).catch(() => {});
    getDataFactoryStats().then((r) => setStats(r.data)).catch(() => {});
    getVariableFunctions().then((r) => setVariableFunctions(r.data || [])).catch(() => {});
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

  // 选择工具时初始化参数默认值
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
      message.error('执行失败');
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
      message.error('批量执行失败');
    }
    finally {
      setExecuting(false);
      setBatchOpen(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
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
          <Card size="small" title="工具分类" style={{ marginBottom: 8 }}>
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
              { key: 'tools', label: '工具列表', children: (
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
                    <Empty description="该分类暂无工具" />
                  )}
                </div>
              )},
              { key: 'scenes', label: '场景视图', children: (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <Row gutter={[4, 4]}>
                    {scenes.map((scene) => (
                      <Col span={12} key={scene.key}>
                        <Card size="small" hoverable
                          onClick={() => {
                            // 切换到场景推荐分类
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
              { key: 'records', label: '历史记录', children: (
                <Table dataSource={records} rowKey="id" size="small" pagination={false}
                  columns={[
                    { title: '工具', dataIndex: 'tool_name', width: 100 },
                    { title: '结果', dataIndex: 'output_data', ellipsis: true },
                    { title: '时间', dataIndex: 'created_at', width: 80 },
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
                    >执行</Button>
                    <Button size="small" onClick={() => setBatchOpen(true)}>批量</Button>
                    <Button size="small" icon={<CodeOutlined />} onClick={() => setFuncDrawerOpen(true)}>变量助手</Button>
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
                <Card title="执行结果" extra={
                  result ? <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(result)}>复制</Button> : null
                }>
                  {result ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                      {result}
                    </pre>
                  ) : (
                    <Text type="secondary">设置参数后点击"执行"按钮</Text>
                  )}
                </Card>
              </Col>
            </Row>
          ) : (
            <Card>
              <Empty description="从左侧选择一个数据生成工具" />
            </Card>
          )}

          {/* 批量结果 */}
          {batchResults.length > 0 && (
            <Card title="批量生成结果" style={{ marginTop: 16 }} size="small">
              <Button size="small" icon={<CopyOutlined />}
                onClick={() => copyToClipboard(batchResults.join('\n---\n'))}
              >复制全部</Button>
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
              <Col span={6}><Card size="small"><Statistic title="总执行" value={stats.total_executions} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="今日" value={stats.today_executions} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="工具数" value={stats.tool_count} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="分类数" value={stats.category_count} /></Card></Col>
            </Row>
          )}
        </Col>
      </Row>

      {/* 批量生成弹窗 */}
      <Modal title="批量生成" open={batchOpen} onOk={handleBatchExecute}
        onCancel={() => setBatchOpen(false)} confirmLoading={executing}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>生成数量</Text>
          <InputNumber min={1} max={100} value={batchCount} onChange={(v) => setBatchCount(v || 5)}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>

      {/* 变量函数助手 Drawer */}
      <Drawer
        title={<span><CodeOutlined /> 变量函数助手</span>}
        open={funcDrawerOpen}
        onClose={() => setFuncDrawerOpen(false)}
        width={400}
      >
        {variableFunctions.length === 0 ? (
          <Empty description="暂无可用变量函数" />
        ) : (
          <Collapse
            items={Object.entries(
              variableFunctions.reduce<Record<string, VariableFunction[]>>((acc, fn) => {
                const cat = fn.category || '其他';
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
                      message.success(`已复制语法: ${fn.example}`);
                    }).catch(() => message.error('复制失败'));
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
            <InfoCircleOutlined /> 点击函数卡片即可复制语法到剪贴板，粘贴到文本参数中使用。
          </Text>
        </div>
      </Drawer>
    </div>
  );
}
