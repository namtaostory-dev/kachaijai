import { useRef, useState } from 'react'
import { actions, OTHER_ID, useData } from '../store'
import { daysSince, money } from '../utils'
import { exportBackup, exportCSV, readBackupFile } from '../backup'
import { Sheet, useToast } from '../components/ui'
import CategorySheet from '../components/CategorySheet'
import MethodSheet from '../components/MethodSheet'
import Icon from '../components/Icon'

export default function SettingsScreen({ onShowGuide }) {
  const data = useData()
  const toast = useToast()
  const fileRef = useRef(null)
  const [editingCat, setEditingCat] = useState(null)
  const [editingMethod, setEditingMethod] = useState(null)
  const [pendingImport, setPendingImport] = useState(null)

  const cats = new Map(data.categories.map((c) => [c.id, c]))
  const last = data.meta.lastBackupAt
  const lastLabel = last
    ? `สำรองล่าสุด ${new Date(last).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}${
        daysSince(last) >= 7 ? ` (${daysSince(last)} วันก่อน)` : ''
      }`
    : 'ยังไม่เคยสำรองข้อมูล'

  const onBackup = async () => {
    const r = await exportBackup(data)
    if (r === 'downloaded') toast({ message: 'ดาวน์โหลดไฟล์สำรองแล้ว' })
    if (r === 'shared') toast({ message: 'สำรองข้อมูลแล้ว' })
  }

  const onCSV = async () => {
    if (!data.entries.length) return toast({ message: 'ยังไม่มีรายการให้ export' })
    const r = await exportCSV(data)
    if (r === 'downloaded') toast({ message: 'ดาวน์โหลด CSV แล้ว' })
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = await readBackupFile(file)
      setPendingImport({ json, name: file.name })
    } catch {
      toast({ message: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ KaChaiJai (.json)' })
    }
  }

  const doImport = (mode) => {
    const { json } = pendingImport
    if (mode === 'replace') {
      actions.replaceAll(json)
      toast({ message: `นำเข้าแล้ว ${json.entries.length} รายการ` })
    } else {
      const added = actions.mergeAll(json)
      toast({ message: `รวมข้อมูลแล้ว เพิ่มใหม่ ${added} รายการ` })
    }
    setPendingImport(null)
  }

  const onClearAll = () => {
    if (!window.confirm('ลบข้อมูลทั้งหมด?\nรายการ หมวดหมู่ และรายการโปรดจะหายถาวร')) return
    if (!window.confirm('แน่ใจนะ? แนะนำให้สำรองข้อมูลก่อน')) return
    actions.clearAll()
    toast({ message: 'ลบข้อมูลทั้งหมดแล้ว' })
  }

  return (
    <div className="space-y-5 px-4 pb-6">
      <h1 className="pt-1 text-xl font-bold">ตั้งค่า</h1>

      <Section title="หมวดหมู่" icon="tag">
        <ul className="divide-y divide-emerald-900/5">
          {data.categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 py-1.5">
              <button onClick={() => setEditingCat(c)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: c.color + '22' }}>
                  {c.emoji}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
              {c.id !== OTHER_ID && (
                <>
                  <IconBtn icon="up" label="เลื่อนขึ้น" disabled={i === 0} onClick={() => actions.moveCategory(c.id, -1)} />
                  <IconBtn
                    icon="down"
                    label="เลื่อนลง"
                    disabled={i >= data.categories.length - 2}
                    onClick={() => actions.moveCategory(c.id, 1)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        <button
          onClick={() => setEditingCat({})}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-400 py-2.5 text-sm font-medium text-emerald-700 active:bg-emerald-50"
        >
          <Icon name="plus" size={18} /> เพิ่มหมวดหมู่
        </button>
      </Section>

      <Section title="วิธีจ่าย" icon="wallet">
        <ul className="divide-y divide-emerald-900/5">
          {data.methods.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 py-1.5">
              <button onClick={() => setEditingMethod(m)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xl">{m.emoji}</span>
                <span className="truncate">{m.name}</span>
              </button>
              <IconBtn icon="up" label="เลื่อนขึ้น" disabled={i === 0} onClick={() => actions.moveMethod(m.id, -1)} />
              <IconBtn
                icon="down"
                label="เลื่อนลง"
                disabled={i === data.methods.length - 1}
                onClick={() => actions.moveMethod(m.id, 1)}
              />
            </li>
          ))}
        </ul>
        <button
          onClick={() => setEditingMethod({})}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-400 py-2.5 text-sm font-medium text-emerald-700 active:bg-emerald-50"
        >
          <Icon name="plus" size={18} /> เพิ่มวิธีจ่าย
        </button>
      </Section>

      <Section title="รายการโปรด" icon="star">
        {data.favorites.length === 0 ? (
          <p className="py-2 text-sm text-muted">
            แตะรายการที่เคยบันทึก แล้วกด "ตั้งเป็นรายการโปรด" จะได้ปุ่มบันทึกด่วนที่หน้าบันทึก
          </p>
        ) : (
          <ul className="divide-y divide-emerald-900/5">
            {data.favorites.map((f) => {
              const c = cats.get(f.categoryId)
              return (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{c?.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {[f.note, f.place].filter(Boolean).join(' · ') || c?.name}
                  </span>
                  <span className="text-sm font-semibold">{money(f.amount)}</span>
                  <IconBtn icon="trash" label="ลบรายการโปรด" onClick={() => actions.deleteFavorite(f.id)} />
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="สำรองและย้ายข้อมูล" icon="shield">
        <p className={`mb-3 text-sm ${!last || daysSince(last) >= 7 ? 'font-medium text-yellow-800' : 'text-muted'}`}>
          {lastLabel}
        </p>
        <div className="space-y-2">
          <ActionBtn icon="download" primary onClick={onBackup} title="สำรองข้อมูล (.json)" sub="เก็บครบทุกอย่าง ใช้ย้ายเครื่องหรือกู้คืน" />
          <ActionBtn icon="upload" onClick={() => fileRef.current?.click()} title="นำเข้าข้อมูล" sub="จากไฟล์สำรอง .json" />
          <ActionBtn icon="table" onClick={onCSV} title="Export CSV" sub="เปิดใน Excel / Google Sheets" />
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onPickFile} className="hidden" />
      </Section>

      <Section title="เกี่ยวกับแอป" icon="info">
        <div className="space-y-2 text-sm text-muted">
          <p>
            <span className="font-semibold text-ink">KaChaiJai</span> · เวอร์ชัน 1.2.0
          </p>
          <p>ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เท่านั้น ไม่มีการส่งขึ้นเซิร์ฟเวอร์ ไม่มีโฆษณา และไม่เก็บสถิติการใช้งาน</p>
          <p>ถ้าลบแอปออกจากหน้าจอโฮม หรือเปลี่ยนเครื่อง ข้อมูลจะหาย ควรสำรองข้อมูลเป็นระยะ</p>
          <button onClick={onShowGuide} className="font-medium text-emerald-700 underline underline-offset-2">
            วิธีติดตั้งลงหน้าจอโฮม
          </button>
        </div>
      </Section>

      <button onClick={onClearAll} className="w-full rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-600 active:bg-red-100">
        ลบข้อมูลทั้งหมด
      </button>

      <CategorySheet category={editingCat} onClose={() => setEditingCat(null)} />
      <MethodSheet method={editingMethod} onClose={() => setEditingMethod(null)} />

      <Sheet open={!!pendingImport} onClose={() => setPendingImport(null)} title="นำเข้าข้อมูล">
        {pendingImport && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              ไฟล์ <span className="font-medium text-ink">{pendingImport.name}</span> มี {pendingImport.json.entries.length} รายการ
            </p>
            <ActionBtn
              icon="check"
              primary
              onClick={() => doImport('merge')}
              title="รวมกับข้อมูลเดิม"
              sub="รายการที่ซ้ำกันจะไม่ถูกเพิ่มซ้ำ"
            />
            <ActionBtn
              icon="alert"
              onClick={() => {
                if (window.confirm('ข้อมูลเดิมในเครื่องนี้จะถูกแทนที่ทั้งหมด ดำเนินการต่อ?')) doImport('replace')
              }}
              title="แทนที่ทั้งหมด"
              sub="ใช้ตอนย้ายมาเครื่องใหม่"
            />
          </div>
        )}
      </Sheet>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-900/5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Icon name={icon} size={18} className="text-emerald-600" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function IconBtn({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full p-2 text-muted active:bg-emerald-50 disabled:opacity-20"
    >
      <Icon name={icon} size={18} />
    </button>
  )
}

function ActionBtn({ icon, title, sub, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${
        primary ? 'bg-emerald-600 text-white active:bg-emerald-700' : 'bg-emerald-50 active:bg-emerald-100'
      }`}
    >
      <Icon name={icon} className="shrink-0" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className={`block text-xs ${primary ? 'text-emerald-100' : 'text-muted'}`}>{sub}</span>
      </span>
    </button>
  )
}
