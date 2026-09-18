import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import { EXAM_TYPES } from '../../lib/types'
import type { ExamType, PaperDetail } from '../../lib/types'
import {
  compareLocalizedNames,
  fieldError,
  isStaff,
  localizedName,
  localizedPaperSubject,
  monthNames,
  yearsOfStudyForStudy,
} from '../../lib/utils'
import { getMajors, getStudies, getSubjects } from '../../services/lookups'
import { getPaper, paperKeys, updatePaperMetadata } from '../../services/papers'
import { Button, ErrorState, Field, Input, LoadingState, Modal, Select } from '../ui'

interface EditForm {
  studyId: string
  majorId: string
  yearOfStudy: string
  subjectId: string
  examType: ExamType
  month: string
  year: string
}

const emptyForm = (): EditForm => ({
  studyId: '',
  majorId: '',
  yearOfStudy: '',
  subjectId: '',
  examType: 'Midterm',
  month: '',
  year: '',
})

function formFromPaper(paper: PaperDetail): EditForm {
  return {
    studyId: '',
    majorId: '',
    yearOfStudy: '',
    subjectId: String(paper.subjectId),
    examType: paper.examType,
    month: String(paper.month),
    year: String(paper.year),
  }
}

function validate(form: EditForm, t: TFunction) {
  const errors: Record<string, string> = {}
  const year = Number(form.year)
  if (!form.subjectId) errors.subjectId = t('editPaper.validation.subjectRequired')
  if (!form.month) errors.month = t('upload.validation.monthRequired')
  if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    errors.year = t('upload.validation.yearRange', { max: new Date().getFullYear() + 1 })
  }
  return errors
}

export function EditPaperModal({
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
  const [form, setForm] = useState<EditForm>(emptyForm)
  const [formPaper, setFormPaper] = useState<PaperDetail>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const open = paperId !== null && isStaff(user?.role)

  const paper = useQuery({
    queryKey: paperKeys.detail(paperId ?? 0),
    queryFn: () => getPaper(paperId as number),
    enabled: open,
  })
  const studies = useQuery({
    queryKey: ['lookups', 'studies'],
    queryFn: getStudies,
    enabled: open,
    staleTime: 30 * 60 * 1000,
  })
  const majors = useQuery({
    queryKey: ['lookups', 'majors', form.studyId],
    queryFn: () => getMajors(Number(form.studyId)),
    enabled: open && Boolean(form.studyId),
    staleTime: 30 * 60 * 1000,
  })
  const subjects = useQuery({
    queryKey: ['lookups', 'subjects', form.majorId],
    queryFn: () => getSubjects(Number(form.majorId)),
    enabled: open && Boolean(form.majorId),
    staleTime: 30 * 60 * 1000,
  })

  if (open && paper.data && paper.data !== formPaper) {
    setFormPaper(paper.data)
    setForm(formFromPaper(paper.data))
    setErrors({})
    setGeneralError('')
  }

  const selectedStudy = studies.data?.data.find((study) => String(study.id) === form.studyId)
  const studyYears = yearsOfStudyForStudy(selectedStudy)
  const visibleSubjects = (subjects.data?.data ?? [])
    .filter((subject) => !form.yearOfStudy || subject.yearOfStudy === Number(form.yearOfStudy))
    .sort((left, right) => compareLocalizedNames(left, right, language))

  const mutation = useMutation({
    mutationFn: updatePaperMetadata,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      onClose()
    },
  })

  const update = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paperId) return

    const nextErrors = validate(form, t)
    setErrors(nextErrors)
    setGeneralError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await mutation.mutateAsync({
        id: paperId,
        subjectId: Number(form.subjectId),
        examType: form.examType,
        month: Number(form.month),
        year: Number(form.year),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          subjectId: fieldError(error.errors, 'SubjectId') ?? '',
          examType: fieldError(error.errors, 'ExamType') ?? '',
          month: fieldError(error.errors, 'Month') ?? '',
          year: fieldError(error.errors, 'Year') ?? '',
        })
        setGeneralError(error.message)
      } else {
        setGeneralError(t('editPaper.saveError'))
      }
    }
  }

  const close = () => {
    setForm(emptyForm())
    setFormPaper(undefined)
    setErrors({})
    setGeneralError('')
    mutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('editPaper.title')}
      description={t('editPaper.description')}
      onClose={close}
      width="max-w-3xl"
    >
      {paper.isPending ? (
        <div className="p-6"><LoadingState label={t('editPaper.loading')} /></div>
      ) : paper.isError ? (
        <div className="p-6">
          <ErrorState
            message={paper.error instanceof ApiError ? paper.error.message : t('editPaper.loadError')}
            onRetry={() => paper.refetch()}
          />
        </div>
      ) : paper.data ? (
        <form onSubmit={submit}>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase text-slate-500">{t('editPaper.currentSubject')}</p>
              <p className="mt-1 font-semibold text-slate-800">{localizedPaperSubject(paper.data, language)}</p>
              <p className="mt-1 text-xs text-slate-500">{t('editPaper.subjectHint')}</p>
            </div>
            <Field label={t('papers.studyProgram')}>
              <Select
                value={form.studyId}
                disabled={studies.isPending || mutation.isPending}
                onChange={(event) => {
                  const studyId = event.target.value
                  setForm((current) => ({
                    ...current,
                    studyId,
                    majorId: '',
                    yearOfStudy: '',
                    subjectId: studyId ? '' : String(paper.data.subjectId),
                  }))
                  setErrors((current) => ({ ...current, subjectId: '' }))
                }}
              >
                <option value="">{t('editPaper.keepCurrentSubject')}</option>
                {studies.data?.data.map((study) => (
                  <option key={study.id} value={study.id}>{localizedName(study, language)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.major')}>
              <Select
                value={form.majorId}
                disabled={!form.studyId || majors.isPending || mutation.isPending}
                onChange={(event) => {
                  update('majorId', event.target.value)
                  setForm((current) => ({ ...current, yearOfStudy: '', subjectId: '' }))
                }}
              >
                <option value="">{t('upload.selectMajor')}</option>
                {majors.data?.data.map((major) => (
                  <option key={major.id} value={major.id}>{localizedName(major, language)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.yearOfStudy')}>
              <Select
                value={form.yearOfStudy}
                disabled={!form.majorId || mutation.isPending}
                onChange={(event) => {
                  update('yearOfStudy', event.target.value)
                  update('subjectId', '')
                }}
              >
                <option value="">{t('papers.allYears')}</option>
                {studyYears.map((year) => (
                  <option key={year} value={year}>{t(`common.yearOfStudy.${year}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.subject')} error={errors.subjectId} required>
              <Select
                value={form.subjectId}
                disabled={!form.majorId || subjects.isPending || mutation.isPending}
                onChange={(event) => update('subjectId', event.target.value)}
              >
                {!form.majorId && (
                  <option value={paper.data.subjectId}>{localizedPaperSubject(paper.data, language)}</option>
                )}
                {form.majorId && <option value="">{t('upload.selectSubject')}</option>}
                {visibleSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {localizedName(subject, language)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.examType')} error={errors.examType} required>
              <Select
                value={form.examType}
                disabled={mutation.isPending}
                onChange={(event) => update('examType', event.target.value as ExamType)}
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`common.examTypes.${type}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.month')} error={errors.month} required>
              <Select
                value={form.month}
                disabled={mutation.isPending}
                onChange={(event) => update('month', event.target.value)}
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.examYear')} error={errors.year} required>
              <Input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.year}
                disabled={mutation.isPending}
                onChange={(event) => update('year', event.target.value)}
              />
            </Field>
            {generalError && (
              <p role="alert" className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {generalError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('editPaper.saving') : t('editPaper.save')}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
