import { useEffect, useState } from 'react'
import { actions, CATEGORY_COLORS, OTHER_ID, useData } from '../store'
import { Sheet, useToast } from './ui'

const EMOJIS = ['🍜', '☕', '🍺', '🚗', '⛽', '🚇', '🛍️', '🛒', '🎬', '🎮', '🎾', '🏸', '⚽', '💪', '🏠', '💡', '📱', '💊', '🐶', '👶', '🎁', '📚', '✈️', '💇', '👕', '🧾', '💸', '📦']

function firstGrapheme(s) {
  if (!s) return ''
  if (Intl.Segmenter) return [...new Intl.Segmenter().segment(s)].at(-1)?.segment ?? ''
  return [...s].at(-1)
}

// category: an existing category to edit, or {} to create a new one
export default function CategorySheet({ category, onClose }) {
  const data = useData()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const isNew = category && !category.id

  useEffect(() => {
    if (category) setForm({ name: category.name ?? '', emoji: category.emoji ?? '🏷️', color: category.color ?? CATEGORY_COLORS[5] })
  }, [category])

  if (!category || !form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const count = isNew ? 0 : data.entries.filter((e) => e.categoryId === category.id).length

  const save = () => {
    if (!form.name.trim()) return toast({ message: 'ใส่ชื่อหมวดหมู่ก่อน', duration: 2000 })
    if (isNew) actions.addCategory(form)
    else actions.updateCategory(category.id, { ...form, name: form.name.trim() })
    onClose()
  }

  const remove = () => {
    const msg = count
      ? `ลบหมวด "${category.name}"?\nรายการ ${count} รายการในหมวดนี้จะย้ายไปอยู่ "อื่นๆ"`
      : `ลบหมวด "${category.name}"?`
    if (!window.confirm(msg)) return
    actions.deleteCategory(category.id)
    toast({ message: 'ลบหมวดหมู่แล้ว' })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? 'เพิ่มหมวดหมู่' : 'แก้ไขหมวดหมู่'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
            style={{ background: form.color + '22' }}
          >
            {form.emoji}
            <input
              value=""
              onChange={(e) => {
                const g = firstGrapheme(e.target.value)
                if (g.trim()) set({ emoji: g })
              }}
              className="absolute inset-0 opacity-0"
              aria-label="พิมพ์ emoji"
            />
          </label>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value.slice(0, 20) })}
            placeholder="ชื่อหมวด เช่น กีฬา"
            className="min-w-0 flex-1 rounded-xl border border-emerald-900/10 px-3 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">เลือก emoji (หรือแตะไอคอนด้านบนเพื่อพิมพ์เอง)</p>
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
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">สีในกราฟ</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set({ color: c })}
                className={`h-9 w-9 rounded-full ${form.color === c ? 'ring-4 ring-offset-2' : ''}`}
                style={{ background: c, '--tw-ring-color': c }}
                aria-label={`สี ${c}`}
              />
            ))}
          </div>
        </div>

        <button onClick={save} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700">
          บันทึก
        </button>
        {!isNew && category.id !== OTHER_ID && (
          <button onClick={remove} className="w-full rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-600 active:bg-red-100">
            ลบหมวดหมู่{count ? ` (${count} รายการจะย้ายไป "อื่นๆ")` : ''}
          </button>
        )}
      </div>
    </Sheet>
  )
}
