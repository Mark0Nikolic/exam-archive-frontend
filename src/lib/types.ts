export const USER_ROLES = {
  SuperAdmin: 1,
  Admin: 2,
  Moderator: 3,
  User: 4,
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export interface CurrentUser {
  id: number
  username: string
  role: UserRole
}

export interface PageMeta {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PageMeta
}

export interface Study {
  id: number
  nameSr: string
  nameEn: string
}

export interface Major {
  id: number
  nameSr: string
  nameEn: string
  studiesId: number
}

export interface Subject {
  id: number
  code: string
  nameSr: string
  nameEn: string
  yearOfStudy: number
}

export const EXAM_TYPES = ['Midterm', 'Final', 'Resit'] as const
export type ExamType = (typeof EXAM_TYPES)[number]

export const PAPER_STATUSES = ['Pending', 'Approved', 'Rejected'] as const
export type PaperStatus = (typeof PAPER_STATUSES)[number]

export interface Paper {
  id: number
  subjectId: number
  subjectNameSr: string
  subjectNameEn: string
  examType: ExamType
  month: number
  year: number
  pageCount: number
  uploadedAt: string
  status: PaperStatus
  reviewedAt: string | null
  rejectionReason: string | null
}

export interface PaperFile {
  pageNumber: number
  contentType: string
  sizeBytes: number
}

export interface PaperDetail extends Paper {
  files: Partial<Record<'pdf' | 'jpg' | 'png' | 'webp', PaperFile[]>>
}

export interface UploadedPaper {
  id: number
  subjectId: number
  examType: ExamType
  month: number
  year: number
  uploadedAt: string
  status: PaperStatus
  files: PaperFile[]
  claimToken: string | null
}

export interface PaperQuery {
  page: number
  perPage: number
  subjectId?: number
  studiesId?: number
  majorId?: number
  yearOfStudy?: number
  examType?: ExamType
  month?: number
  year?: number
  status?: PaperStatus
}

export interface UploadPaperInput {
  files: File[]
  subjectId: number
  examType: ExamType
  month: number
  year: number
}

export type ValidationErrors = Record<string, string[]>
