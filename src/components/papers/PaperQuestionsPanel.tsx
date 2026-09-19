import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/axios'
import { ErrorState, LoadingState } from '../ui'
import { getPaperQuestions, paperKeys } from '../../services/papers'

function skippedMessage(parseError: string | null | undefined, t: (key: string) => string) {
  if (parseError === 'no-extractable-text') return t('details.questionsSkippedNoText')
  if (parseError === 'no-numbered-questions') return t('details.questionsSkippedNoNumbers')
  return t('details.questionsSkipped')
}

export function PaperQuestionsPanel({
  paperId,
  enabled,
}: {
  paperId: number
  enabled: boolean
}) {
  const { t } = useTranslation()
  const questions = useQuery({
    queryKey: paperKeys.questions(paperId),
    queryFn: () => getPaperQuestions(paperId),
    enabled,
    refetchInterval: (query) => query.state.data?.parseStatus === 'Queued' ? 2000 : false,
  })

  if (!enabled) return null

  return (
    <div>
      <h3 className="text-sm font-bold text-slate-800">{t('details.questions')}</h3>
      <div className="mt-2 rounded-xl border border-slate-200 bg-white">
        {questions.isPending ? (
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
        ) : questions.data.parseStatus === 'Queued' ? (
          <div className="p-4">
            <LoadingState label={t('details.questionsExtracting')} />
          </div>
        ) : questions.data.parseStatus === 'Parsed' ? (
          questions.data.questions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsEmpty')}</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {questions.data.questions.map((question, index) => (
                <li key={`${question.ordinal ?? index}-${question.label}`} className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{question.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{question.text}</p>
                </li>
              ))}
            </ol>
          )
        ) : questions.data.parseStatus === 'Skipped' ? (
          <p className="px-4 py-3 text-sm text-slate-600">
            {skippedMessage(questions.data.parseError, t)}
          </p>
        ) : questions.data.parseStatus === 'Failed' ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsFailed')}</p>
        ) : (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsNotParsed')}</p>
        )}
      </div>
    </div>
  )
}
