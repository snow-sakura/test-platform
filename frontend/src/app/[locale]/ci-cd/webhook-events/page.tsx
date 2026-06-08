'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, Tag, Card, Button, Modal, message, Typography } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';

import { getWebhookEvents } from '@/lib/api/ci-cd';
import type { WebhookEventResponse } from '@/lib/api/ci-cd';

const { Text } = Typography;

const CI_TAG_COLORS: Record<string, string> = { gitlab: '#FC6D26', github: '#24292F', jenkins: '#D33833' };

export default function CiCdWebhookEventsPage() {
  const t = useTranslations();
  const [data, setData] = useState<{ count: number; results: WebhookEventResponse[] }>({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [payloadModal, setPayloadModal] = useState<{ raw: string; title: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWebhookEvents({ page, page_size: 20 });
      setData(res.data);
    } catch { message.error(t('ciCd.loadWebhookFailed')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: t('ciCd.ciType'), dataIndex: 'ci_type', key: 'ci_type', width: 110, render: (v: string) => <Tag color={CI_TAG_COLORS[v] || 'default'}>{v?.toUpperCase()}</Tag> },
    { title: t('ciCd.triggerEvent'), dataIndex: 'event_type', key: 'event_type', width: 130 },
    { title: t('ciCd.relatedPipeline'), dataIndex: 'pipeline_id', key: 'pipeline_id', width: 100, render: (v: number | null) => v ? `#${v}` : '-' },
    { title: t('ciCd.sourceIp'), dataIndex: 'ip_address', key: 'ip_address', width: 150 },
    { title: t('ciCd.createdAt'), dataIndex: 'received_at', key: 'received_at', width: 180 },
    {
      title: t('common.action'), key: 'action', width: 100,
      render: (_: any, record: WebhookEventResponse) => (
        <Button type="link" size="small" icon={<EyeOutlined />}
          onClick={() => setPayloadModal({ raw: JSON.stringify(record.source_payload, null, 2), title: `Webhook #${record.id}` })}>
          {t('ciCd.viewPayload')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card size="small" title={t('ciCd.webhookEvents')} extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>{t('ciCd.webhookRefresh')}</Button>}>
        <Table
          dataSource={data.results} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total: data.count, pageSize: 20, onChange: setPage, showTotal: (total) => t('common.totalCount', { count: total }) }}
          size="small"
        />
      </Card>

      <Modal title={payloadModal?.title} open={!!payloadModal} onCancel={() => setPayloadModal(null)} footer={null} width={700}>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 6, fontSize: 12, overflow: 'auto', maxHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {payloadModal?.raw}
        </pre>
      </Modal>
    </div>
  );
}
