import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FileText, Link, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AttachSubjectModal,
  MajorFormModal,
  StudyFormModal,
  SubjectFormModal,
} from '../components/catalogue/CatalogueModals'
import {
  ActionMenu,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Pagination,
  Select,
} from '../components/ui'
import type { Column } from '../components/ui'
import { toAppLanguage } from '../i18n'
import { ApiError } from '../lib/axios'
import type { CatalogueSubject, Major, Study, Subject, SubjectPlacement } from '../lib/types'
import { localizedName, papersListPath, yearsOfStudyForStudy } from '../lib/utils'
import {
  catalogueKeys,
  deleteMajor,
  deleteStudy,
  deleteSubject,
  detachSubject,
  getCatalogueSubjects,
  getUnattachedSubjects,
  unlinkedMajorValue,
} from '../services/catalogue'
import { countPapersForMajor, countPapersForSubjects } from '../services/papers'
import { getMajors, getStudies, getSubjects } from '../services/lookups'

const toNumber = (value: string | null) => (value ? Number(value) : undefined)
const catalogueSelectionKey = 'exam-archive.catalogue'
const rememberedKeys = ['studiesId', 'majorId', 'yearOfStudy', 'view'] as const

type SubjectEditor = {
  subject?: Pick<Subject, 'id' | 'code' | 'nameSr' | 'nameEn'>
  majorId?: number
  maximumYear: number
  placementYear?: number
  placements?: SubjectPlacement[]
  preferUnlinked?: boolean
}

export function CataloguePage() {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const studyId = searchParams.get('studiesId') ?? ''
  const majorId = searchParams.get('majorId') ?? ''
  const yearOfStudy = toNumber(searchParams.get('yearOfStudy'))
  const view = searchParams.get('view') === 'all' ? 'all' : 'major'
  const search = searchParams.get('q') ?? ''
  const cataloguePage = toNumber(searchParams.get('page')) ?? 1
  const [studyEditor, setStudyEditor] = useState<Study | 'new' | null>(null)
  const [majorEditor, setMajorEditor] = useState<Major | 'new' | null>(null)
  const [subjectEditor, setSubjectEditor] = useState<SubjectEditor | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const skipSelectionPersist = useRef(true)

  useEffect(() => {
    if (skipSelectionPersist.current) {
      skipSelectionPersist.current = false
      const hasSelection = rememberedKeys.some((key) => searchParams.has(key))
      if (hasSelection) return
      try {
        const saved = JSON.parse(sessionStorage.getItem(catalogueSelectionKey) ?? '') as Record<string, string>
        if (!saved || typeof saved !== 'object') return
        setSearchParams((current) => {
          if (rememberedKeys.some((key) => current.has(key))) return current
          const next = new URLSearchParams(current)
          for (const key of rememberedKeys) {
            if (saved[key]) next.set(key, saved[key])
          }
          return next
        }, { replace: true })
      } catch {
        // Ignore a missing or unreadable saved selection.
      }
      return
    }

    const snapshot: Record<string, string> = {}
    for (const key of rememberedKeys) {
      const value = searchParams.get(key)
      if (value) snapshot[key] = value
    }
    sessionStorage.setItem(catalogueSelectionKey, JSON.stringify(snapshot))
  }, [searchParams, setSearchParams])

  const setCatalogueParams = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      mutate(next)
      return next
    })
  }

  const studies = useQuery({
    queryKey: catalogueKeys.studies,
    queryFn: getStudies,
    staleTime: 10 * 60 * 1000,
  })
  const effectiveStudyId = Number(studyId) || studies.data?.data[0]?.id || 0
  const selectedStudy = studies.data?.data.find((study) => study.id === effectiveStudyId)
  const studyYears = yearsOfStudyForStudy(selectedStudy)

  const majors = useQuery({
    queryKey: catalogueKeys.majors(effectiveStudyId),
    queryFn: () => getMajors(effectiveStudyId),
    enabled: effectiveStudyId > 0,
    staleTime: 10 * 60 * 1000,
  })
  const showingUnlinked = majorId === unlinkedMajorValue
  const effectiveMajorId = showingUnlinked ? 0 : (Number(majorId) || majors.data?.data[0]?.id || 0)
  const selectedMajor = showingUnlinked ? undefined : majors.data?.data.find((major) => major.id === effectiveMajorId)

  const subjects = useQuery({
    queryKey: catalogueKeys.subjects(effectiveMajorId, yearOfStudy),
    queryFn: () => getSubjects(effectiveMajorId, yearOfStudy),
    enabled: view === 'major' && !showingUnlinked && effectiveMajorId > 0,
  })
  const visibleSubjects = (subjects.data?.data ?? []).filter(
    (subject) => !yearOfStudy || subject.yearOfStudy === yearOfStudy,
  )
  const allSubjects = useQuery({
    queryKey: catalogueKeys.subjectCatalogue(search, cataloguePage),
    queryFn: () => getCatalogueSubjects(search, cataloguePage),
    enabled: view === 'all',
    placeholderData: (previous) => previous,
  })
  const unattachedSubjects = useQuery({
    queryKey: catalogueKeys.unattached,
    queryFn: getUnattachedSubjects,
    enabled: view === 'major' && showingUnlinked,
  })
  const listedSubjectIds = view === 'all'
    ? (allSubjects.data?.data.map((subject) => subject.id) ?? [])
    : showingUnlinked
      ? (unattachedSubjects.data?.data.map((subject) => subject.id) ?? [])
      : visibleSubjects.map((subject) => subject.id)
  const paperCounts = useQuery({
    queryKey: ['papers', 'subject-counts', view === 'major' && !showingUnlinked ? effectiveMajorId : listedSubjectIds],
    queryFn: () => (
      view === 'major' && !showingUnlinked
        ? countPapersForMajor(effectiveMajorId)
        : countPapersForSubjects(listedSubjectIds)
    ),
    enabled: listedSubjectIds.length > 0,
  })

  const openSubjectPapers = (subject: Subject) => {
    navigate(papersListPath({
      studiesId: showingUnlinked ? undefined : effectiveStudyId || undefined,
      majorId: showingUnlinked ? undefined : effectiveMajorId || undefined,
      yearOfStudy: showingUnlinked ? undefined : (yearOfStudy ?? subject.yearOfStudy),
      subjectId: subject.id,
    }))
  }

  const openCatalogueSubjectPapers = (subject: CatalogueSubject) => {
    const placement = subject.placements.find((item) =>
      (!effectiveStudyId || item.studiesId === effectiveStudyId)
      && (!effectiveMajorId || item.majorId === effectiveMajorId)
      && (!yearOfStudy || item.yearOfStudy === yearOfStudy),
    ) ?? subject.placements[0]

    navigate(papersListPath({
      studiesId: placement?.studiesId,
      majorId: placement?.majorId,
      yearOfStudy: placement?.yearOfStudy,
      subjectId: subject.id,
    }))
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: catalogueKeys.all })
  }

  const rememberYear = (savedYear?: number) => {
    if (!savedYear) return
    setCatalogueParams((next) => {
      next.set('yearOfStudy', String(savedYear))
      if (effectiveStudyId) next.set('studiesId', String(effectiveStudyId))
      if (effectiveMajorId) next.set('majorId', String(effectiveMajorId))
    })
  }

  const runDestructiveAction = async (action: () => Promise<void>) => {
    setActionBusy(true)
    setActionError('')
    try {
      await action()
      await refresh()
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t('catalogue.actionError'))
    } finally {
      setActionBusy(false)
    }
  }

  const confirmAction = (message: string, action: () => Promise<void>) => {
    if (window.confirm(message)) void runDestructiveAction(action)
  }

  const subjectColumns: Column<Subject>[] = [
    {
      key: 'code',
      header: t('catalogue.code'),
      sortValue: (subject) => subject.code ?? '',
      render: (subject) => subject.code || t('catalogue.noCode'),
    },
    {
      key: 'name',
      header: t('papers.subject'),
      sortValue: (subject) => localizedName(subject, language),
      render: (subject) => <span className="font-semibold text-slate-900">{localizedName(subject, language)}</span>,
    },
    {
      key: 'papers',
      header: t('catalogue.paperCount'),
      sortValue: (subject) => paperCounts.data?.[subject.id] ?? 0,
      render: (subject) => (paperCounts.data ? (paperCounts.data[subject.id] ?? 0) : '…'),
    },
    ...(showingUnlinked ? [] : [{
      key: 'year',
      header: t('papers.yearOfStudy'),
      sortValue: (subject: Subject) => subject.yearOfStudy,
      render: (subject: Subject) => t('common.studyYear', { year: subject.yearOfStudy }),
    }]),
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (subject) => (
        <ActionMenu
          label={t('catalogue.openSubjectActions', { subject: localizedName(subject, language) })}
          items={[
            {
              key: 'papers',
              label: t('catalogue.viewPapers'),
              icon: <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />,
              onSelect: () => openSubjectPapers(subject),
            },
            {
              key: 'edit',
              label: t('catalogue.edit'),
              icon: <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />,
              onSelect: () => setSubjectEditor(showingUnlinked
                ? {
                  subject,
                  maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                  preferUnlinked: true,
                }
                : {
                  subject,
                  majorId: effectiveMajorId,
                  maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                  placementYear: subject.yearOfStudy,
                }),
            },
            ...(!showingUnlinked ? [{
              key: 'detach',
              label: t('catalogue.detachSubject'),
              separatorBefore: true,
              disabled: actionBusy,
              onSelect: () => confirmAction(
                t('catalogue.detachConfirm', { subject: localizedName(subject, language) }),
                () => detachSubject({ majorId: effectiveMajorId, subjectId: subject.id }),
              ),
            }] : []),
            {
              key: 'delete',
              label: t('catalogue.deleteSubjectEverywhere'),
              danger: true,
              separatorBefore: showingUnlinked,
              disabled: actionBusy,
              onSelect: () => confirmAction(
                t('catalogue.deleteSubjectConfirm', { subject: localizedName(subject, language) }),
                () => deleteSubject(subject.id),
              ),
            },
          ]}
        />
      ),
    },
  ]

  const catalogueColumns: Column<CatalogueSubject>[] = [
    {
      key: 'code',
      header: t('catalogue.code'),
      sortValue: (subject) => subject.code ?? '',
      render: (subject) => subject.code || t('catalogue.noCode'),
    },
    {
      key: 'name',
      header: t('papers.subject'),
      sortValue: (subject) => localizedName(subject, language),
      render: (subject) => <span className="font-semibold text-slate-900">{localizedName(subject, language)}</span>,
    },
    {
      key: 'papers',
      header: t('catalogue.paperCount'),
      sortValue: (subject) => paperCounts.data?.[subject.id] ?? 0,
      render: (subject) => (paperCounts.data ? (paperCounts.data[subject.id] ?? 0) : '…'),
    },
    {
      key: 'placements',
      header: t('catalogue.placements'),
      sortValue: (subject) => subject.placements.length === 0
        ? ''
        : subject.placements.map((placement) =>
          `${localizedName(
            { nameSr: placement.majorNameSr, nameEn: placement.majorNameEn },
            language,
          )} ${placement.yearOfStudy}`,
        ).join(', '),
      render: (subject) => subject.placements.length === 0
        ? <span className="text-amber-700">{t('catalogue.unattached')}</span>
        : (
          <span>
            {subject.placements.map((placement) =>
              `${localizedName(
                { nameSr: placement.majorNameSr, nameEn: placement.majorNameEn },
                language,
              )} (${t('common.studyYear', { year: placement.yearOfStudy })})`,
            ).join(', ')}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (subject) => (
        <ActionMenu
          label={t('catalogue.openSubjectActions', { subject: localizedName(subject, language) })}
          items={[
            {
              key: 'papers',
              label: t('catalogue.viewPapers'),
              icon: <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />,
              onSelect: () => openCatalogueSubjectPapers(subject),
            },
            {
              key: 'edit',
              label: t('catalogue.edit'),
              icon: <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />,
              onSelect: () => {
                const placement = subject.placements.find((item) =>
                  (!effectiveStudyId || item.studiesId === effectiveStudyId)
                  && (!effectiveMajorId || item.majorId === effectiveMajorId)
                  && (!yearOfStudy || item.yearOfStudy === yearOfStudy),
                ) ?? subject.placements[0]
                setSubjectEditor({
                  subject,
                  majorId: placement?.majorId,
                  maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                  placementYear: placement?.yearOfStudy,
                  placements: subject.placements,
                })
              },
            },
            {
              key: 'delete',
              label: t('catalogue.deleteSubject'),
              danger: true,
              separatorBefore: true,
              disabled: actionBusy,
              onSelect: () => confirmAction(
                t('catalogue.deleteSubjectConfirm', { subject: localizedName(subject, language) }),
                () => deleteSubject(subject.id),
              ),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{t('catalogue.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('catalogue.description')}</p>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {studies.isPending ? (
        <LoadingState label={t('catalogue.loading')} />
      ) : studies.isError ? (
        <ErrorState
          message={studies.error instanceof ApiError ? studies.error.message : t('catalogue.loadError')}
          onRetry={() => studies.refetch()}
        />
      ) : (
        <>
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={t('papers.studyProgram')}>
                  <Select
                    value={effectiveStudyId || ''}
                    onChange={(event) => {
                      setCatalogueParams((next) => {
                        ;['studiesId', 'majorId', 'yearOfStudy', 'page'].forEach((key) => next.delete(key))
                        if (event.target.value) next.set('studiesId', event.target.value)
                      })
                    }}
                  >
                    {studies.data.data.length === 0 && <option value="">{t('catalogue.noStudies')}</option>}
                    {studies.data.data.map((study) => (
                      <option key={study.id} value={study.id}>{localizedName(study, language)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button variant="secondary" className="px-3" onClick={() => setStudyEditor('new')}>
                <Plus className="h-4 w-4" aria-hidden="true" />{t('catalogue.add')}
              </Button>
              {selectedStudy && (
                <ActionMenu
                  label={t('catalogue.studyActions')}
                  items={[
                    { key: 'edit', label: t('catalogue.editStudy'), onSelect: () => setStudyEditor(selectedStudy) },
                    {
                      key: 'delete',
                      label: t('catalogue.deleteStudy'),
                      danger: true,
                      separatorBefore: true,
                      disabled: actionBusy,
                      onSelect: () => confirmAction(
                        t('catalogue.deleteStudyConfirm', { study: localizedName(selectedStudy, language) }),
                        async () => {
                          await deleteStudy(selectedStudy.id)
                          setCatalogueParams((next) => {
                            ;['studiesId', 'majorId', 'yearOfStudy', 'page'].forEach((key) => next.delete(key))
                          })
                        },
                      ),
                    },
                  ]}
                />
              )}
            </div>

            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={t('papers.major')}>
                  <Select
                    value={showingUnlinked ? unlinkedMajorValue : (effectiveMajorId || '')}
                    disabled={!selectedStudy || majors.isPending}
                    onChange={(event) => {
                      setCatalogueParams((next) => {
                        next.delete('page')
                        if (effectiveStudyId) next.set('studiesId', String(effectiveStudyId))
                        if (event.target.value === unlinkedMajorValue) next.delete('yearOfStudy')
                        if (event.target.value) next.set('majorId', event.target.value)
                        else next.delete('majorId')
                      })
                    }}
                  >
                    {(majors.data?.data.length ?? 0) === 0 && <option value="">{t('catalogue.noMajors')}</option>}
                    <option value={unlinkedMajorValue}>{t('catalogue.notLinked')}</option>
                    {majors.data?.data.map((major) => (
                      <option key={major.id} value={major.id}>{localizedName(major, language)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button
                variant="secondary"
                className="px-3"
                disabled={!selectedStudy}
                onClick={() => setMajorEditor('new')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />{t('catalogue.add')}
              </Button>
              {selectedMajor && (
                <ActionMenu
                  label={t('catalogue.majorActions')}
                  items={[
                    { key: 'edit', label: t('catalogue.editMajor'), onSelect: () => setMajorEditor(selectedMajor) },
                    {
                      key: 'delete',
                      label: t('catalogue.deleteMajor'),
                      danger: true,
                      separatorBefore: true,
                      disabled: actionBusy,
                      onSelect: () => confirmAction(
                        t('catalogue.deleteMajorConfirm', { major: localizedName(selectedMajor, language) }),
                        async () => {
                          await deleteMajor(selectedMajor.id)
                          setCatalogueParams((next) => {
                            next.delete('majorId')
                            next.delete('page')
                          })
                        },
                      ),
                    },
                  ]}
                />
              )}
            </div>

            <Field label={t('papers.yearOfStudy')}>
              <Select
                value={showingUnlinked ? '' : (yearOfStudy ?? '')}
                disabled={showingUnlinked || !selectedMajor}
                onChange={(event) => {
                  setCatalogueParams((next) => {
                    next.delete('page')
                    if (effectiveStudyId) next.set('studiesId', String(effectiveStudyId))
                    if (effectiveMajorId) next.set('majorId', String(effectiveMajorId))
                    if (event.target.value) next.set('yearOfStudy', event.target.value)
                    else next.delete('yearOfStudy')
                  })
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
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <Button
                variant={view === 'major' ? 'primary' : 'ghost'}
                className="min-h-8 px-3 py-1"
                onClick={() => {
                  setCatalogueParams((next) => {
                    next.delete('view')
                    next.delete('page')
                    next.delete('q')
                  })
                }}
              >
                {t('catalogue.currentMajor')}
              </Button>
              <Button
                variant={view === 'all' ? 'primary' : 'ghost'}
                className="min-h-8 px-3 py-1"
                onClick={() => {
                  setCatalogueParams((next) => {
                    next.set('view', 'all')
                    next.delete('page')
                  })
                }}
              >
                {t('catalogue.allSubjects')}
              </Button>
            </div>
            {view === 'major' && (selectedMajor || showingUnlinked) && (
              <div className="flex flex-wrap gap-2">
                {selectedMajor && (
                  <Button variant="secondary" onClick={() => setAttachOpen(true)}>
                    <Link className="h-4 w-4" aria-hidden="true" />{t('catalogue.attachExisting')}
                  </Button>
                )}
                <Button onClick={() => setSubjectEditor(showingUnlinked
                  ? { maximumYear: selectedStudy?.yearsOfStudy ?? 1, preferUnlinked: true }
                  : {
                    majorId: selectedMajor?.id,
                    maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                    placementYear: yearOfStudy,
                  })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />{t('catalogue.addSubject')}
                </Button>
              </div>
            )}
          </div>

          {view === 'major' ? (
            showingUnlinked ? (
              unattachedSubjects.isPending ? (
                <LoadingState label={t('catalogue.loadingSubjects')} />
              ) : unattachedSubjects.isError ? (
                <ErrorState
                  message={unattachedSubjects.error instanceof ApiError ? unattachedSubjects.error.message : t('catalogue.loadError')}
                  onRetry={() => unattachedSubjects.refetch()}
                />
              ) : unattachedSubjects.data.data.length === 0 ? (
                <EmptyState title={t('catalogue.noSubjectsTitle')} description={t('catalogue.noSubjectsDescription')} />
              ) : (
                <DataTable
                  columns={subjectColumns}
                  rows={unattachedSubjects.data.data}
                  getRowKey={(subject) => subject.id}
                  onRowClick={openSubjectPapers}
                />
              )
            ) : !selectedMajor ? (
              <EmptyState title={t('catalogue.noMajorTitle')} description={t('catalogue.noMajorDescription')} />
            ) : subjects.isPending ? (
              <LoadingState label={t('catalogue.loadingSubjects')} />
            ) : subjects.isError ? (
              <ErrorState
                message={subjects.error instanceof ApiError ? subjects.error.message : t('catalogue.loadError')}
                onRetry={() => subjects.refetch()}
              />
            ) : visibleSubjects.length === 0 ? (
              <EmptyState title={t('catalogue.noSubjectsTitle')} description={t('catalogue.noSubjectsDescription')} />
            ) : (
              <DataTable
                columns={subjectColumns}
                rows={visibleSubjects}
                getRowKey={(subject) => subject.id}
                onRowClick={openSubjectPapers}
              />
            )
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  className="pl-9"
                  value={search}
                  placeholder={t('catalogue.searchPlaceholder')}
                  onChange={(event) => {
                    setCatalogueParams((next) => {
                      next.delete('page')
                      if (event.target.value) next.set('q', event.target.value)
                      else next.delete('q')
                    })
                  }}
                />
              </div>
              {allSubjects.isPending ? (
                <LoadingState label={t('catalogue.loadingSubjects')} />
              ) : allSubjects.isError ? (
                <ErrorState
                  message={allSubjects.error instanceof ApiError ? allSubjects.error.message : t('catalogue.loadError')}
                  onRetry={() => allSubjects.refetch()}
                />
              ) : allSubjects.data.data.length === 0 ? (
                <EmptyState title={t('catalogue.noSubjectsTitle')} description={t('catalogue.noSubjectsDescription')} />
              ) : (
                <>
                  <DataTable
                    columns={catalogueColumns}
                    rows={allSubjects.data.data}
                    getRowKey={(subject) => subject.id}
                    onRowClick={openCatalogueSubjectPapers}
                  />
                  <Pagination
                    page={allSubjects.data.meta.page}
                    totalPages={allSubjects.data.meta.totalPages}
                    totalItems={allSubjects.data.meta.totalItems}
                    onChange={(page) => {
                      setCatalogueParams((next) => {
                        if (page > 1) next.set('page', String(page))
                        else next.delete('page')
                      })
                    }}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {studyEditor && (
        <StudyFormModal
          study={studyEditor === 'new' ? undefined : studyEditor}
          onClose={() => setStudyEditor(null)}
          onSaved={async (saved) => {
            await refresh()
            setCatalogueParams((next) => {
              next.set('studiesId', String(saved.id))
              ;['majorId', 'yearOfStudy', 'page'].forEach((key) => next.delete(key))
            })
            setStudyEditor(null)
          }}
        />
      )}
      {majorEditor && selectedStudy && (
        <MajorFormModal
          major={majorEditor === 'new' ? undefined : majorEditor}
          studies={studies.data?.data ?? []}
          selectedStudyId={selectedStudy.id}
          onClose={() => setMajorEditor(null)}
          onSaved={async (saved) => {
            await refresh()
            setCatalogueParams((next) => {
              next.set('studiesId', String(saved.studiesId))
              next.set('majorId', String(saved.id))
              next.delete('page')
            })
            setMajorEditor(null)
          }}
        />
      )}
      {subjectEditor && (
        <SubjectFormModal
          {...subjectEditor}
          onClose={() => setSubjectEditor(null)}
          onSaved={async (placement) => {
            await refresh()
            if (placement && 'unlinked' in placement) {
              setCatalogueParams((next) => {
                next.delete('view')
                next.set('majorId', unlinkedMajorValue)
                next.delete('yearOfStudy')
                next.delete('page')
              })
            } else if (placement?.studiesId && placement.majorId) {
              setCatalogueParams((next) => {
                next.set('view', 'major')
                next.set('studiesId', String(placement.studiesId))
                next.set('majorId', String(placement.majorId))
                next.set('yearOfStudy', String(placement.yearOfStudy))
                next.delete('page')
              })
            }
            setSubjectEditor(null)
          }}
        />
      )}
      {attachOpen && selectedMajor && (
        <AttachSubjectModal
          defaultMajorId={selectedMajor.id}
          defaultYear={yearOfStudy}
          onClose={() => setAttachOpen(false)}
          onSaved={async (savedYear) => {
            await refresh()
            rememberYear(savedYear)
            setAttachOpen(false)
          }}
        />
      )}
    </div>
  )
}
