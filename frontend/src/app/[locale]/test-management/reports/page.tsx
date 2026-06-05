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

export default function ReportsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  // 新图表数据
  const [trendData, setTrendData] = useState<{ date: string; total: number; passed: number; failed: number }[]>([]);
  const [failedTop10, setFailedTop10] = useState<{ case_id: number; title: string; fail_count: number }[]>([]);
  const [execSummary, setExecSummary] = useState<{ total: number; passed: number; failed: number; blocked: number; untested: number } | null>(null);
  const [defectDist, setDefectDist] = useState<DefectDistribution | null>(null);
  const [aiEfficiency, setAiEfficiency] = useState<AiEfficiencyItem[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadItem[]>([]);

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [projectId]);

  /* 通过率仪表盘 ECharts 配置（useMemo 缓存避免每次渲染重建） */
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

  /* 执行概况饼图 */
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
          { value: stats.total_cases, name: '测试用例', itemStyle: { color: '#1677ff' } },
          { value: stats.total_suites, name: '测试套件', itemStyle: { color: '#52c41a' } },
          { value: stats.total_plans, name: '测试计划', itemStyle: { color: '#faad14' } },
          { value: stats.total_runs, name: '执行轮次', itemStyle: { color: '#722ed1' } },
        ],
      },
    ],
  } : null, [stats]);

  /* 执行趋势折线图 */
  const trendOption = useMemo(() => trendData.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['总执行', '通过', '失败'], top: 0 },
    grid: { left: 50, right: 20, bottom: 30, top: 40 },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => d.date.slice(5)),  // MM-DD 格式
      boundaryGap: false,
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '总执行',
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
        name: '通过',
        type: 'line',
        data: trendData.map((d) => d.passed),
        smooth: true,
        lineStyle: { width: 2, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '失败',
        type: 'line',
        data: trendData.map((d) => d.failed),
        smooth: true,
        lineStyle: { width: 2, color: '#ff4d4f' },
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  } : null, [trendData]);

  /* 失败 TOP10 横向柱状图 */
  const failedTop10Option = useMemo(() => failedTop10.length > 0 ? {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>失败次数: ${p.value}`;
      },
    },
    grid: { left: 200, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1, name: '失败次数' },
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
  } : null, [failedTop10]);

  /* 执行状态分布饼图 */
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
        { value: execSummary.passed, name: '通过', itemStyle: { color: '#52c41a' } },
        { value: execSummary.failed, name: '失败', itemStyle: { color: '#ff4d4f' } },
        { value: execSummary.blocked, name: '阻塞', itemStyle: { color: '#faad14' } },
        { value: execSummary.untested, name: '未测', itemStyle: { color: '#d9d9d9' } },
      ],
    }],
  } : null, [execSummary]);

  /* 缺陷分布饼图 */
  const defectPieOption = useMemo(() => defectDist ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: defectDist.high, name: '高优先级', itemStyle: { color: '#ff4d4f' } },
        { value: defectDist.medium, name: '中优先级', itemStyle: { color: '#faad14' } },
        { value: defectDist.low, name: '低优先级', itemStyle: { color: '#52c41a' } },
      ],
    }],
  } : null, [defectDist]);

  /* AI 效能对比柱状图 */
  const aiEfficiencyOption = useMemo(() => aiEfficiency.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['AI 生成', '人工创建'], top: 0 },
    grid: { left: 60, right: 20, bottom: 50, top: 40 },
    xAxis: {
      type: 'category',
      data: aiEfficiency.map((d) => d.period),
      axisLabel: { rotate: 45, fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'AI 生成',
        type: 'bar',
        data: aiEfficiency.map((d) => d.ai_generated),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
      {
        name: '人工创建',
        type: 'bar',
        data: aiEfficiency.map((d) => d.manual),
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  } : null, [aiEfficiency]);

  /* 团队工作量横向柱状图 */
  const workloadOption = useMemo(() => teamWorkload.length > 0 ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1, name: '执行用例数' },
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
  } : null, [teamWorkload]);

  return (
    <div>
      {/* 项目选择 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="请选择项目"
          style={{ width: 300 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch filterOption
        />
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="测试用例" value={stats.total_cases} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="测试套件" value={stats.total_suites} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="测试计划" value={stats.total_plans} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="执行轮次" value={stats.total_runs} prefix={<RiseOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="今日执行" value={stats.today_executions} prefix={<RiseOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="待审评审" value={stats.my_pending_reviews} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 第一行 ECharts 图表：通过率 + 资源分布 + 评审概要 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card title="通过率" size="small">
              {passRateOption && <ReactEChartsCore option={passRateOption} style={{ height: 200 }} />}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="资源分布" size="small">
              {execPieOption && <ReactEChartsCore option={execPieOption} style={{ height: 200 }} />}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="评审概要" size="small">
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Statistic
                  title="评审总数"
                  value={stats.total_reviews}
                  valueStyle={{ fontSize: 36, color: '#722ed1' }}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag color={stats.my_pending_reviews > 0 ? 'warning' : 'success'}>
                    待我评审: {stats.my_pending_reviews}
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 第二行 ECharts 图表：执行趋势 + 执行状态分布 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="执行趋势（近 14 天）" size="small">
            {trendOption ? (
              <ReactEChartsCore option={trendOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无执行数据
              </div>
            )}
          </Card>
        </Col>
        <Col span={10}>
          <Card title="执行状态分布" size="small">
            {statusPieOption ? (
              <ReactEChartsCore option={statusPieOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无执行数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 第三行：失败 TOP10 横向柱状图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="失败次数最多的 TOP10 用例" size="small">
            {failedTop10Option ? (
              <ReactEChartsCore option={failedTop10Option} style={{ height: 320 }} />
            ) : (
              <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无失败数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 第四行：缺陷分布饼图 + 团队工作量 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Card title="缺陷分布（按优先级）" size="small">
            {defectPieOption && Object.values(defectDist || {}).some(v => v > 0) ? (
              <ReactEChartsCore option={defectPieOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无缺陷数据
              </div>
            )}
          </Card>
        </Col>
        <Col span={14}>
          <Card title="团队工作量" size="small">
            {workloadOption ? (
              <ReactEChartsCore option={workloadOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无执行数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 第五行：AI 效能对比 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="AI 生成 vs 人工创建效能对比（近 12 月）" size="small">
            {aiEfficiencyOption ? (
              <ReactEChartsCore option={aiEfficiencyOption} style={{ height: 300 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无生成数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 报告列表 */}
      <Tabs
        items={[
          {
            key: 'reports',
            label: '报告列表',
            children: (
              <Table
                rowKey="id" loading={loading} dataSource={reports}
                pagination={false} size="small"
                columns={[
                  { title: '报告名称', dataIndex: 'name' },
                  { title: '类型', dataIndex: 'report_type', width: 100 },
                  { title: '创建时间', dataIndex: 'created_at', width: 180 },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
