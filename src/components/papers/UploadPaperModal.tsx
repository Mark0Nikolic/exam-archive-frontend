import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/axios'
import { EXAM_TYPES } from '../../lib/types'
import type { ExamType } from '../../lib/types'
import { fieldError, formatBytes, monthNames } from '../../lib/utils'
import { getMajors, getStudies, getSubjects } from '../../services/lookups'
import { paperKeys, uploadPaper } from '../../services/papers'
import { Button, Field, Input, Modal, Select } from '../ui'

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

function validate(form: FormState) {
  const errors: Record<string, string> = {}
  const year = Number(form.year)
  const totalSize = form.files.reduce((sum, file) => sum + file.size, 0)
  const pdfCount = form.files.filter(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
  ).length
  const allowed = /\.(pdf|jpe?g|png|webp)$/i

  if (!form.studyId) errors.studyId = 'Choose a study program.'
  if (!form.majorId) errors.majorId = 'Choose a major.'
  if (!form.subjectId) errors.subjectId = 'Choose a subject.'
  if (!form.month) errors.month = 'Choose the exam month.'
  if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    errors.year = `Enter a year between 1990 and ${new Date().getFullYear() + 1}.`
  }
  if (form.files.length === 0) errors.files = 'Add at least one file.'
  else if (form.files.length > 10) errors.files = 'A paper can contain at most 10 files.'
  else if (pdfCount > 2) errors.files = 'A paper can contain at most 2 PDF files.'
  else if (form.files.some((file) => !allowed.test(file.name))) {
    errors.files = 'Only PDF, JPG, JPEG, PNG, and WEBP files are supported.'
  } else if (form.files.some((file) => file.size > 20 * 1024 * 1024)) {
    errors.files = 'Each file must be 20 MB or smaller.'
  } else if (totalSize > 100 * 1024 * 1024) {
    errors.files = 'The combined upload must be 100 MB or smaller.'
  }

  return errors
}

export function UploadPaperModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    queryKey: ['lookups', 'subjects', form.majorId],
    queryFn: () => getSubjects(Number(form.majorId)),
    enabled: open && Boolean(form.majorId),
    staleTime: 30 * 60 * 1000,
  })

  const visibleSubjects = (subjects.data?.data ?? [])
    .filter((subject) => !form.yearOfStudy || subject.yearOfStudy === Number(form.yearOfStudy))
    .sort((a, b) => a.nameSr.localeCompare(b.nameSr, 'sr'))

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
    const nextErrors = validate(form)
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
        setGeneralError('The paper could not be uploaded.')
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
      title={result ? 'Paper uploaded' : 'Upload a paper'}
      description={
        result
          ? 'Your upload has been received.'
          : 'Files are stored in the order shown below. Required fields are marked.'
      }
      onClose={close}
      width="max-w-3xl"
    >
      {result ? (
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">
              Paper #{result.id} is {result.status.toLowerCase()}.
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              {result.status === 'Pending'
                ? 'A moderator will review the submission.'
                : 'The paper is now available in the archive.'}
            </p>
          </div>
          {result.claimToken && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">Save this claim token now</p>
              <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {result.claimToken}
              </code>
              <p className="mt-2 text-xs text-amber-800">The API returns this token only once.</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Study program" error={errors.studyId} required>
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
                <option value="">Select a program</option>
                {studies.data?.data.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.nameEn || study.nameSr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Major" error={errors.majorId} required>
              <Select
                value={form.majorId}
                disabled={!form.studyId || majors.isPending}
                onChange={(event) => {
                  update('majorId', event.target.value)
                  setForm((current) => ({ ...current, yearOfStudy: '', subjectId: '' }))
                }}
              >
                <option value="">Select a major</option>
                {majors.data?.data.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.nameEn || major.nameSr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Year of study">
              <Select
                value={form.yearOfStudy}
                disabled={!form.majorId}
                onChange={(event) => {
                  update('yearOfStudy', event.target.value)
                  update('subjectId', '')
                }}
              >
                <option value="">All years</option>
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" error={errors.subjectId} required>
              <Select
                value={form.subjectId}
                disabled={!form.majorId || subjects.isPending}
                onChange={(event) => update('subjectId', event.target.value)}
              >
                <option value="">Select a subject</option>
                {visibleSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {subject.nameEn || subject.nameSr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Exam type" error={errors.examType} required>
              <Select
                value={form.examType}
                onChange={(event) => update('examType', event.target.value as ExamType)}
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <Field label="Exam month" error={errors.month} required>
              <Select value={form.month} onChange={(event) => update('month', event.target.value)}>
                <option value="">Select a month</option>
                {monthNames.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Exam year" error={errors.year} required>
              <Input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(event) => update('year', event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Paper files"
                error={errors.files}
                hint="Up to 10 files; PDF or images; 20 MB each and 100 MB total."
                required
              >
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-indigo-700"
                  onChange={(event) => update('files', Array.from(event.target.files ?? []))}
                />
              </Field>
              {form.files.length > 0 && (
                <ol className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {form.files.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Move ${file.name} up`}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        onClick={() => moveFile(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${file.name} down`}
                        disabled={index === form.files.length - 1}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        onClick={() => moveFile(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => update('files', form.files.filter((_, fileIndex) => fileIndex !== index))}
                      >
                        ×
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
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Uploading…' : 'Upload paper'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
