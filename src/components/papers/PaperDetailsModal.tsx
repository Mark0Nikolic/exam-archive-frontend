import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import { formatBytes, formatDate, isStaff, localizedPaperSubject, monthNames } from '../../lib/utils'
import {
  approvePaper,
  downloadPaper,
  getPaper,
  isUnavailablePdf,
  paperKeys,
  previewPaper,
  rejectPaper,
} from '../../services/papers'
import { Button, ErrorState, Field, LoadingState, Modal, StatusBadge, Textarea } from '../ui'
import { PaperQuestionsPanel } from './PaperQuestionsPanel'

export function PaperDetailsModal({
  paperId,
  onClose,
}: {
  paperId: number | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
  const [statePaperId, setStatePaperId] = useState(paperId)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [fileError, setFileError] = useState('')

  if (paperId !== statePaperId) {
    setStatePaperId(paperId)
    setReason('')
    setActionError('')
    setFileError('')
  }

  const query = useQuery({
    queryKey: paperKeys.detail(paperId ?? 0),
    queryFn: () => getPaper(paperId as number),
    enabled: paperId !== null,
  })
  const preview = useQuery({
    queryKey: paperKeys.preview(paperId ?? 0),
    queryFn: () => previewPaper(paperId as number),
    enabled: paperId !== null,
    gcTime: 0,
    retry: false,
  })

  const previewUrl = useMemo(
    () => preview.data ? URL.createObjectURL(preview.data.blob) : '',
    [preview.data],
  )

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const approve = useMutation({
    mutationFn: approvePaper,
    onSuccess: async (paper) => {
      queryClient.setQueryData(paperKeys.detail(paper.id), paper)
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : t('pending.approveError')),
  })

  const reject = useMutation({
    mutationFn: rejectPaper,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      onClose()
    },
    onError: (error) =>
      setActionError(
        error instanceof ApiError ? error.message : t('pending.rejectError'),
      ),
  })

  const download = useMutation({
    mutationFn: () => downloadPaper(paperId as number),
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    },
    onError: (error) =>
      setFileError(
        isUnavailablePdf(error)
          ? t('details.downloadWordOnly')
          : error instanceof ApiError ? error.message : t('details.downloadError'),
      ),
  })

  const files = query.data
    ? Object.entries(query.data.files)
        .flatMap(([, entries]) => entries ?? [])
        .sort((a, b) => a.pageNumber - b.pageNumber)
    : []

  const canReview = isStaff(user?.role) && query.data?.status === 'Pending'
  const canShowQuestions = isStaff(user?.role) && query.data?.status === 'Approved'
  const isBusy = approve.isPending || reject.isPending
  const previewIsWordOnly = preview.isError && isUnavailablePdf(preview.error)

  const submitReject = () => {
    if (!query.data) return
    const trimmed = reason.trim()
    if (trimmed.length > 0 && (trimmed.length < 3 || trimmed.length > 500)) {
      setActionError(t('details.reasonOptionalValidation'))
      return
    }
    if (!window.confirm(t('pending.rejectConfirm', { id: query.data.id }))) return
    setActionError('')
    reject.mutate({ id: query.data.id, reason: trimmed })
  }

  return (
    <Modal
      open={paperId !== null}
      ariaLabel={t('details.title')}
      onClose={onClose}
      width="max-w-6xl"
    >
      <div className="p-5 sm:p-6">
        {query.isPending ? (
          <LoadingState label={t('details.loading')} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : t('details.loadError')}
            onRetry={() => query.refetch()}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-950">
                  {localizedPaperSubject(query.data, language)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={query.data.status} />
                <Button
                  variant="secondary"
                  className="min-h-9 px-3 py-1.5"
                  disabled={download.isPending}
                  onClick={() => {
                    setFileError('')
                    download.mutate()
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {download.isPending ? t('details.downloading') : t('details.downloadPdf')}
                </Button>
              </div>
            </div>
            {fileError && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {fileError}
              </p>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t('details.preview')}</h3>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {preview.isPending ? (
                  <LoadingState label={t('details.previewLoading')} />
                ) : previewIsWordOnly ? (
                  <p className="p-4 text-sm text-slate-600">{t('details.previewWordOnly')}</p>
                ) : preview.isError ? (
                  <div className="p-4">
                    <ErrorState
                      message={preview.error instanceof ApiError
                        ? preview.error.message
                        : t('details.previewError')}
                      onRetry={() => preview.refetch()}
                    />
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={t('details.previewTitle', {
                      subject: localizedPaperSubject(query.data, language),
                    })}
                    className="h-[58vh] min-h-[420px] w-full bg-white"
                  />
                ) : null}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">{t('details.exam')}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {t(`common.examTypes.${query.data.examType}`)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">{t('details.date')}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {months[query.data.month - 1]} {query.data.year}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">{t('details.pages')}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{query.data.pageCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">{t('details.uploaded')}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(query.data.uploadedAt, language)}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t('details.files')}</h3>
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {files.map((file) => (
                  <div key={`${file.pageNumber}-${file.contentType}`} className="flex justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {t('details.pageNumber', { page: file.pageNumber })}
                    </span>
                    <span className="text-slate-500">
                      {file.contentType} · {formatBytes(file.sizeBytes, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {canShowQuestions && paperId !== null && (
              <PaperQuestionsPanel paperId={paperId} enabled />
            )}
            {query.data.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-800">{t('details.rejectionReason')}</p>
                <p className="mt-1 text-sm text-rose-700">{query.data.rejectionReason}</p>
              </div>
            )}
            {canReview && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-800">{t('details.reviewTitle')}</h3>
                <Field
                  label={t('details.reasonOptional')}
                  hint={t('common.characters', { count: reason.trim().length })}
                >
                  <Textarea
                    value={reason}
                    maxLength={500}
                    placeholder={t('pending.reasonPlaceholder')}
                    disabled={isBusy}
                    onChange={(event) => {
                      setReason(event.target.value)
                      setActionError('')
                    }}
                  />
                </Field>
                {actionError && (
                  <p role="alert" className="text-sm font-medium text-rose-600">
                    {actionError}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="danger"
                    disabled={isBusy}
                    onClick={submitReject}
                  >
                    {reject.isPending ? t('pending.rejecting') : t('pending.reject')}
                  </Button>
                  <Button
                    disabled={isBusy}
                    onClick={() => {
                      if (!window.confirm(t('pending.approveConfirm', { id: query.data.id }))) return
                      setActionError('')
                      approve.mutate(query.data.id)
                    }}
                  >
                    {approve.isPending ? t('details.approving') : t('pending.approve')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
