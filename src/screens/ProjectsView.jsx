import { useMemo, useState } from 'react'
import { actions, buildCSV, currencyOf, hasForeign, useData } from '../store'
import { fmtDay, fmtDayLong, fmtMonthShort, fmtNum, money, parseISODate, shareOrDownload, shiftDate, sum } from '../utils'
import { EntryRow, useLookups, useToast } from '../components/ui'
import { Breakdown, Card, ProgressBar } from '../components/charts'
import ProjectSheet from '../components/ProjectSheet'
import Icon from '../components/Icon'

function projectStats(project, entries) {
  const list = entries.filter((e) => e.projectId === project.id)
  const dates = list.map((e) => e.date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  const days = first ? Math.round((parseISODate(last) - parseISODate(first)) / 86400000) + 1 : 0
  const total = sum(list)
  const foreignTotal = list.reduce((a, e) => a + (e.foreignAmount ?? 0), 0)
  return { list, first, last, days, total, foreignTotal }
}

function dateRange(first, last) {
  if (!first) return 'ยังไม่มีรายการ'
  if (first === last) return fmtDay(first)
  return `${fmtDay(first)} – ${fmtDay(last)}`
}

export default function ProjectsView({ onEdit }) {
  const data = useData()
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null)

  const open = data.projects.find((p) => p.id === openId)

  return (
    <>
      {open ? (
        <ProjectDetail project={open} onBack={() => setOpenId(null)} onEditProject={() => setEditing(open)} onEdit={onEdit} />
      ) : (
        <ProjectList onOpen={setOpenId} onCreate={() => setEditing({})} />
      )}
      <ProjectSheet project={editing} onClose={() => setEditing(null)} onDeleted={() => setOpenId(null)} />
    </>
  )
}

function ProjectList({ onOpen, onCreate }) {
  const data = useData()
  const activeId = data.meta.activeProjectId

  const rows = useMemo(() => {
    return data.projects
      .map((p) => ({ project: p, stats: projectStats(p, data.entries) }))
      .sort(
        (a, b) =>
          (b.project.id === activeId) - (a.project.id === activeId) ||
          (b.stats.last ?? '').localeCompare(a.stats.last ?? '') ||
          b.project.createdAt - a.project.createdAt,
      )
  }, [data.projects, data.entries, activeId])

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <Card>
          <p className="font-semibold">แยกค่าใช้จ่ายเป็นโปรเจกต์</p>
          <p className="mt-1 text-sm text-muted">
            เช่น ทริปเซี่ยงไฮ้ หรือซ่อมบ้าน เปิดโปรเจกต์ไว้ แล้วทุกรายการที่จดจะติดป้ายให้อัตโนมัติ
            ถ้าไปต่างประเทศ ตั้งสกุลเงินแล้วจดเป็นเงินท้องถิ่นได้เลย
          </p>
        </Card>
      )}
      {rows.map(({ project: p, stats }) => {
        const active = p.id === activeId
        const over = p.budget && stats.total > p.budget
        return (
          <div
            key={p.id}
            className={`rounded-3xl bg-white p-4 shadow-sm ${active ? 'ring-2 ring-yellow-300' : 'ring-1 ring-emerald-900/5'}`}
          >
            <div className="flex items-start gap-3">
              <button onClick={() => onOpen(p.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-semibold">
                  {p.emoji} {p.name}
                </span>
                <span className="block text-xs text-muted">
                  {dateRange(stats.first, stats.last)}
                  {hasForeign(p) && ` · ${currencyOf(p.currency).symbol} ${currencyOf(p.currency).name} @ ${p.rate}`}
                </span>
              </button>
              <button
                onClick={() => actions.setMeta({ activeProjectId: active ? null : p.id })}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  active ? 'bg-yellow-300 text-yellow-950' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-900/10'
                }`}
              >
                {active ? '● กำลังจด' : 'เปิดจด'}
              </button>
            </div>
            <button onClick={() => onOpen(p.id)} className="mt-2 block w-full text-left">
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-semibold">{money(stats.total)}</span>
                <span className={`text-xs ${over ? 'font-medium text-red-600' : 'text-muted'}`}>
                  {p.budget
                    ? over
                      ? `เกินงบ ${Math.round(((stats.total - p.budget) / p.budget) * 100)}%`
                      : `งบ ${money(p.budget)}`
                    : `${stats.list.length} รายการ`}
                </span>
              </div>
              {p.budget ? <ProgressBar value={stats.total} max={p.budget} danger={over} /> : null}
            </button>
          </div>
        )
      })}
      <button
        onClick={onCreate}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-emerald-400 py-3 text-sm font-medium text-emerald-700 active:bg-emerald-50"
      >
        <Icon name="plus" size={18} /> สร้างโปรเจกต์ใหม่
      </button>
    </div>
  )
}

function ProjectDetail({ project: p, onBack, onEditProject, onEdit }) {
  const data = useData()
  const toast = useToast()
  const look = useLookups()
  const active = data.meta.activeProjectId === p.id
  const stats = useMemo(() => projectStats(p, data.entries), [p, data.entries])
  const cur = currencyOf(p.currency)
  const over = p.budget && stats.total > p.budget

  // Daily bars across the trip; long projects fall back to monthly
  const bars = useMemo(() => {
    if (!stats.first) return null
    if (stats.days <= 62) {
      return {
        title: 'รายวัน',
        dense: stats.days > 14,
        items: Array.from({ length: stats.days }, (_, i) => {
          const d = shiftDate(stats.first, i)
          return { label: String(Number(d.slice(8))), value: sum(stats.list.filter((e) => e.date === d)) }
        }),
      }
    }
    const months = new Map()
    for (const e of stats.list) months.set(e.date.slice(0, 7), (months.get(e.date.slice(0, 7)) || 0) + e.amount)
    return {
      title: 'รายเดือน',
      items: [...months.entries()].sort().map(([k, v]) => ({ label: fmtMonthShort(Number(k.slice(5)) - 1), value: v })),
    }
  }, [stats])

  const groups = useMemo(() => {
    const map = new Map()
    for (const e of [...stats.list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date).push(e)
    }
    return [...map.entries()]
  }, [stats.list])

  const exportCSV = async () => {
    if (!stats.list.length) return toast({ message: 'ยังไม่มีรายการให้ export' })
    const safeName = p.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'project'
    const r = await shareOrDownload(`kachaijai-${safeName}.csv`, buildCSV(data, stats.list), 'text/csv')
    if (r === 'downloaded') toast({ message: 'ดาวน์โหลด CSV แล้ว' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <button onClick={onBack} className="-ml-2 rounded-full p-2 active:bg-emerald-100" aria-label="กลับ">
          <Icon name="left" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {p.emoji} {p.name}
        </h2>
        <button onClick={onEditProject} className="rounded-full p-2 text-muted active:bg-emerald-100" aria-label="แก้ไขโปรเจกต์">
          <Icon name="pencil" />
        </button>
      </div>

      <button
        onClick={() => actions.setMeta({ activeProjectId: active ? null : p.id })}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold ${
          active ? 'bg-yellow-300 text-yellow-950' : 'bg-emerald-600 text-white active:bg-emerald-700'
        }`}
      >
        {active ? '● กำลังจดในโปรเจกต์นี้ — แตะเพื่อปิด' : 'เริ่มจดในโปรเจกต์นี้'}
      </button>

      <Card>
        <p className="text-sm text-muted">
          ยอดรวม · {stats.list.length} รายการ{stats.days ? ` · ${stats.days} วัน` : ''}
        </p>
        <p className="mt-1 inline-block rounded-xl bg-yellow-300 px-3 py-0.5 text-3xl font-bold tracking-tight text-yellow-950">
          {money(stats.total)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {[
            hasForeign(p) && stats.foreignTotal > 0 && `จดเป็น${cur.name} ${cur.symbol}${fmtNum(stats.foreignTotal)}`,
            stats.days > 1 && `เฉลี่ย ${money(Math.round(stats.total / stats.days))}/วัน`,
            stats.first && dateRange(stats.first, stats.last),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {p.budget ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs">
              <span>งบ {money(p.budget)}</span>
              <span className={over ? 'font-medium text-red-600' : 'text-muted'}>
                {over ? `เกินงบ ${money(stats.total - p.budget)}` : `เหลือ ${money(p.budget - stats.total)}`}
              </span>
            </div>
            <ProgressBar value={stats.total} max={p.budget} danger={over} thick />
          </div>
        ) : null}
      </Card>

      {stats.total > 0 && <Breakdown entries={stats.list} total={stats.total} bars={bars} />}

      {groups.length > 0 && (
        <Card title="รายการ">
          <div className="-mt-1 space-y-3">
            {groups.map(([date, list]) => (
              <div key={date}>
                <div className="flex justify-between border-b border-emerald-900/5 pb-1 text-xs text-muted">
                  <span>{fmtDayLong(date)}</span>
                  <span>{money(sum(list))}</span>
                </div>
                <div className="divide-y divide-emerald-900/5">
                  {list.map((e) => (
                    <EntryRow key={e.id} {...look.rowProps(e, { hideProject: true })} onClick={() => onEdit(e)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <button
        onClick={exportCSV}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-sm font-medium text-emerald-800 active:bg-emerald-100"
      >
        <Icon name="table" size={18} /> Export CSV ของโปรเจกต์นี้
      </button>
    </div>
  )
}
