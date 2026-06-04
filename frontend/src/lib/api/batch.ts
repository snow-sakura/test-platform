import request from '../request';

export interface TaskBatch {
  id: number;
  project_id: number;
  task_type: string;
  status: string;
  progress: number;
  total_count: number;
  completed_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** 获取所有任务批次 */
export function getBatches() {
  return request.get<TaskBatch[]>('/api/batches');
}

/** 获取项目下的任务批次 */
export function getProjectBatches(projectId: number) {
  return request.get<TaskBatch[]>(`/api/batches/project/${projectId}`);
}

/** 获取批次详情 */
export function getBatch(id: number) {
  return request.get<TaskBatch>(`/api/batches/${id}`);
}

/** 取消任务批次 */
export function cancelBatch(id: number) {
  return request.put<TaskBatch>(`/api/batches/${id}/cancel`);
}
