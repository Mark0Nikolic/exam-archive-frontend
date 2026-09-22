import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, LoaderCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Key,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { toAppLanguage } from '../../i18n'
import { cn, localeCode } from '../../lib/utils'
import type { PaperStatus } from '../../lib/types'

export { FileDropZone } from './FileDropZone'
export { ActionMenu } from './ActionMenu'
export type { ActionMenuItem } from './ActionMenu'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-accent-wash disabled:text-slate-400',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300',
  ghost: 'text-slate-600 hover:bg-accent-wash disabled:text-slate-300',
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

const controlClasses =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />
}

interface SelectOption {
  value: string
  label: string
  disabled: boolean
}

function optionLabel(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map((child) => optionLabel(child)).join('')
  return ''
}

function readOptions(children: ReactNode) {
  const options: SelectOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return
    if (child.type !== 'option') return
    options.push({
      value: child.props.value == null ? '' : String(child.props.value),
      label: optionLabel(child.props.children),
      disabled: Boolean(child.props.disabled),
    })
  })
  return options
}

export function Select({
  className,
  children,
  value,
  disabled,
  id,
  required,
  variant = 'default',
  'aria-label': ariaLabel,
  onChange,
}: SelectHTMLAttributes<HTMLSelectElement> & { variant?: 'default' | 'inline' }) {
  const listId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [menuStyle, setMenuStyle] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)
  const options = readOptions(children)
  const selectedValue = value == null ? '' : String(value)
  const selected = options.find((option) => option.value === selectedValue) ?? options[0]
  const placeholder = selectedValue === ''

  const placeMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove
    const available = (openBelow ? spaceBelow : spaceAbove) - 12
    setMenuStyle({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(280, available)),
      top: openBelow ? rect.bottom + 6 : undefined,
      bottom: openBelow ? undefined : window.innerHeight - rect.top + 6,
    })
  }

  useEffect(() => {
    if (!open) return
    placeMenu()
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    document.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const choose = (option: SelectOption) => {
    if (option.disabled) return
    onChange?.({
      target: { value: option.value },
      currentTarget: { value: option.value },
    } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const openMenu = () => {
    if (disabled) return
    const index = options.findIndex((option) => option.value === selectedValue)
    setHighlight(index >= 0 ? index : 0)
    setOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu()
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((current) => Math.min(options.length - 1, current + 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => Math.max(0, current - 1))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[highlight]
      if (option) choose(option)
    }
    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          variant === 'inline'
            ? 'relative flex min-h-10 w-full items-center bg-transparent py-2 pl-1 pr-9 text-left text-sm font-semibold text-slate-700 outline-none'
            : 'relative flex min-h-10 w-full items-center rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-11 text-left text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100',
          variant === 'default' && (placeholder ? 'text-slate-500' : 'text-slate-900'),
          className,
        )}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute h-4 w-4 text-slate-500 transition-transform',
            variant === 'inline' ? 'right-2' : 'right-5',
            open && 'rotate-180',
          )}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
      {open && menuStyle && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            position: 'fixed',
            left: menuStyle.left,
            width: menuStyle.width,
            top: menuStyle.top,
            bottom: menuStyle.bottom,
            maxHeight: menuStyle.maxHeight,
          }}
          className="z-[70] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                data-index={index}
                aria-selected={isSelected}
                disabled={option.disabled}
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-300',
                  isSelected
                    ? 'bg-indigo-50 font-semibold text-indigo-700'
                    : index === highlight
                      ? 'bg-accent-wash text-slate-700'
                      : 'text-slate-700 hover:bg-accent-wash',
                )}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option)}
              >
                {option.label}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-28 resize-y', className)} {...props} />
}

export function Modal({
  open,
  title,
  description,
  ariaLabel,
  children,
  onClose,
  width = 'max-w-2xl',
}: {
  open: boolean
  title?: string
  description?: string
  ariaLabel?: string
  children: ReactNode
  onClose: () => void
  width?: string
}) {
  const { t } = useTranslation()
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)

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
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!rendered) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [rendered])

  if (!rendered) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center p-0 transition-[background-color,backdrop-filter] duration-200 ease-out motion-reduce:transition-none sm:items-center sm:p-6',
        visible
          ? 'bg-slate-950/30 backdrop-blur-[2px]'
          : 'pointer-events-none bg-slate-950/0 backdrop-blur-none',
      )}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={title ? undefined : ariaLabel}
        className={cn(
          'max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:rounded-2xl',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-100 opacity-0 sm:translate-y-0 sm:scale-[0.98]',
          width,
        )}
      >
        <div
          className={cn(
            'flex border-b border-slate-200 px-5 sm:px-6',
            title ? 'items-start justify-between py-4' : 'items-center justify-end py-2',
          )}
        >
          {title ? (
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-950">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
          ) : null}
          <button
            type="button"
            aria-label={t('common.close')}
            className="rounded-lg p-2 text-slate-400 hover:bg-accent-wash hover:text-slate-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export interface Column<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | null
}

type SortDirection = 'asc' | 'desc'

function compareSortValues(
  left: string | number | null,
  right: string | number | null,
  locale: string,
) {
  const leftEmpty = left === null || left === ''
  const rightEmpty = right === null || right === ''
  if (leftEmpty && rightEmpty) return 0
  if (leftEmpty) return 1
  if (rightEmpty) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), locale, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
}: {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => Key
  onRowClick?: (row: T) => void
}) {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null)
  const sortedRows = sortRows(rows, columns, sort, localeCode(toAppLanguage(i18n.language)))

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => {
                const sortable = Boolean(column.header && column.sortValue)
                const active = sort?.key === column.key ? sort.direction : null
                return (
                  <th
                    key={column.key}
                    aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : sortable ? 'none' : undefined}
                    className={cn(
                      'border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500',
                      column.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent-wash hover:text-indigo-800',
                          active && 'text-indigo-700',
                        )}
                        aria-label={t('common.sortBy', { column: column.header })}
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.header}
                        {active === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        ) : active === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" strokeWidth={2} aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition hover:bg-accent-wash',
                  onRowClick && 'cursor-pointer focus-within:bg-accent-wash',
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3.5 text-sm text-slate-600', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function sortRows<T>(
  rows: T[],
  columns: Column<T>[],
  sort: { key: string; direction: SortDirection } | null,
  locale: string,
) {
  if (!sort) return rows
  const column = columns.find((item) => item.key === sort.key && item.sortValue)
  if (!column?.sortValue) return rows
  const direction = sort.direction === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = column.sortValue!(left.row)
      const rightValue = column.sortValue!(right.row)
      const leftEmpty = leftValue === null || leftValue === ''
      const rightEmpty = rightValue === null || rightValue === ''
      if (leftEmpty || rightEmpty) return compareSortValues(leftValue, rightValue, locale)
      const result = compareSortValues(leftValue, rightValue, locale)
      return result === 0 ? left.index - right.index : result * direction
    })
    .map((item) => item.row)
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  onChange: (page: number) => void
}) {
  const { t } = useTranslation()
  const safeTotalPages = Math.max(totalPages, 1)
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row">
      <p className="text-sm text-slate-500">{t('common.results', { count: totalItems })}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('common.previous')}
        </Button>
        <span className="min-w-24 text-center text-sm font-medium text-slate-600">
          {t('common.pageOf', { page, total: safeTotalPages })}
        </span>
        <Button
          variant="secondary"
          disabled={page >= safeTotalPages}
          onClick={() => onChange(page + 1)}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: PaperStatus }) {
  const { t } = useTranslation()
  const classes: Record<PaperStatus, string> = {
    Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  }
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', classes[status])}>
      {t(`common.statuses.${status}`)}
    </span>
  )
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
      <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" strokeWidth={1.8} aria-hidden="true" />
      <p className="text-sm font-medium text-slate-500">{label ?? t('common.loading')}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <p className="font-semibold text-rose-800">{t('common.somethingWentWrong')}</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry && (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}