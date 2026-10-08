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

// Rates are typed in by the user; the app never fetches live exchange rates
export const CURRENCIES = [
  { code: 'THB', symbol: '฿', name: 'บาท' },
  { code: 'CNY', symbol: '¥', name: 'หยวน' },
  { code: 'JPY', symbol: '¥', name: 'เยน' },
  { code: 'KRW', symbol: '₩', name: 'วอน' },
  { code: 'USD', symbol: '$', name: 'ดอลลาร์สหรัฐ' },
  { code: 'EUR', symbol: '€', name: 'ยูโร' },
  { code: 'GBP', symbol: '£', name: 'ปอนด์' },
  { code: 'SGD', symbol: 'S$', name: 'ดอลลาร์สิงคโปร์' },
  { code: 'HKD', symbol: 'HK$', name: 'ดอลลาร์ฮ่องกง' },
  { code: 'TWD', symbol: 'NT$', name: 'ดอลลาร์ไต้หวัน' },
  { code: 'MYR', symbol: 'RM', name: 'ริงกิต' },
  { code: 'VND', symbol: '₫', name: 'ดอง' },
  { code: 'LAK', symbol: '₭', name: 'กีบ' },
  { code: 'AUD', symbol: 'A$', name: 'ดอลลาร์ออสเตรเลีย' },
]
export const currencyOf = (code) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]

// A project has a foreign currency only when it isn't THB and has a usable rate
export const hasForeign = (project) => !!project && project.currency !== 'THB' && project.rate > 0

const toBaht = (foreign, rate) => Math.round(foreign * rate * 100) / 100

function defaultMethods() {
  const now = Date.now()
  return [
    { id: 'cash', name: 'เงินสด', emoji: '💵' },
    { id: 'transfer', name: 'โอน/สแกนจ่าย', emoji: '📱' },
    { id: 'credit', name: 'บัตรเครดิต', emoji: '💳' },
  ].map((m) => ({ ...m, updatedAt: now }))
}

function emptyData() {
  return {
    version: SCHEMA_VERSION,
    categories: defaultCategories(),
    methods: defaultMethods(),
    projects: [],
    entries: [],
    favorites: [],
    meta: { lastBackupAt: null, onboarded: false, backupDismissedAt: null, lastMethodId: null, activeProjectId: null },
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
  // Files from before payment methods existed get the defaults; an explicitly empty list stays empty
  const methods = Array.isArray(d?.methods) ? d.methods : base.methods
  const methodIds = new Set(methods.map((m) => m.id))
  const validMethod = (id) => (methodIds.has(id) ? id : '')
  const projects = Array.isArray(d?.projects)
    ? d.projects.map((p) => ({
        currency: 'THB',
        rate: null,
        budget: null,
        ...p,
      }))
    : []
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const entries = Array.isArray(d?.entries)
    ? d.entries
        .filter((e) => e && e.id && Number.isFinite(e.amount) && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
        .map((e) => ({
          ...e,
          note: e.note ?? '',
          place: e.place ?? '',
          categoryId: catIds.has(e.categoryId) ? e.categoryId : OTHER_ID,
          methodId: validMethod(e.methodId),
          projectId: projectById.has(e.projectId) ? e.projectId : '',
          foreignAmount:
            Number.isFinite(e.foreignAmount) && hasForeign(projectById.get(e.projectId)) ? e.foreignAmount : null,
        }))
    : []
  const meta = { ...base.meta, ...(d?.meta || {}) }
  meta.lastMethodId = validMethod(meta.lastMethodId) || null
  if (!projectById.has(meta.activeProjectId)) meta.activeProjectId = null
  return {
    version: SCHEMA_VERSION,
    categories,
    methods,
    projects,
    entries,
    favorites: Array.isArray(d?.favorites)
      ? d.favorites.map((f) => ({ ...f, methodId: validMethod(f.methodId) }))
      : [],
    meta,
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
  addEntry({ amount, categoryId, methodId = '', projectId = '', foreignAmount = null, note = '', place = '', date }) {
    const now = Date.now()
    const entry = {
      id: uid(),
      amount,
      categoryId,
      methodId: methodId || '',
      projectId: projectId || '',
      foreignAmount: foreignAmount ?? null,
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

  addFavorite({ amount, categoryId, methodId = '', note = '', place = '' }) {
    const fav = { id: uid(), amount, categoryId, methodId: methodId || '', note: note.trim(), place: place.trim() }
    set((s) => ({ ...s, favorites: [...s.favorites, fav] }))
  },
  deleteFavorite(id) {
    set((s) => ({ ...s, favorites: s.favorites.filter((f) => f.id !== id) }))
  },

  addMethod({ name, emoji }) {
    const m = { id: uid(), name: name.trim(), emoji, updatedAt: Date.now() }
    set((s) => ({ ...s, methods: [...s.methods, m] }))
  },
  updateMethod(id, patch) {
    set((s) => ({
      ...s,
      methods: s.methods.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)),
    }))
  },
  // Entries paid with a deleted method become "ไม่ระบุ"
  deleteMethod(id) {
    const now = Date.now()
    set((s) => ({
      ...s,
      methods: s.methods.filter((m) => m.id !== id),
      entries: s.entries.map((e) => (e.methodId === id ? { ...e, methodId: '', updatedAt: now } : e)),
      favorites: s.favorites.map((f) => (f.methodId === id ? { ...f, methodId: '' } : f)),
      meta: s.meta.lastMethodId === id ? { ...s.meta, lastMethodId: null } : s.meta,
    }))
  },
  moveMethod(id, dir) {
    set((s) => {
      const list = [...s.methods]
      const i = list.findIndex((m) => m.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return s
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...s, methods: list }
    })
  },

  addProject({ name, emoji, currency, rate, budget }) {
    const now = Date.now()
    const project = { id: uid(), name: name.trim(), emoji, currency, rate, budget, createdAt: now, updatedAt: now }
    set((s) => ({ ...s, projects: [...s.projects, project] }))
    return project
  },
  // Changing a project's rate re-prices every entry that was typed in the foreign currency
  updateProject(id, patch) {
    const now = Date.now()
    set((s) => {
      const projects = s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p))
      const project = projects.find((p) => p.id === id)
      const foreign = hasForeign(project)
      const entries = s.entries.map((e) => {
        if (e.projectId !== id || e.foreignAmount == null) return e
        if (!foreign) return { ...e, foreignAmount: null, updatedAt: now }
        const amount = toBaht(e.foreignAmount, project.rate)
        return amount === e.amount ? e : { ...e, amount, updatedAt: now }
      })
      return { ...s, projects, entries }
    })
  },
  // Entries stay; they just lose the project tag
  deleteProject(id) {
    const now = Date.now()
    set((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      entries: s.entries.map((e) => (e.projectId === id ? { ...e, projectId: '', foreignAmount: null, updatedAt: now } : e)),
      meta: s.meta.activeProjectId === id ? { ...s.meta, activeProjectId: null } : s.meta,
    }))
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
      const methods = new Map(s.methods.map((m) => [m.id, m]))
      for (const m of incoming.methods) {
        const cur = methods.get(m.id)
        if (!cur || (m.updatedAt || 0) > (cur.updatedAt || 0)) methods.set(m.id, m)
      }
      const projects = new Map(s.projects.map((p) => [p.id, p]))
      for (const p of incoming.projects) {
        const cur = projects.get(p.id)
        if (!cur || (p.updatedAt || 0) > (cur.updatedAt || 0)) projects.set(p.id, p)
      }
      const favIds = new Set(s.favorites.map((f) => f.id))
      return {
        ...s,
        entries: [...byId.values()],
        categories: [...cats.values()].sort((a, b) => (a.id === OTHER_ID) - (b.id === OTHER_ID)),
        methods: [...methods.values()],
        projects: [...projects.values()],
        favorites: [...s.favorites, ...incoming.favorites.filter((f) => !favIds.has(f.id))],
      }
    })
    return added
  },
  clearAll() {
    set(() => ({ ...emptyData(), meta: { ...emptyData().meta, onboarded: true } }))
  },
}

export { toBaht }

export function buildBackup(data) {
  return JSON.stringify({ app: 'KaChaiJai', exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function buildCSV(data, entries = data.entries) {
  const cats = new Map(data.categories.map((c) => [c.id, c]))
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const methods = new Map(data.methods.map((m) => [m.id, m]))
  const projects = new Map(data.projects.map((p) => [p.id, p]))
  const rows = [['วันที่', 'หมวดหมู่', 'จำนวนเงิน (บาท)', 'วิธีจ่าย', 'โน้ต', 'สถานที่', 'โปรเจกต์', 'ยอดสกุลเงินต่างประเทศ', 'สกุลเงิน']]
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  for (const e of sorted) {
    const project = projects.get(e.projectId)
    rows.push([
      e.date,
      cats.get(e.categoryId)?.name ?? 'อื่นๆ',
      e.amount,
      methods.get(e.methodId)?.name ?? '',
      e.note,
      e.place,
      project?.name ?? '',
      e.foreignAmount ?? '',
      e.foreignAmount != null ? project?.currency : '',
    ])
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
