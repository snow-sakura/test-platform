'use client';

import { Tag, Tabs, Typography } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

const { Text } = Typography;

interface Props {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  elapsedMs: number;
  loading?: boolean;
}

/** HTTP response viewer: status code + elapsed + headers + body (formatted JSON) */
export default function ResponseViewer({ statusCode, headers, body, elapsedMs, loading }: Props) {
  const t = useTranslations('apiTesting');
  const isSuccess = statusCode >= 200 && statusCode < 300;
  const isRedirect = statusCode >= 300 && statusCode < 400;
  const isError = statusCode >= 400;

  const statusColor = isSuccess ? 'success' : isRedirect ? 'processing' : 'error';
  const statusIcon = isSuccess ? <CheckCircleOutlined /> : isError ? <CloseCircleOutlined /> : <ClockCircleOutlined />;

  const formatBody = (text: string): string => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const tabItems = [
    {
      key: 'body',
      label: t('response.title'),
      children: (
        <pre style={{
          maxHeight: 400, overflow: 'auto', background: '#f6f8fa',
          padding: 12, borderRadius: 4, fontSize: 13, whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          <code>{loading ? t('response.loading') : (body ? formatBody(body) : `(${t('response.empty')})`)}</code>
        </pre>
      ),
    },
    {
      key: 'headers',
      label: t('response.headers'),
      children: (
        <pre style={{
          maxHeight: 400, overflow: 'auto', background: '#f6f8fa',
          padding: 12, borderRadius: 4, fontSize: 13,
        }}>
          {JSON.stringify(headers, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Tag icon={statusIcon} color={statusColor} style={{ fontSize: 14, padding: '2px 12px' }}>
          {statusCode > 0 ? statusCode : 'N/A'}
        </Tag>
        {elapsedMs > 0 && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {elapsedMs.toFixed(0)} ms
          </Text>
        )}
        {!statusCode && !loading && (
          <Text type="warning">{t('response.notExecuted')}</Text>
        )}
      </div>
      <Tabs items={tabItems} size="small" />
    </div>
  );
}
