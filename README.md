# KaChaiJai

แอปจดค่าใช้จ่ายแบบ PWA: ไม่ต้องล็อกอิน ไม่มีกระเป๋าเงิน และข้อมูลเก็บใน LocalStorage ของเครื่องผู้ใช้เท่านั้น

## พัฒนา

```bash
npm install
npm run dev        # เปิด http://localhost:5173 (ใช้ --host อยู่แล้ว เปิดจากมือถือในวง Wi-Fi เดียวกันได้)
npm run build      # build ลง dist/ (base path = /kachaijai/ สำหรับ GitHub Pages)
npm run icons      # สร้างไอคอนใหม่จาก public/icon.svg
```

## Deploy (GitHub Pages)

1. สร้าง repo ชื่อ `kachaijai` (public) แล้ว push ขึ้น branch `main`
2. ไปที่ repo → Settings → Pages → Source: **GitHub Actions**
3. ทุกครั้งที่ push ขึ้น `main` ระบบจะ deploy ให้อัตโนมัติ (`.github/workflows/deploy.yml`)
4. แอปจะอยู่ที่ `https://<username>.github.io/kachaijai/`

ถ้าเปลี่ยนชื่อ repo ให้แก้ `base` ใน `vite.config.js` ให้ตรงกัน

## โครงสร้างข้อมูล

คีย์ใน LocalStorage คือ `kachaijai:data:v1`

```js
{
  version: 1,
  categories: [{ id, name, emoji, color, updatedAt }],   // "other" ลบไม่ได้
  methods:    [{ id, name, emoji, updatedAt }],          // วิธีจ่าย
  projects:   [{ id, name, emoji, currency, rate, budget, createdAt, updatedAt }],
  entries:    [{ id, amount /* บาทเสมอ */, foreignAmount, categoryId, methodId, projectId, note, place, date: 'YYYY-MM-DD', createdAt, updatedAt }],
  favorites:  [{ id, amount, categoryId, methodId, note, place }],
  meta:       { lastBackupAt, onboarded, backupDismissedAt, lastMethodId, activeProjectId, excludeProjects },
}
```

ทุกรายการมี `id` (UUID) และ `updatedAt` จึงรวมข้อมูลจากหลายไฟล์ได้โดยไม่ซ้ำ และพร้อมต่อยอดเป็นระบบซิงก์ในอนาคต
