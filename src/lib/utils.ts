import type { AppLanguage } from '../i18n'
import { toSerbianScript } from '../i18n/transliterate'
import type { Paper, Study, UserRole, ValidationErrors } from './types'
import { USER_ROLES } from './types'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function isStaff(role?: UserRole) {
  return role !== undefined && role <= USER_ROLES.Moderator
}

export function isAdmin(role?: UserRole) {
  return role !== undefined && role <= USER_ROLES.Admin
}

export function roleName(role: UserRole) {
  return Object.entries(USER_ROLES).find(([, value]) => value === role)?.[0] ?? 'User'
}

export function localeCode(language: AppLanguage) {
  if (language === 'sr-Latn') return 'sr-Latn-RS'
  if (language === 'sr-Cyrl') return 'sr-Cyrl-RS'
  return 'en-US'
}

export function formatDate(value: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(localeCode(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatBytes(bytes: number, language: AppLanguage) {
  const format = (value: number) =>
    new Intl.NumberFormat(localeCode(language), { maximumFractionDigits: 1 }).format(value)

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${format(bytes / 1024)} KB`
  return `${format(bytes / 1024 ** 2)} MB`
}

export function fieldError(errors: ValidationErrors, name: string) {
  const entry = Object.entries(errors).find(([key]) => key.toLowerCase() === name.toLowerCase())
  return entry?.[1]?.[0]
}

export function monthNames(language: AppLanguage) {
  const formatter = new Intl.DateTimeFormat(localeCode(language), {
    month: 'long',
    timeZone: 'UTC',
  })

  return Array.from({ length: 12 }, (_, month) => {
    const name = formatter.format(new Date(Date.UTC(2024, month, 1)))
    return name.charAt(0).toLocaleUpperCase(localeCode(language)) + name.slice(1)
  })
}

export function yearsOfStudyForStudy(study?: Pick<Study, 'nameEn' | 'nameSr'> & { yearsOfStudy?: number }) {
  if (study?.yearsOfStudy && study.yearsOfStudy > 0) {
    return Array.from({ length: study.yearsOfStudy }, (_, index) => index + 1)
  }

  const haystack = `${study?.nameEn ?? ''} ${study?.nameSr ?? ''}`.toLowerCase()
  if (haystack.includes('master') || haystack.includes('magistar')) return [1, 2]
  return [1, 2, 3]
}

export function localizedName(value: { nameEn: string; nameSr: string }, language: AppLanguage) {
  if (language === 'en') return value.nameEn || value.nameSr
  const serbianName = value.nameSr || value.nameEn
  return toSerbianScript(serbianName, language)
}

export function localizedPaperSubject(paper: Pick<Paper, 'subjectNameEn' | 'subjectNameSr'>, language: AppLanguage) {
  return localizedName({ nameEn: paper.subjectNameEn, nameSr: paper.subjectNameSr }, language)
}

export function compareLocalizedNames(
  first: { nameEn: string; nameSr: string },
  second: { nameEn: string; nameSr: string },
  language: AppLanguage,
) {
  return localizedName(first, language).localeCompare(localizedName(second, language), localeCode(language))
}
