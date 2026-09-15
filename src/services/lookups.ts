import { api } from '../lib/axios'
import type { Major, PaginatedResponse, Study, Subject } from '../lib/types'

export async function getStudies() {
  const { data } = await api.get<PaginatedResponse<Study>>('/api/studies', {
    params: { page: 1, perPage: 100 },
  })
  return data
}

export async function getMajors(studiesId?: number) {
  const { data } = await api.get<PaginatedResponse<Major>>('/api/majors', {
    params: { studiesId, page: 1, perPage: 100 },
  })
  return data
}

export async function getSubjects(majorId: number) {
  const { data } = await api.get<PaginatedResponse<Subject>>('/api/subjects', {
    params: { majorId, page: 1, perPage: 100 },
  })
  return data
}
