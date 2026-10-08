import { useCallback, useEffect, useRef, useState } from 'react'
import { actions, getPersistError, useData } from './store'
import { Toast, ToastContext } from './components/ui'
import Icon from './components/Icon'
import EntrySheet from './components/EntrySheet'
import GuideSheet from './components/GuideSheet'
import AddScreen from './screens/AddScreen'
import ListScreen from './screens/ListScreen'
import SummaryScreen from './screens/SummaryScreen'
import SettingsScreen from './screens/SettingsScreen'

const TABS = [
  { id: 'add', label: 'บันทึก', icon: 'pencil' },
  { id: 'list', label: 'รายการ', icon: 'list' },
  { id: 'summary', label: 'สรุป', icon: 'pie' },
  { id: 'settings', label: 'ตั้งค่า', icon: 'settings' },
]

export default function App() {
  const data = useData()
  const [tab, setTab] = useState('add')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const scrollRef = useRef(null)

  const showToast = useCallback((t) => setToast({ ...t, id: Date.now() }), [])
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (getPersistError()) showToast({ message: 'บันทึกลงเครื่องไม่สำเร็จ พื้นที่อาจเต็ม หรือเปิดในโหมดส่วนตัว', duration: 6000 })
  }, [data, showToast])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [tab])

  const firstRun = !data.meta.onboarded
  const closeGuide = () => {
    if (firstRun) actions.setMeta({ onboarded: true })
    setGuideOpen(false)
  }

  return (
    <ToastContext.Provider value={showToast}>
      <div className="mx-auto flex h-full max-w-lg flex-col">
        <main ref={scrollRef} className="pt-safe flex-1 overflow-y-auto">
          {tab === 'add' && <AddScreen onEdit={setEditing} />}
          {tab === 'list' && <ListScreen onEdit={setEditing} />}
          {tab === 'summary' && <SummaryScreen onEdit={setEditing} />}
          {tab === 'settings' && <SettingsScreen onShowGuide={() => setGuideOpen(true)} />}
        </main>

        <nav className="pb-safe border-t border-emerald-900/5 bg-white/95 backdrop-blur">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] ${
                  tab === t.id ? 'font-semibold text-emerald-600' : 'text-muted'
                }`}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                <Icon name={t.icon} size={24} strokeWidth={tab === t.id ? 2.2 : 1.8} />
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
      <GuideSheet open={firstRun || guideOpen} firstRun={firstRun} onClose={closeGuide} />
      <Toast toast={toast} onClose={closeToast} />
    </ToastContext.Provider>
  )
}
