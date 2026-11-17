# ระบบบริหารความเสี่ยง — Hospital Risk Management

แดชบอร์ดบริหารความเสี่ยงโรงพยาบาล สร้างจากเคสตัวอย่าง RCA ให้เลือดผิดคน (IR 2503000003) และกรอบ HRO + Safety Culture + Compassionate RCA จากเอกสาร S7_Anuwat (HACC Forum 2568)

**สถาปัตยกรรม:** `frontend` เป็นระบบเดียวจบในตัว — Next.js ต่อ Postgres โดยตรงผ่าน route handlers

```
risk_management/
├── frontend/     Next.js 15 (App Router) + React 19 + pg   →  UI + API บนพอร์ต 3000
└── backend/      Express + TypeScript (ไม่จำเป็นต้องรันแล้ว)  →  เหลือไว้ทำ migration / ใช้เป็น API แยก
```

- **frontend** ดูแลทุกอย่าง: UI, DB query (`lib/db.ts` + `lib/queries.ts`), REST API (`app/api/*`),
  demo-mode fallback เมื่อยังไม่มี DB, Word export และฟีเจอร์ AI
- **backend** เดิมทำหน้าที่เป็น API แยก ตอนนี้ frontend ไม่เรียกใช้แล้ว (ไม่มีการอ้าง `BACKEND_URL` ที่ไหนเลย)
  แต่ยังเก็บไว้เพราะเป็นที่อยู่ของ `migrations/` และสคริปต์ `db:migrate` / `db:seed`

หากเปิดใช้ Express backend แยก ต้องตั้ง `BACKEND_API_TOKEN` เป็นค่าลับสุ่มอย่างน้อย 32 ตัวอักษร
และส่ง `Authorization: Bearer <token>` ทุกครั้งที่เรียก `/api/*` ยกเว้น `/api/health`;
หากไม่ได้ตั้งค่า API จะปฏิเสธคำขอ ห้ามนำ token ไปใส่ในโค้ดหรือ frontend

> เดิมโครงสร้างนี้แยก 2 ระบบและ frontend เรียก backend ผ่าน `fetch` — เปลี่ยนมาเป็นระบบเดียวแล้ว
> เพื่อให้ deploy ง่ายขึ้น (Vercel project เดียว ไม่ต้องตั้ง CORS)

---

## เริ่มใช้งานเร็ว (Demo mode — ไม่ต้องมี DB)

เปิด terminal เดียว:

```powershell
cd frontend
npm install
copy .env.example .env.local   # ปล่อยว่างไว้ก็ได้ถ้าจะลอง demo mode
npm run dev                    # เปิด http://localhost:3000
```

ถ้ายังไม่ตั้ง `POSTGRES_URL` → ระบบจะใช้ข้อมูล demo อัตโนมัติและแสดงแบนเนอร์ "Demo mode"
(หน้าแบบฟอร์ม RCA `/rca/form` และการส่งออก Word ใช้งานได้เต็มที่แม้ไม่มี DB เพราะข้อมูลมาจากที่กรอกในหน้าเว็บ)

demo mode ล้วน (ไม่ตั้งทั้ง `POSTGRES_URL` และ `GOOGLE_CLIENT_ID`) จะข้ามการล็อกอินให้เปิดดูได้เลย
**แต่เมื่อใดที่ตั้ง `POSTGRES_URL` แล้ว ทุกหน้าจะบังคับล็อกอินทันที** — ดูหัวข้อ
[การเข้าสู่ระบบและสิทธิ์](#การเข้าสู่ระบบและสิทธิ์-google-sign-in)

---

## เชื่อม Postgres จริง (Neon / Vercel / local)

### ฐานข้อมูลที่ใช้งานปัจจุบัน

ตรวจสอบการตั้งค่า Production บน Vercel เมื่อ 17 พฤศจิกายน 2569: เว็บใช้ PostgreSQL ของ **Neon** โฮสต์บน AWS ภูมิภาค `ap-southeast-1` (สิงคโปร์) ผ่าน connection pooler ฐานข้อมูลชื่อ `neondb` และ Neon project ID คือ `falling-haze-10744378` จัดการได้ผ่าน [Neon Console](https://console.neon.tech/) ด้วยบัญชีที่มีสิทธิ์เข้าถึงโปรเจกต์ โดย Vercel project ชื่อ `risk-management`

Frontend เชื่อมต่อโดยตรงผ่าน `frontend/lib/db.ts` โดยเลือก `POSTGRES_URL` ก่อน `DATABASE_URL` เมื่อกำหนดทั้งสองค่า ค่า connection string และรหัสผ่านต้องเก็บใน environment variables ไม่ใส่ใน Git

**ระวัง:** ณ วันที่ตรวจสอบ `frontend/.env.local` บนเครื่องพัฒนาชี้ไปยัง host และชื่อฐานข้อมูลเดียวกับ Production ควรแยกฐานข้อมูลหรือ Neon branch สำหรับ development และ staging ก่อนทดลองเขียนข้อมูล รัน migration หรือ seed และตรวจเป้าหมายพร้อมสำรองข้อมูลก่อนเปลี่ยนฐานข้อมูลจริง ห้ามรัน seed กับ Production โดยพลการ

ขั้นตอนด้านล่างเป็นแนวทางสร้างฐานข้อมูลแยกสำหรับการติดตั้งหรือพัฒนา ไม่ใช่คำสั่งให้สร้างฐานข้อมูล Production ใหม่:

1. สร้างฐานข้อมูล Postgres (แนะนำ Neon free tier <https://neon.tech>)
2. ที่ `frontend/.env.local` ใส่:
   ```
   POSTGRES_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require
   ```
3. รัน migration และ seed — สคริปต์อยู่ในโฟลเดอร์ `backend` ใส่ `POSTGRES_URL` ตัวเดียวกันใน `backend/.env`
   ```powershell
   cd backend
   npm install
   copy .env.example .env
   npm run db:migrate
   npm run db:seed
   ```
4. รีสตาร์ท `npm run dev` ของ frontend — แบนเนอร์ Demo จะหายไป

---

## API Endpoints (route handlers ใน `frontend/app/api`)

เรียกด้วย path แบบ relative เช่น `/api/incidents` — ไม่ต้องตั้ง base URL

| Method | Path                       | คำอธิบาย                              |
|--------|----------------------------|----------------------------------------|
| GET    | `/api/health`              | สถานะระบบ + ว่าตั้ง `POSTGRES_URL` หรือยัง |
| GET    | `/api/incidents`           | รายการอุบัติการณ์                     |
| POST   | `/api/incidents`           | บันทึกอุบัติการณ์ใหม่ (ต้องเชื่อม DB)   |
| GET    | `/api/rca/:irCode`         | RCA bundle — incident + case + timeline + causes |
| GET    | `/api/rca/:irCode/export`  | ส่งออกรายงาน RCA จากข้อมูลในระบบเป็น Word (.docx) |
| POST   | `/api/rca/:irCode/analyze` | AI วิเคราะห์ RCA ด้วย Gemini (5-Tier + Compassionate + HRO) |
| POST   | `/api/rca/export-form`     | รับข้อมูลแบบฟอร์ม FM-QPS-QSH-002 (JSON) → คืนไฟล์ Word |
| GET    | `/api/actions`             | มาตรการแก้ไขทั้งหมด                   |
| GET    | `/api/stats`               | Aggregate stats สำหรับ Dashboard      |
| GET    | `/api/cauti`               | CAUTI QuickAlert — ทะเบียนผู้ป่วยใส่ Foley + flag overdue |
| POST   | `/api/cauti`               | เพิ่มผู้ป่วยใหม่                       |
| PATCH  | `/api/cauti/:id/remove`    | บันทึก off F/C                         |

ทุก endpoint ของ GET จะตอบด้วย envelope:
```json
{ "data": <payload>, "demo": <bool>, "error": <string|null> }
```

ยกเว้น `/api/health` และ endpoint ที่คืนไฟล์ `.docx` (สอง endpoint ของ export)

---

## แบบฟอร์ม RCA (FM-QPS-QSH-002/03) → Word

หน้า `/rca/form` เป็นแบบฟอร์มกรอกข้อมูลตามแบบฟอร์มกระดาษของโรงพยาบาล แล้วกดส่งออกเป็นไฟล์ `.docx`
เข้าได้จากเมนู "แบบฟอร์ม RCA" ในแถบซ้าย หรือปุ่มในหน้า `/rca`
(เปิดด้วย `/rca/form?ir=IR...` จะดึงข้อมูลตั้งต้นจากเคสนั้นมาใส่ให้ก่อน)

หัวข้อที่ครอบคลุม: ส่วนหัวฟอร์ม · **1** Story and Timeline + problem statement + COLONOGY OF EVENT ·
**2** CARE MANAGEMENT PROBLEM (Unsafe act) · **3** 5W1H · **4** 5 Tier Contributory Factor ·
**5** สรุป RCA (Creative solution) · **6** Process Management

ไฟล์ที่เกี่ยวข้อง:
- `lib/rcaForm.ts` — โครงข้อมูล หัวข้อ/คำถามนำทั้งหมด และข้อมูลตัวอย่าง
- `lib/rcaFormDocx.ts` — สร้าง `.docx` 2 section: ส่วนหัว + หัวข้อ 1 เป็นหน้าแนวตั้ง, ตารางหัวข้อ 2–6 เป็นหน้าแนวนอน
  (ความกว้างคอลัมน์ · footer `FM-QPS-QSH-002/03 : 28/04/64` + เลขหน้า · ฟอนต์ TH Sarabun New ตามแบบฟอร์มต้นฉบับ)
- `app/rca/form/page.tsx` — หน้ากรอกข้อมูล (บันทึกร่างอัตโนมัติใน localStorage ยังไม่บันทึกลง DB)

ช่องที่ไม่กรอกในหัวข้อ 3 และ 4 จะพิมพ์คำถามนำเป็นตัวอักษรสีแดงเหมือนแบบฟอร์มกระดาษ (ลบทิ้งได้ตามหมายเหตุในฟอร์ม)

---

## โครงสร้างโปรเจค

```
frontend/                   ← ระบบหลัก (deploy เฉพาะโฟลเดอร์นี้)
├── app/
│   ├── layout.tsx          Sidebar + Topbar + global frame
│   ├── page.tsx            Dashboard
│   ├── incidents/page.tsx
│   ├── rca/page.tsx        รับ ?ir=IR... param
│   ├── rca/form/page.tsx   แบบฟอร์ม RCA (FM-QPS-QSH-002) → ส่งออก Word
│   ├── matrix/page.tsx
│   ├── actions/page.tsx
│   ├── cauti/page.tsx      CAUTI QuickAlert
│   ├── report/page.tsx     ฟอร์ม POST → /api/incidents
│   ├── culture/page.tsx
│   ├── compassion/page.tsx
│   ├── settings/page.tsx
│   ├── api/                route handlers ทั้งหมด (ดูตาราง endpoint ด้านบน)
│   └── globals.css
├── components/
│   └── Sidebar.tsx, Topbar.tsx, BarChart.tsx, DemoBanner.tsx, RcaAiPanel.tsx
├── lib/
│   ├── db.ts               pg Pool + dbConfigured()
│   ├── queries.ts          SQL ทั้งหมด (คืน envelope)
│   ├── envelope.ts         demo-fallback helper { data, demo, error }
│   ├── demo.ts             demo ข้อมูลตัวอย่าง
│   ├── types.ts            TypeScript types ของ domain
│   ├── api.ts              re-export จาก queries ให้ server component เรียก
│   ├── ai.ts               Gemini API + prompt 3 กรอบ (5-Tier / Compassionate / HRO)
│   ├── docx.ts             Word export ของรายงาน RCA จากข้อมูลในระบบ
│   ├── rcaForm.ts          โครงข้อมูลแบบฟอร์ม FM-QPS-QSH-002
│   └── rcaFormDocx.ts      Word export ของแบบฟอร์ม FM-QPS-QSH-002
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
└── .env.example

backend/                    ← ไม่ต้อง deploy · ใช้รัน migration เป็นหลัก
├── migrations/
│   ├── 001_init.sql        Schema: units, incidents, rca_*, actions, risk_register
│   └── 002_seed.sql        ข้อมูลตัวอย่าง
├── scripts/
│   ├── migrate.ts          อ่าน migrations/*.sql แล้วรัน
│   └── seed.ts             รัน 002_seed.sql อย่างเดียว
├── src/                    Express API เดิม (frontend ไม่เรียกใช้แล้ว)
├── api/index.ts            entry สำหรับ Vercel serverless (เหลือไว้เฉย ๆ)
├── vercel.json             rewrite ทุก request → Express (ไม่ถูกใช้ถ้า deploy แค่ frontend)
└── .env.example
```

---

## Environment variables

**frontend/.env.local** (และ Environment Variables บน Vercel) — ไม่ใส่เลยก็รันได้ เป็น demo mode

- `POSTGRES_URL` — Postgres connection string (ไม่ใส่ = demo mode + แบนเนอร์ Demo)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth client สำหรับเข้าสู่ระบบด้วย Google
- `SESSION_SECRET` — กุญแจเซ็น session cookie ต้องยาว ≥ 32 ตัวอักษร
- `APP_URL` — โดเมนจริงของเว็บ เช่น `https://risk-management.vercel.app` (บังคับ redirect_uri ให้คงที่)
- `ALLOWED_EMAIL_DOMAINS` — จำกัดโดเมนอีเมลที่ล็อกอินได้ คั่นด้วย comma (เว้นว่าง = ไม่จำกัด)
- `ADMIN_EMAILS` — อีเมลที่ได้สิทธิ์ admin อัตโนมัติ คั่นด้วย comma
- `GEMINI_API_KEY` — Gemini API key สำหรับฟีเจอร์ AI วิเคราะห์ RCA (ไม่ใส่ = คืนผลตัวอย่าง ไม่ error) สร้างที่ <https://aistudio.google.com/apikey>
- `GEMINI_MODEL` — โมเดล Gemini ที่ใช้ (ดีฟอลต์ `gemini-3.6-flash`)

**backend/.env** — ใช้ตอนรัน migration เท่านั้น

- `POSTGRES_URL` — ตัวเดียวกับที่ frontend ใช้
- (`PORT`, `CORS_ORIGIN` มีผลเฉพาะเมื่อจะรัน Express API เดิมเป็นระบบแยก)

---

## การเข้าสู่ระบบและสิทธิ์ (Google Sign-In)

ทุกหน้าและทุก API ยกเว้น `/login`, `/api/auth/*` และ `/api/health` ต้องเข้าสู่ระบบก่อน
บังคับที่ [frontend/middleware.ts](frontend/middleware.ts) — ระบบไม่เก็บรหัสผ่านเอง ใช้ Google ยืนยันตัวตนอย่างเดียว

### สิทธิ์ 3 ระดับ

| role | ทำอะไรได้ |
|---|---|
| `viewer` (ค่าเริ่มต้นของผู้ใช้ใหม่) | ดูข้อมูล · กรอกฟอร์ม RCA + ส่งออก Word · สั่ง AI วิเคราะห์ RCA ได้ |
| `editor` | ทุกอย่างที่ viewer ทำได้ + บันทึกอุบัติการณ์และข้อมูล CAUTI |
| `admin` | ทุกอย่าง + จัดการสิทธิ์ผู้ใช้ที่ `/settings` |

ผู้ที่ล็อกอินครั้งแรกได้ `viewer` เสมอ ต้องให้ admin เลื่อนสิทธิ์ให้ (ยกเว้นอีเมลที่อยู่ใน `ADMIN_EMAILS`)

### ตั้งค่า Google OAuth

1. ไปที่ <https://console.cloud.google.com/apis/credentials> → **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Authorized redirect URIs** ใส่ให้ครบทั้งของ dev และ production:
   ```
   http://localhost:3000/api/auth/callback/google
   https://<โดเมนจริง>/api/auth/callback/google
   ```
4. คัดลอก Client ID / Client secret ไปใส่ env
5. สร้าง `SESSION_SECRET`:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
6. ใส่อีเมลตัวเองใน `ADMIN_EMAILS` แล้วล็อกอินครั้งแรก — จะได้สิทธิ์ admin ทันที

### ร่องรอยการใช้งาน

ทุกการล็อกอิน/ออกจากระบบ/บันทึกข้อมูล/เปลี่ยนสิทธิ์ ถูกบันทึกในตาราง `audit_log`
(ผู้ใช้ เวลา การกระทำ IP) — จำเป็นสำหรับข้อมูลสุขภาพส่วนบุคคลตาม PDPA
audit log ของ CAUTI จงใจไม่เก็บชื่อ/HN ซ้ำ เก็บแค่เตียงกับ ward

> **ก่อนใส่ข้อมูลผู้ป่วยจริง** ควรตรวจสอบกับฝ่าย IT/ผู้บริหารโรงพยาบาลเรื่องนโยบายข้อมูล
> อย่างน้อยควรตั้ง `ALLOWED_EMAIL_DOMAINS` ให้เป็นโดเมนของโรงพยาบาล

---

## Deploy ขึ้น Vercel (project เดียว)

frontend จบในตัว ไม่ต้อง deploy backend และไม่ต้องมี `vercel.json` ที่ root

ที่ Vercel dashboard:
1. **Add New… → Project** เลือก repo นี้
2. **Application Preset:** `Next.js`
   (ถ้า Vercel ตรวจเจอเป็น `Services` แล้วเตือนว่า `vercel.json required to deploy projects with multiple services`
   ให้เปลี่ยน preset เป็น Next.js — คำเตือนจะหายไปเพราะเหลือ service เดียว)
3. **Root Directory:** `frontend`
4. **Environment Variables:** ใส่หรือไม่ใส่ก็ได้ (ดูหัวข้อด้านบน)
5. Deploy

เสร็จแล้วเทส:
- `https://<domain>.vercel.app/api/health` → `{ "status": "ok", "db": true|false, ... }`
- `https://<domain>.vercel.app/rca/form` → กด "ใส่ตัวอย่าง" แล้ว "ส่งออก Word" ควรได้ไฟล์ `.docx`

### Migration บน DB จริง

Vercel functions ไม่ได้ออกแบบไว้รัน migration ตอน deploy — ต้องรันจากเครื่องครั้งเดียว:

```powershell
vercel env pull frontend/.env.local     # ดึง POSTGRES_URL ลงมา
# คัดลอกค่า POSTGRES_URL ไปใส่ backend/.env
cd backend
npm install
npm run db:migrate
npm run db:seed
```

### ถ้าจะกลับไปใช้ Express backend เป็นระบบแยก

โค้ดใน `backend/src` ยังใช้ได้ แต่ frontend ปัจจุบันไม่ได้เรียก `BACKEND_URL` แล้ว
ถ้าต้องการสถาปัตยกรรมแบบ 2 ระบบ ต้องแก้ `frontend/lib/api.ts` กลับไปเป็น fetch wrapper
แล้วจึง deploy `backend` เป็น Vercel project ที่สอง (หรือ Railway / Render / Fly.io / VPS ด้วย `npm run start`)
พร้อมตั้ง `CORS_ORIGIN` ให้ตรงกับ domain ของ frontend

---

## เข้าสู่ระบบด้วยหน่วยงาน

หน้า `/login` ให้ค้นหาและเลือกหน่วยงานจากรายชื่อ Risk Profile (`riskUnitDirectory`) แล้วกรอกรหัสผ่านหน่วยงาน แทนปุ่ม Google โดยใช้ session และสิทธิ์ของระบบเดิม เฉพาะหน่วยงานที่มีบัญชีเปิดใช้งานและรหัสผ่านใน `risk_units` เท่านั้นที่จะเข้าสู่ระบบได้ การแสดงชื่อในรายการไม่ได้สร้างบัญชีหรือกำหนดรหัสผ่าน บัญชีหน่วยงานใหม่ได้สิทธิ์ editor และเชื่อมกับ Risk Profile ของหน่วยงานโดยอัตโนมัติ รหัสผ่านผิด 5 ครั้งจะพักบัญชี 15 นาที

ก่อนใช้งานโค้ดรุ่นนี้ ต้องรัน migration `backend/migrations/013_unit_login.sql` กับฐานข้อมูลเป้าหมายก่อน deploy และตั้งค่า `POSTGRES_URL` หรือ `DATABASE_URL` พร้อม `SESSION_SECRET` อย่างน้อย 32 ตัวอักษร บัญชีเดิมที่เข้าสู่ระบบแล้วใช้สิทธิ์เดิมต่อได้

การนำเข้ารหัสผ่านจากเอกสารต้องมีข้อมูลจับคู่ชื่อกับหน่วยงานก่อน และเก็บเฉพาะค่าแฮชตามรูปแบบ `hashUnitPassword` ห้ามใส่รหัสผ่านจริงใน frontend หรือ commit ลง repository

ตรวจสอบด้วย `cd frontend` แล้วรัน `node scripts/test-department-login.cjs` และ `npx tsc --noEmit`

## หมายเหตุ

- เมื่อเชื่อมต่อฐานข้อมูลต้องเข้าสู่ระบบก่อนใช้งาน ส่วน demo ที่ไม่มีฐานข้อมูลยังเปิดให้ทดลองได้
- Theme dark/light persist ผ่าน localStorage
- ร่างของแบบฟอร์ม RCA เก็บใน localStorage ของเบราว์เซอร์ ยังไม่บันทึกลงฐานข้อมูล
- โฟลเดอร์ `_legacy/` เป็น HTML ต้นฉบับสำหรับอ้างอิงเท่านั้น ไม่ใช้แล้ว
- `node_modules/` ที่อยู่นอก backend/frontend เป็นของเก่าก่อนแยกระบบ ลบทิ้งได้ปลอดภัย
