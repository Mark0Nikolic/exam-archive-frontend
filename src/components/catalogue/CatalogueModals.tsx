import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import type { Major, Study, Subject } from '../../lib/types'
import { fieldError, localizedName } from '../../lib/utils'
import {
  attachSubject,
  createMajor,
  createStudy,
  createSubject,
  getCatalogueSubjects,
  updateMajor,
  updateStudy,
  updateSubject,
} from '../../services/catalogue'
import { Button, Field, Input, Modal, Pagination, Select } from '../ui'

function optional(value: string) {
  return value.trim() || null
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function ModalActions({
  busy,
  onClose,
}: {
  busy: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
      <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
      <Button type="submit" disabled={busy}>
        {busy ? t('catalogue.saving') : t('catalogue.save')}
      </Button>
    </div>
  )
}

export function StudyFormModal({
  study,
  onClose,
  onSaved,
}: {
  study?: Study
  onClose: () => void
  onSaved: (study: Study) => void
}) {
  const { t } = useTranslation()
  const [nameSr, setNameSr] = useState(study?.nameSr ?? '')
  const [nameEn, setNameEn] = useState(study?.nameEn ?? '')
  const [years, setYears] = useState(String(study?.yearsOfStudy ?? 3))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const mutation = useMutation({
    mutationFn: study
      ? (input: { nameSr: string; nameEn: string | null; yearsOfStudy: number }) =>
          updateStudy({ id: study.id, ...input })
      : createStudy,
    onSuccess: onSaved,
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!nameSr.trim()) nextErrors.nameSr = t('catalogue.validation.nameSrRequired')
    if (!Number.isInteger(Number(years)) || Number(years) < 1) {
      nextErrors.years = t('catalogue.validation.yearsRequired')
    }
    setErrors(nextErrors)
    setGeneralError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await mutation.mutateAsync({
        nameSr: nameSr.trim(),
        nameEn: optional(nameEn),
        yearsOfStudy: Number(years),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nameSr: fieldError(error.errors, 'NameSr') ?? '',
          nameEn: fieldError(error.errors, 'NameEn') ?? '',
          years: fieldError(error.errors, 'YearsOfStudy') ?? '',
        })
      }
      setGeneralError(apiMessage(error, t('catalogue.saveError')))
    }
  }

  return (
    <Modal
      open
      title={study ? t('catalogue.editStudy') : t('catalogue.addStudy')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label={t('catalogue.nameSr')} error={errors.nameSr} required>
            <Input value={nameSr} maxLength={100} onChange={(event) => setNameSr(event.target.value)} />
          </Field>
          <Field label={t('catalogue.nameEn')} error={errors.nameEn}>
            <Input value={nameEn} maxLength={100} onChange={(event) => setNameEn(event.target.value)} />
          </Field>
          <Field label={t('catalogue.yearsOfStudy')} error={errors.years} required>
            <Input type="number" min={1} value={years} onChange={(event) => setYears(event.target.value)} />
          </Field>
          {generalError && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{generalError}</p>}
        </div>
        <ModalActions busy={mutation.isPending} onClose={onClose} />
      </form>
    </Modal>
  )
}

export function MajorFormModal({
  major,
  studies,
  selectedStudyId,
  onClose,
  onSaved,
}: {
  major?: Major
  studies: Study[]
  selectedStudyId: number
  onClose: () => void
  onSaved: (major: Major) => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [nameSr, setNameSr] = useState(major?.nameSr ?? '')
  const [nameEn, setNameEn] = useState(major?.nameEn ?? '')
  const [studiesId, setStudiesId] = useState(String(major?.studiesId ?? selectedStudyId))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const mutation = useMutation({
    mutationFn: major
      ? (input: { nameSr: string; nameEn: string | null; studiesId: number }) =>
          updateMajor({ id: major.id, ...input })
      : createMajor,
    onSuccess: onSaved,
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!nameSr.trim()) nextErrors.nameSr = t('catalogue.validation.nameSrRequired')
    if (!studiesId) nextErrors.studiesId = t('catalogue.validation.studyRequired')
    setErrors(nextErrors)
    setGeneralError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await mutation.mutateAsync({
        nameSr: nameSr.trim(),
        nameEn: optional(nameEn),
        studiesId: Number(studiesId),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nameSr: fieldError(error.errors, 'NameSr') ?? '',
          nameEn: fieldError(error.errors, 'NameEn') ?? '',
          studiesId: fieldError(error.errors, 'StudiesId') ?? '',
        })
      }
      setGeneralError(apiMessage(error, t('catalogue.saveError')))
    }
  }

  return (
    <Modal
      open
      title={major ? t('catalogue.editMajor') : t('catalogue.addMajor')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label={t('catalogue.nameSr')} error={errors.nameSr} required>
            <Input value={nameSr} maxLength={200} onChange={(event) => setNameSr(event.target.value)} />
          </Field>
          <Field label={t('catalogue.nameEn')} error={errors.nameEn}>
            <Input value={nameEn} maxLength={200} onChange={(event) => setNameEn(event.target.value)} />
          </Field>
          <Field label={t('papers.studyProgram')} error={errors.studiesId} required>
            <Select value={studiesId} onChange={(event) => setStudiesId(event.target.value)}>
              {studies.map((study) => (
                <option key={study.id} value={study.id}>{localizedName(study, language)}</option>
              ))}
            </Select>
          </Field>
          {generalError && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{generalError}</p>}
        </div>
        <ModalActions busy={mutation.isPending} onClose={onClose} />
      </form>
    </Modal>
  )
}

export function SubjectFormModal({
  subject,
  majorId,
  maximumYear,
  placementYear,
  onClose,
  onSaved,
}: {
  subject?: Pick<Subject, 'id' | 'code' | 'nameSr' | 'nameEn'>
  majorId?: number
  maximumYear: number
  placementYear?: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [nameSr, setNameSr] = useState(subject?.nameSr ?? '')
  const [nameEn, setNameEn] = useState(subject?.nameEn ?? '')
  const [code, setCode] = useState(subject?.code ?? '')
  const [year, setYear] = useState(String(placementYear ?? 1))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const mutation = useMutation({
    mutationFn: async () => {
      const identity = {
        nameSr: nameSr.trim(),
        nameEn: optional(nameEn),
        code: optional(code),
      }
      if (subject) {
        return updateSubject({
          id: subject.id,
          ...identity,
          ...(majorId ? { majorId, yearOfStudy: Number(year) } : {}),
        })
      }
      return createSubject({
        ...identity,
        majorId: majorId as number,
        yearOfStudy: Number(year),
      })
    },
    onSuccess: onSaved,
  })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!nameSr.trim()) nextErrors.nameSr = t('catalogue.validation.nameSrRequired')
    if (!subject && !majorId) nextErrors.year = t('catalogue.validation.majorRequired')
    if (majorId && (!Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > maximumYear)) {
      nextErrors.year = t('catalogue.validation.yearRange', { max: maximumYear })
    }
    setErrors(nextErrors)
    setGeneralError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await mutation.mutateAsync()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nameSr: fieldError(error.errors, 'NameSr') ?? '',
          nameEn: fieldError(error.errors, 'NameEn') ?? '',
          code: fieldError(error.errors, 'Code') ?? '',
          year: fieldError(error.errors, 'YearOfStudy') ?? '',
        })
      }
      setGeneralError(apiMessage(error, t('catalogue.saveError')))
    }
  }

  return (
    <Modal
      open
      title={subject ? t('catalogue.editSubject') : t('catalogue.addSubject')}
      description={majorId ? t('catalogue.subjectPlacementDescription') : t('catalogue.subjectIdentityDescription')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label={t('catalogue.code')} error={errors.code}>
            <Input value={code} maxLength={20} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <div />
          <Field label={t('catalogue.nameSr')} error={errors.nameSr} required>
            <Input value={nameSr} maxLength={200} onChange={(event) => setNameSr(event.target.value)} />
          </Field>
          <Field label={t('catalogue.nameEn')} error={errors.nameEn}>
            <Input value={nameEn} maxLength={200} onChange={(event) => setNameEn(event.target.value)} />
          </Field>
          {majorId && (
            <Field label={t('papers.yearOfStudy')} error={errors.year} required>
              <Select value={year} onChange={(event) => setYear(event.target.value)}>
                {Array.from({ length: maximumYear }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>{t('common.studyYear', { year: value })}</option>
                ))}
              </Select>
            </Field>
          )}
          {generalError && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{generalError}</p>}
        </div>
        <ModalActions busy={mutation.isPending} onClose={onClose} />
      </form>
    </Modal>
  )
}

export function AttachSubjectModal({
  majorId,
  maximumYear,
  attachedSubjectIds,
  onClose,
  onSaved,
}: {
  majorId: number
  maximumYear: number
  attachedSubjectIds: number[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [subjectId, setSubjectId] = useState('')
  const [year, setYear] = useState('1')
  const [generalError, setGeneralError] = useState('')
  const subjects = useQuery({
    queryKey: ['lookups', 'subject-catalogue', search, page],
    queryFn: () => getCatalogueSubjects(search, page),
  })
  const available = (subjects.data?.data ?? []).filter(
    (subject) => !attachedSubjectIds.includes(subject.id),
  )
  const mutation = useMutation({
    mutationFn: () => attachSubject({
      majorId,
      subjectId: Number(subjectId),
      yearOfStudy: Number(year),
    }),
    onSuccess: onSaved,
    onError: (error) => setGeneralError(apiMessage(error, t('catalogue.attachError'))),
  })

  return (
    <Modal open title={t('catalogue.attachSubject')} description={t('catalogue.attachDescription')} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setGeneralError('')
          if (!subjectId) {
            setGeneralError(t('catalogue.validation.subjectRequired'))
            return
          }
          mutation.mutate()
        }}
      >
        <div className="space-y-5 p-5 sm:p-6">
          <Field label={t('catalogue.searchSubjects')}>
            <Input
              value={search}
              placeholder={t('catalogue.searchPlaceholder')}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
                setSubjectId('')
              }}
            />
          </Field>
          <Field label={t('papers.subject')} required>
            <Select value={subjectId} disabled={subjects.isPending} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">{t('catalogue.selectExistingSubject')}</option>
              {available.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} — ` : ''}{localizedName(subject, language)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('papers.yearOfStudy')} required>
            <Select value={year} onChange={(event) => setYear(event.target.value)}>
              {Array.from({ length: maximumYear }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{t('common.studyYear', { year: value })}</option>
              ))}
            </Select>
          </Field>
          {subjects.data && subjects.data.meta.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={subjects.data.meta.totalPages}
              totalItems={subjects.data.meta.totalItems}
              onChange={(nextPage) => {
                setPage(nextPage)
                setSubjectId('')
              }}
            />
          )}
          {generalError && <p role="alert" className="text-sm text-rose-700">{generalError}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('catalogue.attaching') : t('catalogue.attach')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
