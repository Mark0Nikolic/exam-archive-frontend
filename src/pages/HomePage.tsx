import { useState } from 'react'
import { Search, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UploadPaperModal } from '../components/papers/UploadPaperModal'

function ActionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
      <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}

const actionCardClassName =
  'group flex min-h-52 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'

export function HomePage() {
  const { t } = useTranslation()
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center py-6 sm:py-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">{t('common.brand')}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {t('home.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          {t('home.description')}
        </p>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Link to="/papers" className={actionCardClassName}>
          <ActionIcon icon={Search} />
          <span className="mt-5 text-lg font-bold text-slate-950">{t('home.viewPapers')}</span>
          <span className="mt-1.5 text-sm text-slate-500">{t('home.viewDescription')}</span>
        </Link>

        <button type="button" className={actionCardClassName} onClick={() => setUploadOpen(true)}>
          <ActionIcon icon={Upload} />
          <span className="mt-5 text-lg font-bold text-slate-950">{t('home.uploadPaper')}</span>
          <span className="mt-1.5 text-sm text-slate-500">{t('home.uploadDescription')}</span>
        </button>
      </div>

      <UploadPaperModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}