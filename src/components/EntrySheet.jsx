import { useEffect, useMemo, useState } from 'react'
import { actions, recentValues, useData } from '../store'
import { fmtDayLong, parseAmount, sanitizeAmount } from '../utils'
import { AmountInput, CategoryPicker, DateChip, MethodPicker, Sheet, SuggestInput, useToast } from './ui'
import Icon from './Icon'

export default function EntrySheet({ entry, onClose }) {
  const data = useData()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (entry) setForm({ ...entry, amount: String(entry.amount) })
  }, [entry])

  const notes = useMemo(() => recentValues(data.entries, 'note'), [data.entries])
  const places = useMemo(() => recentValues(data.entries, 'place'), [data.entries])

  if (!entry || !form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = () => {
    const amount = parseAmount(form.amount)
    if (!amount) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    actions.updateEntry(entry.id, {
      amount,
      categoryId: form.categoryId,
      methodId: form.methodId ?? '',
      date: form.date,
      note: form.note,
      place: form.place,
    })
    toast({ message: 'แก้ไขแล้ว' })
    onClose()
  }

  const remove = () => {
    const removed = actions.deleteEntry(entry.id)
    toast({ message: 'ลบรายการแล้ว', action: { label: 'เลิกทำ', onClick: () => actions.restoreEntry(removed) } })
    onClose()
  }

  const addFavorite = () => {
    const amount = parseAmount(form.amount)
    if (!amount) return
    actions.addFavorite({ amount, categoryId: form.categoryId, methodId: form.methodId, note: form.note, place: form.place })
    toast({ message: '⭐ เพิ่มในรายการโปรดแล้ว จะแสดงที่หน้าบันทึก' })
  }

  return (
    <Sheet open onClose={onClose} title="แก้ไขรายการ">
      <div className="space-y-4">
        <div className="flex justify-center">
          <DateChip value={form.date} onChange={(date) => set({ date })} label={fmtDayLong(form.date)} />
        </div>
        <AmountInput value={form.amount} onChange={(v) => set({ amount: sanitizeAmount(v) })} shake={shake} size="md" />
        <SuggestInput value={form.note} onChange={(note) => set({ note })} placeholder="โน้ต เช่น ตีเทนนิส" icon="note" suggestions={notes} />
        <SuggestInput value={form.place} onChange={(place) => set({ place })} placeholder="สถานที่ เช่น สนาม 700 ปี" icon="pin" suggestions={places} />
        <MethodPicker methods={data.methods} selectedId={form.methodId} onPick={(methodId) => set({ methodId })} />
        <CategoryPicker categories={data.categories} selectedId={form.categoryId} onPick={(categoryId) => set({ categoryId })} compact />
        <button onClick={save} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700">
          บันทึกการแก้ไข
        </button>
        <div className="flex gap-2">
          <button
            onClick={addFavorite}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-yellow-100 py-3 text-sm font-medium text-yellow-900 active:bg-yellow-200"
          >
            <Icon name="star" size={18} /> ตั้งเป็นรายการโปรด
          </button>
          <button
            onClick={remove}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-600 active:bg-red-100"
          >
            <Icon name="trash" size={18} /> ลบ
          </button>
        </div>
      </div>
    </Sheet>
  )
}
