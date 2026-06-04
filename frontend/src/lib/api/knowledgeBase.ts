/** 知识库 API 封装 */
import request from '@/lib/request';

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  chroma_collection_name: string;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  knowledge_base_id: number;
  filename: string;
  file_type: string;
  chunk_count: number;
  uploaded_at: string;
}

export function getKnowledgeBases(): Promise<{ data: KnowledgeBase[] }> {
  return request.get('/api/knowledge-bases');
}

export function createKnowledgeBase(data: { name: string; description?: string }): Promise<{ data: KnowledgeBase }> {
  return request.post('/api/knowledge-bases', data);
}

export function updateKnowledgeBase(id: number, data: { name?: string; description?: string }): Promise<{ data: KnowledgeBase }> {
  return request.put(`/api/knowledge-bases/${id}`, data);
}

export function deleteKnowledgeBase(id: number): Promise<void> {
  return request.delete(`/api/knowledge-bases/${id}`);
}

export function uploadKnowledgeDocument(kbId: number, file: File): Promise<{ data: { message: string; chunk_count: number; document: KnowledgeDocument } }> {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(`/api/knowledge-bases/${kbId}/documents/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getKnowledgeDocuments(kbId: number): Promise<{ data: KnowledgeDocument[] }> {
  return request.get(`/api/knowledge-bases/${kbId}/documents`);
}
