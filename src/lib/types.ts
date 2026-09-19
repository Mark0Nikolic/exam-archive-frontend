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
  nameEn: string | null
  yearsOfStudy: number
}

export interface Major {
  id: number
  nameSr: string
  nameEn: string | null
  studiesId: number
}

export interface Subject {
  id: number
  code: string | null
  nameSr: string
  nameEn: string | null
  yearOfStudy: number
}

export interface SubjectPlacement {
  majorId: number
  majorNameSr: string
  majorNameEn: string | null
  studiesId: number
  studiesNameSr: string
  studiesNameEn: string | null
  yearOfStudy: number
}

export interface CatalogueSubject {
  id: number
  code: string | null
  nameSr: string
  nameEn: string | null
  placements: SubjectPlacement[]
}

export interface SaveStudyInput {
  nameSr: string
  nameEn: string | null
  yearsOfStudy: number
}

export interface SaveMajorInput {
  nameSr: string
  nameEn: string | null
  studiesId: number
}

export interface CreateSubjectInput {
  nameSr: string
  nameEn: string | null
  code: string | null
  majorId: number
  yearOfStudy: number
}

export interface UpdateSubjectInput {
  nameSr: string
  nameEn: string | null
  code: string | null
  majorId?: number
  yearOfStudy?: number
}

export const EXAM_TYPES = ['Midterm', 'Final', 'Resit'] as const
export type ExamType = (typeof EXAM_TYPES)[number]

export const PAPER_STATUSES = ['Pending', 'Rejected', 'Approved'] as const
export type PaperStatus = (typeof PAPER_STATUSES)[number]

export const PARSE_STATUSES = ['NotQueued', 'Queued', 'Parsed', 'Skipped', 'Failed'] as const
export type ParseStatus = (typeof PARSE_STATUSES)[number]

export interface Paper {
  id: number
  subjectId: number
  subjectNameSr: string
  subjectNameEn: string | null
  examType: ExamType
  month: number
  year: number
  pageCount: number
  uploadedAt: string
  status: PaperStatus
  reviewedAt: string | null
  rejectionReason: string | null
  isOwnedByCurrentUser?: boolean
  parseStatus?: ParseStatus
  questionCount?: number
}

export interface PaperFile {
  pageNumber: number
  contentType: string
  sizeBytes: number
}

export interface PaperDetail extends Paper {
  files: Partial<Record<'pdf' | 'jpg' | 'png' | 'webp' | 'docx', PaperFile[]>>
  parseError?: string | null
}

export interface PaperQuestion {
  ordinal?: number
  label: string
  text: string
}

export interface PaperQuestions {
  parseStatus: ParseStatus
  parseError?: string | null
  questions: PaperQuestion[]
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
  parseStatus?: ParseStatus
  questionCount?: number
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

export interface UpdatePaperMetadataInput {
  id: number
  subjectId: number
  examType: ExamType
  month: number
  year: number
}

export interface PaperPdf {
  blob: Blob
  fileName: string
}

export type ValidationErrors = Record<string, string[]>
