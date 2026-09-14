import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '../../i18n'
import { toAppLanguage } from '../../i18n'
import { cn } from '../../lib/utils'

const options: Array<{ value: AppLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'sr-Latn', label: 'Srpski (Latinica)' },
  { value: 'sr-Cyrl', label: 'Српски (Ћирилица)' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language)

  return (
    <label
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm',
        className,
      )}
    >
      <Languages className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        className="min-w-0 cursor-pointer bg-transparent py-2 text-sm font-semibold text-slate-700 outline-none"
        value={language}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
