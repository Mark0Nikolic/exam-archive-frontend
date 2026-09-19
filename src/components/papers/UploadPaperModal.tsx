import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import { EXAM_TYPES } from '../../lib/types'
import type { ExamType } from '../../lib/types'
import { compareLocalizedNames, fieldError, formatBytes, localizedName, monthNames, yearsOfStudyForStudy } from '../../lib/utils'
import { getMajors, getStudies, getSubjects } from '../../services/lookups'
import { paperKeys, uploadPaper } from '../../services/papers'
import { Button, Field, FileDropZone, Input, Modal, Select } from '../ui'

interface FormState {
  studyId: string
  majorId: string
  yearOfStudy: string
  subjectId: string
  examType: ExamType
  month: string
  year: string
  files: File[]
}

const initialState = (): FormState => ({
  studyId: '',
  majorId: '',
  yearOfStudy: '',
  subjectId: '',
  examType: 'Midterm',
  month: '',
  year: String(new Date().getFullYear()),
  files: [],
})

function validate(form: FormState, t: TFunction) {
  const errors: Record<string, string> = {}
  const year = Number(form.year)
  const totalSize = form.files.reduce((sum, file) => sum + file.size, 0)
  const pdfCount = form.files.filter(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
  ).length
  const allowed = /\.(pdf|jpe?g|png|webp)$/i

  if (!form.studyId) errors.studyId = t('upload.validation.studyRequired')
  if (!form.majorId) errors.majorId = t('upload.validation.majorRequired')
  if (!form.subjectId) errors.subjectId = t('upload.validation.subjectRequired')
  if (!form.month) errors.month = t('upload.validation.monthRequired')
  if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    errors.year = t('upload.validation.yearRange', { max: new Date().getFullYear() + 1 })
  }
  if (form.files.length === 0) errors.files = t('upload.validation.filesRequired')
  else if (form.files.length > 10) errors.files = t('upload.validation.tooManyFiles')
  else if (pdfCount > 2) errors.files = t('upload.validation.tooManyPdfs')
  else if (form.files.some((file) => !allowed.test(file.name))) {
    errors.files = t('upload.validation.unsupportedFile')
  } else if (form.files.some((file) => file.size > 20 * 1024 * 1024)) {
    errors.files = t('upload.validation.fileTooLarge')
  } else if (totalSize > 100 * 1024 * 1024) {
    errors.files = t('upload.validation.uploadTooLarge')
  }

  return errors
}

export function UploadPaperModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const months = monthNames(language)
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')

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
    queryKey: ['lookups', 'subjects', form.majorId, form.yearOfStudy],
    queryFn: () => getSubjects(Number(form.majorId), form.yearOfStudy ? Number(form.yearOfStudy) : undefined),
    enabled: open && Boolean(form.majorId),
    staleTime: 30 * 60 * 1000,
  })

  const visibleSubjects = (subjects.data?.data ?? [])
    .filter((subject) => !form.yearOfStudy || subject.yearOfStudy === Number(form.yearOfStudy))
    .sort((a, b) => compareLocalizedNames(a, b, language))

  const selectedStudy = studies.data?.data.find((study) => String(study.id) === form.studyId)
  const studyYears = yearsOfStudyForStudy(selectedStudy)

  const mutation = useMutation({
    mutationFn: uploadPaper,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paperKeys.all }),
  })

  const close = () => {
    setForm(initialState())
    setErrors({})
    setGeneralError('')
    mutation.reset()
    onClose()
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setGeneralError('')
    const nextErrors = validate(form, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await mutation.mutateAsync({
        files: form.files,
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
          files:
            fieldError(error.errors, 'Files') ??
            Object.entries(error.errors).find(([key]) => key.toLowerCase().startsWith('files['))?.[1]?.[0] ??
            '',
        })
        setGeneralError(error.message)
      } else {
        setGeneralError(t('upload.failed'))
      }
    }
  }

  const moveFile = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= form.files.length) return
    const files = [...form.files]
    ;[files[index], files[destination]] = [files[destination], files[index]]
    update('files', files)
  }

  const result = mutation.data

  return (
    <Modal
      open={open}
      title={result ? t('upload.uploadedTitle') : t('upload.title')}
      description={result ? t('upload.received') : undefined}
      onClose={close}
      width="max-w-3xl"
    >
      {result ? (
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">
              {t('upload.result', {
                id: result.id,
                status: t(`common.statuses.${result.status}`).toLocaleLowerCase(language),
              })}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              {result.status === 'Pending'
                ? t('upload.pendingReview')
                : t('upload.available')}
            </p>
          </div>
          {result.claimToken && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">{t('upload.claimTitle')}</p>
              <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {result.claimToken}
              </code>
              <p className="mt-2 text-xs text-amber-800">{t('upload.claimDescription')}</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={close}>{t('common.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label={t('papers.studyProgram')} error={errors.studyId} required>
              <Select
                value={form.studyId}
                disabled={studies.isPending}
                onChange={(event) => {
                  update('studyId', event.target.value)
                  setForm((current) => ({
                    ...current,
                    majorId: '',
                    yearOfStudy: '',
                    subjectId: '',
                  }))
                }}
              >
                <option value="">{t('upload.selectProgram')}</option>
                {studies.data?.data.map((study) => (
                  <option key={study.id} value={study.id}>
                    {localizedName(study, language)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.major')} error={errors.majorId} required>
              <Select
                value={form.majorId}
                disabled={!form.studyId || majors.isPending}
                onChange={(event) => {
                  update('majorId', event.target.value)
                  setForm((current) => ({ ...current, yearOfStudy: '', subjectId: '' }))
                }}
              >
                <option value="">{t('upload.selectMajor')}</option>
                {majors.data?.data.map((major) => (
                  <option key={major.id} value={major.id}>
                    {localizedName(major, language)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.yearOfStudy')}>
              <Select
                value={form.yearOfStudy}
                disabled={!form.majorId}
                onChange={(event) => {
                  update('yearOfStudy', event.target.value)
                  update('subjectId', '')
                }}
              >
                <option value="">{t('papers.allYears')}</option>
                {studyYears.map((year) => (
                  <option key={year} value={year}>
                    {t('common.studyYear', { year })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.subject')} error={errors.subjectId} required>
              <Select
                value={form.subjectId}
                disabled={!form.majorId || subjects.isPending}
                onChange={(event) => update('subjectId', event.target.value)}
              >
                <option value="">{t('upload.selectSubject')}</option>
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
                onChange={(event) => update('examType', event.target.value as ExamType)}
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`common.examTypes.${type}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.month')} error={errors.month} required>
              <Select value={form.month} onChange={(event) => update('month', event.target.value)}>
                <option value="">{t('upload.selectMonth')}</option>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('papers.examYear')} error={errors.year} required>
              <Input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(event) => update('year', event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-slate-700">
                {t('upload.paperFiles')}<span className="ml-1 text-rose-600">*</span>
              </p>
              <div className="mt-1.5">
                <FileDropZone
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={mutation.isPending}
                  label={t('upload.dropLabel')}
                  onFiles={(files) => update('files', files)}
                />
              </div>
              {errors.files ? (
                <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.files}</span>
              ) : (
                <span className="mt-1.5 block text-xs text-slate-500">
                  {t('upload.fileHint')}
                </span>
              )}
              {form.files.length > 0 && (
                <ol className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {form.files.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-400">{formatBytes(file.size, language)}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={t('upload.moveUp', { name: file.name })}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        onClick={() => moveFile(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('upload.moveDown', { name: file.name })}
                        disabled={index === form.files.length - 1}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        onClick={() => moveFile(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('upload.removeFile', { name: file.name })}
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => update('files', form.files.filter((_, fileIndex) => fileIndex !== index))}
                      >
                        <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            {generalError && (
              <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{generalError}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('upload.uploading') : t('upload.submit')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}