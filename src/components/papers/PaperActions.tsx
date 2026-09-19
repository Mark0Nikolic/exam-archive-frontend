import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import type { Paper } from '../../lib/types'
import { isStaff, localizedPaperSubject } from '../../lib/utils'
import { deletePaper, downloadPaper, paperKeys } from '../../services/papers'
import { ActionMenu } from '../ui'

export function PaperActions({
  paper,
  onPreview,
  onEdit,
  onDeleted,
  onError,
}: {
  paper: Paper
  onPreview: () => void
  onEdit: () => void
  onDeleted?: (id: number) => void
  onError: (message: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const subject = localizedPaperSubject(paper, language)
  const download = useMutation({
    mutationFn: () => downloadPaper(paper.id),
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
    onError: (error) => {
      onError(error instanceof ApiError ? error.message : t('details.downloadError'))
    },
  })
  const remove = useMutation({
    mutationFn: () => deletePaper(paper.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      onDeleted?.(paper.id)
    },
    onError: (error) => {
      onError(error instanceof ApiError ? error.message : t('papers.deleteError'))
    },
  })

  return (
    <ActionMenu
      label={t('papers.openActions', { subject })}
      items={[
        {
          key: 'preview',
          label: t('details.preview'),
          icon: <Eye className="h-4 w-4" aria-hidden="true" />,
          onSelect: onPreview,
        },
        {
          key: 'download',
          label: download.isPending ? t('details.downloading') : t('details.downloadPdf'),
          icon: <Download className="h-4 w-4" aria-hidden="true" />,
          disabled: download.isPending,
          onSelect: () => {
            onError('')
            download.mutate()
          },
        },
        ...(isStaff(user?.role)
          ? [
              {
                key: 'edit',
                label: t('editPaper.action'),
                icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                separatorBefore: true,
                onSelect: onEdit,
              },
              {
                key: 'delete',
                label: remove.isPending ? t('papers.deleting') : t('papers.delete'),
                icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                danger: true,
                disabled: remove.isPending,
                onSelect: () => {
                  if (!window.confirm(t('papers.deleteConfirm', { subject, id: paper.id }))) return
                  onError('')
                  remove.mutate()
                },
              },
            ]
          : []),
      ]}
    />
  )
}
