import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/axios'
import type { ParseStatus } from '../../lib/types'
import { getPaperQuestions, paperKeys } from '../../services/papers'
import { ErrorState, LoadingState } from '../ui'

function skippedMessage(parseError: string | null | undefined, t: (key: string) => string) {
  if (parseError === 'no-extractable-text') return t('details.questionsSkippedNoText')
  if (parseError === 'no-numbered-questions') return t('details.questionsSkippedNoNumbers')
  return t('details.questionsSkipped')
}

export function PaperQuestionsPanel({
  paperId,
  parseStatus,
  parseError,
  questionCount,
  enabled,
}: {
  paperId: number
  parseStatus?: ParseStatus
  parseError?: string | null
  questionCount?: number
  enabled: boolean
}) {
  const { t } = useTranslation()
  const [openIndexes, setOpenIndexes] = useState<number[]>([])
  const status = parseStatus ?? 'NotQueued'
  const loadText = enabled && status === 'Parsed' && (questionCount === undefined || questionCount > 0)
  const questions = useQuery({
    queryKey: paperKeys.questions(paperId),
    queryFn: () => getPaperQuestions(paperId),
    enabled: loadText,
  })

  if (!enabled) return null

  const toggle = (index: number) => {
    setOpenIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800">
        {t('details.questions')}
        {status === 'Parsed' && typeof questionCount === 'number' ? (
          <span className="ml-1.5 font-medium text-slate-400">({questionCount})</span>
        ) : null}
      </h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {status === 'Queued' ? (
          <div className="p-4">
            <LoadingState label={t('details.questionsExtracting')} />
          </div>
        ) : status === 'Skipped' ? (
          <p className="px-4 py-3 text-sm text-slate-600">{skippedMessage(parseError, t)}</p>
        ) : status === 'Failed' ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsFailed')}</p>
        ) : status !== 'Parsed' ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsNotParsed')}</p>
        ) : questionCount === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsEmpty')}</p>
        ) : questions.isPending ? (
          <div className="p-4">
            <LoadingState label={t('details.questionsExtracting')} />
          </div>
        ) : questions.isError ? (
          <div className="p-4">
            <ErrorState
              message={questions.error instanceof ApiError
                ? questions.error.message
                : t('details.questionsLoadError')}
              onRetry={() => questions.refetch()}
            />
          </div>
        ) : (questions.data?.length ?? 0) === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsEmpty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {questions.data.map((question, index) => {
              const open = openIndexes.includes(index)
              return (
                <li key={`${question.ordinal ?? index}-${question.label}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
                    onClick={() => toggle(index)}
                  >
                    <span className="text-sm font-semibold text-slate-900">{question.label}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-700">
                      {open ? t('details.questionsCollapse') : t('details.questionsExpand')}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  {open && (
                    <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-6 text-slate-700">
                      {question.text}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
