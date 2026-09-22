import { api, ApiError } from '../lib/axios'
import type {
  MergePaperQuestionsInput,
  PaginatedResponse,
  Paper,
  PaperDetail,
  PaperPdf,
  PaperQuery,
  PaperQuestions,
  UpdatePaperMetadataInput,
  UpdatePaperQuestionInput,
  UploadedPaper,
  UploadPaperInput,
} from '../lib/types'

export const paperKeys = {
  all: ['papers'] as const,
  list: (query: PaperQuery) => [...paperKeys.all, 'list', query] as const,
  detail: (id: number) => [...paperKeys.all, 'detail', id] as const,
  preview: (id: number) => [...paperKeys.all, 'preview', id] as const,
  questions: (id: number) => [...paperKeys.all, 'questions', id] as const,
}

export function isUnavailablePdf(error: unknown) {
  return error instanceof ApiError && error.status === 409
}

export async function getPapers(query: PaperQuery) {
  const { data } = await api.get<PaginatedResponse<Paper>>('/api/papers', { params: query })
  return data
}

export async function countPapersForMajor(majorId: number) {
  const counts: Record<number, number> = {}
  let page = 1
  let totalPages = 1
  do {
    const result = await getPapers({ page, perPage: 100, majorId })
    for (const paper of result.data) {
      counts[paper.subjectId] = (counts[paper.subjectId] ?? 0) + 1
    }
    totalPages = result.meta.totalPages
    page += 1
  } while (page <= totalPages && page <= 50)
  return counts
}

export async function countPapersForSubjects(subjectIds: number[]) {
  const counts: Record<number, number> = {}
  const ids = [...new Set(subjectIds)]
  for (let index = 0; index < ids.length; index += 8) {
    const slice = ids.slice(index, index + 8)
    const pages = await Promise.all(slice.map((subjectId) => getPapers({ page: 1, perPage: 1, subjectId })))
    slice.forEach((subjectId, sliceIndex) => {
      counts[subjectId] = pages[sliceIndex]?.meta.totalItems ?? 0
    })
  }
  return counts
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

function fileNameFromDisposition(disposition: string | undefined, fallback: string) {
  if (!disposition) return fallback

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^["']|["']$/g, ''))
    } catch {
      return encoded
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback
}

async function getPaperPdf(id: number, action: 'preview' | 'download'): Promise<PaperPdf> {
  const accept = action === 'preview'
    ? 'application/pdf'
    : 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*'
  const fallback = action === 'preview' ? `exam-paper-${id}.pdf` : `exam-paper-${id}`

  try {
    const response = await api.get<Blob>(`/api/papers/${id}/${action}`, {
      responseType: 'blob',
      headers: { Accept: accept },
    })

    return {
      blob: response.data,
      fileName: fileNameFromDisposition(response.headers['content-disposition'], fallback),
    }
  } catch (error) {
    if (action === 'download' && isUnavailablePdf(error)) {
      const response = await api.get<Blob>(`/api/papers/${id}/download`, {
        responseType: 'blob',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*',
        },
      })

      return {
        blob: response.data,
        fileName: fileNameFromDisposition(
          response.headers['content-disposition'],
          `exam-paper-${id}.docx`,
        ),
      }
    }

    throw error
  }
}

export async function getPaperQuestions(id: number) {
  const { data } = await api.get<PaperQuestions>(`/api/papers/${id}/questions`)
  return data
}

export async function updatePaperQuestion({ id, ordinal, ...input }: UpdatePaperQuestionInput) {
  const { data } = await api.patch<PaperQuestions>(`/api/papers/${id}/questions/${ordinal}`, input)
  return data
}

export async function deletePaperQuestion({ id, ordinal }: { id: number; ordinal: number }) {
  const { data } = await api.delete<PaperQuestions>(`/api/papers/${id}/questions/${ordinal}`)
  return data
}

export async function mergePaperQuestions({ id, ordinals }: MergePaperQuestionsInput) {
  const { data } = await api.post<PaperQuestions>(`/api/papers/${id}/questions/merge`, { ordinals })
  return data
}

export async function reparsePaper(id: number) {
  const { data } = await api.post<PaperDetail>(`/api/papers/${id}/reparse`)
  return data
}

export function previewPaper(id: number) {
  return getPaperPdf(id, 'preview')
}

export function downloadPaper(id: number) {
  return getPaperPdf(id, 'download')
}

export async function updatePaperMetadata({ id, ...input }: UpdatePaperMetadataInput) {
  const { data } = await api.patch<PaperDetail>(`/api/papers/${id}`, input)
  return data
}

export async function deletePaper(id: number) {
  await api.delete(`/api/papers/${id}`)
}
