// crypto.randomUUID needs a secure context; fall back for http://<LAN IP> during dev
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export function shiftDate(iso, days) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

const moneyFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 })
export const money = (n) => `฿${moneyFmt.format(n || 0)}`
export const fmtNum = (n) => moneyFmt.format(n || 0)

const dayFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' })
const dayLongFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
const monthFmt = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })
const monthShortFmt = new Intl.DateTimeFormat('th-TH', { month: 'short' })
const yearFmt = new Intl.DateTimeFormat('th-TH', { year: 'numeric' })

export const fmtDay = (iso) => dayFmt.format(parseISODate(iso))
export const fmtDayLong = (iso) => dayLongFmt.format(parseISODate(iso))
export const fmtMonth = (ym) => monthFmt.format(parseISODate(`${ym}-01`))
export const fmtMonthShort = (m) => monthShortFmt.format(new Date(2000, m, 1))
export const fmtYear = (y) => yearFmt.format(new Date(Number(y), 0, 1))

export function relativeDayLabel(iso) {
  const t = todayISO()
  if (iso === t) return 'วันนี้'
  if (iso === shiftDate(t, -1)) return 'เมื่อวาน'
  return fmtDay(iso)
}

export function daysSince(ts) {
  if (!ts) return Infinity
  return Math.floor((Date.now() - ts) / 86400000)
}

// Keep only digits and a single dot, max 2 decimals
export function sanitizeAmount(raw) {
  let s = raw.replace(/,/g, '').replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2)
  if (s.startsWith('.')) s = '0' + s
  return s.slice(0, 12)
}

export function parseAmount(s) {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

export function sum(list) {
  return list.reduce((a, e) => a + e.amount, 0)
}

// Period keys: day 'YYYY-MM-DD', month 'YYYY-MM', year 'YYYY'
export function inPeriod(dateISO, mode, key) {
  if (mode === 'day') return dateISO === key
  if (mode === 'month') return dateISO.startsWith(key + '-')
  return dateISO.startsWith(key + '-')
}

export function currentPeriodKey(mode) {
  const t = todayISO()
  return mode === 'day' ? t : mode === 'month' ? t.slice(0, 7) : t.slice(0, 4)
}

export function shiftPeriod(mode, key, delta) {
  if (mode === 'day') return shiftDate(key, delta)
  if (mode === 'month') {
    const [y, m] = key.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  return String(Number(key) + delta)
}

export function periodLabel(mode, key) {
  if (mode === 'day') return fmtDayLong(key)
  if (mode === 'month') return fmtMonth(key)
  return fmtYear(key)
}

export async function shareOrDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const file = new File([blob], filename, { type: mime })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
