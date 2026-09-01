import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PaperDetailsModal } from '../components/papers/PaperDetailsModal'
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui'
import type { Column } from '../components/ui'
import { FilterPanel } from '../components/ui/FilterPanel'
import { ApiError } from '../lib/axios'
import { EXAM_TYPES } from '../lib/types'
import type { ExamType, Paper, PaperQuery } from '../lib/types'
import { fieldError, formatDate, monthNames } from '../lib/utils'
import { approvePaper, getPapers, paperKeys, rejectPaper } from '../services/papers'

function RejectModal({
  paper,
  onClose,
}: {
  paper: Paper | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: rejectPaper,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      onClose()
      setReason('')
      setError('')
    },
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (trimmed.length < 3 || trimmed.length > 500) {
      setError('The reason must contain between 3 and 500 characters.')
      return
    }
    if (!paper) return
    try {
      await mutation.mutateAsync({ id: paper.id, reason: trimmed })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? fieldError(caught.errors, 'Reason') ?? caught.message
          : 'The paper could not be rejected.',
      )
    }
  }

  return (
    <Modal
      open={paper !== null}
      title="Reject paper"
      description={paper ? `Explain why “${paper.subjectNameEn}” cannot be approved.` : undefined}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="p-5 sm:p-6">
          <Field label="Reason" error={error} hint={`${reason.trim().length}/500 characters`} required>
            <Textarea
              value={reason}
              maxLength={500}
              placeholder="Describe what should be corrected…"
              onChange={(event) => {
                setReason(event.target.value)
                setError('')
              }}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={mutation.isPending}>
            {mutation.isPending ? 'Rejecting…' : 'Reject paper'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const numberParam = (value: string | null) => (value ? Number(value) : undefined)

export function PendingPapersPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)
  const [paperToReject, setPaperToReject] = useState<Paper | null>(null)
  const [actionError, setActionError] = useState('')

  const filters = {
    examType: (searchParams.get('examType') as ExamType | null) ?? undefined,
    month: numberParam(searchParams.get('month')),
    year: numberParam(searchParams.get('year')),
    page: numberParam(searchParams.get('page')) ?? 1,
  }
  const query: PaperQuery = { ...filters, status: 'Pending', perPage: 10 }
  const papers = useQuery({
    queryKey: paperKeys.list(query),
    queryFn: () => getPapers(query),
    placeholderData: (previous) => previous,
  })
  const approve = useMutation({
    mutationFn: approvePaper,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paperKeys.all }),
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : 'The paper could not be approved.'),
  })

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
          <p className="text-xs text-slate-400">{paper.subjectNameSr}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Exam', render: (paper) => paper.examType },
    {
      key: 'date',
      header: 'Exam date',
      render: (paper) => `${monthNames[paper.month - 1]} ${paper.year}`,
    },
    { key: 'pages', header: 'Pages', render: (paper) => paper.pageCount },
    { key: 'uploaded', header: 'Submitted', render: (paper) => formatDate(paper.uploadedAt) },
    { key: 'status', header: 'Status', render: (paper) => <StatusBadge status={paper.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (paper) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            className="min-h-8 px-3 py-1"
            disabled={approve.isPending}
            onClick={(event) => {
              event.stopPropagation()
              setActionError('')
              if (window.confirm(`Approve paper #${paper.id}?`)) approve.mutate(paper.id)
            }}
          >
            Approve
          </Button>
          <Button
            variant="ghost"
            className="min-h-8 px-3 py-1 text-rose-600 hover:bg-rose-50"
            onClick={(event) => {
              event.stopPropagation()
              setPaperToReject(paper)
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Pending papers</h1>
        <p className="mt-1 text-sm text-slate-500">Review user submissions in oldest-first order.</p>
      </div>

      <FilterPanel onClear={() => setSearchParams({})}>
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
        <Field label="Year">
          <Select value={filters.year ?? ''} onChange={(event) => setFilter('year', event.target.value)}>
            <option value="">All years</option>
            {Array.from({ length: 15 }, (_, index) => new Date().getFullYear() + 1 - index).map((year) => (
              <option key={year}>{year}</option>
            ))}
          </Select>
        </Field>
      </FilterPanel>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {papers.isPending ? (
        <LoadingState label="Loading pending papers…" />
      ) : papers.isError ? (
        <ErrorState
          message={papers.error instanceof ApiError ? papers.error.message : 'Unable to load pending papers.'}
          onRetry={() => papers.refetch()}
        />
      ) : papers.data.data.length === 0 ? (
        <EmptyState title="The queue is clear" description="There are no pending papers matching these filters." />
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

      <PaperDetailsModal paperId={selectedPaperId} onClose={() => setSelectedPaperId(null)} />
      <RejectModal paper={paperToReject} onClose={() => setPaperToReject(null)} />
    </div>
  )
}
