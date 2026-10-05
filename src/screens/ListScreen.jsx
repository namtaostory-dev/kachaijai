import { useMemo, useState } from 'react'
import { useData } from '../store'
import { currentPeriodKey, fmtDayLong, fmtMonth, money, shiftPeriod, sum } from '../utils'
import { EntryRow, PeriodNav, SuggestInput } from '../components/ui'

export default function ListScreen({ onEdit }) {
  const data = useData()
  const [month, setMonth] = useState(() => currentPeriodKey('month'))
  const [catFilter, setCatFilter] = useState(null)
  const [query, setQuery] = useState('')

  const cats = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories])
  const methods = useMemo(() => new Map(data.methods.map((m) => [m.id, m])), [data.methods])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.entries.filter(
      (e) =>
        e.date.startsWith(month + '-') &&
        (!catFilter || e.categoryId === catFilter) &&
        (!q || e.note.toLowerCase().includes(q) || e.place.toLowerCase().includes(q)),
    )
  }, [data.entries, month, catFilter, query])

  const groups = useMemo(() => {
    const map = new Map()
    for (const e of [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date).push(e)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="space-y-3 px-4 pb-6">
      <h1 className="pt-1 text-xl font-bold">รายการ</h1>
      <div className="rounded-2xl bg-white px-2 py-1 shadow-sm ring-1 ring-emerald-900/5">
        <PeriodNav
          label={fmtMonth(month)}
          onPrev={() => setMonth(shiftPeriod('month', month, -1))}
          onNext={() => setMonth(shiftPeriod('month', month, 1))}
          canNext={month < currentPeriodKey('month')}
        />
      </div>
      <SuggestInput value={query} onChange={setQuery} placeholder="ค้นหาโน้ตหรือสถานที่" icon="note" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={!catFilter} onClick={() => setCatFilter(null)}>
          ทั้งหมด
        </FilterChip>
        {data.categories.map((c) => (
          <FilterChip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}>
            {c.emoji} {c.name}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-baseline justify-between px-1 text-sm">
        <span className="text-muted">{filtered.length} รายการ</span>
        <span className="font-semibold">รวม {money(sum(filtered))}</span>
      </div>

      {groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">ไม่มีรายการในเดือนนี้</p>
      ) : (
        groups.map(([date, list]) => (
          <section key={date} className="rounded-3xl bg-white px-4 py-2 shadow-sm ring-1 ring-emerald-900/5">
            <div className="flex justify-between border-b border-emerald-900/5 py-2 text-sm">
              <span className="font-semibold">{fmtDayLong(date)}</span>
              <span className="text-muted">{money(sum(list))}</span>
            </div>
            <div className="divide-y divide-emerald-900/5">
              {list.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  category={cats.get(e.categoryId)}
                  method={methods.get(e.methodId)}
                  onClick={() => onEdit(e)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
        active ? 'bg-emerald-600 font-medium text-white' : 'bg-white text-ink ring-1 ring-emerald-900/10'
      }`}
    >
      {children}
    </button>
  )
}
