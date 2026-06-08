'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Card, message, Spin, Table, Space, Modal, Select, Tag,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSuite, updateSuite, getCases } from '@/lib/api/test-management';
import type { TestSuite, TestCaseListItem } from '@/lib/api/test-management';

export default function SuiteDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const suiteId = Number(params.id);
  const [suite, setSuite] = useState<(TestSuite & { cases: TestCaseListItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState<TestCaseListItem[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);

  const loadSuite = () => {
    setLoading(true);
    getSuite(suiteId).then((res) => setSuite(res.data)).catch(() => {
      message.error(t('testManagement.suiteDetail.loadFailed'));
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadSuite(); }, [suiteId]);

  const handleRemoveCase = async (caseId: number) => {
    if (!suite) return;
    const newIds = suite.cases.filter((c) => c.id !== caseId).map((c) => c.id);
    try {
      await updateSuite(suiteId, { case_ids: newIds });
      message.success(t('common.deleted'));
      loadSuite();
    } catch { message.error(t('common.operationFailed')); }
  };

  const openAddModal = async () => {
    if (!suite) return;
    setCaseModalOpen(true);
    try {
      const res = await getCases({ project_id: suite.project_id, page_size: 200 });
      setAvailableCases(res.data.results || []);
      const existingIds = new Set(suite.cases.map((c) => c.id));
      setSelectedCaseIds([]);
      setAvailableCases((prev) => prev.filter((c) => !existingIds.has(c.id)));
    } catch { message.error(t('testManagement.suiteDetail.loadCasesFailed')); }
  };

  const handleAddCases = async () => {
    if (!suite || !selectedCaseIds.length) return;
    const allIds = [...suite.cases.map((c) => c.id), ...selectedCaseIds];
    try {
      await updateSuite(suiteId, { case_ids: allIds });
      message.success(t('testManagement.suiteDetail.addSuccess'));
      setCaseModalOpen(false);
      loadSuite();
    } catch { message.error(t('testManagement.suiteDetail.addFailed')); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!suite) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('testManagement.suiteDetail.back')}
      </Button>

      <Card
        title={suite.name}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>{t('testManagement.suiteDetail.addCases')}</Button>}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>{suite.description || t('testManagement.suiteDetail.noDescription')}</p>

        <Table
          rowKey="id" dataSource={suite.cases || []} pagination={false} size="small"
          locale={{ emptyText: t('testManagement.suiteDetail.noCases') }}
          columns={[
            { title: t('testManagement.suiteDetail.titleLabel'), dataIndex: 'title', ellipsis: true },
            { title: t('testManagement.suiteDetail.priority'), dataIndex: 'priority', width: 80,
              render: (v: string) => {
                const map: Record<string, { color: string; label: string }> = {
                  HIGH: { color: 'red', label: t('testManagement.case.high') },
                  MEDIUM: { color: 'orange', label: t('testManagement.case.medium') },
                  LOW: { color: 'blue', label: t('testManagement.case.low') },
                };
                return <Tag color={map[v]?.color}>{map[v]?.label || v}</Tag>;
              },
            },
            { title: t('testManagement.suiteDetail.status'), dataIndex: 'status', width: 80,
              render: (v: string) => {
                const map: Record<string, string> = {
                  draft: t('testManagement.case.draft'),
                  pending_review: t('testManagement.case.pendingReview'),
                  approved: t('testManagement.case.approved'),
                  rejected: t('testManagement.case.rejected'),
                };
                return map[v] || v;
              },
            },
            { title: t('testManagement.suiteDetail.type'), dataIndex: 'case_type', width: 80 },
            {
              title: t('common.action'), width: 80,
              render: (_, record) => (
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleRemoveCase(record.id)}
                >{t('testManagement.suiteDetail.remove')}</Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal title={t('testManagement.suiteDetail.addCases')} open={caseModalOpen} onOk={handleAddCases} onCancel={() => setCaseModalOpen(false)} width={700}>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder={t('testManagement.suiteDetail.searchCases')}
          value={selectedCaseIds}
          onChange={setSelectedCaseIds}
          showSearch
          filterOption={(input, option) => (option?.label as string || '').includes(input)}
          options={availableCases.map((c) => ({
            label: `${c.title} (${c.priority})`,
            value: c.id,
          }))}
        />
      </Modal>
    </div>
  );
}
