import { useEffect, useState } from 'react'
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
import { Button, ErrorState, Field, LoadingState, Modal, StatusBadge, Textarea, useWarningDialog } from '../ui'
import { PaperQuestionsPanel } from './PaperQuestionsPanel'

export function PaperDetailsModal({
  paperId,
  onClose,
  onOpenPaper,
}: {
  paperId: number | null
  onClose: () => void
  onOpenPaper?: (id: number) => void
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
  const { ask, notify, dialog: warningDialog } = useWarningDialog()

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
    refetchInterval: (current) =>
      current.state.data?.status === 'Approved'
      && current.state.data.parseStatus === 'Queued'
        ? 2000
        : false,
  })
  const preview = useQuery({
    queryKey: paperKeys.preview(paperId ?? 0),
    queryFn: () => previewPaper(paperId as number),
    enabled: paperId !== null,
    gcTime: 0,
    retry: false,
  })

  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const blob = preview.data?.blob
    if (!blob) {
      setPreviewUrl('')
      return
    }
    const typed = blob.type.startsWith('image/') || blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' })
    const url = URL.createObjectURL(typed)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview.data])

  const approve = useMutation({
    mutationFn: approvePaper,
    onSuccess: async (paper) => {
      queryClient.setQueryData(paperKeys.detail(paper.id), paper)
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void notify(error.message)
        return
      }
      setActionError(error instanceof ApiError ? error.message : t('pending.approveError'))
    },
  })

  const reject = useMutation({
    mutationFn: rejectPaper,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void notify(error.message)
        return
      }
      setActionError(error instanceof ApiError ? error.message : t('pending.rejectError'))
    },
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
  const totalSize = files.reduce((sum, file) => sum + file.sizeBytes, 0)

  const canReview = isStaff(user?.role) && query.data?.status === 'Pending'
  const canShowQuestions = query.data?.status === 'Approved'
  const isBusy = approve.isPending || reject.isPending
  const previewIsWordOnly = preview.isError && isUnavailablePdf(preview.error)

  const submitReject = async () => {
    if (!query.data) return
    const trimmed = reason.trim()
    if (trimmed.length > 0 && (trimmed.length < 3 || trimmed.length > 500)) {
      setActionError(t('details.reasonOptionalValidation'))
      return
    }
    if (!(await ask(t('pending.rejectConfirm', { id: query.data.id })))) return
    setActionError('')
    reject.mutate({ id: query.data.id, reason: trimmed })
  }

  return (
    <>
    <Modal
      open={paperId !== null}
      title={query.data ? localizedPaperSubject(query.data, language) : t('details.title')}
      titleAside={query.data ? <StatusBadge status={query.data.status} /> : undefined}
      onClose={onClose}
      width="max-w-[92rem]"
      scrollable={false}
    >
      <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
        {query.isPending ? (
          <LoadingState label={t('details.loading')} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : t('details.loadError')}
            onRetry={() => query.refetch()}
          />
        ) : (
          <div className="grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
            <div className="min-h-[240px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:min-h-0">
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
              ) : previewUrl && preview.data?.blob.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={t('details.previewTitle', {
                    subject: localizedPaperSubject(query.data, language),
                  })}
                  className="mx-auto h-[58vh] w-full object-contain bg-white lg:h-full"
                />
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={t('details.previewTitle', {
                    subject: localizedPaperSubject(query.data, language),
                  })}
                  className="h-[58vh] w-full bg-white lg:h-full"
                />
              ) : null}
            </div>

            <aside className="min-h-0 space-y-4 overflow-y-auto lg:h-full lg:pr-1">
              <Button
                variant="secondary"
                className="min-h-9 w-full px-3 py-1.5"
                disabled={download.isPending}
                onClick={() => {
                  setFileError('')
                  download.mutate()
                }}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {download.isPending ? t('details.downloading') : t('details.downloadPdf')}
              </Button>
              {fileError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {fileError}
                </p>
              )}
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
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
                  <dt className="text-xs font-medium uppercase text-slate-500">{t('details.fileSize')}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {formatBytes(totalSize, language)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-500">{t('details.uploaded')}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(query.data.uploadedAt, language)}
                  </dd>
                </div>
              </dl>
              {canShowQuestions && paperId !== null && (
                <PaperQuestionsPanel
                  key={paperId}
                  paperId={paperId}
                  parseStatus={query.data.parseStatus}
                  parseError={query.data.parseError}
                  questionCount={query.data.questionCount}
                  onOpenPaper={onOpenPaper}
                  enabled
                />
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
                        void (async () => {
                          if (!(await ask(t('pending.approveConfirm', { id: query.data.id })))) return
                          setActionError('')
                          approve.mutate(query.data.id)
                        })()
                      }}
                    >
                      {approve.isPending ? t('details.approving') : t('pending.approve')}
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </Modal>
    {warningDialog}
    </>
  )
}
