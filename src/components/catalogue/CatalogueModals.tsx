import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toAppLanguage } from '../../i18n'
import { ApiError } from '../../lib/axios'
import type { CatalogueSubject, Major, Study, Subject, SubjectPlacement } from '../../lib/types'
import { fieldError, localizedName, yearsOfStudyForStudy } from '../../lib/utils'
import {
  attachSubject,
  catalogueKeys,
  createMajor,
  detachSubject,
  createStudy,
  createSubject,
  getCatalogueSubjects,
  updateMajor,
  updateStudy,
  unlinkedMajorValue,
  updateSubject,
} from '../../services/catalogue'
import { getMajors, getStudies } from '../../services/lookups'
import { Button, Field, Input, Modal, Select } from '../ui'

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
  placements = [],
  preferUnlinked = false,
  onClose,
  onSaved,
}: {
  subject?: Pick<Subject, 'id' | 'code' | 'nameSr' | 'nameEn'>
  majorId?: number
  maximumYear: number
  placementYear?: number
  placements?: SubjectPlacement[]
  preferUnlinked?: boolean
  onClose: () => void
  onSaved: (placement?: { majorId: number; studiesId: number; yearOfStudy: number } | { unlinked: true }) => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const placing = true
  const [nameSr, setNameSr] = useState(subject?.nameSr ?? '')
  const [nameEn, setNameEn] = useState(subject?.nameEn ?? '')
  const [code, setCode] = useState(subject?.code ?? '')
  const [chosenMajorId, setChosenMajorId] = useState(
    majorId ? String(majorId) : (preferUnlinked || subject ? unlinkedMajorValue : ''),
  )
  const [year, setYear] = useState(String(placementYear ?? 1))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const studies = useQuery({
    queryKey: catalogueKeys.studies,
    queryFn: getStudies,
    enabled: placing,
    staleTime: 10 * 60 * 1000,
  })
  const majors = useQuery({
    queryKey: ['lookups', 'majors', 'all', studies.data?.data.map((study) => study.id).join(',')],
    queryFn: async () => {
      const pages = await Promise.all((studies.data?.data ?? []).map((study) => getMajors(study.id)))
      return pages.flatMap((page) => page.data)
    },
    enabled: placing && (studies.data?.data.length ?? 0) > 0,
  })
  const leavingUnlinked = chosenMajorId === unlinkedMajorValue
  const selectedMajor = majors.data?.find((major) => String(major.id) === chosenMajorId)
  const selectedStudy = studies.data?.data.find((study) => study.id === selectedMajor?.studiesId)
  const yearOptions = selectedMajor ? yearsOfStudyForStudy(selectedStudy) : Array.from({ length: Math.max(maximumYear, 1) }, (_, index) => index + 1)
  const majorOptions = (majors.data ?? []).map((major) => {
    const study = studies.data?.data.find((item) => item.id === major.studiesId)
    const studyName = study ? localizedName(study, language) : ''
    return {
      id: major.id,
      label: studyName ? `${localizedName(major, language)} — ${studyName}` : localizedName(major, language),
    }
  })
  const mutation = useMutation({
    mutationFn: async () => {
      const identity = {
        nameSr: nameSr.trim(),
        nameEn: optional(nameEn),
        code: optional(code),
      }
      if (leavingUnlinked) {
        if (subject) {
          await updateSubject({ id: subject.id, ...identity })
          const majorIds = new Set([
            ...placements.map((item) => item.majorId),
            ...(majorId ? [majorId] : []),
          ])
          for (const linkedMajorId of majorIds) {
            await detachSubject({ majorId: linkedMajorId, subjectId: subject.id })
          }
        } else {
          await createSubject(identity)
        }
        return
      }
      const placement = { majorId: Number(chosenMajorId), yearOfStudy: Number(year) }
      if (subject) {
        const linked = new Set([
          ...placements.map((item) => item.majorId),
          ...(majorId ? [majorId] : []),
        ])
        if (linked.has(placement.majorId)) {
          return updateSubject({
            id: subject.id,
            ...identity,
            ...placement,
          })
        }
        await updateSubject({
          id: subject.id,
          ...identity,
        })
        return attachSubject({
          majorId: placement.majorId,
          subjectId: subject.id,
          yearOfStudy: placement.yearOfStudy,
        })
      }
      return createSubject({
        ...identity,
        ...placement,
      })
    },
    onSuccess: () => {
      if (leavingUnlinked) {
        onSaved({ unlinked: true })
        return
      }
      const major = majors.data?.find((item) => String(item.id) === chosenMajorId)
      onSaved({
        majorId: Number(chosenMajorId),
        studiesId: major?.studiesId ?? 0,
        yearOfStudy: Number(year),
      })
    },
  })

  useEffect(() => {
    if (!selectedMajor) return
    const years = yearsOfStudyForStudy(selectedStudy)
    setYear((current) => (years.includes(Number(current)) ? current : String(years[0] ?? 1)))
  }, [selectedMajor, selectedStudy])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!nameSr.trim()) nextErrors.nameSr = t('catalogue.validation.nameSrRequired')
    if (!leavingUnlinked && !selectedMajor) nextErrors.major = t('catalogue.validation.majorRequired')
    if (!leavingUnlinked && (!Number.isInteger(Number(year)) || !yearOptions.includes(Number(year)))) {
      nextErrors.year = t('catalogue.validation.yearRange', { max: yearOptions.at(-1) ?? maximumYear })
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
          major: fieldError(error.errors, 'MajorId') ?? '',
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
      description={subject ? t('catalogue.subjectPlacementDescription') : t('catalogue.addSubjectDescription')}
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
          {placing && (
            <>
              <Field label={t('papers.major')} error={errors.major} required>
                <Select
                  value={chosenMajorId}
                  disabled={majors.isPending}
                  onChange={(event) => {
                    const nextMajorId = event.target.value
                    setChosenMajorId(nextMajorId)
                    const nextMajor = majors.data?.find((major) => String(major.id) === nextMajorId)
                    const nextStudy = studies.data?.data.find((study) => study.id === nextMajor?.studiesId)
                    const nextYears = yearsOfStudyForStudy(nextStudy)
                    setYear((current) => (nextYears.includes(Number(current)) ? current : String(nextYears[0] ?? 1)))
                  }}
                >
                  <option value="">{t('catalogue.selectMajor')}</option>
                  <option value={unlinkedMajorValue}>{t('catalogue.notLinked')}</option>
                  {majorOptions.map((major) => (
                    <option key={major.id} value={major.id}>{major.label}</option>
                  ))}
                </Select>
              </Field>
              {!leavingUnlinked && (
              <Field label={t('papers.yearOfStudy')} error={errors.year} required>
                <Select value={year} disabled={!chosenMajorId} onChange={(event) => setYear(event.target.value)}>
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>{t('common.studyYear', { year: value })}</option>
                  ))}
                </Select>
              </Field>
              )}
              {studies.isSuccess && majorOptions.length === 0 && !leavingUnlinked && (
                <p className="text-sm text-rose-700 sm:col-span-2">{t('catalogue.noMajorDescription')}</p>
              )}
            </>
          )}
          {generalError && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{generalError}</p>}
        </div>
        <ModalActions
          busy={mutation.isPending || (!leavingUnlinked && studies.isPending) || (!leavingUnlinked && majors.isFetching)}
          onClose={onClose}
        />
      </form>
    </Modal>
  )
}

function subjectOptionLabel(subject: CatalogueSubject, language: ReturnType<typeof toAppLanguage>) {
  const name = localizedName(subject, language)
  return subject.code ? `${subject.code} — ${name}` : name
}

export function AttachSubjectModal({
  defaultMajorId,
  defaultYear,
  onClose,
  onSaved,
}: {
  defaultMajorId: number
  defaultYear?: number
  onClose: () => void
  onSaved: (yearOfStudy?: number) => void
}) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [selected, setSelected] = useState<CatalogueSubject | null>(null)
  const [major1, setMajor1] = useState(String(defaultMajorId))
  const [year1, setYear1] = useState(String(defaultYear ?? 1))
  const [major2, setMajor2] = useState('')
  const [year2, setYear2] = useState(String(defaultYear ?? 1))
  const [generalError, setGeneralError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  const studies = useQuery({
    queryKey: catalogueKeys.studies,
    queryFn: getStudies,
    staleTime: 10 * 60 * 1000,
  })
  const majors = useQuery({
    queryKey: ['lookups', 'majors', 'all', studies.data?.data.map((study) => study.id).join(',')],
    queryFn: async () => {
      const pages = await Promise.all((studies.data?.data ?? []).map((study) => getMajors(study.id)))
      return pages.flatMap((page) => page.data)
    },
    enabled: (studies.data?.data.length ?? 0) > 0,
  })
  const subjects = useQuery({
    queryKey: ['lookups', 'subject-catalogue', query, 1],
    queryFn: () => getCatalogueSubjects(query, 1),
    enabled: listOpen,
  })

  const yearsFor = (majorId: string) => {
    const major = majors.data?.find((item) => String(item.id) === majorId)
    const study = studies.data?.data.find((item) => item.id === major?.studiesId)
    return yearsOfStudyForStudy(study)
  }

  const changeMajor = (slot: 1 | 2, value: string) => {
    const years = yearsFor(value)
    const nextYear = (current: string) => (years.includes(Number(current)) ? current : String(years[0] ?? 1))
    if (slot === 1) {
      setMajor1(value)
      setYear1(nextYear)
      if (value && value === major2) setMajor2('')
    } else {
      setMajor2(value)
      setYear2(nextYear)
    }
  }

  const chooseSubject = (subject: CatalogueSubject) => {
    setSelected(subject)
    setSearch(subjectOptionLabel(subject, language))
    setListOpen(false)
    const [first, second] = subject.placements
    if (first) {
      setMajor1(String(first.majorId))
      setYear1(String(first.yearOfStudy))
    }
    if (second && second.majorId !== first?.majorId) {
      setMajor2(String(second.majorId))
      setYear2(String(second.yearOfStudy))
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) return 0
      const pairs = [
        { majorId: Number(major1), yearOfStudy: Number(year1) },
        { majorId: Number(major2), yearOfStudy: Number(year2) },
      ]
      let changes = 0
      for (const pair of pairs) {
        const existing = selected.placements.find((placement) => placement.majorId === pair.majorId)
        if (existing?.yearOfStudy === pair.yearOfStudy) continue
        changes += 1
        if (existing) {
          await updateSubject({
            id: selected.id,
            nameSr: selected.nameSr,
            nameEn: selected.nameEn,
            code: selected.code,
            majorId: pair.majorId,
            yearOfStudy: pair.yearOfStudy,
          })
        } else {
          await attachSubject({
            majorId: pair.majorId,
            subjectId: selected.id,
            yearOfStudy: pair.yearOfStudy,
          })
        }
      }
      return changes
    },
    onSuccess: (changes) => {
      if (changes === 0) {
        setGeneralError(t('catalogue.alreadyLinked'))
        return
      }
      const remembered = [Number(major1), Number(major2)].includes(defaultMajorId)
        ? (String(defaultMajorId) === major1 ? Number(year1) : Number(year2))
        : Number(year1)
      onSaved(remembered)
    },
    onError: (error) => setGeneralError(apiMessage(error, t('catalogue.attachError'))),
  })

  const majorOptions = (majors.data ?? []).map((major) => {
    const study = studies.data?.data.find((item) => item.id === major.studiesId)
    const studyName = study ? localizedName(study, language) : ''
    return {
      id: major.id,
      label: studyName ? `${localizedName(major, language)} — ${studyName}` : localizedName(major, language),
    }
  })

  return (
    <Modal open title={t('catalogue.attachSubject')} description={t('catalogue.attachDescription')} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setGeneralError('')
          if (!selected) {
            setGeneralError(t('catalogue.validation.subjectRequired'))
            return
          }
          if (!major1 || !major2) {
            setGeneralError(t('catalogue.validation.majorRequired'))
            return
          }
          if (major1 === major2) {
            setGeneralError(t('catalogue.majorsMustDiffer'))
            return
          }
          mutation.mutate()
        }}
      >
        <div className="space-y-5 p-5 sm:p-6">
          <Field label={t('papers.subject')} required>
            <span className="relative block">
              <Input
                value={search}
                placeholder={t('catalogue.searchPlaceholder')}
                autoComplete="off"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls="attach-subject-results"
                onFocus={() => setListOpen(true)}
                onBlur={() => setListOpen(false)}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setSelected(null)
                  setListOpen(true)
                }}
              />
              {listOpen && (
                <div
                  id="attach-subject-results"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {subjects.isPending ? (
                    <p className="px-3 py-2 text-sm text-slate-500">{t('common.loading')}</p>
                  ) : (subjects.data?.data.length ?? 0) === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">{t('catalogue.searchNoResults')}</p>
                  ) : subjects.data?.data.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      role="option"
                      className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-accent-wash"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSubject(subject)}
                    >
                      {subjectOptionLabel(subject, language)}
                    </button>
                  ))}
                </div>
              )}
            </span>
          </Field>
          {selected && selected.placements.length > 0 && (
            <p className="text-sm text-slate-500">
              {selected.placements.map((placement) =>
                `${localizedName({ nameSr: placement.majorNameSr, nameEn: placement.majorNameEn }, language)} (${t('common.studyYear', { year: placement.yearOfStudy })})`,
              ).join(', ')}
            </p>
          )}
          {([1, 2] as const).map((slot) => {
            const majorId = slot === 1 ? major1 : major2
            const year = slot === 1 ? year1 : year2
            return (
              <div key={slot} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <Field label={t(slot === 1 ? 'catalogue.majorOne' : 'catalogue.majorTwo')} required>
                  <Select value={majorId} disabled={majors.isPending} onChange={(event) => changeMajor(slot, event.target.value)}>
                    <option value="">{t('catalogue.noMajors')}</option>
                    {majorOptions.map((major) => {
                      const takenByOther = String(major.id) === (slot === 1 ? major2 : major1)
                      return (
                        <option key={major.id} value={major.id} disabled={takenByOther}>{major.label}</option>
                      )
                    })}
                  </Select>
                </Field>
                <Field label={t('papers.yearOfStudy')} required>
                  <Select
                    value={year}
                    disabled={!majorId}
                    onChange={(event) => (slot === 1 ? setYear1(event.target.value) : setYear2(event.target.value))}
                  >
                    {yearsFor(majorId).map((value) => (
                      <option key={value} value={value}>{t('common.studyYear', { year: value })}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )
          })}
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
