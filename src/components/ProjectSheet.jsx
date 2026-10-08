import { useEffect, useState } from 'react'
import { actions, currencyOf, CURRENCIES, useData } from '../store'
import { parseAmount, sanitizeAmount } from '../utils'
import { Sheet, useToast } from './ui'

const EMOJIS = ['✈️', '🏖️', '🏔️', '🗼', '🏯', '🚗', '🏕️', '🎒', '🏠', '🔧', '💍', '🎉', '👶', '🎓', '🐶', '💼', '🏥', '📦']

// project: an existing project to edit, or {} to create a new one
export default function ProjectSheet({ project, onClose, onDeleted }) {
  const data = useData()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const isNew = project && !project.id

  useEffect(() => {
    if (!project) return
    setForm({
      name: project.name ?? '',
      emoji: project.emoji ?? '✈️',
      currency: project.currency ?? 'THB',
      rate: project.rate ? String(project.rate) : '',
      budget: project.budget ? String(project.budget) : '',
      startNow: true,
    })
  }, [project])

  if (!project || !form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const cur = currencyOf(form.currency)
  const foreign = form.currency !== 'THB'
  const count = isNew ? 0 : data.entries.filter((e) => e.projectId === project.id).length

  const save = () => {
    if (!form.name.trim()) return toast({ message: 'ใส่ชื่อโปรเจกต์ก่อน', duration: 2000 })
    const rate = foreign ? parseAmount(form.rate) : null
    if (foreign && !rate) return toast({ message: `ใส่อัตราแลกเปลี่ยน 1 ${cur.symbol} = กี่บาท`, duration: 2500 })
    const fields = {
      name: form.name.trim(),
      emoji: form.emoji,
      currency: form.currency,
      rate,
      budget: parseAmount(form.budget),
    }
    if (isNew) {
      const created = actions.addProject(fields)
      if (form.startNow) actions.setMeta({ activeProjectId: created.id })
      toast({ message: form.startNow ? `เริ่มจดใน ${fields.emoji} ${fields.name} แล้ว` : 'สร้างโปรเจกต์แล้ว' })
    } else {
      actions.updateProject(project.id, fields)
    }
    onClose()
  }

  const remove = () => {
    const msg = count
      ? `ลบโปรเจกต์ "${project.name}"?\nรายการ ${count} รายการจะไม่ถูกลบ แค่ไม่มีป้ายโปรเจกต์แล้ว`
      : `ลบโปรเจกต์ "${project.name}"?`
    if (!window.confirm(msg)) return
    actions.deleteProject(project.id)
    toast({ message: 'ลบโปรเจกต์แล้ว' })
    onClose()
    onDeleted?.()
  }

  const input = 'w-full rounded-xl border border-emerald-900/10 px-3 py-2.5 outline-none focus:border-emerald-500'

  return (
    <Sheet open onClose={onClose} title={isNew ? 'สร้างโปรเจกต์' : 'แก้ไขโปรเจกต์'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-3xl">{form.emoji}</span>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value.slice(0, 30) })}
            placeholder="ชื่อ เช่น ทริปเซี่ยงไฮ้"
            className={input}
          />
        </div>
        <div className="grid grid-cols-9 gap-0.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => set({ emoji: e })}
              className={`rounded-lg py-1 text-xl ${form.emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'active:bg-emerald-50'}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-muted">
            สกุลเงินที่ใช้จด
            <select value={form.currency} onChange={(e) => set({ currency: e.target.value })} className={`${input} mt-1 bg-white text-ink`}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          {foreign && (
            <label className="block text-sm text-muted">
              อัตราแลกเปลี่ยน (ใส่เอง)
              <div className="mt-1 flex items-center gap-2 text-ink">
                <span className="shrink-0">1 {cur.symbol} =</span>
                <input
                  value={form.rate}
                  onChange={(e) => set({ rate: sanitizeAmount(e.target.value) })}
                  inputMode="decimal"
                  placeholder="4.90"
                  className={input}
                />
                <span className="shrink-0">บาท</span>
              </div>
              {!isNew && count > 0 && (
                <span className="mt-1 block text-xs">ถ้าแก้อัตรา รายการที่จดเป็น {cur.symbol} จะคำนวณยอดบาทใหม่ทั้งหมด</span>
              )}
            </label>
          )}
          <label className="block text-sm text-muted">
            งบ (ไม่บังคับ)
            <div className="mt-1 flex items-center gap-2 text-ink">
              <span className="shrink-0">฿</span>
              <input
                value={form.budget}
                onChange={(e) => set({ budget: sanitizeAmount(e.target.value) })}
                inputMode="decimal"
                placeholder="15000"
                className={input}
              />
            </div>
          </label>
        </div>

        {isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.startNow}
              onChange={(e) => set({ startNow: e.target.checked })}
              className="h-5 w-5 accent-emerald-600"
            />
            เริ่มจดในโปรเจกต์นี้เลย
          </label>
        )}

        <button onClick={save} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700">
          {isNew ? 'สร้างโปรเจกต์' : 'บันทึก'}
        </button>
        {!isNew && (
          <button onClick={remove} className="w-full rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-600 active:bg-red-100">
            ลบโปรเจกต์ (รายการไม่ถูกลบ)
          </button>
        )}
      </div>
    </Sheet>
  )
}
