'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button, Table, Tag, Modal, Form, Input, Select, Space, message, Popconfirm, Checkbox,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getTestPoints, createTestPoint, updateTestPoint, deleteTestPoint,
  extractTestPoints,
} from '@/lib/api/test';
import type { TestPoint } from '@/lib/api/test';

const priorityColors: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
};

const categoryColors: Record<string, string> = {
  '功能': 'blue',
  'UI': 'purple',
  '性能': 'cyan',
  '安全': 'volcano',
  '兼容性': 'geekblue',
};

interface Props {
  projectId: number;
  documentIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export default function TestPoints({ projectId, documentIds, onSelectionChange }: Props) {
  const t = useTranslations();
  const [testPoints, setTestPoints] = useState<TestPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TestPoint | null>(null);
  const [form] = Form.useForm();
  const [generateLoading, setGenerateLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getTestPoints(projectId)
      .then((res) => setTestPoints(res.data?.results ?? []))
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

  const handleEdit = (record: TestPoint) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateTestPoint(editRecord.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createTestPoint(projectId, values);
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
      await deleteTestPoint(id);
      message.success(t('common.deleteSuccess'));
      fetchData();
    } catch {
      message.error(t('common.deleteFailed'));
    }
  };

  const handleVerify = async (record: TestPoint) => {
    try {
      await updateTestPoint(record.id, { is_verified: true });
      message.success('已确认');
      fetchData();
    } catch {
      message.error('确认失败');
    }
  };

  const handleExtract = async () => {
    if (!documentIds || documentIds.length === 0) {
      message.warning('请先在文档管理页面上传文档');
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await extractTestPoints(projectId, documentIds);
      message.success(`提取任务已提交（批次 ID: ${res.data.batch_id}）`);
    } catch {
      // 错误已由拦截器处理
    } finally {
      setGenerateLoading(false);
    }
  };

  const columns: ColumnsType<TestPoint> = [
    {
      title: t('common.detail'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: t('project.description'),
      dataIndex: 'description',
      key: 'description',
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
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string | null) => c ? <Tag color={categoryColors[c] || 'default'}>{c}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'is_verified',
      key: 'is_verified',
      width: 100,
      render: (v: boolean) => v
        ? <Tag color="success">已确认</Tag>
        : <Tag color="warning">待确认</Tag>,
    },
    {
      title: t('common.action'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          {!record.is_verified && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record)}>
              确认
            </Button>
          )}
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
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleExtract}
            loading={generateLoading}
          >
            AI 提取测试点
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={testPoints}
        loading={loading}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => {
            setSelectedIds(keys as number[]);
            onSelectionChange?.(keys as number[]);
          },
        }}
      />

      <Modal
        title={editRecord ? '编辑测试点' : '新建测试点'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
            <Select>
              <Select.Option value="HIGH">HIGH</Select.Option>
              <Select.Option value="MEDIUM">MEDIUM</Select.Option>
              <Select.Option value="LOW">LOW</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select allowClear>
              <Select.Option value="功能">功能</Select.Option>
              <Select.Option value="UI">UI</Select.Option>
              <Select.Option value="性能">性能</Select.Option>
              <Select.Option value="安全">安全</Select.Option>
              <Select.Option value="兼容性">兼容性</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
