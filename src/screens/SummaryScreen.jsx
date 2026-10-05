import { useMemo, useState } from 'react'
import { useData } from '../store'
import { currentPeriodKey, fmtMonthShort, inPeriod, money, periodLabel, shiftPeriod, sum, todayISO } from '../utils'
import { PeriodNav, Segmented } from '../components/ui'

const MODES = [
  { value: 'day', label: 'วัน' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
]
const PREV_LABEL = { day: 'เมื่อวาน', month: 'เดือนก่อน', year: 'ปีก่อน' }

export default function SummaryScreen() {
  const data = useData()
  const [mode, setMode] = useState('month')
  const [keys, setKeys] = useState(() => ({
    day: currentPeriodKey('day'),
    month: currentPeriodKey('month'),
    year: currentPeriodKey('year'),
  }))
  const key = keys[mode]
  const setKey = (k) => setKeys((s) => ({ ...s, [mode]: k }))

  const entries = useMemo(() => data.entries.filter((e) => inPeriod(e.date, mode, key)), [data.entries, mode, key])
  const prevKey = shiftPeriod(mode, key, -1)
  // An unfinished month/year is compared with the same span of the previous one (e.g. 1–4 Oct vs 1–4 Sep)
  const partial = mode !== 'day' && key === currentPeriodKey(mode)
  const prevTotal = useMemo(() => {
    const today = todayISO()
    const cutoff = mode === 'month' ? today.slice(8) : today.slice(5)
    return sum(
      data.entries.filter(
        (e) => inPeriod(e.date, mode, prevKey) && (!partial || e.date.slice(mode === 'month' ? 8 : 5) <= cutoff),
      ),
    )
  }, [data.entries, mode, prevKey, partial])
  const total = sum(entries)

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

  const bars = useMemo(() => {
    if (mode === 'year') {
      return Array.from({ length: 12 }, (_, m) => {
        const mk = `${key}-${String(m + 1).padStart(2, '0')}`
        return { label: fmtMonthShort(m), value: sum(entries.filter((e) => e.date.startsWith(mk))) }
      })
    }
    if (mode === 'month') {
      const [y, m] = key.split('-').map(Number)
      const days = new Date(y, m, 0).getDate()
      return Array.from({ length: days }, (_, d) => {
        const dk = `${key}-${String(d + 1).padStart(2, '0')}`
        return { label: String(d + 1), value: sum(entries.filter((e) => e.date === dk)) }
      })
    }
    return null
  }, [mode, key, entries])

  const diff = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null

  return (
    <div className="space-y-4 px-4 pb-6">
      <h1 className="pt-1 text-xl font-bold">สรุป</h1>
      <Segmented options={MODES} value={mode} onChange={setMode} />
      <div className="rounded-2xl bg-white px-2 py-1 shadow-sm ring-1 ring-emerald-900/5">
        <PeriodNav
          label={periodLabel(mode, key)}
          onPrev={() => setKey(shiftPeriod(mode, key, -1))}
          onNext={() => setKey(shiftPeriod(mode, key, 1))}
          canNext={key < currentPeriodKey(mode)}
        />
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5">
        <p className="text-sm text-muted">ยอดรวม · {entries.length} รายการ</p>
        <p className="mt-1 inline-block rounded-xl bg-yellow-300 px-3 py-0.5 text-3xl font-bold tracking-tight text-yellow-950">
          {money(total)}
        </p>
        {diff !== null && (
          <p className={`mt-2 text-sm ${diff > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {diff > 0 ? '▲ มากกว่า' : diff < 0 ? '▼ น้อยกว่า' : 'เท่ากับ'}
            {diff !== 0 && ` ${Math.abs(Math.round(diff))}%`} จาก{partial ? 'ช่วงเดียวกันของ' : ''}
            {PREV_LABEL[mode]} ({money(prevTotal)})
          </p>
        )}
      </section>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted">ไม่มีค่าใช้จ่ายในช่วงนี้</p>
      ) : (
        <>
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5">
            <h2 className="mb-4 font-semibold">แยกตามหมวดหมู่</h2>
            <div className="flex items-center gap-5">
              <Donut parts={byCategory.map((r) => ({ value: r.amount, color: r.cat.color }))} />
              <ul className="min-w-0 flex-1 space-y-2 text-sm">
                {byCategory.map(({ cat, amount }) => (
                  <li key={cat.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                    <span className="min-w-0 flex-1 truncate">
                      {cat.emoji} {cat.name}
                    </span>
                    <span className="text-xs text-muted">{Math.round((amount / total) * 100)}%</span>
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
          </section>

          {byMethod.some((r) => r.method) && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5">
              <h2 className="mb-3 font-semibold">แยกตามวิธีจ่าย</h2>
              <ul className="space-y-3 text-sm">
                {byMethod.map(({ id, method, amount }) => (
                  <li key={id || 'none'}>
                    <div className="mb-1 flex justify-between">
                      <span className={method ? '' : 'text-muted'}>
                        {method ? `${method.emoji} ${method.name}` : 'ไม่ระบุ'}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {money(amount)}
                        <span className="ml-2 text-xs font-normal text-muted">{Math.round((amount / total) * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-emerald-50">
                      <div
                        className={`h-full rounded-full ${method ? 'bg-emerald-500' : 'bg-emerald-900/15'}`}
                        style={{ width: `${(amount / total) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bars && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5">
              <h2 className="mb-3 font-semibold">{mode === 'year' ? 'รายเดือน' : 'รายวัน'}</h2>
              <Bars bars={bars} dense={mode === 'month'} />
            </section>
          )}

          {byPlace.length > 0 && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/5">
              <h2 className="mb-2 font-semibold">แยกตามสถานที่</h2>
              <ul className="divide-y divide-emerald-900/5 text-sm">
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
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Donut({ parts, size = 120, stroke = 22 }) {
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

function Bars({ bars, dense }) {
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
