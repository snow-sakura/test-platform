'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tree, Input, Dropdown, message, Modal, Button, Space, Spin } from 'antd';
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { createCollection, deleteCollection, getCollectionTree, updateCollection } from '@/lib/api/api-testing';
import type { ApiCollectionTreeNode } from '@/lib/api/api-testing';

interface Props {
  projectId: number | null;
  onSelectCollection?: (collectionId: number) => void;
  onSelectRequest?: (requestId: number) => void;
  onRefresh?: () => void;
}

/** API collection tree component */
export default function CollectionTree({ projectId, onSelectCollection, onSelectRequest, onRefresh }: Props) {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);
  const [creating, setCreating] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: number; name: string } | null>(null);

  const loadTree = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getCollectionTree(projectId);
      setTreeData(buildTreeNodes(res.data));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  /** Convert flat tree structure to Ant Design Tree DataNode */
  const buildTreeNodes = (nodes: ApiCollectionTreeNode[]): DataNode[] => {
    return nodes.map((node) => ({
      key: `collection-${node.id}`,
      title: (
        <span>
          {node.name}
          <span style={{ color: '#999', fontSize: 12, marginLeft: 6 }}>({node.request_count})</span>
        </span>
      ),
      icon: (expandedKeys.includes(`collection-${node.id}`) ? <FolderOpenOutlined /> : <FolderOutlined />),
      isLeaf: node.children.length === 0,
      children: buildTreeNodes(node.children || []),
      data: node,
    }));
  };

  /** Create collection */
  const handleCreate = async (parentId?: number) => {
    if (!projectId) return;
    const name = prompt(t('collection.namePrompt'));
    if (!name) return;

    try {
      await createCollection({ project_id: projectId, name, parent_id: parentId || null });
      message.success(t('collection.createSuccess'));
      loadTree();
      onRefresh?.();
    } catch {
      message.error(t('collection.createFailed'));
    }
  };

  /** Delete collection */
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: t('collection.deleteConfirm'),
      content: t('collection.deleteWarning'),
      onOk: async () => {
        try {
          await deleteCollection(id);
          message.success(t('collection.deleted'));
          loadTree();
          onRefresh?.();
        } catch {
          message.error(t('collection.deleteFailed'));
        }
      },
    });
  };

  /** Rename collection */
  const handleRename = async (id: number, name: string) => {
    try {
      await updateCollection(id, { name });
      message.success(t('collection.renameSuccess'));
      setRenameModal(null);
      loadTree();
    } catch {
      message.error(t('collection.renameFailed'));
    }
  };

  const handleSelect = (keys: React.Key[], info: { node: EventDataNode<DataNode> }) => {
    const key = keys[0] as string;
    setSelectedKey(key);

    if (key?.startsWith('collection-')) {
      onSelectCollection?.(parseInt(key.replace('collection-', '')));
    } else if (key?.startsWith('request-')) {
      onSelectRequest?.(parseInt(key.replace('request-', '')));
    }
  };

  /** Context menu */
  const menuItems = (nodeType: string, nodeId: number) => {
    const items = [];
    if (nodeType === 'collection') {
      items.push(
        { key: 'add', icon: <PlusOutlined />, label: t('collection.createSub'), onClick: () => handleCreate(nodeId) },
        { key: 'rename', icon: <EditOutlined />, label: t('collection.rename'), onClick: () => {
          const node = findNode(treeData, `collection-${nodeId}`);
          const nodeData = (node as any)?.data;
          setRenameModal({ id: nodeId, name: nodeData?.name || '' });
        }},
        { type: 'divider' as const },
        { key: 'delete', icon: <DeleteOutlined />, label: tc('delete'), danger: true, onClick: () => handleDelete(nodeId) },
      );
    }
    return items;
  };

  const findNode = (nodes: DataNode[], key: string): DataNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const found = findNode(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  /** Tree node title render (with context menu) */
  const titleRender = (node: DataNode) => {
    const key = node.key as string;
    const nodeType = key?.startsWith('collection-') ? 'collection' : 'request';
    const nodeId = parseInt(key?.replace(/^(collection|request)-/, '') || '0');

    return (
      <Dropdown menu={{ items: menuItems(nodeType, nodeId) }} trigger={['contextMenu']}>
        <span>{node.title as React.ReactNode}</span>
      </Dropdown>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>{t('collection.title')}</strong>
        {projectId && (
          <Button type="link" icon={<PlusOutlined />} size="small" onClick={() => handleCreate()}>
            {t('collection.create')}
          </Button>
        )}
      </div>

      <Spin spinning={loading}>
        <Tree
          treeData={treeData}
          showIcon
          defaultExpandAll
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          onSelect={handleSelect}
          titleRender={titleRender}
          selectedKeys={selectedKey ? [selectedKey] : []}
          style={{ fontSize: 13 }}
        />
      </Spin>

      {!projectId && (
        <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>{t('collection.selectProjectFirst')}</div>
      )}

      {renameModal && (
        <Modal
          title={t('collection.rename')}
          open
          onOk={() => handleRename(renameModal.id, renameModal.name)}
          onCancel={() => setRenameModal(null)}
        >
          <Input
            value={renameModal.name}
            onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
          />
        </Modal>
      )}
    </div>
  );
}
