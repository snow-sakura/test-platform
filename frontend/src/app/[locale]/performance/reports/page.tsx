'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, Card, Button, message, Modal, Typography } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';

import { getPerformanceReports, getPerformanceReport } from '@/lib/api/performance';
import type { PerformanceReport } from '@/lib/api/performance';

const { Text } = Typography;

export default function PerformanceReportsPage() {
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
    } catch { message.error('加载报告列表失败'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getPerformanceReport(id);
      setDetailReport(res.data);
      setDetailOpen(true);
    } catch { message.error('加载报告详情失败'); }
  };

  /* 报告 ECharts 配置 */
  const latencyChartOption = detailReport?.content ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均延迟 (ms)'], top: 0 },
    grid: { left: 60, right: 20, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: (detailReport.content.time_series as any[])?.map((d: any) => `${d.time}s`) || [],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: '延迟 (ms)' },
    series: [{
      name: '平均延迟 (ms)',
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
    legend: { data: ['吞吐量 (req/s)', '错误数'], top: 0 },
    grid: { left: 60, right: 60, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: (detailReport.content.time_series as any[])?.map((d: any) => `${d.time}s`) || [],
    },
    yAxis: [
      { type: 'value', name: 'req/s' },
      { type: 'value', name: '错误数' },
    ],
    series: [
      {
        name: '吞吐量 (req/s)',
        type: 'line',
        smooth: true,
        data: (detailReport.content.time_series as any[])?.map((d: any) => d.rps) || [],
        lineStyle: { color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '错误数',
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
    { title: '报告名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '执行 ID', dataIndex: 'execution_id', key: 'execution_id', width: 90 },
    { title: '摘要', dataIndex: 'summary', key: 'summary', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, record: PerformanceReport) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        size="small" title="压测报告"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>}
      >
        <Table
          dataSource={data.results} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total: data.count, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
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
                <Text>总请求: <strong>{summary.total_requests}</strong></Text>
                <Text>平均延迟: <strong>{summary.avg_response_time_ms?.toFixed(0)}ms</strong></Text>
                <Text>P95: <strong>{summary.p95_ms?.toFixed(0)}ms</strong></Text>
                <Text>P99: <strong>{summary.p99_ms?.toFixed(0)}ms</strong></Text>
                <Text>错误率: <strong>{((summary.error_rate || 0) * 100).toFixed(1)}%</strong></Text>
                <Text>吞吐量: <strong>{summary.throughput?.toFixed(1)}/s</strong></Text>
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
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无详细报告数据</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
