'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button, Table, Tag, Upload, Modal, message, Space, Popconfirm, Alert,
} from 'antd';
import { UploadOutlined, EyeOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  getDocuments, deleteDocument, getDocument, uploadDocument,
} from '@/lib/api/document';
import type { Document } from '@/lib/api/document';
import type { ColumnsType } from 'antd/es/table';

const { Dragger } = Upload;

const fileTypeColors: Record<string, string> = {
  pdf: 'red',
  docx: 'blue',
  md: 'green',
  yaml: 'orange',
  csv: 'purple',
};

interface Props {
  projectId: number;
  onDocumentsChange?: (documentIds: number[]) => void;
}

export default function Documents({ projectId, onDocumentsChange }: Props) {
  const t = useTranslations();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchDocuments = () => {
    setLoading(true);
    getDocuments(projectId)
      .then((res) => {
        setDocuments(res.data ?? []);
        onDocumentsChange?.(res.data?.map((d) => d.id) ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const handleView = async (doc: Document) => {
    try {
      const res = await getDocument(projectId, doc.id);
      setPreviewTitle(doc.filename);
      setPreviewContent(res.data.content || t('common.noData'));
      setPreviewOpen(true);
    } catch {
      message.error(t('common.loadFailed'));
    }
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDocument(projectId, doc.id);
      message.success(t('common.deleteSuccess'));
      fetchDocuments();
    } catch {
      message.error(t('common.deleteFailed'));
    }
  };

  const uploadProps: UploadProps = {
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        await uploadDocument(projectId, file as File);
        onSuccess?.(null);
        message.success(t('common.uploadSuccess'));
        fetchDocuments();
      } catch (err: any) {
        onError?.(err);
      }
    },
    showUploadList: false,
    accept: '.pdf,.docx,.md,.markdown,.yaml,.yml,.csv',
  };

  const columns: ColumnsType<Document> = [
    {
      title: t('project.fileName'),
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: t('project.fileType'),
      dataIndex: 'file_type',
      key: 'file_type',
      width: 100,
      render: (type: string) => (
        <Tag color={fileTypeColors[type] || 'default'}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: t('project.uploadedAt'),
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      width: 180,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            {t('common.view')}
          </Button>
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t('project.uploadDragHint')}</p>
          <p className="ant-upload-hint">{t('project.uploadFormats')}</p>
        </Dragger>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={documents}
        loading={loading}
        pagination={false}
      />

      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={700}
      >
        <div style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
          {previewContent}
        </div>
      </Modal>
    </div>
  );
}
