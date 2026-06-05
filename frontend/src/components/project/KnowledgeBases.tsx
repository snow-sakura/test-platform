'use client';

import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Upload, Tag, Space, message, Empty, Popconfirm,
} from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase,
  uploadKnowledgeDocument, getKnowledgeDocuments,
} from '@/lib/api/knowledgeBase';
import type { KnowledgeBase, KnowledgeDocument } from '@/lib/api/knowledgeBase';

interface Props {}

export default function KnowledgeBases(_props: Props) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedKbId, setExpandedKbId] = useState<number | null>(null);
  const [kbDocs, setKbDocs] = useState<Record<number, KnowledgeDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<Record<number, boolean>>({});
  const [form] = Form.useForm();

  const fetchKbs = () => {
    setLoading(true);
    getKnowledgeBases()
      .then((res) => setKbs(res.data?.results ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchKbs(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createKnowledgeBase(values);
      message.success('知识库创建成功');
      setCreateOpen(false);
      form.resetFields();
      fetchKbs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteKnowledgeBase(id);
      message.success('知识库已删除');
      if (expandedKbId === id) setExpandedKbId(null);
      fetchKbs();
    } catch {
      message.error('删除失败');
    }
  };

  const handleExpand = (kbId: number) => {
    if (expandedKbId === kbId) {
      setExpandedKbId(null);
      return;
    }
    setExpandedKbId(kbId);
    if (!kbDocs[kbId]) {
      setDocsLoading((prev) => ({ ...prev, [kbId]: true }));
      getKnowledgeDocuments(kbId)
        .then((res) => setKbDocs((prev) => ({ ...prev, [kbId]: res.data?.results ?? [] })))
        .finally(() => setDocsLoading((prev) => ({ ...prev, [kbId]: false })));
    }
  };

  const handleUpload = async (kbId: number, file: File) => {
    try {
      await uploadKnowledgeDocument(kbId, file);
      message.success('文档上传成功');
      const res = await getKnowledgeDocuments(kbId);
      setKbDocs((prev) => ({ ...prev, [kbId]: res.data?.results ?? [] }));
    } catch {
      message.error('上传失败');
    }
    return false; // prevent default upload
  };

  const docColumns: ColumnsType<KnowledgeDocument> = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    {
      title: '类型', dataIndex: 'file_type', key: 'file_type', width: 100,
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    { title: '分块数', dataIndex: 'chunk_count', key: 'chunk_count', width: 80 },
    { title: '上传时间', dataIndex: 'uploaded_at', key: 'uploaded_at', width: 180 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建知识库
        </Button>
      </div>

      {kbs.length === 0 && !loading ? (
        <Empty description="暂无知识库，点击上方按钮创建" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kbs.map((kb) => (
            <Card
              key={kb.id}
              size="small"
              title={
                <Space>
                  <FileTextOutlined />
                  <span>{kb.name}</span>
                </Space>
              }
              extra={
                <Space>
                  <Popconfirm title="确定删除此知识库？" onConfirm={() => handleDelete(kb.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <p style={{ color: '#666', marginBottom: 12 }}>{kb.description || '暂无描述'}</p>
              <Button
                size="small"
                type="link"
                onClick={() => handleExpand(kb.id)}
              >
                {expandedKbId === kb.id ? '收起文档' : '查看文档'}
              </Button>

              {expandedKbId === kb.id && (
                <div style={{ marginTop: 12 }}>
                  <Upload
                    accept=".pdf,.docx,.md,.yaml,.yml,.csv"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUpload(kb.id, file);
                      return false;
                    }}
                  >
                    <Button size="small" icon={<UploadOutlined />} style={{ marginBottom: 12 }}>
                      上传文档
                    </Button>
                  </Upload>
                  <Table
                    rowKey="id"
                    columns={docColumns}
                    dataSource={kbDocs[kb.id] || []}
                    loading={docsLoading[kb.id]}
                    size="small"
                    pagination={false}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="新建知识库"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入知识库名称' }]}>
            <Input placeholder="例如：项目需求文档库" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
