import { useMemo, useRef, useState } from 'react'
import { actions, currencyOf, hasForeign, recentValues, toBaht, useData } from '../store'
import { daysSince, fmtNum, money, parseAmount, relativeDayLabel, sanitizeAmount, sum, todayISO } from '../utils'
import { exportBackup } from '../backup'
import { AmountInput, CategoryPicker, DateChip, EntryRow, MethodPicker, SuggestInput, useLookups, useToast } from '../components/ui'
import Icon from '../components/Icon'

const BACKUP_REMIND_DAYS = 7

export default function AddScreen({ onEdit }) {
  const data = useData()
  const toast = useToast()
  const amountRef = useRef(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState(todayISO)
  // Most people pay the same way repeatedly, so the last choice sticks
  const [methodId, setMethodId] = useState(() => data.meta.lastMethodId ?? '')
  const [shake, setShake] = useState(false)
  // Inside a foreign-currency project, amounts are typed in that currency unless switched to baht
  const [typeInBaht, setTypeInBaht] = useState(false)
  const look = useLookups()

  const today = todayISO()
  const cats = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories])
  const methods = useMemo(() => new Map(data.methods.map((m) => [m.id, m])), [data.methods])
  const activeMethodId = methods.has(methodId) ? methodId : ''
  const project = data.projects.find((p) => p.id === data.meta.activeProjectId)
  const inForeign = hasForeign(project) && !typeInBaht
  const cur = project ? currencyOf(project.currency) : null

  // Turns what was typed into { amount (baht), foreignAmount }
  const priced = (value) =>
    inForeign ? { amount: toBaht(value, project.rate), foreignAmount: value } : { amount: value, foreignAmount: null }
  const notes = useMemo(() => recentValues(data.entries, 'note'), [data.entries])
  const places = useMemo(() => recentValues(data.entries, 'place'), [data.entries])
  const todayTotal = useMemo(() => sum(data.entries.filter((e) => e.date === today)), [data.entries, today])
  const dayEntries = useMemo(
    () => data.entries.filter((e) => e.date === date).sort((a, b) => b.createdAt - a.createdAt),
    [data.entries, date],
  )

  const backupDue = useMemo(() => {
    if (data.entries.length < 5) return null
    const since = data.meta.lastBackupAt ?? Math.min(...data.entries.map((e) => e.createdAt))
    const days = daysSince(since)
    if (days < BACKUP_REMIND_DAYS) return null
    if (daysSince(data.meta.backupDismissedAt) < 3) return null
    return { days, never: !data.meta.lastBackupAt }
  }, [data])

  const nudge = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
    amountRef.current?.focus()
    toast({ message: 'ใส่จำนวนเงินก่อน แล้วแตะหมวดหมู่', duration: 2000 })
  }

  const record = (fields) => {
    const entry = actions.addEntry({ ...fields, projectId: project?.id ?? '', date })
    setAmount('')
    setNote('')
    setPlace('')
    const cat = cats.get(entry.categoryId)
    toast({
      message: `บันทึก ${money(entry.amount)} · ${cat?.emoji ?? ''} ${cat?.name ?? ''}${date !== today ? ` (${relativeDayLabel(date)})` : ''}`,
      action: { label: 'เลิกทำ', onClick: () => actions.deleteEntry(entry.id) },
    })
  }

  const saveWithCategory = (categoryId) => {
    const value = parseAmount(amount)
    if (!value) return nudge()
    record({ ...priced(value), categoryId, methodId: activeMethodId, note, place })
  }

  // A typed amount overrides the favourite's usual price
  const saveFavorite = (fav) => {
    const typed = parseAmount(amount)
    record({
      ...(typed ? priced(typed) : { amount: fav.amount, foreignAmount: null }),
      categoryId: cats.has(fav.categoryId) ? fav.categoryId : 'other',
      methodId: methods.has(fav.methodId) ? fav.methodId : activeMethodId,
      note: note || fav.note,
      place: place || fav.place,
    })
  }

  const isOtherDay = date !== today

  return (
    <div className="space-y-4 px-4 pb-6">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold tracking-tight text-emerald-800">KaChaiJai</h1>
        <span className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-semibold text-yellow-950">
          วันนี้ {money(todayTotal)}
        </span>
      </header>

      {project && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-300 bg-yellow-100 px-3 py-2.5 text-yellow-950">
          <span className="text-2xl">{project.emoji}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-xs">กำลังจดใน</span>
            <span className="block truncate font-semibold">{project.name}</span>
          </span>
          <button
            onClick={() => {
              actions.setMeta({ activeProjectId: null })
              setTypeInBaht(false)
              toast({ message: `ปิดโปรเจกต์ ${project.name} แล้ว กลับไปจดแบบปกติ` })
            }}
            className="shrink-0 rounded-full bg-yellow-950 px-3 py-1.5 text-sm font-medium text-yellow-50"
          >
            ปิด
          </button>
        </div>
      )}

      {backupDue && (
        <div className="flex items-center gap-3 rounded-2xl bg-yellow-100 p-3 text-sm text-yellow-950">
          <Icon name="alert" className="shrink-0" />
          <span className="flex-1">
            {backupDue.never ? 'ยังไม่เคยสำรองข้อมูล' : `ไม่ได้สำรองข้อมูลมา ${backupDue.days} วัน`}
          </span>
          <button
            onClick={() => exportBackup(data)}
            className="rounded-full bg-yellow-950 px-3 py-1.5 font-medium text-yellow-50"
          >
            สำรองเลย
          </button>
          <button
            onClick={() => actions.setMeta({ backupDismissedAt: Date.now() })}
            className="p-1 text-yellow-900/60"
            aria-label="ซ่อน"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-900/5">
        <div className="flex items-center justify-center gap-2">
          <DateChip value={date} onChange={setDate} label={relativeDayLabel(date)} />
          {hasForeign(project) && (
            <button
              onClick={() => setTypeInBaht((v) => !v)}
              className="rounded-full border border-emerald-600 px-3 py-1 text-sm font-medium text-emerald-800 active:bg-emerald-50"
              aria-label="สลับสกุลเงิน"
            >
              {inForeign ? `${cur.symbol} ${cur.name}` : '฿ บาท'} ⇄
            </button>
          )}
          {isOtherDay && (
            <button onClick={() => setDate(today)} className="text-sm text-emerald-700 underline underline-offset-2">
              กลับไปวันนี้
            </button>
          )}
        </div>
        <AmountInput
          inputRef={amountRef}
          value={amount}
          onChange={(v) => setAmount(sanitizeAmount(v))}
          autoFocus
          shake={shake}
          symbol={inForeign ? cur.symbol : '฿'}
        />
        {inForeign && (
          <p className="-mt-2 text-center text-xs text-muted">
            ≈ {money(toBaht(parseAmount(amount) ?? 0, project.rate))} · 1{cur.symbol} = {fmtNum(project.rate)}฿
          </p>
        )}
        <SuggestInput value={note} onChange={setNote} placeholder="โน้ต (ไม่บังคับ)" icon="note" suggestions={notes} />
        <SuggestInput value={place} onChange={setPlace} placeholder="สถานที่ (ไม่บังคับ)" icon="pin" suggestions={places} />
        <MethodPicker
          methods={data.methods}
          selectedId={activeMethodId}
          onPick={(id) => {
            setMethodId(id)
            actions.setMeta({ lastMethodId: id || null })
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="text-center text-xs text-muted">แตะหมวดหมู่เพื่อบันทึก</p>
        <CategoryPicker categories={data.categories} onPick={saveWithCategory} />
      </section>

      {data.favorites.length > 0 && (
        <section className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {data.favorites.map((f) => {
            const c = cats.get(f.categoryId)
            return (
              <button
                key={f.id}
                onClick={() => saveFavorite(f)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-emerald-500 bg-white px-3 py-1.5 text-sm text-emerald-900 active:bg-emerald-50"
              >
                <span>{c?.emoji ?? '⭐'}</span>
                <span className="max-w-[10rem] truncate">{[f.note, f.place].filter(Boolean).join(' · ') || c?.name}</span>
                <span className="font-semibold">{money(f.amount)}</span>
              </button>
            )
          })}
        </section>
      )}

      <section className="rounded-3xl bg-white px-4 py-2 shadow-sm ring-1 ring-emerald-900/5">
        <div className="flex items-center justify-between border-b border-emerald-900/5 py-2 text-sm">
          <span className="font-semibold">รายการ{relativeDayLabel(date)}</span>
          <span className="text-muted">{money(sum(dayEntries))}</span>
        </div>
        {dayEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">ยังไม่มีรายการ{relativeDayLabel(date)}</p>
        ) : (
          <div className="divide-y divide-emerald-900/5">
            {dayEntries.map((e) => (
              <EntryRow key={e.id} {...look.rowProps(e)} onClick={() => onEdit(e)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
