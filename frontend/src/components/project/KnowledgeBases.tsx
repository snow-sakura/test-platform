'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
      message.success(t('project.kbCreateSuccess'));
      setCreateOpen(false);
      form.resetFields();
      fetchKbs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(t('common.createFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteKnowledgeBase(id);
      message.success(t('project.kbDeleted'));
      if (expandedKbId === id) setExpandedKbId(null);
      fetchKbs();
    } catch {
      message.error(t('common.deleteFailed'));
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
      message.success(t('common.uploadSuccess'));
      const res = await getKnowledgeDocuments(kbId);
      setKbDocs((prev) => ({ ...prev, [kbId]: res.data?.results ?? [] }));
    } catch {
      message.error(t('common.uploadFailed'));
    }
    return false;
  };

  const docColumns: ColumnsType<KnowledgeDocument> = [
    { title: t('project.fileName'), dataIndex: 'filename', key: 'filename' },
    {
      title: t('project.fileType'), dataIndex: 'file_type', key: 'file_type', width: 100,
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    { title: t('project.kbChunkCount'), dataIndex: 'chunk_count', key: 'chunk_count', width: 80 },
    { title: t('project.uploadedAt'), dataIndex: 'uploaded_at', key: 'uploaded_at', width: 180 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          {t('common.create')}
        </Button>
      </div>

      {kbs.length === 0 && !loading ? (
        <Empty description={t('project.kbNoData')} />
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
                  <Popconfirm title={t('project.kbDeleteConfirm')} onConfirm={() => handleDelete(kb.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <p style={{ color: '#666', marginBottom: 12 }}>{kb.description || t('common.noDescription')}</p>
              <Button
                size="small"
                type="link"
                onClick={() => handleExpand(kb.id)}
              >
                {expandedKbId === kb.id ? t('project.kbHideDocs') : t('project.kbViewDocs')}
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
                      {t('project.kbUploadDoc')}
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
        title={t('common.create')}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true, message: t('project.kbNameRequired') }]}>
            <Input placeholder={t('project.kbNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder={t('project.kbDescPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
