'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Table, Select, message, Tabs, Tag,
} from 'antd';
import {
  FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import {
  getReports,
  getTestManagementDashboardStats,
  getExecutionTrend,
  getFailedTop10,
  getExecutionSummary,
  getDefectDistribution,
  getAiEfficiency,
  getTeamWorkload,
} from '@/lib/api/test-management';
import type { TestReport, DashboardStats, DefectDistribution, AiEfficiencyItem, TeamWorkloadItem } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';
import { useTranslations } from 'next-intl';

export default function ReportsPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Chart data
  const [trendData, setTrendData] = useState<{ date: string; total: number; passed: number; failed: number }[]>([]);
  const [failedTop10, setFailedTop10] = useState<{ case_id: number; title: string; fail_count: number }[]>([]);
  const [execSummary, setExecSummary] = useState<{ total: number; passed: number; failed: number; blocked: number; untested: number } | null>(null);
  const [defectDist, setDefectDist] = useState<DefectDistribution | null>(null);
  const [aiEfficiency, setAiEfficiency] = useState<AiEfficiencyItem[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadItem[]>([]);

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [reportsRes, statsRes, trendRes, failedRes, summaryRes, defectRes, aiRes, workloadRes] = await Promise.all([
        getReports(projectId),
        getTestManagementDashboardStats(projectId),
        getExecutionTrend({ project_id: projectId, days: 14 }),
        getFailedTop10({ project_id: projectId }),
        getExecutionSummary({ project_id: projectId }),
        getDefectDistribution({ project_id: projectId }),
        getAiEfficiency({ project_id: projectId, months: 12 }),
        getTeamWorkload({ project_id: projectId }),
      ]);
      setReports(reportsRes.data.results || []);
      setStats(statsRes.data);
      setTrendData(trendRes.data.data || []);
      setFailedTop10(failedRes.data.data || []);
      setExecSummary(summaryRes.data);
      setDefectDist(defectRes.data);
      setAiEfficiency(aiRes.data || []);
      setTeamWorkload(workloadRes.data || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [projectId]);

  /* Pass rate gauge ECharts config (useMemo for caching) */
  const passRateOption = useMemo(() => stats ? {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        pointer: { show: false },
        progress: {
          show: true,
          width: 12,
          itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#ff4d4f' },
              { offset: 0.5, color: '#faad14' },
              { offset: 1, color: '#52c41a' },
            ]}},
        },
        axisLine: { lineStyle: { width: 12 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          offsetCenter: [0, '60%'],
          fontSize: 28,
          fontWeight: 'bold',
          formatter: `${(stats.pass_rate * 100).toFixed(1)}%`,
        },
        data: [{ value: stats.pass_rate * 100 }],
      },
    ],
  } : null, [stats]);

  /* Execution overview pie chart */
  const execPieOption = useMemo(() => stats ? {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: [
          { value: stats.total_cases, name: t('testManagement.caseCount'), itemStyle: { color: '#1677ff' } },
          { value: stats.total_suites, name: t('testManagement.suiteCount'), itemStyle: { color: '#52c41a' } },
          { value: stats.total_plans, name: t('testManagement.planCount'), itemStyle: { color: '#faad14' } },
          { value: stats.total_runs, name: t('testManagement.plan.executionRounds'), itemStyle: { color: '#722ed1' } },
        ],
      },
    ],
  } : null, [stats, t]);

  /* Execution trend line chart */
  const trendOption = useMemo(() => trendData.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('common.total'), t('common.passed'), t('common.failed')], top: 0 },
    grid: { left: 50, right: 20, bottom: 30, top: 40 },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => d.date.slice(5)),  // MM-DD format
      boundaryGap: false,
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: t('common.total'),
        type: 'line',
        data: trendData.map((d) => d.total),
        smooth: true,
        lineStyle: { width: 2, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(22,119,255,0.25)' },
            { offset: 1, color: 'rgba(22,119,255,0.02)' },
          ]}},
      },
      {
        name: t('common.passed'),
        type: 'line',
        data: trendData.map((d) => d.passed),
        smooth: true,
        lineStyle: { width: 2, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: t('common.failed'),
        type: 'line',
        data: trendData.map((d) => d.failed),
        smooth: true,
        lineStyle: { width: 2, color: '#ff4d4f' },
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  } : null, [trendData, t]);

  /* Failed TOP10 horizontal bar chart */
  const failedTop10Option = useMemo(() => failedTop10.length > 0 ? {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>${t('common.failed')}: ${p.value}`;
      },
    },
    grid: { left: 200, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1, name: t('common.failed') },
    yAxis: {
      type: 'category',
      data: failedTop10.map((d) => d.title.length > 30 ? d.title.slice(0, 30) + '...' : d.title),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: failedTop10.map((d) => ({
        value: d.fail_count,
        itemStyle: { color: d.fail_count >= 5 ? '#ff4d4f' : '#faad14' },
      })),
      barMaxWidth: 24,
    }],
  } : null, [failedTop10, t]);

  /* Execution status distribution pie chart */
  const statusPieOption = useMemo(() => execSummary ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: execSummary.passed, name: t('common.passed'), itemStyle: { color: '#52c41a' } },
        { value: execSummary.failed, name: t('common.failed'), itemStyle: { color: '#ff4d4f' } },
        { value: execSummary.blocked, name: t('common.blocked'), itemStyle: { color: '#faad14' } },
        { value: execSummary.untested, name: t('common.untested'), itemStyle: { color: '#d9d9d9' } },
      ],
    }],
  } : null, [execSummary, t]);

  /* Defect distribution pie chart */
  const defectPieOption = useMemo(() => defectDist ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: defectDist.high, name: t('common.priorityLabel', { value: t('common.high') }), itemStyle: { color: '#ff4d4f' } },
        { value: defectDist.medium, name: t('common.priorityLabel', { value: t('common.medium') }), itemStyle: { color: '#faad14' } },
        { value: defectDist.low, name: t('common.priorityLabel', { value: t('common.low') }), itemStyle: { color: '#52c41a' } },
      ],
    }],
  } : null, [defectDist, t]);

  /* AI efficiency comparison bar chart */
  const aiEfficiencyOption = useMemo(() => aiEfficiency.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['AI', 'Manual'], top: 0 },
    grid: { left: 60, right: 20, bottom: 50, top: 40 },
    xAxis: {
      type: 'category',
      data: aiEfficiency.map((d) => d.period),
      axisLabel: { rotate: 45, fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'AI',
        type: 'bar',
        data: aiEfficiency.map((d) => d.ai_generated),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
      {
        name: 'Manual',
        type: 'bar',
        data: aiEfficiency.map((d) => d.manual),
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  } : null, [aiEfficiency, t]);

  /* Team workload horizontal bar chart */
  const workloadOption = useMemo(() => teamWorkload.length > 0 ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1, name: t('testManagement.execution.title') },
    yAxis: {
      type: 'category',
      data: teamWorkload.map((d) => d.username),
      axisLabel: { fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: teamWorkload.map((d) => ({
        value: d.case_count,
        itemStyle: { color: d.case_count >= 10 ? '#722ed1' : '#1677ff' },
      })),
      barMaxWidth: 24,
    }],
  } : null, [teamWorkload, t]);

  return (
    <div>
      {/* Project selection */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('common.selectProject')}
          style={{ width: 300 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch filterOption
        />
      </div>

      {/* Stats cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.caseCount')} value={stats.total_cases} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.suiteCount')} value={stats.total_suites} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.planCount')} value={stats.total_plans} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.plan.executionRounds')} value={stats.total_runs} prefix={<RiseOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.report.todayExecutions')} value={stats.today_executions} prefix={<RiseOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('testManagement.report.pendingReviews')} value={stats.my_pending_reviews} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Row 1: Pass rate + Resource distribution + Review summary */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card title={t('testManagement.report.passRate')} size="small">
              {passRateOption && <ReactEChartsCore option={passRateOption} style={{ height: 200 }} />}
            </Card>
          </Col>
          <Col span={8}>
            <Card title={t('testManagement.report.resourceDistribution')} size="small">
              {execPieOption && <ReactEChartsCore option={execPieOption} style={{ height: 200 }} />}
            </Card>
          </Col>
          <Col span={8}>
            <Card title={t('testManagement.report.reviewSummary')} size="small">
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Statistic
                  title={t('testManagement.report.totalReviews')}
                  value={stats.total_reviews}
                  valueStyle={{ fontSize: 36, color: '#722ed1' }}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag color={stats.my_pending_reviews > 0 ? 'warning' : 'success'}>
                  {t('testManagement.report.pendingMyReview', { count: stats.my_pending_reviews })}
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Row 2: Execution trend + Status distribution */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title={t('testManagement.report.executionTrend14d')} size="small">
            {trendOption ? (
              <ReactEChartsCore option={trendOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
        <Col span={10}>
          <Card title={t('testManagement.report.statusDistribution')} size="small">
            {statusPieOption ? (
              <ReactEChartsCore option={statusPieOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Failed TOP10 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title={t('testManagement.report.failedTop10')} size="small">
            {failedTop10Option ? (
              <ReactEChartsCore option={failedTop10Option} style={{ height: 320 }} />
            ) : (
              <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 4: Defect distribution + Team workload */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Card title={t('testManagement.report.defectDistribution')} size="small">
            {defectPieOption && Object.values(defectDist || {}).some(v => v > 0) ? (
              <ReactEChartsCore option={defectPieOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
        <Col span={14}>
          <Card title={t('testManagement.report.teamWorkload')} size="small">
            {workloadOption ? (
              <ReactEChartsCore option={workloadOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 5: AI efficiency comparison */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title={t('testManagement.report.aiEfficiency12m')} size="small">
            {aiEfficiencyOption ? (
              <ReactEChartsCore option={aiEfficiencyOption} style={{ height: 300 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                {t('common.noData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Report list */}
      <Tabs
        items={[
          {
            key: 'reports',
            label: t('testManagement.reports'),
            children: (
              <Table
                rowKey="id" loading={loading} dataSource={reports}
                pagination={false} size="small"
                columns={[
                  { title: t('common.name'), dataIndex: 'name' },
                  { title: t('common.type'), dataIndex: 'report_type', width: 100 },
                  { title: t('common.createdAt'), dataIndex: 'created_at', width: 180 },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
