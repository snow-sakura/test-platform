'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Table, Tag, Space, message, Modal, Select, Input, Row, Col, Popconfirm, Upload,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getCases, deleteCase, batchDeleteCases, exportCasesExcel, importCasesExcel } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestCaseListItem } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';

export default function CaseListPage() {
  const t = useTranslations();
  const router = useRouter();

  const PRIORITY_MAP = useMemo(() => ({
    HIGH: { color: 'red', label: t('testManagement.case.high') },
    MEDIUM: { color: 'orange', label: t('testManagement.case.medium') },
    LOW: { color: 'blue', label: t('testManagement.case.low') },
  }), [t]);

  const STATUS_MAP = useMemo(() => ({
    draft: { color: 'default', label: t('testManagement.case.draft') },
    pending_review: { color: 'processing', label: t('testManagement.case.pendingReview') },
    approved: { color: 'success', label: t('testManagement.case.approved') },
    rejected: { color: 'error', label: t('testManagement.case.rejected') },
  }), [t]);
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [cases, setCases] = useState<TestCaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Load project list
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  // Load case list
  const loadCases = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getCases({
        project_id: projectId, page, page_size: 20,
        search: search || undefined,
        status: statusFilter,
        priority: priorityFilter,
      });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch {
      message.error(t('testManagement.case.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Delete single case
  const handleDelete = async (id: number) => {
    try {
      await deleteCase(id);
      message.success(t('testManagement.case.deleted'));
      loadCases();
    } catch {
      message.error(t('testManagement.case.deleteFailed'));
    }
  };

  // Export Excel
  const handleExport = async () => {
    if (!projectId) return;
    try {
      const res = await exportCasesExcel({
        project_id: projectId,
        status: statusFilter,
        priority: priorityFilter,
      });
      // Trigger browser download
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_cases_project_${projectId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success(t('testManagement.case.exportSuccess'));
    } catch {
      message.error(t('testManagement.case.exportFailed'));
    }
  };

  // Import Excel
  const handleImport = async (file: File) => {
    if (!projectId) return;
    try {
      const res = await importCasesExcel(projectId, file);
      const data = res.data;
      if (data.errors && data.errors.length > 0) {
        message.warning(t('testManagement.case.importCompleted', { count: data.created }));
        console.error('Import errors:', data.errors);
      } else {
        message.success(t('testManagement.case.importCompleted', { count: data.created }));
      }
      loadCases();
    } catch {
      message.error(t('testManagement.case.importFailed'));
    }
    return false; // Prevent Upload default behavior
  };

  // Batch delete
  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    Modal.confirm({
      title: `${t('common.confirmDeleteItem')}: ${selectedRowKeys.length} ${t('common.items')}`,
      onOk: async () => {
        try {
          await batchDeleteCases(selectedRowKeys as number[]);
          message.success(t('common.deleteSuccess'));
          setSelectedRowKeys([]);
          loadCases();
        } catch {
          message.error(t('common.operationFailed'));
        }
      },
    });
  };

  const columns: ColumnsType<TestCaseListItem> = [
    {
      title: t('testManagement.case.titleLabel'), dataIndex: 'title', key: 'title', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/cases/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: t('testManagement.case.priority'), dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => {
        const p = PRIORITY_MAP[v as keyof typeof PRIORITY_MAP] || { color: 'default', label: v };
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: t('testManagement.case.status'), dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const s = STATUS_MAP[v as keyof typeof STATUS_MAP] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    { title: t('testManagement.case.type'), dataIndex: 'case_type', key: 'case_type', width: 80 },
    { title: t('testManagement.case.steps'), dataIndex: 'step_count', key: 'step_count', width: 60 },
    { title: t('testManagement.case.comments'), dataIndex: 'comment_count', key: 'comment_count', width: 60 },
    {
      title: t('common.action'), key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => router.push(`/${locale}/test-management/cases/${record.id}`)}
          >
            {t('common.detail')}
          </Button>
          <Popconfirm title={t('testManagement.case.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col span={6}>
          <Select
            placeholder={t('common.selectProject')}
            style={{ width: '100%' }}
            value={projectId}
            onChange={(v) => { setProjectId(v); setPage(1); }}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            showSearch
            filterOption
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder={t('testManagement.case.status')}
            allowClear
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: t('testManagement.case.draft'), value: 'draft' },
              { label: t('testManagement.case.pendingReview'), value: 'pending_review' },
              { label: t('testManagement.case.approved'), value: 'approved' },
              { label: t('testManagement.case.rejected'), value: 'rejected' },
            ]}
          />
        </Col>
        <Col span={3}>
          <Select
            placeholder={t('testManagement.case.priority')}
            allowClear
            style={{ width: '100%' }}
            value={priorityFilter}
            onChange={(v) => { setPriorityFilter(v); setPage(1); }}
            options={[
              { label: t('testManagement.case.high'), value: 'HIGH' },
              { label: t('testManagement.case.medium'), value: 'MEDIUM' },
              { label: t('testManagement.case.low'), value: 'LOW' },
            ]}
          />
        </Col>
        <Col span={5}>
          <Input
            placeholder={t('common.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => setPage(1)}
            allowClear
            onClear={() => setPage(1)}
          />
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                {t('common.delete')} {selectedRowKeys.length} {t('common.items')}
              </Button>
            )}
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleImport}
              disabled={!projectId}
            >
              <Button icon={<UploadOutlined />} disabled={!projectId}>
                {t('common.import')} Excel
              </Button>
            </Upload>
            <Button icon={<DownloadOutlined />} disabled={!projectId} onClick={handleExport}>
              {t('common.export')} Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />}
              disabled={!projectId}
              onClick={() => router.push(`/${locale}/test-management/cases/create?project_id=${projectId}`)}
            >
              {t('testManagement.case.create')}
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={cases}
        loading={loading}
        pagination={{
          current: page, total, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (totalCount) => t('common.totalCount', { count: totalCount }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        size="small"
      />
    </div>
  );
}
