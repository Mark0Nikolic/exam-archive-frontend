import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import { toAppLanguage } from '../i18n'
import { ApiError } from '../lib/axios'
import { EXAM_TYPES } from '../lib/types'
import type { ExamType, Paper, PaperQuery } from '../lib/types'
import { fieldError, formatDate, localizedPaperSubject, monthNames } from '../lib/utils'
import { approvePaper, getPapers, paperKeys, rejectPaper } from '../services/papers'

function RejectModal({
  paper,
  onClose,
}: {
  paper: Paper | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
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
      setError(t('pending.reasonValidation'))
      return
    }
    if (!paper) return
    try {
      await mutation.mutateAsync({ id: paper.id, reason: trimmed })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? fieldError(caught.errors, 'Reason') ?? caught.message
          : t('pending.rejectError'),
      )
    }
  }

  return (
    <Modal
      open={paper !== null}
      title={t('pending.rejectTitle')}
      description={
        paper ? t('pending.rejectDescription', { subject: localizedPaperSubject(paper, language) }) : undefined
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="p-5 sm:p-6">
          <Field
            label={t('pending.reason')}
            error={error}
            hint={t('common.characters', { count: reason.trim().length })}
            required
          >
            <Textarea
              value={reason}
              maxLength={500}
              placeholder={t('pending.reasonPlaceholder')}
              onChange={(event) => {
                setReason(event.target.value)
                setError('')
              }}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={mutation.isPending}>
            {mutation.isPending ? t('pending.rejecting') : t('pending.rejectPaper')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const numberParam = (value: string | null) => (value ? Number(value) : undefined)

export function PendingPapersPage() {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
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
      setActionError(error instanceof ApiError ? error.message : t('pending.approveError')),
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
      header: t('papers.subject'),
      render: (paper) => <p className="font-semibold text-slate-900">{localizedPaperSubject(paper, language)}</p>,
    },
    { key: 'type', header: t('pending.exam'), render: (paper) => t(`common.examTypes.${paper.examType}`) },
    {
      key: 'date',
      header: t('papers.examDate'),
      render: (paper) => `${months[paper.month - 1]} ${paper.year}`,
    },
    { key: 'pages', header: t('papers.pages'), render: (paper) => paper.pageCount },
    { key: 'uploaded', header: t('pending.submitted'), render: (paper) => formatDate(paper.uploadedAt, language) },
    { key: 'status', header: t('pending.status'), render: (paper) => <StatusBadge status={paper.status} /> },
    {
      key: 'actions',
      header: t('pending.actions'),
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
              if (window.confirm(t('pending.approveConfirm', { id: paper.id }))) approve.mutate(paper.id)
            }}
          >
            {t('pending.approve')}
          </Button>
          <Button
            variant="ghost"
            className="min-h-8 px-3 py-1 text-rose-600 hover:bg-rose-50"
            onClick={(event) => {
              event.stopPropagation()
              setPaperToReject(paper)
            }}
          >
            {t('pending.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{t('pending.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('pending.description')}</p>
      </div>

      <FilterPanel onClear={() => setSearchParams({})}>
        <Field label={t('papers.examType')}>
          <Select value={filters.examType ?? ''} onChange={(event) => setFilter('examType', event.target.value)}>
            <option value="">{t('papers.allTypes')}</option>
            {EXAM_TYPES.map((type) => (
              <option key={type} value={type}>{t(`common.examTypes.${type}`)}</option>
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
        <Field label={t('pending.year')}>
          <Select value={filters.year ?? ''} onChange={(event) => setFilter('year', event.target.value)}>
            <option value="">{t('papers.allYears')}</option>
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
        <LoadingState label={t('pending.loading')} />
      ) : papers.isError ? (
        <ErrorState
          message={papers.error instanceof ApiError ? papers.error.message : t('pending.loadError')}
          onRetry={() => papers.refetch()}
        />
      ) : papers.data.data.length === 0 ? (
        <EmptyState title={t('pending.emptyTitle')} description={t('pending.emptyDescription')} />
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
