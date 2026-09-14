import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

interface FileDropZoneProps {
  accept?: string
  multiple?: boolean
  disabled?: boolean
  label?: string
  onFiles: (files: File[]) => void
}

export function FileDropZone({
  accept,
  multiple = false,
  disabled = false,
  label,
  onFiles,
}: FileDropZoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])
    if (files.length > 0) onFiles(files)
    event.currentTarget.value = ''
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    dragDepth.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors',
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={handleChange}
      />
      <Upload
        className={cn('mx-auto h-8 w-8', isDragging ? 'text-indigo-600' : 'text-slate-400')}
        strokeWidth={1.7}
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-semibold text-slate-700" aria-live="polite">
        {isDragging ? t('fileDrop.dropNow') : (label ?? t('fileDrop.defaultLabel'))}
      </p>
      <p className="mt-1 text-xs text-slate-500">{t('fileDrop.or')}</p>
      <button
        type="button"
        disabled={disabled}
        className="mt-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
        onClick={() => inputRef.current?.click()}
      >
        {t('fileDrop.browse')}
      </button>
    </div>
  )
}