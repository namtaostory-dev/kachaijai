import { useEffect, useState } from 'react'
import { actions, useData } from '../store'
import { Sheet, useToast } from './ui'

const EMOJIS = ['💵', '📱', '💳', '🏦', '🪙', '💰', '🧧', '🎫', '🟦', '🟩', '🟥', '🟨', '🟪', '⬛']

// method: an existing payment method to edit, or {} to create a new one
export default function MethodSheet({ method, onClose }) {
  const data = useData()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const isNew = method && !method.id

  useEffect(() => {
    if (method) setForm({ name: method.name ?? '', emoji: method.emoji ?? '💳' })
  }, [method])

  if (!method || !form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const count = isNew ? 0 : data.entries.filter((e) => e.methodId === method.id).length

  const save = () => {
    if (!form.name.trim()) return toast({ message: 'ใส่ชื่อวิธีจ่ายก่อน', duration: 2000 })
    if (isNew) actions.addMethod(form)
    else actions.updateMethod(method.id, { ...form, name: form.name.trim() })
    onClose()
  }

  const remove = () => {
    const msg = count
      ? `ลบ "${method.name}"?\nรายการ ${count} รายการที่จ่ายด้วยวิธีนี้จะกลายเป็น "ไม่ระบุ"`
      : `ลบ "${method.name}"?`
    if (!window.confirm(msg)) return
    actions.deleteMethod(method.id)
    toast({ message: 'ลบวิธีจ่ายแล้ว' })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? 'เพิ่มวิธีจ่าย' : 'แก้ไขวิธีจ่าย'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
            {form.emoji}
          </span>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value.slice(0, 20) })}
            placeholder="ชื่อ เช่น บัตร KTC"
            className="min-w-0 flex-1 rounded-xl border border-emerald-900/10 px-3 py-3 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => set({ emoji: e })}
              className={`rounded-xl py-1.5 text-2xl ${form.emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'active:bg-emerald-50'}`}
            >
              {e}
            </button>
          ))}
        </div>
        <button onClick={save} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700">
          บันทึก
        </button>
        {!isNew && (
          <button onClick={remove} className="w-full rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-600 active:bg-red-100">
            ลบวิธีจ่ายนี้{count ? ` (${count} รายการจะเป็น "ไม่ระบุ")` : ''}
          </button>
        )}
      </div>
    </Sheet>
  )
}
