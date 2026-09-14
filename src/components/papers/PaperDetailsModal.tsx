import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import { formatBytes, formatDate, localizedPaperSubject, monthNames } from '../../lib/utils'
import { getPaper, paperKeys } from '../../services/papers'
import { ErrorState, LoadingState, Modal, StatusBadge } from '../ui'

export function PaperDetailsModal({
  paperId,
  onClose,
}: {
  paperId: number | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
  const query = useQuery({
    queryKey: paperKeys.detail(paperId ?? 0),
    queryFn: () => getPaper(paperId as number),
    enabled: paperId !== null,
  })

  const files = query.data
    ? Object.entries(query.data.files)
        .flatMap(([, entries]) => entries ?? [])
        .sort((a, b) => a.pageNumber - b.pageNumber)
    : []

  return (
    <Modal
      open={paperId !== null}
      title={t('details.title')}
      description={t('details.description')}
      onClose={onClose}
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
              <StatusBadge status={query.data.status} />
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
            {query.data.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-800">{t('details.rejectionReason')}</p>
                <p className="mt-1 text-sm text-rose-700">{query.data.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
