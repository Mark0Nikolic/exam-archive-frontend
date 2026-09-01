import { api } from '../lib/axios'
import { useMockData } from '../lib/config'
import type { Major, PaginatedResponse, Study, Subject } from '../lib/types'
import { mockGetMajors, mockGetStudies, mockGetSubjects } from '../mocks/backend'

export async function getStudies() {
  if (useMockData) return mockGetStudies()
  const { data } = await api.get<PaginatedResponse<Study>>('/api/studies', {
    params: { page: 1, perPage: 100 },
  })
  return data
}

export async function getMajors(studiesId?: number) {
  if (useMockData) return mockGetMajors(studiesId)
  const { data } = await api.get<PaginatedResponse<Major>>('/api/majors', {
    params: { studiesId, page: 1, perPage: 100 },
  })
  return data
}

export async function getSubjects(majorId: number) {
  if (useMockData) return mockGetSubjects(majorId)
  const { data } = await api.get<PaginatedResponse<Subject>>('/api/subjects', {
    params: { majorId, page: 1, perPage: 100 },
  })
  return data
}
