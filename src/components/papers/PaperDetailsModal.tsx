import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../lib/axios'
import { formatBytes, formatDate, monthNames } from '../../lib/utils'
import { getPaper, paperKeys } from '../../services/papers'
import { ErrorState, LoadingState, Modal, StatusBadge } from '../ui'

export function PaperDetailsModal({
  paperId,
  onClose,
}: {
  paperId: number | null
  onClose: () => void
}) {
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
      title="Paper details"
      description="File metadata is available; viewing file contents requires a backend download endpoint."
      onClose={onClose}
    >
      <div className="p-5 sm:p-6">
        {query.isPending ? (
          <LoadingState label="Loading paper details…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load this paper.'}
            onRetry={() => query.refetch()}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-950">{query.data.subjectNameEn}</p>
                <p className="text-sm text-slate-500">{query.data.subjectNameSr}</p>
              </div>
              <StatusBadge status={query.data.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Exam</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{query.data.examType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Date</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {monthNames[query.data.month - 1]} {query.data.year}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Pages</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{query.data.pageCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Uploaded</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(query.data.uploadedAt)}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Files</h3>
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {files.map((file) => (
                  <div key={`${file.pageNumber}-${file.contentType}`} className="flex justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">Page {file.pageNumber}</span>
                    <span className="text-slate-500">
                      {file.contentType} · {formatBytes(file.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {query.data.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-800">Rejection reason</p>
                <p className="mt-1 text-sm text-rose-700">{query.data.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
