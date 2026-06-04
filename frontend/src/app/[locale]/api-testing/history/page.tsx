'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Select, Table, Tag, Space, message, Modal, Popconfirm,
} from 'antd';
import { DeleteOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getRequestHistory, deleteRequestHistory, clearRequestHistory,
  getRequestHistoryDetail,
} from '@/lib/api/api-testing';
import type { ApiRequestHistory } from '@/lib/api/api-testing';

/** 请求历史页面 */
export default function HistoryPage() {
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
      message.success('删除成功');
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearRequestHistory(0);
      message.success('已清空');
      fetchData();
    } catch {
      message.error('清空失败');
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getRequestHistoryDetail(id);
      setDetailRecord(res.data);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  };

  const columns: ColumnsType<ApiRequestHistory> = [
    {
      title: '方法', dataIndex: 'method', key: 'method', width: 90,
      render: (m: string) => (
        <Tag color={m === 'GET' ? 'green' : m === 'POST' ? 'blue' : m === 'PUT' ? 'orange' : m === 'DELETE' ? 'red' : 'default'}>
          {m}
        </Tag>
      ),
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: '状态码', dataIndex: 'response_status', key: 'response_status', width: 100,
      render: (v: number | null) => v ? (
        <Tag color={v >= 200 && v < 300 ? 'success' : v >= 400 ? 'error' : 'warning'}>{v}</Tag>
      ) : '-',
    },
    {
      title: '耗时', dataIndex: 'elapsed_time', key: 'elapsed_time', width: 100,
      render: (v: number | null) => v ? `${v.toFixed(0)}ms` : '-',
    },
    { title: '执行时间', dataIndex: 'executed_at', key: 'executed_at', width: 180 },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
          详情
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
          placeholder="搜索 URL"
          style={{ width: 250 }}
          allowClear
        />
        <Select
          value={methodFilter}
          onChange={setMethodFilter}
          placeholder="方法筛选"
          allowClear
          style={{ width: 120 }}
          options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => ({ value: m, label: m }))}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="状态码"
          allowClear
          style={{ width: 120 }}
          options={[
            { value: 200, label: '2xx 成功' },
            { value: 300, label: '3xx 重定向' },
            { value: 400, label: '4xx 客户端错误' },
            { value: 500, label: '5xx 服务端错误' },
          ]}
        />
        <Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm title={`确定删除选中的 ${selectedRowKeys.length} 条记录？`} onConfirm={handleBatchDelete}>
              <Button icon={<DeleteOutlined />} danger>批量删除</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确定清空所有历史记录？" onConfirm={handleClearAll}>
            <Button icon={<ClearOutlined />}>清空</Button>
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
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Modal
        title={`请求详情 #${detailRecord?.id}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detailRecord && (
          <div>
            <p><strong>方法：</strong><Tag>{detailRecord.method}</Tag></p>
            <p><strong>URL：</strong>{detailRecord.url}</p>
            <p><strong>状态码：</strong>{detailRecord.response_status}</p>
            <p><strong>耗时：</strong>{detailRecord.elapsed_time?.toFixed(0)}ms</p>
            <p><strong>执行时间：</strong>{detailRecord.executed_at}</p>
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>请求头</summary>
              <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 4, fontSize: 12 }}>
                {JSON.stringify(detailRecord.headers, null, 2)}
              </pre>
            </details>
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>响应体</summary>
              <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                {detailRecord.response_body || '(空)'}
              </pre>
            </details>
          </div>
        )}
      </Modal>
    </div>
  );
}
