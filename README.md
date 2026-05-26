# ระบบบริหารความเสี่ยง — Hospital Risk Management

แดชบอร์ดบริหารความเสี่ยงโรงพยาบาล สร้างจากเคสตัวอย่าง RCA ให้เลือดผิดคน (IR 2503000003) และกรอบ HRO + Safety Culture + Compassionate RCA จากเอกสาร S7_Anuwat (HACC Forum 2568)

**สถาปัตยกรรม:** แยก frontend และ backend ออกเป็น 2 ระบบ

```
risk_management/
├── backend/      Express + TypeScript + Postgres (pg)  →  REST API บนพอร์ต 4000
└── frontend/     Next.js 15 (App Router) + React 19    →  UI บนพอร์ต 3000
```

- **backend** ดูแล DB, migration, business logic, REST API ทั้งหมด (รวม demo mode fallback เมื่อยังไม่มี DB)
- **frontend** เป็น UI ล้วน เรียก backend ผ่าน `fetch` — ไม่ได้ติด DB โดยตรงอีกแล้ว

---

## เริ่มใช้งานเร็ว (Demo mode — ไม่ต้องมี DB)

เปิด 2 terminal:

**Terminal 1 — backend**
```powershell
cd backend
npm install
copy .env.example .env       # ปรับ PORT หรือ POSTGRES_URL ถ้าต้องการ
npm run dev                  # เริ่ม API ที่ http://localhost:4000
```

**Terminal 2 — frontend**
```powershell
cd frontend
npm install
copy .env.example .env.local
npm run dev                  # เปิด http://localhost:3000
```

ถ้ายังไม่ตั้ง `POSTGRES_URL` ใน backend → API จะตอบด้วยข้อมูล demo อัตโนมัติ และ frontend จะแสดงแบนเนอร์ "Demo mode"

---

## เชื่อม Postgres จริง (Neon / Vercel / local)

1. สร้างฐานข้อมูล Postgres (แนะนำ Neon free tier <https://neon.tech>)
2. ที่ `backend/.env` ใส่:
   ```
   POSTGRES_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require
   ```
3. รัน migration และ seed
   ```powershell
   cd backend
   npm run db:migrate
   npm run db:seed
   ```
4. รีสตาร์ท backend dev server — แบนเนอร์ Demo จะหายไป

---

## API Endpoints (ภายใต้ `BACKEND_URL` เช่น `http://localhost:4000`)

| Method | Path                | คำอธิบาย                              |
|--------|---------------------|----------------------------------------|
| GET    | `/api/health`       | สถานะ backend + ว่า DB เชื่อมหรือยัง   |
| GET    | `/api/incidents`    | รายการอุบัติการณ์                     |
| POST   | `/api/incidents`    | บันทึกอุบัติการณ์ใหม่ (ต้องเชื่อม DB)   |
| GET    | `/api/rca/:irCode`  | RCA bundle — incident + case + timeline + causes |
| GET    | `/api/actions`      | มาตรการแก้ไขทั้งหมด                   |
| GET    | `/api/stats`        | Aggregate stats สำหรับ Dashboard      |

ทุก endpoint ของ GET จะตอบด้วย envelope:
```json
{ "data": <payload>, "demo": <bool>, "error": <string|null> }
```

---

## โครงสร้างโปรเจค

```
backend/
├── src/
│   ├── server.ts           Express bootstrap + CORS + router mount
│   ├── db.ts               pg Pool
│   ├── envelope.ts         demo-fallback helper { data, demo, error }
│   ├── demo.ts             demo ข้อมูลตัวอย่าง
│   ├── types.ts            TypeScript types ของ domain
│   └── routes/
│       ├── incidents.ts    GET, POST
│       ├── rca.ts          GET /:id
│       ├── actions.ts      GET
│       └── stats.ts        GET
├── scripts/
│   ├── migrate.ts          อ่าน migrations/*.sql แล้วรัน
│   └── seed.ts             รัน 002_seed.sql อย่างเดียว
├── migrations/
│   ├── 001_init.sql        Schema: units, incidents, rca_*, actions, risk_register
│   └── 002_seed.sql        ข้อมูลตัวอย่าง
├── package.json
├── tsconfig.json
└── .env.example

frontend/
├── app/
│   ├── layout.tsx          Sidebar + Topbar + global frame
│   ├── page.tsx            Dashboard
│   ├── incidents/page.tsx
│   ├── rca/page.tsx        รับ ?ir=IR... param
│   ├── matrix/page.tsx
│   ├── actions/page.tsx
│   ├── report/page.tsx     ฟอร์ม POST → backend
│   ├── culture/page.tsx
│   ├── compassion/page.tsx
│   ├── settings/page.tsx
│   └── globals.css
├── components/
│   ├── Sidebar.tsx, Topbar.tsx, BarChart.tsx, DemoBanner.tsx
├── lib/
│   ├── types.ts            (ซ้ำกับ backend โดยตั้งใจ ให้ frontend ไม่ต้องอ้าง backend)
│   └── api.ts              fetch wrapper เรียก backend
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
└── .env.example
```

---

## Environment variables

**backend/.env**
- `PORT` — พอร์ตที่ Express ฟัง (ดีฟอลต์ 4000)
- `POSTGRES_URL` — Postgres connection string (ไม่ใส่ = demo mode)
- `CORS_ORIGIN` — origin ที่อนุญาต (คั่นด้วยจุลภาคได้) ดีฟอลต์ `http://localhost:3000`

**frontend/.env.local**
- `BACKEND_URL` — URL ที่ Next.js server ใช้เรียก backend (SSR) ดีฟอลต์ `http://localhost:4000`
- `NEXT_PUBLIC_BACKEND_URL` — URL ที่ browser ใช้เรียก backend (form `/report`) ดีฟอลต์ `http://localhost:4000`

---

## Deploy ขึ้น Vercel (2 projects แยกกัน)

โครงสร้างนี้เป็น monorepo — สร้าง Vercel project **2 ตัว** จาก repo เดียวกัน โดยตั้ง Root Directory ต่างกัน

### 1) Backend (Express on Vercel serverless)

ไฟล์ที่เกี่ยวข้องเตรียมไว้แล้ว: `backend/api/index.ts` (function entry) และ `backend/vercel.json` (rewrite ทุก request → Express app)

ที่ Vercel dashboard:
1. **Add New… → Project** เลือก repo นี้
2. **Root Directory:** `backend`
3. **Framework Preset:** Other (ปล่อย Vercel ตรวจอัตโนมัติ)
4. **Environment Variables:**
   - `POSTGRES_URL` = connection string ของ Neon/Vercel Postgres
   - `CORS_ORIGIN` = URL ของ frontend หลัง deploy เช่น `https://my-app-frontend.vercel.app`
5. Deploy

เสร็จแล้วเทสที่ `https://<backend-domain>.vercel.app/api/health` ควรได้ `{ status: "ok", db: true, ... }`

> Migration: รัน local ครั้งเดียวก่อน — `vercel env pull backend/.env` แล้ว `cd backend && npm run db:migrate && npm run db:seed`
> (Vercel functions ไม่ได้ออกแบบไว้รัน migration ตอน deploy)

### 2) Frontend (Next.js on Vercel)

ที่ Vercel dashboard:
1. **Add New… → Project** เลือก repo เดิม
2. **Root Directory:** `frontend`
3. **Framework Preset:** Next.js (auto)
4. **Environment Variables:**
   - `BACKEND_URL` = URL ของ backend project เช่น `https://my-app-backend.vercel.app`
   - `NEXT_PUBLIC_BACKEND_URL` = URL เดียวกัน (browser ใช้ตอนยิงฟอร์ม `/report`)
5. Deploy

### 3) อัปเดต CORS

หลัง deploy frontend แล้ว กลับไปที่ **backend project → Settings → Environment Variables** ปรับ `CORS_ORIGIN` ให้ตรงกับ domain ของ frontend แล้ว Redeploy backend

### ทางเลือกอื่นสำหรับ backend

ถ้าไม่อยากใช้ Vercel serverless กับ Express:

- **Railway / Render / Fly.io / VPS** — รัน `npm run start` ตรงๆ (เป็น long-running Node server)
- frontend ยังคง deploy บน Vercel ได้เหมือนเดิม แค่เปลี่ยน `BACKEND_URL` ให้ชี้ไปที่ host ใหม่

---

## หมายเหตุ

- ยังไม่มีระบบ Auth (demo mode) — เปิดให้ทุกคนเข้าได้
- Theme dark/light persist ผ่าน localStorage
- โฟลเดอร์ `_legacy/` เป็น HTML ต้นฉบับสำหรับอ้างอิงเท่านั้น ไม่ใช้แล้ว
- `node_modules/` ที่อยู่นอก backend/frontend เป็นของเก่าก่อนแยกระบบ ลบทิ้งได้ปลอดภัย
