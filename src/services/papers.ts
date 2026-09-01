import { api } from '../lib/axios'
import { useMockData } from '../lib/config'
import type {
  PaginatedResponse,
  Paper,
  PaperDetail,
  PaperQuery,
  UploadedPaper,
  UploadPaperInput,
} from '../lib/types'
import {
  mockApprovePaper,
  mockGetPaper,
  mockGetPapers,
  mockRejectPaper,
  mockUploadPaper,
} from '../mocks/backend'

export const paperKeys = {
  all: ['papers'] as const,
  list: (query: PaperQuery) => [...paperKeys.all, 'list', query] as const,
  detail: (id: number) => [...paperKeys.all, 'detail', id] as const,
}

export async function getPapers(query: PaperQuery) {
  if (useMockData) return mockGetPapers(query)
  const { data } = await api.get<PaginatedResponse<Paper>>('/api/papers', { params: query })
  return data
}

export async function getPaper(id: number) {
  if (useMockData) return mockGetPaper(id)
  const { data } = await api.get<PaperDetail>(`/api/papers/${id}`)
  return data
}

export async function uploadPaper(input: UploadPaperInput) {
  if (useMockData) return mockUploadPaper(input)
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
  if (useMockData) return mockApprovePaper(id)
  const { data } = await api.post<PaperDetail>(`/api/papers/${id}/approve`)
  return data
}

export async function rejectPaper(input: { id: number; reason: string }) {
  if (useMockData) return mockRejectPaper(input)
  const { data } = await api.post<PaperDetail>(`/api/papers/${input.id}/reject`, {
    reason: input.reason,
  })
  return data
}
