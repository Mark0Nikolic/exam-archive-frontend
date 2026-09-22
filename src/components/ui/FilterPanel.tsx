import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function FilterPanel({
  children,
  onClear,
}: {
  children: ReactNode
  onClear: () => void
}) {
  const { t } = useTranslation()
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">{t('filters.title')}</h2>
        <button
          type="button"
          className="inline-flex min-h-8 items-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
          onClick={onClear}
        >
          {t('filters.clearAll')}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{children}</div>
    </section>
  )
}
