import { api } from '../lib/axios'
import type {
  CatalogueSubject,
  CreateSubjectInput,
  Major,
  PaginatedResponse,
  SaveMajorInput,
  SaveStudyInput,
  Study,
  Subject,
  UpdateSubjectInput,
} from '../lib/types'

export const catalogueKeys = {
  all: ['lookups'] as const,
  studies: ['lookups', 'studies'] as const,
  majors: (studiesId?: number) => ['lookups', 'majors', studiesId] as const,
  subjects: (majorId: number) => ['lookups', 'subjects', majorId] as const,
  subjectCatalogue: (search: string, page: number) =>
    ['lookups', 'subject-catalogue', search, page] as const,
}

export async function getCatalogueSubjects(search = '', page = 1) {
  const { data } = await api.get<PaginatedResponse<CatalogueSubject>>('/api/subjects/catalogue', {
    params: { search: search.trim() || undefined, page, perPage: 20 },
  })
  return data
}

export async function createStudy(input: SaveStudyInput) {
  const { data } = await api.post<Study>('/api/studies', input)
  return data
}

export async function updateStudy(input: SaveStudyInput & { id: number }) {
  const { id, ...body } = input
  const { data } = await api.put<Study>(`/api/studies/${id}`, body)
  return data
}

export async function deleteStudy(id: number) {
  await api.delete(`/api/studies/${id}`)
}

export async function createMajor(input: SaveMajorInput) {
  const { data } = await api.post<Major>('/api/majors', input)
  return data
}

export async function updateMajor(input: SaveMajorInput & { id: number }) {
  const { id, ...body } = input
  const { data } = await api.put<Major>(`/api/majors/${id}`, body)
  return data
}

export async function deleteMajor(id: number) {
  await api.delete(`/api/majors/${id}`)
}

export async function createSubject(input: CreateSubjectInput) {
  const { data } = await api.post<Subject>('/api/subjects', input)
  return data
}

export async function updateSubject(input: UpdateSubjectInput & { id: number }) {
  const { id, ...body } = input
  const { data } = await api.put<Subject>(`/api/subjects/${id}`, body)
  return data
}

export async function deleteSubject(id: number) {
  await api.delete(`/api/subjects/${id}`)
}

export async function attachSubject(input: {
  majorId: number
  subjectId: number
  yearOfStudy: number
}) {
  const { majorId, ...body } = input
  const { data } = await api.post<Subject>(`/api/majors/${majorId}/subjects`, body)
  return data
}

export async function detachSubject(input: { majorId: number; subjectId: number }) {
  await api.delete(`/api/majors/${input.majorId}/subjects/${input.subjectId}`)
}
