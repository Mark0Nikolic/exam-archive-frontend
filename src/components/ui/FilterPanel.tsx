import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '.'

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
        <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={onClear}>
          {t('filters.clearAll')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{children}</div>
    </section>
  )
}
