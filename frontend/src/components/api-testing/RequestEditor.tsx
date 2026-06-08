'use client';

import { useEffect, useState } from 'react';
import {
  Button, Input, Select, message, Spin, Tabs, Space,
} from 'antd';
import { SendOutlined, SaveOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
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

/** Full request editor: method selector + URL input + headers/params/body + send + response display */
export default function RequestEditor({ requestId, environmentId, projectId, onSaved }: Props) {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
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
      message.error(t('interface.loadingRequest'));
    } finally {
      setLoading(false);
    }
  };

  /** Save request */
  const handleSave = async () => {
    if (!requestId || !request) return;
    try {
      await updateRequest(requestId, {
        method, url, headers, query_params: queryParams,
        body, body_type: bodyType,
      });
      message.success(t('interface.saveSuccess'));
      onSaved?.();
    } catch {
      message.error(t('interface.saveFailed'));
    }
  };

  /** Send request */
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
      message.error(t('interface.executeFailed'));
    } finally {
      setSending(false);
    }
  };

  /** Toggle favorite */
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
      label: t('interface.params'),
      children: (
        <KeyValueEditor
          value={queryParams}
          onChange={setQueryParams}
          keyPlaceholder={t('interface.paramName')}
          valuePlaceholder={t('interface.paramValue')}
        />
      ),
    },
    {
      key: 'headers',
      label: t('interface.headers'),
      children: (
        <KeyValueEditor
          value={headers}
          onChange={setHeaders}
          keyPlaceholder={t('interface.paramName')}
          valuePlaceholder={t('interface.paramValue')}
        />
      ),
    },
    {
      key: 'body',
      label: t('interface.body'),
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
        {t('interface.selectFromLeft')}
      </div>
    );
  }

  if (loading) {
    return <Spin style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      {/* Request line */}
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
          placeholder={t('interface.url')}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={sending}>
          {t('interface.send')}
        </Button>
        <Button icon={<SaveOutlined />} onClick={handleSave}>
          {t('interface.save')}
        </Button>
        <Button
          type="text"
          icon={request?.is_favorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={handleToggleFavorite}
        />
      </Space.Compact>

      <div style={{ marginBottom: 4, fontSize: 12, color: '#999' }}>
        {request?.name && <span>{t('interface.currentRequest')}: {request.name}</span>}
      </div>

      {/* Tabs: Params / Headers / Body */}
      <Tabs items={tabItems} size="small" />

      {/* Response area */}
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
