import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import type { PaperQuestion, PaperQuestions, ParseStatus } from '../../lib/types'
import { isStaff, monthNames } from '../../lib/utils'
import {
  deletePaperQuestion,
  getPaperQuestions,
  mergePaperQuestions,
  paperKeys,
  reparsePaper,
  updatePaperQuestion,
} from '../../services/papers'
import { Button, ErrorState, Field, Input, LoadingState, Textarea } from '../ui'

function skippedMessage(parseError: string | null | undefined, t: (key: string) => string) {
  if (parseError === 'no-extractable-text') return t('details.questionsSkippedNoText')
  if (parseError === 'no-numbered-questions') return t('details.questionsSkippedNoNumbers')
  return t('details.questionsSkipped')
}

function mutationMessage(error: unknown, fallback: string, conflict: string) {
  if (error instanceof ApiError) {
    if (error.status === 409) return error.message || conflict
    return error.message
  }
  return fallback
}

export function PaperQuestionsPanel({
  paperId,
  parseStatus,
  parseError,
  questionCount,
  enabled,
  onOpenPaper,
}: {
  paperId: number
  parseStatus?: ParseStatus
  parseError?: string | null
  questionCount?: number
  enabled: boolean
  onOpenPaper?: (id: number) => void
}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
  const staffUser = isStaff(user?.role)
  const [openIndexes, setOpenIndexes] = useState<number[]>([])
  const [selectedOrdinals, setSelectedOrdinals] = useState<number[]>([])
  const [editingOrdinal, setEditingOrdinal] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editText, setEditText] = useState('')
  const [actionError, setActionError] = useState('')
  const status = parseStatus ?? 'NotQueued'
  const loadText = enabled && status === 'Parsed' && (questionCount === undefined || questionCount > 0)
  const questions = useQuery({
    queryKey: paperKeys.questions(paperId),
    queryFn: () => getPaperQuestions(paperId),
    enabled: loadText,
  })

  const applyQuestions = async (body: PaperQuestions) => {
    queryClient.setQueryData(paperKeys.questions(paperId), body)
    await queryClient.invalidateQueries({ queryKey: paperKeys.detail(paperId) })
    await queryClient.invalidateQueries({ queryKey: paperKeys.questions(paperId) })
    setSelectedOrdinals([])
    setEditingOrdinal(null)
    setActionError('')
  }

  const update = useMutation({
    mutationFn: updatePaperQuestion,
    onSuccess: applyQuestions,
    onError: (error) =>
      setActionError(mutationMessage(error, t('details.questionsSaveError'), t('details.questionConflict'))),
  })
  const remove = useMutation({
    mutationFn: deletePaperQuestion,
    onSuccess: applyQuestions,
    onError: (error) =>
      setActionError(mutationMessage(error, t('details.questionsDeleteError'), t('details.questionConflict'))),
  })
  const merge = useMutation({
    mutationFn: mergePaperQuestions,
    onSuccess: applyQuestions,
    onError: (error) =>
      setActionError(mutationMessage(error, t('details.questionsMergeError'), t('details.questionConflict'))),
  })
  const reparse = useMutation({
    mutationFn: () => reparsePaper(paperId),
    onSuccess: async (paper) => {
      queryClient.setQueryData(paperKeys.detail(paper.id), paper)
      await queryClient.invalidateQueries({ queryKey: paperKeys.questions(paper.id) })
      await queryClient.invalidateQueries({ queryKey: paperKeys.detail(paper.id) })
      setSelectedOrdinals([])
      setEditingOrdinal(null)
      setActionError('')
    },
    onError: (error) =>
      setActionError(mutationMessage(error, t('details.questionsReparseError'), t('details.reparseNotApproved'))),
  })

  if (!enabled) return null

  const list = questions.data?.questions ?? []
  const count = questions.data?.questions.length ?? questionCount
  const busy = update.isPending || remove.isPending || merge.isPending || reparse.isPending

  const toggle = (index: number) => {
    setOpenIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }

  const toggleSelected = (ordinal: number) => {
    setSelectedOrdinals((current) =>
      current.includes(ordinal) ? current.filter((item) => item !== ordinal) : [...current, ordinal],
    )
  }

  const startEdit = (question: PaperQuestion) => {
    setEditingOrdinal(question.ordinal)
    setEditLabel(question.label)
    setEditText(question.text)
    setActionError('')
  }

  const submitEdit = async (ordinal: number) => {
    const label = editLabel.trim()
    const text = editText.trim()
    if (!label || !text) return
    await update.mutateAsync({ id: paperId, ordinal, label, text })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">
          {t('details.questions')}
          {status === 'Parsed' && typeof count === 'number' ? (
            <span className="ml-1.5 font-medium text-slate-400">({count})</span>
          ) : null}
        </h3>
        {staffUser && status !== 'Queued' && (
          <Button
            variant="secondary"
            className="min-h-8 px-3 py-1"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(t('details.reparseConfirm'))) return
              setActionError('')
              reparse.mutate()
            }}
          >
            {reparse.isPending ? t('details.reparsing') : t('details.reparse')}
          </Button>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      )}
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
        ) : questionCount === 0 && !questions.data ? (
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
        ) : list.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-600">{t('details.questionsEmpty')}</p>
        ) : (
          <>
            {staffUser && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
                <p className="text-xs text-slate-500">{t('details.mergeQuestionsHint')}</p>
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 py-1"
                  disabled={busy || selectedOrdinals.length < 2}
                  onClick={() => {
                    if (!window.confirm(t('details.mergeQuestionsConfirm'))) return
                    setActionError('')
                    merge.mutate({ id: paperId, ordinals: selectedOrdinals })
                  }}
                >
                  {merge.isPending ? t('details.mergingQuestions') : t('details.mergeQuestions')}
                </Button>
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {list.map((question, index) => {
                const open = openIndexes.includes(index)
                const sittings = question.appearances.filter((sitting) => sitting.paperId !== paperId)
                return (
                  <li key={`${question.questionId}-${question.ordinal}`}>
                    <div className="flex items-start gap-2 px-4 py-2.5">
                      {staffUser && (
                        <input
                          type="checkbox"
                          className="mt-2 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                          checked={selectedOrdinals.includes(question.ordinal)}
                          aria-label={t('details.selectQuestion', { label: question.label })}
                          onChange={() => toggleSelected(question.ordinal)}
                        />
                      )}
                      <button
                        type="button"
                        aria-expanded={open}
                        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 text-left"
                        onClick={() => toggle(index)}
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{question.label}</span>
                          {question.appearedRecently && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {t('details.appearedRecently')}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-700">
                          {open ? t('details.questionsCollapse') : t('details.questionsExpand')}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </div>
                    {open && (
                      <div className="space-y-3 px-4 pb-3">
                        {editingOrdinal === question.ordinal ? (
                          <form
                            className="space-y-3"
                            onSubmit={(event) => {
                              event.preventDefault()
                              void submitEdit(question.ordinal)
                            }}
                          >
                            <Field label={t('details.questionLabel')} required>
                              <Input
                                maxLength={50}
                                value={editLabel}
                                onChange={(event) => setEditLabel(event.target.value)}
                              />
                            </Field>
                            <Field label={t('details.questionText')} required>
                              <Textarea
                                value={editText}
                                onChange={(event) => setEditText(event.target.value)}
                              />
                            </Field>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="secondary"
                                className="min-h-8 px-3 py-1"
                                disabled={busy}
                                onClick={() => setEditingOrdinal(null)}
                              >
                                {t('details.cancelEdit')}
                              </Button>
                              <Button type="submit" className="min-h-8 px-3 py-1" disabled={busy}>
                                {update.isPending ? t('details.savingQuestion') : t('details.saveQuestion')}
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{question.text}</p>
                        )}
                        {sittings.length > 0 && (
                          <div>
                            <p className="text-xs font-medium uppercase text-slate-500">{t('details.otherSittings')}</p>
                            <ul className="mt-1.5 space-y-1">
                              {sittings.map((sitting) => {
                                const label = t('details.sitting', {
                                  month: months[sitting.month - 1],
                                  year: sitting.year,
                                  examType: t(`common.examTypes.${sitting.examType}`),
                                })
                                return (
                                  <li key={`${sitting.paperId}-${sitting.ordinal}`}>
                                    {onOpenPaper ? (
                                      <button
                                        type="button"
                                        className="text-sm font-semibold text-indigo-700 hover:underline"
                                        onClick={() => onOpenPaper(sitting.paperId)}
                                      >
                                        {label}
                                      </button>
                                    ) : (
                                      <span className="text-sm text-slate-600">{label}</span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                        {staffUser && editingOrdinal !== question.ordinal && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              className="min-h-8 px-3 py-1"
                              disabled={busy}
                              onClick={() => startEdit(question)}
                            >
                              {t('details.editQuestion')}
                            </Button>
                            <Button
                              variant="danger"
                              className="min-h-8 px-3 py-1"
                              disabled={busy}
                              onClick={() => {
                                if (!window.confirm(t('details.deleteQuestionConfirm'))) return
                                setActionError('')
                                remove.mutate({ id: paperId, ordinal: question.ordinal })
                              }}
                            >
                              {remove.isPending ? t('details.deletingQuestion') : t('details.deleteQuestion')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
