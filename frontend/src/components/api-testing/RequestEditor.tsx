'use client';

import { useEffect, useState } from 'react';
import {
  Button, Input, Select, message, Spin, Tabs, Space,
} from 'antd';
import { SendOutlined, SaveOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { getRequest, updateRequest, executeRequest } from '@/lib/api/api-testing';
import type { ApiRequest, ExecuteResponse } from '@/lib/api/api-testing';
import KeyValueEditor from './KeyValueEditor';
import BodyEditor from './BodyEditor';
import ResponseViewer from './ResponseViewer';

interface Props {
  requestId: number | null;
  environmentId?: number;
  projectId?: number;
  onSaved?: () => void;
}

/** 完整请求编辑器：方法选择 + URL输入 + 请求头/参数/Body + 发送 + 响应展示 */
export default function RequestEditor({ requestId, environmentId, projectId, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [request, setRequest] = useState<ApiRequest | null>(null);

  // 可编辑字段
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState<any>({});
  const [bodyType, setBodyType] = useState('none');

  // 响应
  const [response, setResponse] = useState<ExecuteResponse | null>(null);

  useEffect(() => {
    if (!requestId) {
      setRequest(null);
      resetForm();
      return;
    }
    loadRequest(requestId);
  }, [requestId]);

  const resetForm = () => {
    setMethod('GET');
    setUrl('');
    setHeaders({});
    setQueryParams({});
    setBody({});
    setBodyType('none');
    setResponse(null);
  };

  const loadRequest = async (id: number) => {
    setLoading(true);
    try {
      const res = await getRequest(id);
      const r = res.data;
      setRequest(r);
      setMethod(r.method);
      setUrl(r.url);
      setHeaders(r.headers || {});
      setQueryParams(r.query_params || {});
      setBody(r.body || {});
      setBodyType(r.body_type || 'none');
      setResponse(null);
    } catch {
      message.error('加载请求失败');
    } finally {
      setLoading(false);
    }
  };

  /** 保存请求 */
  const handleSave = async () => {
    if (!requestId || !request) return;
    try {
      await updateRequest(requestId, {
        method, url, headers, query_params: queryParams,
        body, body_type: bodyType,
      });
      message.success('保存成功');
      onSaved?.();
    } catch {
      message.error('保存失败');
    }
  };

  /** 发送请求 */
  const handleSend = async () => {
    setSending(true);
    try {
      const res = await executeRequest(requestId!, {
        method, url, headers, query_params: queryParams,
        body, body_type: bodyType,
        environment_id: environmentId,
        project_id: projectId,
      });
      setResponse(res.data);
    } catch {
      message.error('请求执行失败');
    } finally {
      setSending(false);
    }
  };

  /** 切换收藏 */
  const handleToggleFavorite = async () => {
    if (!requestId || !request) return;
    try {
      await updateRequest(requestId, { is_favorite: !request.is_favorite });
      setRequest({ ...request, is_favorite: !request.is_favorite });
    } catch {
      // ignore
    }
  };

  const tabItems = [
    {
      key: 'params',
      label: 'URL 参数',
      children: (
        <KeyValueEditor
          value={queryParams}
          onChange={setQueryParams}
          keyPlaceholder="参数名"
          valuePlaceholder="参数值"
        />
      ),
    },
    {
      key: 'headers',
      label: '请求头',
      children: (
        <KeyValueEditor
          value={headers}
          onChange={setHeaders}
          keyPlaceholder="Header名"
          valuePlaceholder="Header值"
        />
      ),
    },
    {
      key: 'body',
      label: '请求体',
      children: (
        <BodyEditor
          bodyType={bodyType}
          body={body}
          onBodyTypeChange={setBodyType}
          onBodyChange={setBody}
        />
      ),
    },
  ];

  if (!requestId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#999' }}>
        请从左侧集合树选择一个请求
      </div>
    );
  }

  if (loading) {
    return <Spin style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      {/* 请求行 */}
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Select
          value={method}
          onChange={setMethod}
          style={{ width: 100 }}
          options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => ({
            value: m,
            label: <span style={{
              color: m === 'GET' ? '#52c41a' : m === 'POST' ? '#1890ff'
                : m === 'PUT' ? '#faad14' : m === 'DELETE' ? '#ff4d4f' : '#666',
              fontWeight: 'bold',
            }}>{m}</span>,
          }))}
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="请求 URL（支持 ${environment_variable}）"
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={sending}>
          发送
        </Button>
        <Button icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
        <Button
          type="text"
          icon={request?.is_favorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={handleToggleFavorite}
        />
      </Space.Compact>

      <div style={{ marginBottom: 4, fontSize: 12, color: '#999' }}>
        {request?.name && <span>当前请求: {request.name}</span>}
      </div>

      {/* Tab 页：Params / Headers / Body */}
      <Tabs items={tabItems} size="small" />

      {/* 响应区域 */}
      {response && (
        <ResponseViewer
          statusCode={response.status_code}
          headers={response.headers}
          body={response.body}
          elapsedMs={response.elapsed_ms}
        />
      )}
    </div>
  );
}
