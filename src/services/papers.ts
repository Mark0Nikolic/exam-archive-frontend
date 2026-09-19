import { api, ApiError } from '../lib/axios'
import type {
  PaginatedResponse,
  Paper,
  PaperDetail,
  PaperPdf,
  PaperQuery,
  PaperQuestion,
  PaperQuestions,
  UpdatePaperMetadataInput,
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
  const { data } = await api.get<PaperQuestions | PaperQuestion[]>(`/api/papers/${id}/questions`)
  if (Array.isArray(data)) return data
  return data.questions ?? []
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
