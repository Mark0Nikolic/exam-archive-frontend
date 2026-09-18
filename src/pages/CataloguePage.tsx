import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Link, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import type { CatalogueSubject, Major, Study, Subject } from '../lib/types'
import { localizedName } from '../lib/utils'
import {
  catalogueKeys,
  deleteMajor,
  deleteStudy,
  deleteSubject,
  detachSubject,
  getCatalogueSubjects,
} from '../services/catalogue'
import { getMajors, getStudies, getSubjects } from '../services/lookups'

type SubjectEditor = {
  subject?: Pick<Subject, 'id' | 'code' | 'nameSr' | 'nameEn'>
  majorId?: number
  maximumYear: number
  placementYear?: number
}

export function CataloguePage() {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const queryClient = useQueryClient()
  const [studyId, setStudyId] = useState('')
  const [majorId, setMajorId] = useState('')
  const [view, setView] = useState<'major' | 'all'>('major')
  const [search, setSearch] = useState('')
  const [cataloguePage, setCataloguePage] = useState(1)
  const [studyEditor, setStudyEditor] = useState<Study | 'new' | null>(null)
  const [majorEditor, setMajorEditor] = useState<Major | 'new' | null>(null)
  const [subjectEditor, setSubjectEditor] = useState<SubjectEditor | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  const studies = useQuery({
    queryKey: catalogueKeys.studies,
    queryFn: getStudies,
    staleTime: 10 * 60 * 1000,
  })
  const effectiveStudyId = Number(studyId) || studies.data?.data[0]?.id || 0
  const selectedStudy = studies.data?.data.find((study) => study.id === effectiveStudyId)

  const majors = useQuery({
    queryKey: catalogueKeys.majors(effectiveStudyId),
    queryFn: () => getMajors(effectiveStudyId),
    enabled: effectiveStudyId > 0,
    staleTime: 10 * 60 * 1000,
  })
  const effectiveMajorId = Number(majorId) || majors.data?.data[0]?.id || 0
  const selectedMajor = majors.data?.data.find((major) => major.id === effectiveMajorId)

  const subjects = useQuery({
    queryKey: catalogueKeys.subjects(effectiveMajorId),
    queryFn: () => getSubjects(effectiveMajorId),
    enabled: effectiveMajorId > 0,
  })
  const allSubjects = useQuery({
    queryKey: catalogueKeys.subjectCatalogue(search, cataloguePage),
    queryFn: () => getCatalogueSubjects(search, cataloguePage),
    enabled: view === 'all',
    placeholderData: (previous) => previous,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: catalogueKeys.all })
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
      render: (subject) => subject.code || t('catalogue.noCode'),
    },
    {
      key: 'name',
      header: t('papers.subject'),
      render: (subject) => <span className="font-semibold text-slate-900">{localizedName(subject, language)}</span>,
    },
    {
      key: 'year',
      header: t('papers.yearOfStudy'),
      render: (subject) => t('common.studyYear', { year: subject.yearOfStudy }),
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
              key: 'edit',
              label: t('catalogue.editSubject'),
              onSelect: () => setSubjectEditor({
                subject,
                majorId: effectiveMajorId,
                maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                placementYear: subject.yearOfStudy,
              }),
            },
            {
              key: 'detach',
              label: t('catalogue.detachSubject'),
              separatorBefore: true,
              disabled: actionBusy,
              onSelect: () => confirmAction(
                t('catalogue.detachConfirm', { subject: localizedName(subject, language) }),
                () => detachSubject({ majorId: effectiveMajorId, subjectId: subject.id }),
              ),
            },
            {
              key: 'delete',
              label: t('catalogue.deleteSubjectEverywhere'),
              danger: true,
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
      render: (subject) => subject.code || t('catalogue.noCode'),
    },
    {
      key: 'name',
      header: t('papers.subject'),
      render: (subject) => <span className="font-semibold text-slate-900">{localizedName(subject, language)}</span>,
    },
    {
      key: 'placements',
      header: t('catalogue.placements'),
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
              key: 'edit',
              label: t('catalogue.editSubjectIdentity'),
              onSelect: () => setSubjectEditor({
                subject,
                maximumYear: 1,
              }),
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
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={t('papers.studyProgram')}>
                  <Select
                    value={effectiveStudyId || ''}
                    onChange={(event) => {
                      setStudyId(event.target.value)
                      setMajorId('')
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
                          setStudyId('')
                          setMajorId('')
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
                    value={effectiveMajorId || ''}
                    disabled={!selectedStudy || majors.isPending}
                    onChange={(event) => setMajorId(event.target.value)}
                  >
                    {(majors.data?.data.length ?? 0) === 0 && <option value="">{t('catalogue.noMajors')}</option>}
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
                          setMajorId('')
                        },
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <Button
                variant={view === 'major' ? 'primary' : 'ghost'}
                className="min-h-8 px-3 py-1"
                onClick={() => setView('major')}
              >
                {t('catalogue.currentMajor')}
              </Button>
              <Button
                variant={view === 'all' ? 'primary' : 'ghost'}
                className="min-h-8 px-3 py-1"
                onClick={() => setView('all')}
              >
                {t('catalogue.allSubjects')}
              </Button>
            </div>
            {view === 'major' && selectedMajor && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAttachOpen(true)}>
                  <Link className="h-4 w-4" aria-hidden="true" />{t('catalogue.attachExisting')}
                </Button>
                <Button onClick={() => setSubjectEditor({
                  majorId: selectedMajor.id,
                  maximumYear: selectedStudy?.yearsOfStudy ?? 1,
                })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />{t('catalogue.addSubject')}
                </Button>
              </div>
            )}
          </div>

          {view === 'major' ? (
            !selectedMajor ? (
              <EmptyState title={t('catalogue.noMajorTitle')} description={t('catalogue.noMajorDescription')} />
            ) : subjects.isPending ? (
              <LoadingState label={t('catalogue.loadingSubjects')} />
            ) : subjects.isError ? (
              <ErrorState
                message={subjects.error instanceof ApiError ? subjects.error.message : t('catalogue.loadError')}
                onRetry={() => subjects.refetch()}
              />
            ) : subjects.data.data.length === 0 ? (
              <EmptyState title={t('catalogue.noSubjectsTitle')} description={t('catalogue.noSubjectsDescription')} />
            ) : (
              <DataTable columns={subjectColumns} rows={subjects.data.data} getRowKey={(subject) => subject.id} />
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
                    setSearch(event.target.value)
                    setCataloguePage(1)
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
                  <DataTable columns={catalogueColumns} rows={allSubjects.data.data} getRowKey={(subject) => subject.id} />
                  <Pagination
                    page={allSubjects.data.meta.page}
                    totalPages={allSubjects.data.meta.totalPages}
                    totalItems={allSubjects.data.meta.totalItems}
                    onChange={setCataloguePage}
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
            setStudyId(String(saved.id))
            setMajorId('')
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
            setStudyId(String(saved.studiesId))
            setMajorId(String(saved.id))
            setMajorEditor(null)
          }}
        />
      )}
      {subjectEditor && (
        <SubjectFormModal
          {...subjectEditor}
          onClose={() => setSubjectEditor(null)}
          onSaved={async () => {
            await refresh()
            setSubjectEditor(null)
          }}
        />
      )}
      {attachOpen && selectedMajor && (
        <AttachSubjectModal
          majorId={selectedMajor.id}
          maximumYear={selectedStudy?.yearsOfStudy ?? 1}
          attachedSubjectIds={subjects.data?.data.map((subject) => subject.id) ?? []}
          onClose={() => setAttachOpen(false)}
          onSaved={async () => {
            await refresh()
            setAttachOpen(false)
          }}
        />
      )}
    </div>
  )
}
