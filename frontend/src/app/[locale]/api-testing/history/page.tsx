'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Select, Table, Tag, Space, message, Modal, Popconfirm,
} from 'antd';
import { DeleteOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { ColumnsType } from 'antd/es/table';
import {
  getRequestHistory, deleteRequestHistory, clearRequestHistory,
  getRequestHistoryDetail,
} from '@/lib/api/api-testing';
import type { ApiRequestHistory } from '@/lib/api/api-testing';

/** Request history page */
export default function HistoryPage() {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [histories, setHistories] = useState<ApiRequestHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ApiRequestHistory | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getRequestHistory({ search, method: methodFilter, status_code: statusFilter, page, page_size: 20 })
      .then((res) => {
        setHistories(res.data.results);
        setTotal(res.data.count);
      })
      .finally(() => setLoading(false));
  }, [page, search, methodFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await deleteRequestHistory(selectedRowKeys as number[]);
      message.success(t('history.deleteSuccess'));
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error(t('history.deleteFailed'));
    }
  };

  const handleClearAll = async () => {
    try {
      await clearRequestHistory(0);
      message.success(t('history.cleared'));
      fetchData();
    } catch {
      message.error(t('history.clearFailed'));
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getRequestHistoryDetail(id);
      setDetailRecord(res.data);
      setDetailOpen(true);
    } catch {
      message.error(t('history.loadDetailFailed'));
    }
  };

  const columns: ColumnsType<ApiRequestHistory> = [
    {
      title: t('history.method'), dataIndex: 'method', key: 'method', width: 90,
      render: (m: string) => (
        <Tag color={m === 'GET' ? 'green' : m === 'POST' ? 'blue' : m === 'PUT' ? 'orange' : m === 'DELETE' ? 'red' : 'default'}>
          {m}
        </Tag>
      ),
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: t('history.statusCode'), dataIndex: 'response_status', key: 'response_status', width: 100,
      render: (v: number | null) => v ? (
        <Tag color={v >= 200 && v < 300 ? 'success' : v >= 400 ? 'error' : 'warning'}>{v}</Tag>
      ) : '-',
    },
    {
      title: t('history.duration'), dataIndex: 'elapsed_time', key: 'elapsed_time', width: 100,
      render: (v: number | null) => v ? `${v.toFixed(0)}ms` : '-',
    },
    { title: t('history.executeTime'), dataIndex: 'executed_at', key: 'executed_at', width: 180 },
    {
      title: tc('action'), key: 'actions', width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
          {tc('detail')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input.Search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => { setPage(1); fetchData(); }}
          placeholder={t('history.searchUrl')}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          value={methodFilter}
          onChange={setMethodFilter}
          placeholder={t('history.methodFilter')}
          allowClear
          style={{ width: 120 }}
          options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => ({ value: m, label: m }))}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder={t('history.statusCode')}
          allowClear
          style={{ width: 120 }}
          options={[
            { value: 200, label: t('history.success2xx') },
            { value: 300, label: t('history.redirect3xx') },
            { value: 400, label: t('history.clientError4xx') },
            { value: 500, label: t('history.serverError5xx') },
          ]}
        />
        <Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm title={`${t('history.deleteSelected')} ${tc('totalCount', { count: selectedRowKeys.length })}`} onConfirm={handleBatchDelete}>
              <Button icon={<DeleteOutlined />} danger>{t('history.batchDelete')}</Button>
            </Popconfirm>
          )}
          <Popconfirm title={t('history.clearAll')} onConfirm={handleClearAll}>
            <Button icon={<ClearOutlined />}>{t('history.clear')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={histories}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t: number) => tc('totalCount', { count: t }),
        }}
      />

      <Modal
        title={`${t('history.detail')} #${detailRecord?.id}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detailRecord && (
          <div>
            <p><strong>{t('history.method')}: </strong><Tag>{detailRecord.method}</Tag></p>
            <p><strong>URL: </strong>{detailRecord.url}</p>
            <p><strong>{t('history.statusCode')}: </strong>{detailRecord.response_status}</p>
            <p><strong>{t('history.duration')}: </strong>{detailRecord.elapsed_time?.toFixed(0)}ms</p>
            <p><strong>{t('history.executeTime')}: </strong>{detailRecord.executed_at}</p>
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>{t('history.requestHeaders')}</summary>
              <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 4, fontSize: 12 }}>
                {JSON.stringify(detailRecord.headers, null, 2)}
              </pre>
            </details>
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>{t('history.responseBody')}</summary>
              <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                {detailRecord.response_body || `(${t('history.empty')})`}
              </pre>
            </details>
          </div>
        )}
      </Modal>
    </div>
  );
}
