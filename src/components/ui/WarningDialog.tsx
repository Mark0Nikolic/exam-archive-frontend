import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleHelp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function WarningDialog({
  open,
  message,
  notice = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  message: string
  notice?: boolean
  onConfirm?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState({ message, notice })

  useEffect(() => {
    if (open && message) setShown({ message, notice })
  }, [open, message, notice])

  useEffect(() => {
    let animationFrame: number | undefined
    let unmountTimer: number | undefined

    if (open) {
      setRendered(true)
      animationFrame = window.requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      unmountTimer = window.setTimeout(() => setRendered(false), prefersReducedMotion ? 0 : 200)
    }

    return () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
      if (unmountTimer !== undefined) window.clearTimeout(unmountTimer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!rendered) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 transition-[background-color,backdrop-filter] duration-200 ease-out motion-reduce:transition-none sm:p-6 ${
        visible ? 'bg-slate-950/30 backdrop-blur-[2px]' : 'pointer-events-none bg-slate-950/0 backdrop-blur-none'
      }`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-describedby="warning-dialog-message"
        className={`w-full max-w-md origin-center rounded-2xl border border-white/70 bg-white/80 px-6 py-6 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200/60 backdrop-blur-md transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-100 opacity-0 sm:translate-y-0 sm:scale-[0.98]'
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          {shown.notice ? (
            <CircleAlert className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <CircleHelp className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          )}
        </div>
        <p id="warning-dialog-message" className="mt-4 text-center text-base font-semibold leading-7 text-slate-900">
          {shown.message}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {!shown.notice && (
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-accent-wash"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            onClick={shown.notice ? onClose : onConfirm}
          >
            {shown.notice ? t('common.ok') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function useWarningDialog() {
  const resolver = useRef<((accepted: boolean) => void) | null>(null)
  const [state, setState] = useState<{ message: string; notice: boolean } | null>(null)

  const finish = useCallback((accepted: boolean) => {
    resolver.current?.(accepted)
    resolver.current = null
    setState(null)
  }, [])

  const ask = useCallback((message: string) => new Promise<boolean>((resolve) => {
    resolver.current = resolve
    setState({ message, notice: false })
  }), [])

  const notify = useCallback((message: string) => new Promise<void>((resolve) => {
    resolver.current = () => resolve()
    setState({ message, notice: true })
  }), [])

  const dialog = (
    <WarningDialog
      open={state !== null}
      message={state?.message ?? ''}
      notice={state?.notice}
      onConfirm={() => finish(true)}
      onClose={() => finish(false)}
    />
  )

  return { ask, notify, dialog }
}
