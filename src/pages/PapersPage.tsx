import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal'
import { UploadPaperModal } from '../components/papers/UploadPaperModal'
import { Button, DataTable, EmptyState, ErrorState, Field, Input, LoadingState, Pagination, Select } from '../components/ui'
import type { Column } from '../components/ui'
import { FilterPanel } from '../components/ui/FilterPanel'
import { ApiError } from '../lib/axios'
import { EXAM_TYPES } from '../lib/types'
import type { ExamType, Paper, PaperQuery } from '../lib/types'
import { formatDate, monthNames } from '../lib/utils'
import { getMajors, getStudies, getSubjects } from '../services/lookups'
import { getPapers, paperKeys } from '../services/papers'

const toNumber = (value: string | null) => (value ? Number(value) : undefined)

export function PapersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)

  const filters = {
    studiesId: toNumber(searchParams.get('studiesId')),
    majorId: toNumber(searchParams.get('majorId')),
    yearOfStudy: toNumber(searchParams.get('yearOfStudy')),
    subjectId: toNumber(searchParams.get('subjectId')),
    examType: (searchParams.get('examType') as ExamType | null) ?? undefined,
    month: toNumber(searchParams.get('month')),
    year: toNumber(searchParams.get('year')),
    page: toNumber(searchParams.get('page')) ?? 1,
  }

  const query: PaperQuery = {
    ...filters,
    status: 'Approved',
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
    .sort((a, b) => a.nameSr.localeCompare(b.nameSr, 'sr'))

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
      header: 'Subject',
      render: (paper) => (
        <div>
          <p className="font-semibold text-slate-900">{paper.subjectNameEn}</p>
          <p className="mt-0.5 text-xs text-slate-400">{paper.subjectNameSr}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Exam type', render: (paper) => paper.examType },
    {
      key: 'date',
      header: 'Exam date',
      render: (paper) => `${monthNames[paper.month - 1]} ${paper.year}`,
    },
    { key: 'pages', header: 'Pages', render: (paper) => paper.pageCount },
    { key: 'uploaded', header: 'Uploaded', render: (paper) => formatDate(paper.uploadedAt) },
    {
      key: 'view',
      header: '',
      className: 'text-right',
      render: (paper) => (
        <Button
          variant="ghost"
          className="min-h-8 px-2 py-1 text-indigo-600"
          onClick={(event) => {
            event.stopPropagation()
            setSelectedPaperId(paper.id)
          }}
        >
          Details
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Papers</h1>
          <p className="mt-1 text-sm text-slate-500">Browse approved exams and upload new material.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <span className="text-lg leading-none">+</span> Upload paper
        </Button>
      </div>

      <FilterPanel onClear={() => setSearchParams({})}>
        <Field label="Study program">
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
            <option value="">All programs</option>
            {studies.data?.data.map((study) => (
              <option key={study.id} value={study.id}>
                {study.nameEn || study.nameSr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Major">
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
            <option value="">All majors</option>
            {majors.data?.data.map((major) => (
              <option key={major.id} value={major.id}>
                {major.nameEn || major.nameSr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year of study">
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
            <option value="">All years</option>
            {[1, 2, 3, 4, 5, 6].map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Select
            value={filters.subjectId ?? ''}
            disabled={!filters.majorId}
            onChange={(event) => setFilter('subjectId', event.target.value)}
          >
            <option value="">All subjects</option>
            {visibleSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} — {subject.nameEn || subject.nameSr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exam type">
          <Select value={filters.examType ?? ''} onChange={(event) => setFilter('examType', event.target.value)}>
            <option value="">All types</option>
            {EXAM_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </Field>
        <Field label="Month">
          <Select value={filters.month ?? ''} onChange={(event) => setFilter('month', event.target.value)}>
            <option value="">All months</option>
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exam year">
          <Input
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={filters.year ?? ''}
            placeholder="All years"
            onChange={(event) => setFilter('year', event.target.value)}
          />
        </Field>
      </FilterPanel>

      {papers.isPending ? (
        <LoadingState label="Loading papers…" />
      ) : papers.isError ? (
        <ErrorState
          message={papers.error instanceof ApiError ? papers.error.message : 'Unable to load papers.'}
          onRetry={() => papers.refetch()}
        />
      ) : papers.data.data.length === 0 ? (
        <EmptyState title="No papers found" description="Try changing or clearing the active filters." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={papers.data.data}
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
