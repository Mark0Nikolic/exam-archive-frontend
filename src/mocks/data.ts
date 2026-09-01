import type { CurrentUser, Major, PaperDetail, Study, Subject } from '../lib/types'
import { USER_ROLES } from '../lib/types'

export interface MockUser extends CurrentUser {
  password: string
}

export interface MockSubject extends Subject {
  majorId: number
}

export const mockUsers: MockUser[] = [
  { id: 1, username: 'admin', password: 'demo123', role: USER_ROLES.Admin },
  { id: 2, username: 'moderator', password: 'demo123', role: USER_ROLES.Moderator },
  { id: 3, username: 'student', password: 'demo123', role: USER_ROLES.User },
]

export const mockStudies: Study[] = [
  { id: 1, nameSr: 'Osnovne akademske studije', nameEn: 'Undergraduate studies' },
  { id: 2, nameSr: 'Master akademske studije', nameEn: "Master's studies" },
]

export const mockMajors: Major[] = [
  { id: 1, studiesId: 1, nameSr: 'Softversko inženjerstvo', nameEn: 'Software Engineering' },
  { id: 2, studiesId: 1, nameSr: 'Računarske nauke', nameEn: 'Computer Science' },
  { id: 3, studiesId: 1, nameSr: 'Informacioni sistemi', nameEn: 'Information Systems' },
  { id: 4, studiesId: 2, nameSr: 'Nauka o podacima', nameEn: 'Data Science' },
]

export const mockSubjects: MockSubject[] = [
  { id: 101, majorId: 1, code: 'SE101', nameSr: 'Uvod u programiranje', nameEn: 'Introduction to Programming', yearOfStudy: 1 },
  { id: 102, majorId: 1, code: 'SE102', nameSr: 'Diskretna matematika', nameEn: 'Discrete Mathematics', yearOfStudy: 1 },
  { id: 103, majorId: 1, code: 'SE201', nameSr: 'Objektno programiranje', nameEn: 'Object-Oriented Programming', yearOfStudy: 2 },
  { id: 104, majorId: 1, code: 'SE202', nameSr: 'Baze podataka', nameEn: 'Databases', yearOfStudy: 2 },
  { id: 105, majorId: 1, code: 'SE301', nameSr: 'Softverske arhitekture', nameEn: 'Software Architecture', yearOfStudy: 3 },
  { id: 106, majorId: 1, code: 'SE302', nameSr: 'Testiranje softvera', nameEn: 'Software Testing', yearOfStudy: 3 },
  { id: 201, majorId: 2, code: 'CS101', nameSr: 'Algoritmi i strukture podataka', nameEn: 'Algorithms and Data Structures', yearOfStudy: 1 },
  { id: 202, majorId: 2, code: 'CS201', nameSr: 'Operativni sistemi', nameEn: 'Operating Systems', yearOfStudy: 2 },
  { id: 203, majorId: 2, code: 'CS301', nameSr: 'Računarske mreže', nameEn: 'Computer Networks', yearOfStudy: 3 },
  { id: 204, majorId: 2, code: 'CS302', nameSr: 'Veštačka inteligencija', nameEn: 'Artificial Intelligence', yearOfStudy: 3 },
  { id: 301, majorId: 3, code: 'IS101', nameSr: 'Poslovni informacioni sistemi', nameEn: 'Business Information Systems', yearOfStudy: 1 },
  { id: 302, majorId: 3, code: 'IS201', nameSr: 'Veb tehnologije', nameEn: 'Web Technologies', yearOfStudy: 2 },
  { id: 303, majorId: 3, code: 'IS301', nameSr: 'Upravljanje projektima', nameEn: 'Project Management', yearOfStudy: 3 },
  { id: 401, majorId: 4, code: 'DS501', nameSr: 'Mašinsko učenje', nameEn: 'Machine Learning', yearOfStudy: 1 },
  { id: 402, majorId: 4, code: 'DS502', nameSr: 'Vizuelizacija podataka', nameEn: 'Data Visualization', yearOfStudy: 1 },
  { id: 403, majorId: 4, code: 'DS503', nameSr: 'Obrada velikih podataka', nameEn: 'Big Data Processing', yearOfStudy: 1 },
]

const currentYear = new Date().getFullYear()
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

type PaperSeed = {
  subjectId: number
  examType: PaperDetail['examType']
  month: number
  yearOffset: number
  pageCount: number
  status: PaperDetail['status']
  uploadedDaysAgo: number
  rejectionReason?: string
  images?: boolean
}

const paperSeeds: PaperSeed[] = [
  { subjectId: 101, examType: 'Midterm', month: 4, yearOffset: 0, pageCount: 6, status: 'Approved', uploadedDaysAgo: 18 },
  { subjectId: 101, examType: 'Final', month: 6, yearOffset: -1, pageCount: 8, status: 'Approved', uploadedDaysAgo: 330 },
  { subjectId: 102, examType: 'Final', month: 1, yearOffset: 0, pageCount: 5, status: 'Approved', uploadedDaysAgo: 205, images: true },
  { subjectId: 103, examType: 'Midterm', month: 4, yearOffset: 0, pageCount: 7, status: 'Pending', uploadedDaysAgo: 8, images: true },
  { subjectId: 103, examType: 'Resit', month: 9, yearOffset: -1, pageCount: 6, status: 'Approved', uploadedDaysAgo: 280 },
  { subjectId: 104, examType: 'Final', month: 6, yearOffset: 0, pageCount: 9, status: 'Pending', uploadedDaysAgo: 6 },
  { subjectId: 104, examType: 'Final', month: 6, yearOffset: -2, pageCount: 8, status: 'Approved', uploadedDaysAgo: 690 },
  { subjectId: 105, examType: 'Midterm', month: 11, yearOffset: -1, pageCount: 4, status: 'Approved', uploadedDaysAgo: 265, images: true },
  { subjectId: 105, examType: 'Final', month: 1, yearOffset: 0, pageCount: 10, status: 'Rejected', uploadedDaysAgo: 12, rejectionReason: 'Several pages are too blurry to read.' },
  { subjectId: 106, examType: 'Final', month: 6, yearOffset: -1, pageCount: 12, status: 'Approved', uploadedDaysAgo: 350 },
  { subjectId: 201, examType: 'Midterm', month: 3, yearOffset: 0, pageCount: 6, status: 'Approved', uploadedDaysAgo: 32 },
  { subjectId: 201, examType: 'Final', month: 6, yearOffset: -1, pageCount: 7, status: 'Approved', uploadedDaysAgo: 335, images: true },
  { subjectId: 202, examType: 'Final', month: 1, yearOffset: 0, pageCount: 8, status: 'Pending', uploadedDaysAgo: 4 },
  { subjectId: 202, examType: 'Resit', month: 9, yearOffset: -2, pageCount: 5, status: 'Approved', uploadedDaysAgo: 710 },
  { subjectId: 203, examType: 'Midterm', month: 4, yearOffset: 0, pageCount: 6, status: 'Pending', uploadedDaysAgo: 2, images: true },
  { subjectId: 203, examType: 'Final', month: 6, yearOffset: -1, pageCount: 9, status: 'Approved', uploadedDaysAgo: 370 },
  { subjectId: 204, examType: 'Final', month: 1, yearOffset: 0, pageCount: 11, status: 'Approved', uploadedDaysAgo: 170 },
  { subjectId: 301, examType: 'Midterm', month: 4, yearOffset: 0, pageCount: 5, status: 'Approved', uploadedDaysAgo: 40 },
  { subjectId: 302, examType: 'Final', month: 6, yearOffset: -1, pageCount: 7, status: 'Approved', uploadedDaysAgo: 390, images: true },
  { subjectId: 303, examType: 'Final', month: 1, yearOffset: 0, pageCount: 8, status: 'Rejected', uploadedDaysAgo: 15, rejectionReason: 'This upload contains lecture notes rather than an exam paper.' },
  { subjectId: 401, examType: 'Midterm', month: 11, yearOffset: -1, pageCount: 6, status: 'Approved', uploadedDaysAgo: 250 },
  { subjectId: 401, examType: 'Final', month: 2, yearOffset: 0, pageCount: 10, status: 'Pending', uploadedDaysAgo: 1 },
  { subjectId: 402, examType: 'Final', month: 2, yearOffset: 0, pageCount: 7, status: 'Approved', uploadedDaysAgo: 140, images: true },
  { subjectId: 403, examType: 'Resit', month: 9, yearOffset: -1, pageCount: 9, status: 'Approved', uploadedDaysAgo: 300 },
]

export const mockPapers: PaperDetail[] = paperSeeds.map((seed, index) => {
  const subject = mockSubjects.find((item) => item.id === seed.subjectId)
  if (!subject) throw new Error(`Missing mock subject ${seed.subjectId}`)

  const reviewedAt = seed.status === 'Pending' ? null : daysAgo(Math.max(0, seed.uploadedDaysAgo - 1))
  const files = seed.images
    ? {
        jpg: Array.from({ length: seed.pageCount }, (_, pageIndex) => ({
          pageNumber: pageIndex + 1,
          contentType: 'image/jpeg',
          sizeBytes: 420_000 + pageIndex * 37_000,
        })),
      }
    : {
        pdf: [
          {
            pageNumber: 1,
            contentType: 'application/pdf',
            sizeBytes: seed.pageCount * 310_000,
          },
        ],
      }

  return {
    id: index + 1,
    subjectId: subject.id,
    subjectNameSr: subject.nameSr,
    subjectNameEn: subject.nameEn,
    examType: seed.examType,
    month: seed.month,
    year: currentYear + seed.yearOffset,
    pageCount: seed.pageCount,
    uploadedAt: daysAgo(seed.uploadedDaysAgo),
    status: seed.status,
    reviewedAt,
    rejectionReason: seed.rejectionReason ?? null,
    files,
  }
})
