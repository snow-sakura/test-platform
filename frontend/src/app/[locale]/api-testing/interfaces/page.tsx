'use client';

import { useEffect, useState } from 'react';
import { Select, message, Button, Modal, Input, Row, Col, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { getApiProjects, createRequest } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';
import CollectionTree from '@/components/api-testing/CollectionTree';
import RequestEditor from '@/components/api-testing/RequestEditor';

/** Interface management core page: left collection tree + right request editor + response area */
export default function InterfacesPage() {
  const t = useTranslations('apiTesting');
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRequestName, setNewRequestName] = useState('');

  // Load project list
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results);
      if (res.data.results.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data.results[0].id);
      }
    }).catch((e) => console.warn(t('project.loadProjectsFailed'), e));
  }, []);

  const handleCreateRequest = async () => {
    if (!selectedCollectionId || !newRequestName) {
      message.warning(t('interface.nameRequired'));
      return;
    }
    try {
      await createRequest({
        collection_id: selectedCollectionId,
        name: newRequestName,
        method: 'GET',
        url: '',
      });
      message.success(t('interface.createSuccess'));
      setCreateModalOpen(false);
      setNewRequestName('');
    } catch {
      message.error(t('interface.createFailed'));
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" title={
            <Select
              value={selectedProjectId}
              onChange={(val) => {
                setSelectedProjectId(val);
                setSelectedCollectionId(null);
                setSelectedRequestId(null);
              }}
              style={{ width: '100%' }}
              placeholder={t('interface.selectProject')}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          }>
            <CollectionTree
              projectId={selectedProjectId}
              onSelectCollection={(id) => {
                setSelectedCollectionId(id);
                setSelectedRequestId(null);
              }}
              onSelectRequest={(id) => {
                setSelectedRequestId(id);
              }}
            />
          </Card>
        </Col>
        <Col span={18}>
          <Card size="small"
            title={selectedRequestId ? t('interface.editor') : t('interface.selectFromLeft')}
            extra={
              selectedCollectionId ? (
                <Button type="link" icon={<PlusOutlined />} size="small" onClick={() => setCreateModalOpen(true)}>
                  {t('interface.create')}
                </Button>
              ) : null
            }
          >
            <RequestEditor
              requestId={selectedRequestId}
              projectId={selectedProjectId || undefined}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={t('interface.create')}
        open={createModalOpen}
        onOk={handleCreateRequest}
        onCancel={() => { setCreateModalOpen(false); setNewRequestName(''); }}
      >
        <Input
          value={newRequestName}
          onChange={(e) => setNewRequestName(e.target.value)}
          placeholder={t('interface.name')}
        />
      </Modal>
    </div>
  );
}
