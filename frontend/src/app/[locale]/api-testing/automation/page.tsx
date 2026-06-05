'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Input, List, message, Modal, Popconfirm,
  Row, Select, Space, Tag, Typography,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import {
  getApiProjects, getTestSuites, createTestSuite,
  deleteTestSuite, getTestSuite, updateTestSuite,
  executeTestSuite, getRequest,
} from '@/lib/api/api-testing';
import type { ApiProject, ApiTestSuite, ApiRequest, SuiteExecuteResult, SingleRequestResult } from '@/lib/api/api-testing';

const { Text } = Typography;

/** 测试套件自动化页面 */
export default function AutomationPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [suites, setSuites] = useState<ApiTestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<ApiTestSuite | null>(null);
  const [availableRequests, setAvailableRequests] = useState<ApiRequest[]>([]);
  const [execResult, setExecResult] = useState<SuiteExecuteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results);
    }).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  const fetchSuites = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getTestSuites({ project_id: projectId, page_size: 50 })
      .then((res) => setSuites(res.data.results))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchSuites(); }, [fetchSuites]);

  const handleSelectSuite = async (suite: ApiTestSuite) => {
    setSelectedSuite(suite);
    setExecResult(null);
    try {
      const res = await getTestSuite(suite.id);
      setSelectedSuite(res.data);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!projectId || !newName) return;
    try {
      const res = await createTestSuite({ project_id: projectId, name: newName });
      setCreateModal(false);
      setNewName('');
      fetchSuites();
      handleSelectSuite(res.data);
    } catch {
      message.error('创建失败');
    }
  };

  const handleExecute = async () => {
    if (!selectedSuite) return;
    setExecuting(true);
    try {
      const res = await executeTestSuite(selectedSuite.id);
      setExecResult(res.data);
    } catch {
      message.error('执行失败');
    } finally {
      setExecuting(false);
    }
  };

  const handleRemoveRequest = async (reqId: number) => {
    if (!selectedSuite) return;
    const newIds = (selectedSuite.request_ids || []).filter((id) => id !== reqId);
    try {
      await updateTestSuite(selectedSuite.id, { request_ids: newIds });
      setSelectedSuite({ ...selectedSuite, request_ids: newIds });
      message.success('已移除');
    } catch {
      message.error('移除失败');
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" title={
            <Select
              value={projectId}
              onChange={setProjectId}
              placeholder="选择项目"
              style={{ width: '100%' }}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          }>
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setCreateModal(true)} style={{ marginBottom: 12 }}>
              新建套件
            </Button>
            <List
              size="small"
              dataSource={suites}
              loading={loading}
              renderItem={(item) => (
                <List.Item
                  onClick={() => handleSelectSuite(item)}
                  style={{
                    cursor: 'pointer',
                    background: selectedSuite?.id === item.id ? '#e6f4ff' : undefined,
                    padding: '4px 8px',
                  }}
                >
                  <Text>{item.name}</Text>
                  <Tag>{item.request_ids?.length || 0} 个请求</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={16}>
          {selectedSuite ? (
            <Card size="small" title={selectedSuite.name}
              extra={
                <Space>
                  <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleExecute} loading={executing}>
                    执行套件
                  </Button>
                  <Popconfirm title="确定删除？" onConfirm={async () => {
                    await deleteTestSuite(selectedSuite.id);
                    setSelectedSuite(null);
                    fetchSuites();
                  }}>
                    <Button danger size="small">删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {selectedSuite.description || '暂无描述'} | 共 {selectedSuite.request_ids?.length || 0} 个请求
              </Text>

              <List
                size="small"
                header={<strong>请求列表</strong>}
                dataSource={selectedSuite.request_ids || []}
                renderItem={(reqId) => (
                  <SuiteRequestItem
                    requestId={reqId}
                    result={execResult?.results.find((r) => r.request_id === reqId)}
                    onRemove={() => handleRemoveRequest(reqId)}
                  />
                )}
              />

              {execResult && (
                <Card size="small" title="执行结果" style={{ marginTop: 16 }}>
                  <Space>
                    <Tag color="blue">总数: {execResult.total}</Tag>
                    <Tag color="success">通过: {execResult.passed}</Tag>
                    <Tag color="error">失败: {execResult.failed}</Tag>
                    <Tag>耗时: {execResult.duration_ms.toFixed(0)}ms</Tag>
                  </Space>
                </Card>
              )}
            </Card>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 60 }}>请从左侧选择一个测试套件</div>
          )}
        </Col>
      </Row>

      <Modal title="新建测试套件" open={createModal} onOk={handleCreate} onCancel={() => setCreateModal(false)}>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="套件名称" />
      </Modal>
    </div>
  );
}

/** 套件中的请求条目组件 */
function SuiteRequestItem({ requestId, result, onRemove }: {
  requestId: number;
  result?: SingleRequestResult;
  onRemove: () => void;
}) {
  const [req, setReq] = useState<ApiRequest | null>(null);

  useEffect(() => {
    getRequest(requestId).then((res) => setReq(res.data)).catch((e) => console.warn('加载请求详情失败', e));
  }, [requestId]);

  return (
    <List.Item
      style={{ padding: '4px 0' }}
      actions={[
        result && (
          result.passed
            ? <Tag color="success"><CheckCircleOutlined /> 通过</Tag>
            : <Tag color="error"><CloseCircleOutlined /> 失败</Tag>
        ),
        <Button type="link" danger size="small" onClick={onRemove}>移除</Button>,
      ].filter(Boolean)}
    >
      <Tag>{req?.method || '?'}</Tag>
      <Text ellipsis style={{ maxWidth: 300 }}>{req?.name || `请求 #${requestId}`}</Text>
      {result && result.status_code && <Tag>{result.status_code}</Tag>}
      {result && <Text type="secondary">{result.elapsed_ms?.toFixed(0)}ms</Text>}
      {result?.error && <Text type="danger" style={{ fontSize: 12 }}>{result.error}</Text>}
    </List.Item>
  );
}
