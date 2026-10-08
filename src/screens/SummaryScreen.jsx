import { useMemo, useState } from 'react'
import { actions, useData } from '../store'
import { currentPeriodKey, fmtMonthShort, inPeriod, money, periodLabel, shiftPeriod, sum, todayISO } from '../utils'
import { PeriodNav, Segmented } from '../components/ui'
import { Breakdown, Card } from '../components/charts'
import ProjectsView from './ProjectsView'

const MODES = [
  { value: 'day', label: 'วัน' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
  { value: 'project', label: 'โปรเจกต์' },
]
const PREV_LABEL = { day: 'เมื่อวาน', month: 'เดือนก่อน', year: 'ปีก่อน' }

export default function SummaryScreen({ onEdit }) {
  const [mode, setMode] = useState('month')
  return (
    <div className="space-y-4 px-4 pb-6">
      <h1 className="pt-1 text-xl font-bold">สรุป</h1>
      <Segmented options={MODES} value={mode} onChange={setMode} />
      {mode === 'project' ? <ProjectsView onEdit={onEdit} /> : <PeriodSummary mode={mode} />}
    </div>
  )
}

function PeriodSummary({ mode }) {
  const data = useData()
  const [keys, setKeys] = useState(() => ({
    day: currentPeriodKey('day'),
    month: currentPeriodKey('month'),
    year: currentPeriodKey('year'),
  }))
  const key = keys[mode]
  const setKey = (k) => setKeys((s) => ({ ...s, [mode]: k }))
  const exclude = !!data.meta.excludeProjects && data.projects.length > 0

  const pool = useMemo(
    () => (exclude ? data.entries.filter((e) => !e.projectId) : data.entries),
    [data.entries, exclude],
  )
  const entries = useMemo(() => pool.filter((e) => inPeriod(e.date, mode, key)), [pool, mode, key])
  const prevKey = shiftPeriod(mode, key, -1)
  // An unfinished month/year is compared with the same span of the previous one (e.g. 1–4 Oct vs 1–4 Sep)
  const partial = mode !== 'day' && key === currentPeriodKey(mode)
  const prevTotal = useMemo(() => {
    const today = todayISO()
    const cutoff = mode === 'month' ? today.slice(8) : today.slice(5)
    return sum(
      pool.filter((e) => inPeriod(e.date, mode, prevKey) && (!partial || e.date.slice(mode === 'month' ? 8 : 5) <= cutoff)),
    )
  }, [pool, mode, prevKey, partial])
  const total = sum(entries)

  const bars = useMemo(() => {
    if (mode === 'year') {
      return {
        title: 'รายเดือน',
        items: Array.from({ length: 12 }, (_, m) => {
          const mk = `${key}-${String(m + 1).padStart(2, '0')}`
          return { label: fmtMonthShort(m), value: sum(entries.filter((e) => e.date.startsWith(mk))) }
        }),
      }
    }
    if (mode === 'month') {
      const [y, m] = key.split('-').map(Number)
      const days = new Date(y, m, 0).getDate()
      return {
        title: 'รายวัน',
        dense: true,
        items: Array.from({ length: days }, (_, d) => {
          const dk = `${key}-${String(d + 1).padStart(2, '0')}`
          return { label: String(d + 1), value: sum(entries.filter((e) => e.date === dk)) }
        }),
      }
    }
    return null
  }, [mode, key, entries])

  const diff = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null

  return (
    <>
      <div className="rounded-2xl bg-white px-2 py-1 shadow-sm ring-1 ring-emerald-900/5">
        <PeriodNav
          label={periodLabel(mode, key)}
          onPrev={() => setKey(shiftPeriod(mode, key, -1))}
          onNext={() => setKey(shiftPeriod(mode, key, 1))}
          canNext={key < currentPeriodKey(mode)}
        />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted">ยอดรวม · {entries.length} รายการ</p>
          {data.projects.length > 0 && (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={exclude}
                onChange={(e) => actions.setMeta({ excludeProjects: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              ไม่รวมโปรเจกต์
            </label>
          )}
        </div>
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
      </Card>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted">ไม่มีค่าใช้จ่ายในช่วงนี้</p>
      ) : (
        <Breakdown entries={entries} total={total} bars={bars} />
      )}
    </>
  )
}
