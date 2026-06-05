'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Card, message, Spin, Table, Space, Modal, Select, Tag,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSuite, updateSuite, getCases } from '@/lib/api/test-management';
import type { TestSuite, TestCaseListItem } from '@/lib/api/test-management';

export default function SuiteDetailPage() {
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
      message.error('加载失败');
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadSuite(); }, [suiteId]);

  const handleRemoveCase = async (caseId: number) => {
    if (!suite) return;
    const newIds = suite.cases.filter((c) => c.id !== caseId).map((c) => c.id);
    try {
      await updateSuite(suiteId, { case_ids: newIds });
      message.success('已移除');
      loadSuite();
    } catch { message.error('操作失败'); }
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
    } catch { message.error('加载用例列表失败'); }
  };

  const handleAddCases = async () => {
    if (!suite || !selectedCaseIds.length) return;
    const allIds = [...suite.cases.map((c) => c.id), ...selectedCaseIds];
    try {
      await updateSuite(suiteId, { case_ids: allIds });
      message.success('添加成功');
      setCaseModalOpen(false);
      loadSuite();
    } catch { message.error('添加失败'); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!suite) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回套件列表
      </Button>

      <Card
        title={suite.name}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>添加用例</Button>}
      >
        <p style={{ color: '#666', marginBottom: 16 }}>{suite.description || '暂无描述'}</p>

        <Table
          rowKey="id" dataSource={suite.cases} pagination={false} size="small"
          locale={{ emptyText: '暂无用例，点击上方"添加用例"按钮添加' }}
          columns={[
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '优先级', dataIndex: 'priority', width: 80,
              render: (v: string) => {
                const map: Record<string, { color: string; label: string }> = {
                  HIGH: { color: 'red', label: '高' },
                  MEDIUM: { color: 'orange', label: '中' },
                  LOW: { color: 'blue', label: '低' },
                };
                return <Tag color={map[v]?.color}>{map[v]?.label || v}</Tag>;
              },
            },
            { title: '状态', dataIndex: 'status', width: 80,
              render: (v: string) => {
                const map: Record<string, string> = { draft: '草稿', pending_review: '待评审', approved: '通过', rejected: '驳回' };
                return map[v] || v;
              },
            },
            { title: '类型', dataIndex: 'case_type', width: 80 },
            {
              title: '操作', width: 80,
              render: (_, record) => (
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleRemoveCase(record.id)}
                >移除</Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="添加用例" open={caseModalOpen} onOk={handleAddCases} onCancel={() => setCaseModalOpen(false)} width={700}>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="搜索并选择用例"
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
