import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal'
import { UploadPaperModal } from '../components/papers/UploadPaperModal'
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Pagination,
  Select,
  StatusBadge,
} from '../components/ui'
import type { Column } from '../components/ui'
import { FilterPanel } from '../components/ui/FilterPanel'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/axios'
import { toAppLanguage } from '../i18n'
import { EXAM_TYPES, PAPER_STATUSES } from '../lib/types'
import type { ExamType, Paper, PaperQuery, PaperStatus } from '../lib/types'
import {
  compareLocalizedNames,
  formatDate,
  isStaff,
  localizedName,
  localizedPaperSubject,
  monthNames,
  yearsOfStudyForStudy,
} from '../lib/utils'
import { getMajors, getStudies, getSubjects } from '../services/lookups'
import { getPapers, paperKeys } from '../services/papers'

const toNumber = (value: string | null) => (value ? Number(value) : undefined)

export function PapersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const staffUser = isStaff(user?.role)
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
  const [searchParams, setSearchParams] = useSearchParams()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)

  const filters = {
    studiesId: toNumber(searchParams.get('studiesId')),
    majorId: toNumber(searchParams.get('majorId')),
    yearOfStudy: toNumber(searchParams.get('yearOfStudy')),
    subjectId: toNumber(searchParams.get('subjectId')),
    examType: (searchParams.get('examType') as ExamType | null) ?? undefined,
    status: (searchParams.get('status') as PaperStatus | null) ?? undefined,
    month: toNumber(searchParams.get('month')),
    year: toNumber(searchParams.get('year')),
    page: toNumber(searchParams.get('page')) ?? 1,
  }

  const query: PaperQuery = {
    ...filters,
    perPage: 10,
  }

  const studies = useQuery({
    queryKey: ['lookups', 'studies'],
    queryFn: getStudies,
    staleTime: 30 * 60 * 1000,
  })
  const majors = useQuery({
    queryKey: ['lookups', 'majors', filters.studiesId],
    queryFn: () => getMajors(filters.studiesId),
    enabled: Boolean(filters.studiesId),
    staleTime: 30 * 60 * 1000,
  })
  const subjects = useQuery({
    queryKey: ['lookups', 'subjects', filters.majorId],
    queryFn: () => getSubjects(filters.majorId as number),
    enabled: Boolean(filters.majorId),
    staleTime: 30 * 60 * 1000,
  })
  const papers = useQuery({
    queryKey: paperKeys.list(query),
    queryFn: () => getPapers(query),
    placeholderData: (previous) => previous,
  })

  const visibleSubjects = (subjects.data?.data ?? [])
    .filter((subject) => !filters.yearOfStudy || subject.yearOfStudy === filters.yearOfStudy)
    .sort((a, b) => compareLocalizedNames(a, b, language))

  const selectedStudy = studies.data?.data.find((study) => study.id === filters.studiesId)
  const studyYears = yearsOfStudyForStudy(selectedStudy)

  const visiblePapers = (papers.data?.data ?? [])
    .filter((paper) => staffUser || paper.status === 'Approved' || paper.isOwnedByCurrentUser)
    .sort((left, right) => PAPER_STATUSES.indexOf(left.status) - PAPER_STATUSES.indexOf(right.status))

  const setFilter = (key: string, value?: string | number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const columns: Column<Paper>[] = [
    {
      key: 'subject',
      header: t('papers.subject'),
      render: (paper) => <p className="font-semibold text-slate-900">{localizedPaperSubject(paper, language)}</p>,
    },
    { key: 'type', header: t('papers.examType'), render: (paper) => t(`common.examTypes.${paper.examType}`) },
    {
      key: 'date',
      header: t('papers.examDate'),
      render: (paper) => `${months[paper.month - 1]} ${paper.year}`,
    },
    { key: 'pages', header: t('papers.pages'), render: (paper) => paper.pageCount },
    { key: 'status', header: t('papers.status'), render: (paper) => <StatusBadge status={paper.status} /> },
    { key: 'uploaded', header: t('papers.uploaded'), render: (paper) => formatDate(paper.uploadedAt, language) },
    {
      key: 'view',
      header: '',
      className: 'text-right',
      render: (paper) => (
        <Button
          variant="ghost"
          className="min-h-8 px-2 py-1 text-slate-500"
          aria-label={t('papers.details')}
          onClick={(event) => {
            event.stopPropagation()
            setSelectedPaperId(paper.id)
          }}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </Button>
      ),
    },
  ]

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">{t('papers.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('papers.description')}</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t('papers.uploadPaper')}
        </Button>
      </div>

      <FilterPanel onClear={() => setSearchParams({})}>
        <Field label={t('papers.studyProgram')}>
          <Select
            value={filters.studiesId ?? ''}
            onChange={(event) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                ;['studiesId', 'majorId', 'yearOfStudy', 'subjectId', 'page'].forEach((key) => next.delete(key))
                if (event.target.value) next.set('studiesId', event.target.value)
                return next
              })
            }}
          >
            <option value="">{t('papers.allPrograms')}</option>
            {studies.data?.data.map((study) => (
              <option key={study.id} value={study.id}>
                {localizedName(study, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.major')}>
          <Select
            value={filters.majorId ?? ''}
            disabled={!filters.studiesId}
            onChange={(event) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                ;['majorId', 'yearOfStudy', 'subjectId', 'page'].forEach((key) => next.delete(key))
                if (event.target.value) next.set('majorId', event.target.value)
                return next
              })
            }}
          >
            <option value="">{t('papers.allMajors')}</option>
            {majors.data?.data.map((major) => (
              <option key={major.id} value={major.id}>
                {localizedName(major, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.yearOfStudy')}>
          <Select
            value={filters.yearOfStudy ?? ''}
            disabled={!filters.majorId}
            onChange={(event) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                next.delete('subjectId')
                next.delete('page')
                if (event.target.value) next.set('yearOfStudy', event.target.value)
                else next.delete('yearOfStudy')
                return next
              })
            }}
          >
            <option value="">{t('papers.allYears')}</option>
            {studyYears.map((year) => (
              <option key={year} value={year}>
                {t(`common.yearOfStudy.${year}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.subject')}>
          <Select
            value={filters.subjectId ?? ''}
            disabled={!filters.majorId}
            onChange={(event) => setFilter('subjectId', event.target.value)}
          >
            <option value="">{t('papers.allSubjects')}</option>
            {visibleSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} — {localizedName(subject, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.examType')}>
          <Select value={filters.examType ?? ''} onChange={(event) => setFilter('examType', event.target.value)}>
            <option value="">{t('papers.allTypes')}</option>
            {EXAM_TYPES.map((type) => (
              <option key={type} value={type}>{t(`common.examTypes.${type}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.status')}>
          <Select value={filters.status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="">{t('papers.allStatuses')}</option>
            {PAPER_STATUSES.map((status) => (
              <option key={status} value={status}>{t(`common.statuses.${status}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.month')}>
          <Select value={filters.month ?? ''} onChange={(event) => setFilter('month', event.target.value)}>
            <option value="">{t('papers.allMonths')}</option>
            {months.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('papers.examYear')}>
          <Input
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={filters.year ?? ''}
            placeholder={t('papers.allYears')}
            onChange={(event) => setFilter('year', event.target.value)}
          />
        </Field>
      </FilterPanel>

      {papers.isPending ? (
        <LoadingState label={t('papers.loading')} />
      ) : papers.isError ? (
        <ErrorState
          message={papers.error instanceof ApiError ? papers.error.message : t('papers.loadError')}
          onRetry={() => papers.refetch()}
        />
      ) : visiblePapers.length === 0 ? (
        <EmptyState title={t('papers.emptyTitle')} description={t('papers.emptyDescription')} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={visiblePapers}
            getRowKey={(paper) => paper.id}
            onRowClick={(paper) => setSelectedPaperId(paper.id)}
          />
          <Pagination
            page={papers.data.meta.page}
            totalPages={papers.data.meta.totalPages}
            totalItems={papers.data.meta.totalItems}
            onChange={(page) => setFilter('page', page)}
          />
        </>
      )}

      <UploadPaperModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <PaperDetailsModal paperId={selectedPaperId} onClose={() => setSelectedPaperId(null)} />
    </div>
  )
}