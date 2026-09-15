import { api } from '../lib/axios'
import type {
  PaginatedResponse,
  Paper,
  PaperDetail,
  PaperQuery,
  UploadedPaper,
  UploadPaperInput,
} from '../lib/types'

export const paperKeys = {
  all: ['papers'] as const,
  list: (query: PaperQuery) => [...paperKeys.all, 'list', query] as const,
  detail: (id: number) => [...paperKeys.all, 'detail', id] as const,
}

export async function getPapers(query: PaperQuery) {
  const { data } = await api.get<PaginatedResponse<Paper>>('/api/papers', { params: query })
  return data
}

export async function getPaper(id: number) {
  const { data } = await api.get<PaperDetail>(`/api/papers/${id}`)
  return data
}

export async function uploadPaper(input: UploadPaperInput) {
  const formData = new FormData()
  input.files.forEach((file) => formData.append('Files', file))
  formData.append('SubjectId', String(input.subjectId))
  formData.append('ExamType', input.examType)
  formData.append('Month', String(input.month))
  formData.append('Year', String(input.year))

  const { data } = await api.post<UploadedPaper>('/api/papers/upload', formData)
  return data
}

export async function approvePaper(id: number) {
  const { data } = await api.post<PaperDetail>(`/api/papers/${id}/approve`)
  return data
}

export async function rejectPaper(input: { id: number; reason?: string }) {
  const reason = input.reason?.trim() ?? ''
  const { data } = await api.post<PaperDetail>(`/api/papers/${input.id}/reject`, {
    reason: reason.length > 0 ? reason : null,
  })
  return data
}
