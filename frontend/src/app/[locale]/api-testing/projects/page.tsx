'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getApiProjects, deleteApiProject } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';
import ApiProjectFormModal from '@/components/api-testing/ApiProjectFormModal';

/** API 项目管理页面 */
export default function ApiProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiProject | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getApiProjects({ page_size: 100 })
      .then((res) => setProjects(res.data.results))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      await deleteApiProject(id);
      message.success('API 项目已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<ApiProject> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => <Tag>{v || 'HTTP'}</Tag>,
    },
    { title: '接口数', dataIndex: 'request_count', key: 'request_count', width: 80 },
    { title: '集合数', dataIndex: 'collection_count', key: 'collection_count', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'success' : 'default'}>{v === 'active' ? '启用' : '归档'}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditRecord(record); setModalOpen(true); }}>
            编辑
          </Button>
          <Popconfirm title="确定删除此项目？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); setModalOpen(true); }}>
          新建 API 项目
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        pagination={false}
      />

      <ApiProjectFormModal
        open={modalOpen}
        editRecord={editRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
