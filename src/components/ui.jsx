import { createContext, useContext, useEffect, useState } from 'react'
import Icon from './Icon'
import { fmtDay } from '../utils'

export const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, toast.duration ?? 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        className="fade-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-950 px-4 py-3 text-sm text-white shadow-lg"
      >
        <span className="flex-1">{toast.message}</span>
        {toast.action && (
          <button
            className="font-medium text-yellow-300"
            onClick={() => {
              toast.action.onClick()
              onClose()
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="fade-in absolute inset-0 bg-emerald-950/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="sheet-up pb-safe relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-muted active:bg-emerald-50" aria-label="ปิด">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
      </div>
    </div>
  )
}

export function SuggestInput({ value, onChange, placeholder, icon, suggestions = [], className = '' }) {
  const [focused, setFocused] = useState(false)
  const q = value.trim().toLowerCase()
  const shown = focused
    ? suggestions.filter((s) => s.toLowerCase() !== q && (!q || s.toLowerCase().includes(q))).slice(0, 8)
    : []
  return (
    <div className={className}>
      <label className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 focus-within:border-emerald-500">
        <Icon name={icon} size={18} className="shrink-0 text-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-emerald-900/35"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange('')}
            className="p-1 text-muted"
            aria-label="ล้าง"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </label>
      {shown.length > 0 && (
        <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto">
          {shown.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(s)}
              className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 active:bg-emerald-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryPicker({ categories, selectedId, onPick, compact = false }) {
  return (
    <div className="grid grid-cols-5 gap-x-1 gap-y-3">
      {categories.map((c) => {
        const active = c.id === selectedId
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className="flex min-w-0 flex-col items-center gap-1 active:scale-95"
          >
            <span
              className={`flex items-center justify-center rounded-2xl text-2xl transition ${
                compact ? 'h-12 w-12' : 'h-14 w-14'
              } ${active ? 'bg-emerald-600 ring-4 ring-emerald-200' : 'bg-white shadow-sm ring-1 ring-emerald-900/5'}`}
            >
              {c.emoji}
            </span>
            <span className={`w-full truncate text-center text-xs ${active ? 'font-semibold text-emerald-700' : ''}`}>
              {c.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Tapping the selected method again clears it (payment method is optional)
export function MethodPicker({ methods, selectedId, onPick }) {
  if (!methods.length) return null
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="radiogroup" aria-label="วิธีจ่าย">
      {methods.map((m) => {
        const active = m.id === selectedId
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(active ? '' : m.id)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
              active ? 'bg-emerald-600 font-medium text-white' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-900/10'
            }`}
          >
            <span>{m.emoji}</span>
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

export function AmountInput({ value, onChange, inputRef, autoFocus, shake, size = 'lg' }) {
  return (
    <label
      className={`flex items-baseline justify-center gap-1 ${shake ? 'shake' : ''} ${
        size === 'lg' ? 'text-5xl' : 'text-4xl'
      } font-semibold tracking-tight`}
    >
      <span className="text-emerald-600/70">฿</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder="0"
        aria-label="จำนวนเงิน"
        style={{ fontSize: 'inherit', width: `${Math.max(1, value.length || 1) + 0.6}ch` }}
        className="max-w-[9ch] bg-transparent text-center caret-emerald-600 outline-none placeholder:text-emerald-900/20"
      />
    </label>
  )
}

export function DateChip({ value, onChange, label }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
      <Icon name="calendar" size={16} />
      {label}
      <input
        type="date"
        value={value}
        max="9999-12-31"
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-0 opacity-0"
        aria-label="เลือกวันที่"
      />
    </label>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-emerald-100/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
            value === o.value ? 'bg-white text-emerald-800 shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PeriodNav({ label, onPrev, onNext, canNext }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onPrev} className="rounded-full p-2 active:bg-emerald-100" aria-label="ก่อนหน้า">
        <Icon name="left" />
      </button>
      <span className="font-semibold">{label}</span>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="rounded-full p-2 active:bg-emerald-100 disabled:opacity-25"
        aria-label="ถัดไป"
      >
        <Icon name="right" />
      </button>
    </div>
  )
}

export function EntryRow({ entry, category, method, onClick, showDate = false }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ background: (category?.color ?? '#64748B') + '22' }}
      >
        {category?.emoji ?? '📦'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.note || category?.name || 'อื่นๆ'}</span>
        <span className="block truncate text-xs text-muted">
          {[
            entry.note ? category?.name : null,
            method && `${method.emoji} ${method.name}`,
            entry.place && `📍 ${entry.place}`,
            showDate && fmtDay(entry.date),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="shrink-0 font-semibold tabular-nums">{entry.amount.toLocaleString('th-TH')}</span>
    </button>
  )
}
