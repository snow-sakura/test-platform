'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Table, Card, Button, message, Modal, Typography } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';

import { getPerformanceReports, getPerformanceReport } from '@/lib/api/performance';
import type { PerformanceReport } from '@/lib/api/performance';

const { Text } = Typography;

export default function PerformanceReportsPage() {
  const t = useTranslations();
  const [data, setData] = useState<{ count: number; results: PerformanceReport[] }>({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<PerformanceReport | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPerformanceReports({ page, page_size: 20 });
      setData(res.data);
    } catch { message.error(t('performance.report.loadFailed')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getPerformanceReport(id);
      setDetailReport(res.data);
      setDetailOpen(true);
    } catch { message.error(t('performance.report.loadDetailFailed')); }
  };

  /* report ECharts configuration */
  const latencyChartOption = detailReport?.content ? {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('performance.report.avgLatencyMs')], top: 0 },
    grid: { left: 60, right: 20, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: (detailReport.content.time_series as any[])?.map((d: any) => `${d.time}s`) || [],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: t('performance.report.latencyMs') },
    series: [{
      name: t('performance.report.avgLatencyMs'),
      type: 'line',
      smooth: true,
      data: (detailReport.content.time_series as any[])?.map((d: any) => d.avg_latency_ms) || [],
      lineStyle: { width: 2, color: '#1677ff' },
      itemStyle: { color: '#1677ff' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(22,119,255,0.25)' },
          { offset: 1, color: 'rgba(22,119,255,0.02)' },
        ]}},
    }],
  } : null;

  const throughputChartOption = detailReport?.content ? {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('performance.report.throughput'), t('performance.report.errorCount')], top: 0 },
    grid: { left: 60, right: 60, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: (detailReport.content.time_series as any[])?.map((d: any) => `${d.time}s`) || [],
    },
    yAxis: [
      { type: 'value', name: 'req/s' },
      { type: 'value', name: t('performance.report.errorCount') },
    ],
    series: [
      {
        name: t('performance.report.throughput'),
        type: 'line',
        smooth: true,
        data: (detailReport.content.time_series as any[])?.map((d: any) => d.rps) || [],
        lineStyle: { color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: t('performance.report.errorCount'),
        type: 'bar',
        yAxisIndex: 1,
        data: (detailReport.content.time_series as any[])?.map((d: any) => d.error_count) || [],
        itemStyle: { color: '#ff4d4f' },
        barMaxWidth: 16,
      },
    ],
  } : null;

  const summary = detailReport?.content?.summary as Record<string, number> | undefined;

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: t('performance.report.name'), dataIndex: 'name', key: 'name', ellipsis: true },
    { title: t('performance.report.executionId'), dataIndex: 'execution_id', key: 'execution_id', width: 90 },
    { title: t('performance.report.summary'), dataIndex: 'summary', key: 'summary', ellipsis: true },
    { title: t('performance.report.createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: t('common.action'), key: 'action', width: 100,
      render: (_: any, record: PerformanceReport) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
          {t('performance.report.detail')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        size="small" title={t('performance.report.title')}
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>{t('performance.report.refresh')}</Button>}
      >
        <Table
          dataSource={data.results} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total: data.count, pageSize: 20, onChange: setPage, showTotal: (total) => t('common.totalCount', { count: total }) }}
          size="small"
        />
      </Card>

      <Modal title={detailReport?.name} open={detailOpen} onCancel={() => setDetailOpen(false)}
        footer={null} width={900}
      >
        {detailReport && (
          <div>
            {summary && (
              <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Text>{t('performance.report.totalRequests')}: <strong>{summary.total_requests}</strong></Text>
                <Text>{t('performance.report.avgLatency')}: <strong>{summary.avg_response_time_ms?.toFixed(0)}ms</strong></Text>
                <Text>P95: <strong>{summary.p95_ms?.toFixed(0)}ms</strong></Text>
                <Text>P99: <strong>{summary.p99_ms?.toFixed(0)}ms</strong></Text>
                <Text>{t('performance.report.errorRate')}: <strong>{((summary.error_rate || 0) * 100).toFixed(1)}%</strong></Text>
                <Text>{t('performance.report.throughput')}: <strong>{summary.throughput?.toFixed(1)}/s</strong></Text>
              </div>
            )}

            {latencyChartOption && (
              <div style={{ marginBottom: 16 }}>
                <ReactEChartsCore option={latencyChartOption} style={{ height: 280 }} />
              </div>
            )}
            {throughputChartOption && (
              <div>
                <ReactEChartsCore option={throughputChartOption} style={{ height: 280 }} />
              </div>
            )}
            {!latencyChartOption && (
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>{t('performance.report.noData')}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
