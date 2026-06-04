'use client';

import { useCallback, useEffect, useState } from 'react';
import { Select, message, Button, Modal, Input, Row, Col, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getApiProjects, getRequests, createRequest, deleteRequest } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';
import CollectionTree from '@/components/api-testing/CollectionTree';
import RequestEditor from '@/components/api-testing/RequestEditor';

/** 接口管理核心页面：左集合树 + 右请求编辑器 + 响应区域 */
export default function InterfacesPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRequestName, setNewRequestName] = useState('');

  // 加载项目列表
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results);
      if (res.data.results.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data.results[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleCreateRequest = async () => {
    if (!selectedCollectionId || !newRequestName) {
      message.warning('请先选择集合并输入请求名称');
      return;
    }
    try {
      await createRequest({
        collection_id: selectedCollectionId,
        name: newRequestName,
        method: 'GET',
        url: '',
      });
      message.success('请求创建成功');
      setCreateModalOpen(false);
      setNewRequestName('');
    } catch {
      message.error('创建失败');
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
              placeholder="选择 API 项目"
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
            title={selectedRequestId ? '请求编辑器' : '请从左侧选择一个请求'}
            extra={
              selectedCollectionId ? (
                <Button type="link" icon={<PlusOutlined />} size="small" onClick={() => setCreateModalOpen(true)}>
                  新建请求
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
        title="新建请求"
        open={createModalOpen}
        onOk={handleCreateRequest}
        onCancel={() => { setCreateModalOpen(false); setNewRequestName(''); }}
      >
        <Input
          value={newRequestName}
          onChange={(e) => setNewRequestName(e.target.value)}
          placeholder="请输入请求名称"
        />
      </Modal>
    </div>
  );
}
