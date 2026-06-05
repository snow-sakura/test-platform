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

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function getKnowledgeBases() {
  return request.get<PaginatedResponse<KnowledgeBase>>('/api/knowledge-bases');
}

export function createKnowledgeBase(data: { name: string; description?: string }) {
  return request.post<KnowledgeBase>('/api/knowledge-bases', data);
}

export function updateKnowledgeBase(id: number, data: { name?: string; description?: string }) {
  return request.put<KnowledgeBase>(`/api/knowledge-bases/${id}`, data);
}

export function deleteKnowledgeBase(id: number) {
  return request.delete<void>(`/api/knowledge-bases/${id}`);
}

export function uploadKnowledgeDocument(kbId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ message: string; chunk_count: number; document: KnowledgeDocument }>(`/api/knowledge-bases/${kbId}/documents/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getKnowledgeDocuments(kbId: number) {
  return request.get<PaginatedResponse<KnowledgeDocument>>(`/api/knowledge-bases/${kbId}/documents`);
}
