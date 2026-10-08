import { useMemo } from 'react'
import { useData } from '../store'
import { money } from '../utils'

export function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5 ${className}`}>
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

// Category, payment method and place breakdowns for any list of entries
export function Breakdown({ entries, total, bars }) {
  const data = useData()

  const byCategory = useMemo(() => {
    const totals = new Map()
    for (const e of entries) totals.set(e.categoryId, (totals.get(e.categoryId) || 0) + e.amount)
    const known = new Map(data.categories.map((c) => [c.id, c]))
    return [...totals.entries()]
      .map(([id, amount]) => ({ cat: known.get(id) ?? known.get('other'), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [entries, data.categories])

  const byMethod = useMemo(() => {
    const totals = new Map()
    for (const e of entries) totals.set(e.methodId || '', (totals.get(e.methodId || '') || 0) + e.amount)
    const known = new Map(data.methods.map((m) => [m.id, m]))
    return [...totals.entries()]
      .map(([id, amount]) => ({ id, method: known.get(id), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [entries, data.methods])

  const byPlace = useMemo(() => {
    const totals = new Map()
    for (const e of entries) {
      if (!e.place) continue
      const t = totals.get(e.place) || { amount: 0, count: 0 }
      totals.set(e.place, { amount: t.amount + e.amount, count: t.count + 1 })
    }
    return [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8)
  }, [entries])

  if (!total) return null
  const pct = (n) => `${Math.round((n / total) * 100)}%`

  return (
    <>
      <Card title="แยกตามหมวดหมู่">
        <div className="flex items-center gap-5">
          <Donut parts={byCategory.map((r) => ({ value: r.amount, color: r.cat.color }))} />
          <ul className="min-w-0 flex-1 space-y-2 text-sm">
            {byCategory.map(({ cat, amount }) => (
              <li key={cat.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                <span className="min-w-0 flex-1 truncate">
                  {cat.emoji} {cat.name}
                </span>
                <span className="text-xs text-muted">{pct(amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="mt-4 divide-y divide-emerald-900/5 border-t border-emerald-900/5 text-sm">
          {byCategory.map(({ cat, amount }) => (
            <li key={cat.id} className="flex justify-between py-2">
              <span>
                {cat.emoji} {cat.name}
              </span>
              <span className="font-semibold tabular-nums">{money(amount)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {bars && (
        <Card title={bars.title}>
          <Bars bars={bars.items} dense={bars.dense} />
        </Card>
      )}

      {byMethod.some((r) => r.method) && (
        <Card title="แยกตามวิธีจ่าย">
          <ul className="space-y-3 text-sm">
            {byMethod.map(({ id, method, amount }) => (
              <li key={id || 'none'}>
                <div className="mb-1 flex justify-between">
                  <span className={method ? '' : 'text-muted'}>{method ? `${method.emoji} ${method.name}` : 'ไม่ระบุ'}</span>
                  <span className="font-semibold tabular-nums">
                    {money(amount)}
                    <span className="ml-2 text-xs font-normal text-muted">{pct(amount)}</span>
                  </span>
                </div>
                <ProgressBar value={amount} max={total} muted={!method} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {byPlace.length > 0 && (
        <Card title="แยกตามสถานที่">
          <ul className="-mt-1 divide-y divide-emerald-900/5 text-sm">
            {byPlace.map(([place, { amount, count }]) => (
              <li key={place} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">📍 {place}</span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold tabular-nums">{money(amount)}</span>
                  <span className="ml-2 text-xs text-muted">{count} ครั้ง</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

export function ProgressBar({ value, max, muted = false, danger = false, thick = false }) {
  const width = max ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className={`${thick ? 'h-2.5' : 'h-1.5'} overflow-hidden rounded-full bg-emerald-50`}>
      <div
        className={`h-full rounded-full ${danger ? 'bg-red-500' : muted ? 'bg-emerald-900/15' : 'bg-emerald-500'}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function Donut({ parts, size = 120, stroke = 22 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = parts.reduce((a, p) => a + p.value, 0)
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECFDF5" strokeWidth={stroke} />
      {parts.map((p, i) => {
        const len = (p.value / total) * c
        // 1.5px gap between slices when there is more than one
        const gap = parts.length > 1 ? 1.5 : 0
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(len - gap, 0)} ${c}`}
            strokeDashoffset={-offset}
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}

export function Bars({ bars, dense }) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 items-end" title={`${b.label}: ${money(b.value)}`}>
            <div
              className={`w-full rounded-t-sm ${b.value ? 'bg-emerald-500' : 'bg-emerald-100'}`}
              style={{ height: b.value ? `${Math.max((b.value / max) * 100, 3)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 text-center">
            {!dense || i === 0 || (i + 1) % 5 === 0 ? b.label : ''}
          </span>
        ))}
      </div>
      <p className="mt-2 text-right text-xs text-muted">สูงสุด {money(max)}</p>
    </div>
  )
}
