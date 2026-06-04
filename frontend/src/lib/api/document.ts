import request from '../request';

export interface Document {
  id: number;
  project_id: number;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

export interface DocumentDetail extends Document {
  content: string | null;
}

/** 上传文档 */
export function uploadDocument(projectId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<Document>(`/api/projects/${projectId}/documents/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 获取项目下的文档列表 */
export function getDocuments(projectId: number) {
  return request.get<Document[]>(`/api/projects/${projectId}/documents`);
}

/** 获取文档详情（含解析内容） */
export function getDocument(projectId: number, docId: number) {
  return request.get<DocumentDetail>(`/api/projects/${projectId}/documents/${docId}`);
}

/** 删除文档 */
export function deleteDocument(projectId: number, docId: number) {
  return request.delete(`/api/projects/${projectId}/documents/${docId}`);
}
