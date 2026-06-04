'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tree, Input, Dropdown, message, Modal, Button, Space, Spin } from 'antd';
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined,
} from '@ant-design/icons';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { createCollection, deleteCollection, getCollectionTree, updateCollection } from '@/lib/api/api-testing';
import type { ApiCollectionTreeNode } from '@/lib/api/api-testing';

interface Props {
  projectId: number | null;
  onSelectCollection?: (collectionId: number) => void;
  onSelectRequest?: (requestId: number) => void;
  onRefresh?: () => void;
}

/** 接口集合树组件 */
export default function CollectionTree({ projectId, onSelectCollection, onSelectRequest, onRefresh }: Props) {
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

  /** 将扁平树结构转为 Ant Design Tree DataNode */
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

  /** 创建集合 */
  const handleCreate = async (parentId?: number) => {
    if (!projectId) return;
    const name = prompt('请输入集合名称：');
    if (!name) return;

    try {
      await createCollection({ project_id: projectId, name, parent_id: parentId || null });
      message.success('集合创建成功');
      loadTree();
      onRefresh?.();
    } catch {
      message.error('创建失败');
    }
  };

  /** 删除集合 */
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确定删除此集合？',
      content: '删除集合将同时删除其下所有子集和请求，不可恢复。',
      onOk: async () => {
        try {
          await deleteCollection(id);
          message.success('集合已删除');
          loadTree();
          onRefresh?.();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  /** 重命名集合 */
  const handleRename = async (id: number, name: string) => {
    try {
      await updateCollection(id, { name });
      message.success('重命名成功');
      setRenameModal(null);
      loadTree();
    } catch {
      message.error('重命名失败');
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

  /** 右键菜单 */
  const menuItems = (nodeType: string, nodeId: number) => {
    const items = [];
    if (nodeType === 'collection') {
      items.push(
        { key: 'add', icon: <PlusOutlined />, label: '新建子集合', onClick: () => handleCreate(nodeId) },
        { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => {
          const node = findNode(treeData, `collection-${nodeId}`);
          setRenameModal({ id: nodeId, name: node?.title?.toString() || '' });
        }},
        { type: 'divider' as const },
        { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => handleDelete(nodeId) },
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

  /** 树节点标题渲染（带右键菜单） */
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
        <strong style={{ fontSize: 13 }}>接口集合</strong>
        {projectId && (
          <Button type="link" icon={<PlusOutlined />} size="small" onClick={() => handleCreate()}>
            新建集合
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
        <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>请先选择项目</div>
      )}

      {renameModal && (
        <Modal
          title="重命名集合"
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
