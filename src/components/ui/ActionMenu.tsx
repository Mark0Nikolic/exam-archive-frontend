import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ActionMenuItem {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}

export function ActionMenu({
  label,
  items,
  className,
}: {
  label: string
  items: ActionMenuItem[]
  className?: string
}) {
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  const placeMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuWidth = 208
    const estimatedHeight = items.length * 40 + 8
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    )
    const top = rect.bottom + estimatedHeight <= window.innerHeight - 8
      ? rect.bottom + 4
      : Math.max(8, rect.top - estimatedHeight - 4)

    setPosition({ left, top })
  }, [items.length])

  useLayoutEffect(() => {
    if (!open) return
    placeMenu()
  }, [open, placeMenu])

  useEffect(() => {
    if (!open) return

    const focusTimer = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus()
    })
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const reposition = () => placeMenu()

    document.addEventListener('pointerdown', closeOnOutsidePress)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, placeMenu])

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    )
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || buttons.length === 0) {
      return
    }

    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1 + buttons.length) % buttons.length
          : (currentIndex - 1 + buttons.length) % buttons.length
    buttons[nextIndex]?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          'inline-flex min-h-8 items-center justify-center rounded-lg px-2 py-1 text-slate-500 transition hover:bg-accent-wash hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
          className,
        )}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="fixed z-[70] w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          style={position}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item) => (
            <div
              key={item.key}
              className={item.separatorBefore ? 'mt-1 border-t border-slate-100 pt-1' : undefined}
            >
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45',
                  item.danger
                    ? 'text-rose-700 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-accent-wash',
                )}
                onClick={() => {
                  setOpen(false)
                  window.requestAnimationFrame(() => triggerRef.current?.focus())
                  item.onSelect()
                }}
              >
                {item.icon && <span className="text-slate-500">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
