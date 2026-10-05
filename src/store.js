import { useSyncExternalStore } from 'react'
import { uid, toISODate } from './utils'

// Every key is prefixed so the app never collides with other apps on the same origin
const STORAGE_KEY = 'kachaijai:data:v1'
export const SCHEMA_VERSION = 1
export const OTHER_ID = 'other'

export const CATEGORY_COLORS = [
  '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#64748B',
  '#10B981', '#EAB308', '#EF4444', '#06B6D4', '#A16207',
]

function defaultCategories() {
  const now = Date.now()
  return [
    { id: 'food', name: 'อาหาร', emoji: '🍜', color: '#F97316' },
    { id: 'travel', name: 'เดินทาง', emoji: '🚗', color: '#3B82F6' },
    { id: 'shopping', name: 'ซื้อของ', emoji: '🛍️', color: '#EC4899' },
    { id: 'fun', name: 'บันเทิง', emoji: '🎬', color: '#8B5CF6' },
    { id: OTHER_ID, name: 'อื่นๆ', emoji: '📦', color: '#64748B' },
  ].map((c) => ({ ...c, updatedAt: now }))
}

function emptyData() {
  return {
    version: SCHEMA_VERSION,
    categories: defaultCategories(),
    entries: [],
    favorites: [],
    meta: { lastBackupAt: null, onboarded: false, backupDismissedAt: null },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    return normalize(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

// Fill in anything missing so older / imported files never crash the app
export function normalize(d) {
  const base = emptyData()
  const categories = Array.isArray(d?.categories) && d.categories.length ? d.categories : base.categories
  if (!categories.some((c) => c.id === OTHER_ID)) categories.push(base.categories.find((c) => c.id === OTHER_ID))
  const catIds = new Set(categories.map((c) => c.id))
  const entries = Array.isArray(d?.entries)
    ? d.entries
        .filter((e) => e && e.id && Number.isFinite(e.amount) && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
        .map((e) => ({
          ...e,
          note: e.note ?? '',
          place: e.place ?? '',
          categoryId: catIds.has(e.categoryId) ? e.categoryId : OTHER_ID,
        }))
    : []
  return {
    version: SCHEMA_VERSION,
    categories,
    entries,
    favorites: Array.isArray(d?.favorites) ? d.favorites : [],
    meta: { ...base.meta, ...(d?.meta || {}) },
  }
}

let state = load()
const listeners = new Set()
let persistError = null

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    persistError = null
  } catch (e) {
    persistError = e
  }
}

function set(updater) {
  state = updater(state)
  persist()
  listeners.forEach((l) => l())
}

export function useData() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export const getPersistError = () => persistError

export const actions = {
  addEntry({ amount, categoryId, note = '', place = '', date }) {
    const now = Date.now()
    const entry = {
      id: uid(),
      amount,
      categoryId,
      note: note.trim(),
      place: place.trim(),
      date: date || toISODate(),
      createdAt: now,
      updatedAt: now,
    }
    set((s) => ({ ...s, entries: [...s.entries, entry] }))
    return entry
  },
  updateEntry(id, patch) {
    set((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id
          ? { ...e, ...patch, note: (patch.note ?? e.note).trim(), place: (patch.place ?? e.place).trim(), updatedAt: Date.now() }
          : e,
      ),
    }))
  },
  deleteEntry(id) {
    let removed = null
    set((s) => {
      removed = s.entries.find((e) => e.id === id)
      return { ...s, entries: s.entries.filter((e) => e.id !== id) }
    })
    return removed
  },
  restoreEntry(entry) {
    set((s) => (s.entries.some((e) => e.id === entry.id) ? s : { ...s, entries: [...s.entries, entry] }))
  },

  addCategory({ name, emoji, color }) {
    const cat = { id: uid(), name: name.trim(), emoji, color, updatedAt: Date.now() }
    // Keep "อื่นๆ" last
    set((s) => {
      const others = s.categories.filter((c) => c.id !== OTHER_ID)
      const other = s.categories.find((c) => c.id === OTHER_ID)
      return { ...s, categories: [...others, cat, other] }
    })
  },
  updateCategory(id, patch) {
    set((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
    }))
  },
  deleteCategory(id) {
    if (id === OTHER_ID) return
    const now = Date.now()
    set((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      entries: s.entries.map((e) => (e.categoryId === id ? { ...e, categoryId: OTHER_ID, updatedAt: now } : e)),
      favorites: s.favorites.map((f) => (f.categoryId === id ? { ...f, categoryId: OTHER_ID } : f)),
    }))
  },
  moveCategory(id, dir) {
    set((s) => {
      const list = [...s.categories]
      const i = list.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return s
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...s, categories: list }
    })
  },

  addFavorite({ amount, categoryId, note = '', place = '' }) {
    const fav = { id: uid(), amount, categoryId, note: note.trim(), place: place.trim() }
    set((s) => ({ ...s, favorites: [...s.favorites, fav] }))
  },
  deleteFavorite(id) {
    set((s) => ({ ...s, favorites: s.favorites.filter((f) => f.id !== id) }))
  },

  setMeta(patch) {
    set((s) => ({ ...s, meta: { ...s.meta, ...patch } }))
  },

  replaceAll(data) {
    const next = normalize(data)
    set((s) => ({ ...next, meta: { ...next.meta, onboarded: true, lastBackupAt: s.meta.lastBackupAt } }))
  },
  // Merge by id; when both sides have the same item, the newer updatedAt wins
  mergeAll(data) {
    const incoming = normalize(data)
    let added = 0
    set((s) => {
      const byId = new Map(s.entries.map((e) => [e.id, e]))
      for (const e of incoming.entries) {
        const cur = byId.get(e.id)
        if (!cur) added++
        if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) byId.set(e.id, e)
      }
      const cats = new Map(s.categories.map((c) => [c.id, c]))
      for (const c of incoming.categories) {
        const cur = cats.get(c.id)
        if (!cur || (c.updatedAt || 0) > (cur.updatedAt || 0)) cats.set(c.id, c)
      }
      const favIds = new Set(s.favorites.map((f) => f.id))
      return {
        ...s,
        entries: [...byId.values()],
        categories: [...cats.values()].sort((a, b) => (a.id === OTHER_ID) - (b.id === OTHER_ID)),
        favorites: [...s.favorites, ...incoming.favorites.filter((f) => !favIds.has(f.id))],
      }
    })
    return added
  },
  clearAll() {
    set(() => ({ ...emptyData(), meta: { ...emptyData().meta, onboarded: true } }))
  },
}

export function buildBackup(data) {
  return JSON.stringify({ app: 'KaChaiJai', exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function buildCSV(data) {
  const cats = new Map(data.categories.map((c) => [c.id, c]))
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = [['วันที่', 'หมวดหมู่', 'จำนวนเงิน', 'โน้ต', 'สถานที่']]
  const sorted = [...data.entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  for (const e of sorted) {
    rows.push([e.date, cats.get(e.categoryId)?.name ?? 'อื่นๆ', e.amount, e.note, e.place])
  }
  // BOM so Excel reads Thai correctly
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

// Recent unique values for suggestion chips, most recent first
export function recentValues(entries, field, limit = 8) {
  const seen = new Map()
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt)
  for (const e of sorted) {
    const v = e[field]
    if (v && !seen.has(v)) seen.set(v, true)
    if (seen.size >= limit * 3) break
  }
  return [...seen.keys()]
}
