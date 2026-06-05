'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button, Table, Tag, Modal, Form, Input, Select, Space, message, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ExportOutlined, EyeOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getTestCases, createTestCase, updateTestCase, deleteTestCase,
  generateTestCases, exportTestCasesExcel,
} from '@/lib/api/test';
import type { TestCase } from '@/lib/api/test';

const priorityColors: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
};

interface Props {
  projectId: number;
  selectedTestPointIds?: number[];
}

export default function TestCases({ projectId, selectedTestPointIds }: Props) {
  const t = useTranslations();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<TestCase | null>(null);
  const [editRecord, setEditRecord] = useState<TestCase | null>(null);
  const [form] = Form.useForm();
  const [generateLoading, setGenerateLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getTestCases(projectId)
      .then((res) => setTestCases(res.data?.results ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreate = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: TestCase) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateTestCase(editRecord.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createTestCase(projectId, values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单验证失败
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTestCase(id);
      message.success(t('common.deleteSuccess'));
      fetchData();
    } catch {
      message.error(t('common.deleteFailed'));
    }
  };

  const handleViewDetail = (record: TestCase) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedTestPointIds || selectedTestPointIds.length === 0) {
      message.warning('请先在测试点页选择需要生成用例的测试点');
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await generateTestCases(projectId, selectedTestPointIds);
      message.success(`生成任务已提交（批次 ID: ${res.data.batch_id}）`);
    } catch {
      // 错误已由拦截器处理
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportTestCasesExcel(projectId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_cases_${projectId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<TestCase> = [
    {
      title: '用例编号',
      dataIndex: 'case_number',
      key: 'case_number',
      width: 150,
    },
    {
      title: '用例标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '前置条件',
      dataIndex: 'precondition',
      key: 'precondition',
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (p: string) => (
        <Tag color={priorityColors[p] || 'default'}>{p}</Tag>
      ),
    },
    {
      title: '用例类型',
      dataIndex: 'case_type',
      key: 'case_type',
      width: 120,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('common.action'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            {t('common.detail')}
          </Button>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small">{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('common.create')}
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出 Excel
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={testCases}
        loading={loading}
        pagination={false}
      />

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editRecord ? '编辑测试用例' : '新建测试用例'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="test_point_id" label="关联测试点 ID" rules={[{ required: true, message: '请输入测试点 ID' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="precondition" label="前置条件">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
            <Select>
              <Select.Option value="HIGH">HIGH</Select.Option>
              <Select.Option value="MEDIUM">MEDIUM</Select.Option>
              <Select.Option value="LOW">LOW</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="case_type" label="用例类型">
            <Select allowClear>
              <Select.Option value="功能">功能</Select.Option>
              <Select.Option value="性能">性能</Select.Option>
              <Select.Option value="安全">安全</Select.Option>
              <Select.Option value="兼容性">兼容性</Select.Option>
              <Select.Option value="UI">UI</Select.Option>
            </Select>
          </Form.Item>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>测试步骤</strong>
                  <Button type="link" icon={<PlusOutlined />} onClick={() => add({ step: '', expected_result: '' })}>
                    添加步骤
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'step']} rules={[{ required: true, message: '请输入步骤描述' }]}>
                      <Input.TextArea rows={2} placeholder="步骤描述" style={{ width: 280 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'expected_result']} rules={[{ required: true, message: '请输入预期结果' }]}>
                      <Input.TextArea rows={2} placeholder="预期结果" style={{ width: 280 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
              </div>
            )}
          </Form.List>
          <Form.Item name="expected_result" label="总体预期结果">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={`用例详情: ${detailRecord?.case_number || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detailRecord && (
          <div>
            <p><strong>标题：</strong>{detailRecord.title}</p>
            <p><strong>前置条件：</strong>{detailRecord.precondition || '-'}</p>
            <p><strong>优先级：</strong>{detailRecord.priority}</p>
            <p><strong>类型：</strong>{detailRecord.case_type || '-'}</p>
            <p><strong>预期结果：</strong>{detailRecord.expected_result || '-'}</p>
            {detailRecord.steps && detailRecord.steps.length > 0 && (
              <div>
                <strong>测试步骤：</strong>
                {detailRecord.steps.map((step: any, idx: number) => (
                  <div key={idx} style={{
                    margin: '8px 0', padding: 8, background: '#fafafa',
                    borderRadius: 4, border: '1px solid #f0f0f0',
                  }}>
                    <p style={{ margin: 0 }}><strong>步骤 {idx + 1}:</strong> {step.step}</p>
                    <p style={{ margin: '4px 0 0', color: '#52c41a' }}>
                      <strong>预期:</strong> {step.expected_result}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
