import { isIOS, isStandalone } from '../utils'
import { Sheet } from './ui'
import Icon from './Icon'

export default function GuideSheet({ open, onClose, firstRun }) {
  const ios = isIOS()
  const installed = isStandalone()
  return (
    <Sheet open={open} onClose={onClose} title={firstRun ? 'ยินดีต้อนรับสู่ KaChaiJai' : 'วิธีติดตั้งลงหน้าจอโฮม'}>
      <div className="space-y-4 text-sm">
        {firstRun && (
          <div className="space-y-2">
            <p>จดค่าใช้จ่ายแบบง่าย ๆ: พิมพ์จำนวนเงิน แล้วแตะหมวดหมู่ เท่านี้ก็บันทึกแล้ว</p>
            <div className="flex gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-900">
              <Icon name="shield" className="shrink-0" />
              <p>ข้อมูลเก็บอยู่ในเครื่องนี้เท่านั้น ไม่ต้องสมัครสมาชิก ไม่มีการส่งข้อมูลออกไปไหน</p>
            </div>
            <div className="flex gap-2 rounded-2xl bg-yellow-100 p-3 text-yellow-950">
              <Icon name="alert" className="shrink-0" />
              <p>ถ้าลบแอปหรือเปลี่ยนเครื่อง ข้อมูลจะหาย ควรกด "สำรองข้อมูล" ในหน้าตั้งค่าเป็นระยะ แอปจะเตือนทุก 7 วัน</p>
            </div>
          </div>
        )}

        {installed ? (
          firstRun ? null : <p>ติดตั้งเรียบร้อยแล้ว 🎉</p>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">ติดตั้งเป็นแอปบนหน้าจอโฮม</p>
            {ios ? (
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  เปิดหน้านี้ด้วย <b>Safari</b>
                </li>
                <li>
                  แตะปุ่มแชร์ <Icon name="share" size={16} className="inline align-text-bottom" /> ที่แถบล่าง
                </li>
                <li>
                  เลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> (Add to Home Screen)
                </li>
                <li>เปิดแอปจากไอคอน KaChaiJai บนหน้าจอโฮม</li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  <b>Android (Chrome):</b> แตะเมนู ⋮ แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"
                </li>
                <li>
                  <b>คอมพิวเตอร์ (Chrome/Edge):</b> กดไอคอนติดตั้งที่ท้ายช่องที่อยู่เว็บ
                </li>
                <li>
                  <b>Mac (Safari):</b> เมนู File แล้วเลือก "Add to Dock"
                </li>
              </ol>
            )}
            {ios && (
              <p className="text-xs text-muted">
                หมายเหตุ: ข้อมูลใน Safari กับในแอปบนหน้าจอโฮมแยกกัน ควรเริ่มจดหลังติดตั้งแล้ว
              </p>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700">
          {firstRun ? 'เริ่มใช้งาน' : 'เข้าใจแล้ว'}
        </button>
      </div>
    </Sheet>
  )
}
