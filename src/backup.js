import { actions, buildBackup, buildCSV } from './store'
import { shareOrDownload, todayISO } from './utils'

export async function exportBackup(data) {
  const result = await shareOrDownload(`kachaijai-backup-${todayISO()}.json`, buildBackup(data), 'application/json')
  if (result !== 'cancelled') actions.setMeta({ lastBackupAt: Date.now() })
  return result
}

export async function exportCSV(data) {
  return shareOrDownload(`kachaijai-${todayISO()}.csv`, buildCSV(data), 'text/csv')
}

export async function readBackupFile(file) {
  const text = await file.text()
  const json = JSON.parse(text)
  if (!json || !Array.isArray(json.entries)) throw new Error('not a KaChaiJai backup')
  return json
}
