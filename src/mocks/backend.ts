import { ApiError } from '../lib/axios'
import { isStaff } from '../lib/utils'
import type {
  CurrentUser,
  Major,
  PaginatedResponse,
  Paper,
  PaperDetail,
  PaperFile,
  PaperQuery,
  Study,
  Subject,
  UploadedPaper,
  UploadPaperInput,
} from '../lib/types'
import type { MockPaperDetail } from './data'
import { mockMajors, mockPapers, mockStudies, mockSubjects, mockUsers } from './data'

const delay = (milliseconds = 120) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const clone = <T>(value: T): T => structuredClone(value)

let currentUser: CurrentUser | null = null
let papers: MockPaperDetail[] = clone(mockPapers)

function page<T>(items: T[], pageNumber: number, perPage: number): PaginatedResponse<T> {
  const safePage = Math.max(1, pageNumber)
  const safePerPage = Math.max(1, perPage)
  const totalItems = items.length

  return {
    data: items.slice((safePage - 1) * safePerPage, safePage * safePerPage),
    meta: {
      page: safePage,
      perPage: safePerPage,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / safePerPage)),
    },
  }
}

function findPaper(id: number) {
  const paper = papers.find((item) => item.id === id)
  if (!paper) throw new ApiError(404, 'Paper not found', `Paper #${id} does not exist.`)
  return paper
}

function isPaperVisible(paper: MockPaperDetail) {
  return (
    paper.status === 'Approved' ||
    paper.uploadedByUserId === currentUser?.id ||
    isStaff(currentUser?.role)
  )
}

function withoutFiles({ files: _files, uploadedByUserId, ...paper }: MockPaperDetail): Paper {
  return { ...paper, isOwnedByCurrentUser: uploadedByUserId === currentUser?.id }
}

function publicPaperDetail({ uploadedByUserId, ...paper }: MockPaperDetail): PaperDetail {
  return { ...paper, isOwnedByCurrentUser: uploadedByUserId === currentUser?.id }
}

function publicUser(user: (typeof mockUsers)[number]): CurrentUser {
  return { id: user.id, username: user.username, role: user.role }
}

export async function mockLogin(input: { username: string; password: string }) {
  await delay()
  const user = mockUsers.find(
    (candidate) =>
      candidate.username.toLowerCase() === input.username.toLowerCase() &&
      candidate.password === input.password,
  )

  if (!user) {
    throw new ApiError(401, 'Sign in failed', 'The mock username or password is incorrect.', {
      Username: ['Use one of the demo accounts shown below.'],
    })
  }

  currentUser = publicUser(user)
  return clone(currentUser)
}

export async function mockGetCurrentUser() {
  await delay(50)
  if (!currentUser) throw new ApiError(401, 'Not signed in', 'Choose a mock account to continue.')
  return clone(currentUser)
}

export async function mockLogout() {
  await delay(50)
  currentUser = null
}

export async function mockGetStudies() {
  await delay()
  return page<Study>(clone(mockStudies), 1, 100)
}

export async function mockGetMajors(studiesId?: number) {
  await delay()
  const majors = studiesId
    ? mockMajors.filter((major) => major.studiesId === studiesId)
    : mockMajors
  return page<Major>(clone(majors), 1, 100)
}

export async function mockGetSubjects(majorId: number) {
  await delay()
  const subjects: Subject[] = mockSubjects
    .filter((subject) => subject.majorId === majorId)
    .map(({ majorId: _majorId, ...subject }) => subject)
  return page<Subject>(clone(subjects), 1, 100)
}

export async function mockGetPapers(query: PaperQuery) {
  await delay()
  const filtered = papers
    .filter((paper) => {
      const subject = mockSubjects.find((item) => item.id === paper.subjectId)
      const major = subject ? mockMajors.find((item) => item.id === subject.majorId) : undefined

      return (
        isPaperVisible(paper) &&
        (!query.status || paper.status === query.status) &&
        (!query.subjectId || paper.subjectId === query.subjectId) &&
        (!query.majorId || subject?.majorId === query.majorId) &&
        (!query.studiesId || major?.studiesId === query.studiesId) &&
        (!query.yearOfStudy || subject?.yearOfStudy === query.yearOfStudy) &&
        (!query.examType || paper.examType === query.examType) &&
        (!query.month || paper.month === query.month) &&
        (!query.year || paper.year === query.year)
      )
    })
    .sort((left, right) => {
      const statusDifference = ['Pending', 'Rejected', 'Approved'].indexOf(left.status) -
        ['Pending', 'Rejected', 'Approved'].indexOf(right.status)
      if (statusDifference !== 0) return statusDifference
      if (left.status === 'Pending') {
        return new Date(left.uploadedAt).getTime() - new Date(right.uploadedAt).getTime()
      }
      return (
        right.year - left.year ||
        right.month - left.month ||
        new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
      )
    })
    .map(withoutFiles)

  return page<Paper>(clone(filtered), query.page, query.perPage)
}

export async function mockGetPaper(id: number) {
  await delay()
  const paper = findPaper(id)
  if (!isPaperVisible(paper)) {
    throw new ApiError(403, 'Paper unavailable', 'You do not have permission to view this paper.')
  }
  return clone(publicPaperDetail(paper))
}

function fileContentType(file: File) {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return 'image/jpeg'
}

function fileGroup(contentType: string): keyof PaperDetail['files'] {
  if (contentType === 'application/pdf') return 'pdf'
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

export async function mockUploadPaper(input: UploadPaperInput) {
  await delay(250)
  if (!currentUser) {
    throw new ApiError(401, 'Not signed in', 'Sign in before uploading a paper.')
  }
  const subject = mockSubjects.find((item) => item.id === input.subjectId)
  if (!subject) {
    throw new ApiError(400, 'Invalid paper', 'Choose a valid subject.', {
      SubjectId: ['The selected subject does not exist.'],
    })
  }

  const files: PaperFile[] = input.files.map((file, index) => ({
    pageNumber: index + 1,
    contentType: fileContentType(file),
    sizeBytes: file.size,
  }))
  const groupedFiles: PaperDetail['files'] = {}
  files.forEach((file) => {
    const group = fileGroup(file.contentType)
    groupedFiles[group] = [...(groupedFiles[group] ?? []), file]
  })

  const id = Math.max(0, ...papers.map((paper) => paper.id)) + 1
  const uploadedAt = new Date().toISOString()
  const paper: MockPaperDetail = {
    id,
    subjectId: subject.id,
    subjectNameSr: subject.nameSr,
    subjectNameEn: subject.nameEn,
    examType: input.examType,
    month: input.month,
    year: input.year,
    pageCount: files.length,
    uploadedAt,
    status: 'Pending',
    reviewedAt: null,
    rejectionReason: null,
    uploadedByUserId: currentUser.id,
    files: groupedFiles,
  }
  papers = [paper, ...papers]

  const result: UploadedPaper = {
    id,
    subjectId: paper.subjectId,
    examType: paper.examType,
    month: paper.month,
    year: paper.year,
    uploadedAt,
    status: paper.status,
    files,
    claimToken: null,
  }
  return clone(result)
}

export async function mockApprovePaper(id: number) {
  await delay()
  const paper = findPaper(id)
  paper.status = 'Approved'
  paper.reviewedAt = new Date().toISOString()
  paper.rejectionReason = null
  return clone(publicPaperDetail(paper))
}

export async function mockRejectPaper(input: { id: number; reason: string }) {
  await delay()
  const paper = findPaper(input.id)
  paper.status = 'Rejected'
  paper.reviewedAt = new Date().toISOString()
  paper.rejectionReason = input.reason
  return clone(publicPaperDetail(paper))
}
