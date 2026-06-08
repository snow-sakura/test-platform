'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Input, List, message, Modal, Popconfirm,
  Row, Select, Space, Tag, Typography,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  getApiProjects, getTestSuites, createTestSuite,
  deleteTestSuite, getTestSuite, updateTestSuite,
  executeTestSuite, getRequest,
} from '@/lib/api/api-testing';
import type { ApiProject, ApiTestSuite, ApiRequest, SuiteExecuteResult, SingleRequestResult } from '@/lib/api/api-testing';

const { Text } = Typography;

/** Test suite automation page */
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

  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results);
    }).catch((e) => console.warn(t('project.loadProjectsFailed'), e));
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
      message.error(t('automation.createFailed'));
    }
  };

  const handleExecute = async () => {
    if (!selectedSuite) return;
    setExecuting(true);
    try {
      const res = await executeTestSuite(selectedSuite.id);
      setExecResult(res.data);
    } catch {
      message.error(t('automation.executeFailed'));
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
      message.success(t('automation.removed'));
    } catch {
      message.error(t('automation.removeFailed'));
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
              placeholder={tc('selectProject')}
              style={{ width: '100%' }}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          }>
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setCreateModal(true)} style={{ marginBottom: 12 }}>
              {t('automation.create')}
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
                  <Tag>{item.request_ids?.length || 0} {t('automation.requestCount')}</Tag>
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
                    {t('automation.execute')}
                  </Button>
                  <Popconfirm title={t('automation.deleteConfirm')} onConfirm={async () => {
                    await deleteTestSuite(selectedSuite.id);
                    setSelectedSuite(null);
                    fetchSuites();
                  }}>
                    <Button danger size="small">{tc('delete')}</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {selectedSuite.description || t('automation.noDescription')} | {tc('total')} {selectedSuite.request_ids?.length || 0} {t('automation.requestCount')}
              </Text>

              <List
                size="small"
                header={<strong>{t('automation.requests')}</strong>}
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
                <Card size="small" title={t('automation.results')} style={{ marginTop: 16 }}>
                  <Space>
                    <Tag color="blue">{tc('total')}: {execResult.total}</Tag>
                    <Tag color="success">{tc('passed')}: {execResult.passed}</Tag>
                    <Tag color="error">{tc('failed')}: {execResult.failed}</Tag>
                    <Tag>{t('automation.duration')}: {execResult.duration_ms.toFixed(0)}ms</Tag>
                  </Space>
                </Card>
              )}
            </Card>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 60 }}>{t('automation.selectFromLeft')}</div>
          )}
        </Col>
      </Row>

      <Modal title={t('automation.create')} open={createModal} onOk={handleCreate} onCancel={() => setCreateModal(false)}>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('automation.name')} />
      </Modal>
    </div>
  );
}

/** Request item within a test suite */
function SuiteRequestItem({ requestId, result, onRemove }: {
  requestId: number;
  result?: SingleRequestResult;
  onRemove: () => void;
}) {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [req, setReq] = useState<ApiRequest | null>(null);

  useEffect(() => {
    getRequest(requestId).then((res) => setReq(res.data)).catch((e) => console.warn(t('automation.loadFailed'), e));
  }, [requestId]);

  return (
    <List.Item
      style={{ padding: '4px 0' }}
      actions={[
        result && (
          result.passed
            ? <Tag color="success"><CheckCircleOutlined /> {tc('passed')}</Tag>
            : <Tag color="error"><CloseCircleOutlined /> {tc('failed')}</Tag>
        ),
        <Button type="link" danger size="small" onClick={onRemove}>{tc('delete')}</Button>,
      ].filter(Boolean)}
    >
      <Tag>{req?.method || '?'}</Tag>
      <Text ellipsis style={{ maxWidth: 300 }}>{req?.name || `${t('interface.create')} #${requestId}`}</Text>
      {result && result.status_code && <Tag>{result.status_code}</Tag>}
      {result && <Text type="secondary">{result.elapsed_ms?.toFixed(0)}ms</Text>}
      {result?.error && <Text type="danger" style={{ fontSize: 12 }}>{result.error}</Text>}
    </List.Item>
  );
}
