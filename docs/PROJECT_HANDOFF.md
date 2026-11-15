# เอกสารส่งมอบระบบบริหารความเสี่ยงโรงพยาบาล

ข้อมูล ณ วันที่ 16 พฤศจิกายน 2569 · สำหรับนักพัฒนา ผู้ดูแลระบบ และผู้รับผิดชอบฐานข้อมูล

เอกสารนี้อธิบายโครงสร้าง วิธีเริ่มงาน จุดเชื่อมต่อสำคัญ การทดสอบ และข้อควรตรวจสอบก่อนนำระบบขึ้นใช้งานจริง โดยอ้างอิงจาก repository ที่ commit `e746fbb` และสถานะเครื่องที่ตรวจพบในวันจัดทำ โปรดตรวจสอบ branch และสภาพแวดล้อมปัจจุบันอีกครั้งก่อนดำเนินการ

## 1 ภาพรวมและงานที่ควรทำก่อน

ระบบเป็นเว็บบริหารความเสี่ยงของโรงพยาบาล รองรับการรายงานอุบัติการณ์ วิเคราะห์ RCA จัดทำ Risk Profile ประเมินความเสี่ยง แดชบอร์ดความปลอดภัย แบบสำรวจวัฒนธรรม และ chatbot ค้นข้อมูลจากเอกสาร การใช้งานจริงเชื่อม PostgreSQL และบริการ Gemini สำหรับฟังก์ชัน AI บางส่วน

สิ่งที่ผู้รับช่วงควรทำก่อนแก้ไขระบบ:

1. ยืนยันเจ้าของระบบ ผู้ดูแลฐานข้อมูล ผู้ดูแล Vercel และผู้อนุมัติสิทธิ์ พร้อมขอช่องทางติดต่อและสิทธิ์ที่จำเป็นผ่านช่องทางปลอดภัย
2. ตรวจสอบ branch, remote, commit และ `git status --short` ก่อนเริ่มงาน ห้ามทับไฟล์ที่ผู้อื่นกำลังแก้ไข
3. แยกฐานข้อมูลพัฒนาออกจาก production และตรวจ backup/restore ก่อนรัน migration หรือ import
4. ตั้งค่า environment จาก `frontend/.env.example` โดยรับค่าจริงจากผู้ดูแล อย่านำค่า secret หรือข้อมูลผู้ป่วยใส่ Git
5. รันระบบและทดสอบเส้นทางสำคัญในสภาพแวดล้อมทดสอบ จากนั้นตรวจสอบ deployment และสถานะ migration จริงร่วมกับผู้ดูแล

## 2 Repository และสถาปัตยกรรม

Repository หลักที่ตรวจพบคือ `https://github.com/inkcy/risk-management.git` โดย remote `origin` ชี้ไปที่ repository นี้ และมี `origin-pitchananya` อีกชุดหนึ่ง ต้องยืนยันปลายทางก่อน push เสมอ ณ เวลาตรวจสอบ branch `main` ตรงกับ `origin/main` ที่ `e746fbb`; สถานะนี้เปลี่ยนได้

- `frontend/` คือแอปหลัก Next.js App Router ใช้ React 19 และ TypeScript หน้าเว็บและ API route อยู่ในโปรเจกต์เดียวกัน
- `frontend/app/` มีหน้าเว็บและ API ภายใต้ `app/api/`; `frontend/components/` เก็บส่วนแสดงผล; `frontend/lib/` เก็บการเชื่อมฐานข้อมูล สิทธิ์ และ business logic
- `frontend/data/` เก็บข้อมูลค้นคืนของ chatbot และไฟล์ index/archive ภาพ; `frontend/scripts/` เก็บเครื่องมือนำเข้าและสคริปต์ทดสอบ
- `backend/` เก็บ migration และ Express API รุ่นเดิม README ระบุว่า frontend ปัจจุบันไม่เรียก Express API นี้โดยตรง ควรยืนยันก่อนนำ backend แยกไป deploy
- `docs/` มีเอกสารประกอบ; `_legacy/` เป็นของเดิมสำหรับอ้างอิง
- PostgreSQL เป็นแหล่งข้อมูลถาวร; Gemini เป็นบริการภายนอก; Vercel เป็นแนวทาง deploy ที่ README ระบุ แต่ยังไม่ได้ตรวจสอบสถานะ deployment จริง

การทำงานทั่วไป: เบราว์เซอร์เรียก Next.js page/API → middleware ตรวจเงื่อนไข session และ origin → API ตรวจสิทธิ์ผ่าน auth → อ่านหรือเขียน PostgreSQL; ฟังก์ชัน AI ที่เปิดใช้จะส่งคำถามและข้อมูลที่คัดเลือกไปยัง Gemini

## 3 เริ่มพัฒนาในเครื่อง

ต้องมี Git, Node.js 20 ขึ้นไป (backend ระบุ `>=20`) และ npm รวมถึง PostgreSQL ทดสอบสำหรับงานที่ต้องบันทึกจริง เลือก Node ที่เข้ากันได้กับ Next.js และ dependency ที่ติดตั้งจริง

```powershell
git clone https://github.com/inkcy/risk-management.git
cd risk-management/frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` และ `http://localhost:3000/api/health` แก้ `.env.local` เฉพาะค่าที่จำเป็น ห้ามนำ credential จริงลงเอกสารนี้หรือ repository หากไม่มีทั้ง DB และ `GOOGLE_CLIENT_ID` middleware เปิด demo mode; demo ไม่ใช่หลักฐานว่าการเข้าสู่ระบบหรือฐานข้อมูลจริงทำงาน

ตรวจชนิดและ build ก่อนส่งงาน:

```powershell
cd frontend
npx tsc --noEmit
npm run build
node scripts/test-security-middleware.cjs
node scripts/test-department-login.cjs
node scripts/test-chatbot-real-retrieval.cjs
```

สคริปต์ทดสอบส่วนใหญ่เป็นไฟล์แยกใน `frontend/scripts/` ไม่มีคำสั่ง test รวมใน package.json เลือกเพิ่มตามพื้นที่ที่แก้ การรัน build อาจต้องมีการตั้งค่า environment ที่เหมาะสม อย่าใช้ production secrets บนเครื่องที่ไม่จำเป็น

## 4 Environment และความลับ

- `POSTGRES_URL` หรือ `DATABASE_URL`: PostgreSQL; โค้ดเลือก `POSTGRES_URL` ก่อนหากมีทั้งคู่
- `SESSION_SECRET`: คีย์เซ็น session ตั้งค่าอย่างน้อย 32 ตัวอักษร เก็บใน secret manager การเปลี่ยนค่าอาจกระทบ session และรหัสบุคลากรที่ใช้ HMAC ต้องวางแผนและทดสอบการนำเข้ารหัสใหม่
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, `ALLOWED_EMAIL_DOMAINS`, `ADMIN_EMAILS`: Google OAuth และการกำหนด admin เมื่อใช้งานวิธีนี้ ตรวจ callback `/api/auth/callback/google` ให้ตรงกับโดเมน
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MATRIX_MODELS`: บริการ AI และตัวเลือกโมเดล ตรวจค่าเริ่มต้นจากโค้ดของแต่ละฟังก์ชัน เพราะ README และ `.env.example` อาจไม่ตรงกัน chatbot ส่งคืน 503 หากไม่มี key

อย่าเปิดเผย `.env.local`, database URL, รหัสหน่วยงาน, รหัสบุคลากร หรือ API key ใน ticket, log, commit และเอกสารส่งต่อ กำหนดค่าแยกตาม development, preview และ production

## 5 การเข้าสู่ระบบและสิทธิ์

เริ่มตรวจจาก `frontend/middleware.ts`, `frontend/lib/session.ts`, `frontend/lib/auth.ts`, `frontend/lib/riskUnitAuth.ts` และ `frontend/lib/departmentAccess.ts` middleware ตรวจลายเซ็น cookie เป็นด่านแรก; การตรวจ session ในฐานข้อมูลและ role ทำในชั้น auth/API ด้วย เมื่อมี DB ระบบบังคับเข้าสู่ระบบแม้ OAuth ไม่ครบ API ที่เปลี่ยนข้อมูลตรวจ origin ให้ตรงกับ origin ของแอป

ระบบมี Google OAuth และการเข้าสู่ระบบหน่วยงาน/รหัสบุคลากร ให้ตรวจ `frontend/app/api/auth/department/route.ts`, `frontend/app/api/risk-units/` และ `frontend/scripts/import-department-codes.cjs` ก่อนแก้ role หรือสิทธิ์ รายชื่อหน่วยงานที่แสดงไม่ได้แปลว่ามีบัญชีหรือสิทธิ์พร้อมใช้งานเสมอ รหัสบุคลากรถูกจำกัดตามหน่วยงานที่กำหนดใน mapping ล่าสุด ตรวจ supervisor แยกจาก staff และ admin

เอกสาร `docs/department-code-login.md` มีข้อความเก่าที่ระบุว่ารหัสบุคลากรเลือกได้ทุกหน่วยงาน ซึ่งขัดกับ commit ล่าสุดและ migration `018_department_code_units.sql` ให้ยึดโค้ดและทดสอบสิทธิ์จริงก่อนเปลี่ยนระบบ ห้ามนำเข้ารหัสจริงโดยไม่มีแหล่งข้อมูลที่เชื่อถือได้และการอนุมัติที่เหมาะสม

## 6 ฐานข้อมูลและ migration

ไฟล์ SQL อยู่ที่ `backend/migrations/001_init.sql` ถึง `018_*` มีเลข 016 และ 018 ซ้ำในชื่อคนละไฟล์ สคริปต์ `backend/scripts/migrate.ts` อ่านไฟล์ SQL ทุกไฟล์ที่ชื่อไม่ประกอบด้วย `seed` แล้วเรียงตามชื่อและรันทุกครั้ง ไม่ได้แสดงระบบบันทึก migration ที่เคยรัน ห้ามสมมติว่าทุกไฟล์รันซ้ำได้อย่างปลอดภัย ตรวจ SQL ทีละไฟล์และสถานะฐานข้อมูลก่อนรัน

```powershell
cd backend
npm ci
# ตั้ง POSTGRES_URL หรือ DATABASE_URL สำหรับฐานข้อมูลทดสอบใน backend/.env
npm run db:migrate
```

ห้ามรัน seed กับ production โดยพลการ: `npm run db:seed` เพิ่มข้อมูลตัวอย่าง ตรวจสำรองข้อมูล ทดสอบ migration บนสำเนา staging และเตรียมแผนย้อนกลับก่อนเปลี่ยน production ตารางสำคัญรวมถึง users/session/audit, risk_units, department_login_codes, department_code_units, incident, RCA, safety และ risk profile; ชื่อและ schema ที่แท้จริงให้ตรวจจาก SQL และฐานข้อมูลเป้าหมาย

`018_risk_submission_snapshots.sql` เพิ่ม snapshot ให้ submission โดยข้อมูลเก่าที่ไม่มี snapshot ยังเป็น NULL อย่าคิดว่าข้อมูลย้อนหลังทุกชุดมี snapshot ควรทดสอบการอ่านรายการเก่าร่วมกับรายการใหม่

## 7 แผนที่ฟังก์ชันและไฟล์หลัก

- หน้าหลักและ dashboard: `frontend/app/home`, `dashboard`, `components/SafetyDashboard.tsx`; API สถิติและ safety อยู่ใต้ `app/api/stats` และ `app/api/safety`
- อุบัติการณ์และรายงาน: `app/incidents`, `app/report`, `app/api/incidents`; หมวดและระดับความรุนแรงอยู่ใน `lib/incident-*`
- RCA: `app/rca`, `app/rca/form`, `app/api/rca`, `lib/rcaForm.ts`, `lib/rcaFormDocx.ts`, `lib/rcaLessons.ts`; README ระบุว่าร่างฟอร์มบางส่วนอยู่ localStorage จึงควรตรวจพฤติกรรมล่าสุดก่อนรับประกันการเก็บข้อมูล
- Risk Profile และการส่งข้อมูล: `app/risk-profile`, `app/smart-risk-profile`, `app/api/unit-risks`, `lib/riskSubmissions.ts`, `lib/unitRiskImport.ts`
- Matrix และการส่งออก: `app/matrix`, `app/api/matrix`, `lib/matrix-analysis.ts`, `matrix-ai.ts`, `matrix-docx.ts`, `matrix-pdf.ts` และ template ใน `frontend/templates/` หรือ `frontend/public/`
- ประกาศ แบบสำรวจ และการจัดการผู้ใช้: `app/api/announcements`, `app/culture`, `app/api/culture-surveys`, `app/settings`, `app/api/users`
- Chatbot: `app/chatbot`, `components/RiskChatbot.tsx`, `components/FloatingRiskChat.tsx`, `app/api/chatbot`, `lib/chatbotKnowledge.ts`

## 8 Chatbot และคลังเอกสาร

`chatbotKnowledge.ts` โหลด JSON หลัก OCR ข้อมูลเพิ่มเติม และ index รูปภาพ จากนั้นตัดคำภาษาไทย จัดอันดับตามคำถาม และส่งข้อความอ้างอิงที่เกี่ยวข้องสูงสุด 8 รายการเข้า API เส้นทาง `app/api/chatbot/route.ts` ขอ Gemini ส่ง quote และตรวจว่า quote อยู่ในข้อความต้นทางก่อนแสดงผล พร้อมชื่อเอกสารและตำแหน่ง แหล่งข้อมูลในเอกสารถูกระบุให้เป็นข้อมูล ไม่ใช่คำสั่งระบบ

ไฟล์ข้อมูลหลักอยู่ใน `frontend/data/chatbot-knowledge.json`, `chatbot-extra.json`, `chatbot-ocr.json`, `chatbot-extra-ocr.json` และ index/ZIP ของภาพ ตรวจ `frontend/next.config.ts` หากเพิ่มไฟล์ที่ API ต้องใช้ตอน deploy เพราะมี `outputFileTracingIncludes` คลังรูปมีขนาดใหญ่และต้องเก็บ index กับ ZIP ที่ตรงกัน

PDF ชื่อ `6.บทที่ 3 คลังความรู้เกี่ยวกับแผนบริหารความ.pdf` ถูกเพิ่มใน `chatbot-extra.json` แบบ 6 รายการแยกตามหน้า ตั้งแต่ commit `2cc6c1d` เนื้อหาเป็นตัวอย่างในบริบทมหาวิทยาลัย ไม่ควรอ้างกำหนดเวลาหรือขั้นตอนเป็นนโยบายโรงพยาบาลโดยไม่มีการยืนยัน ข้อความ PDF ที่ดึงอาจมีช่องว่างแทรกในคำภาษาไทย และตารางอาจเสียลำดับเมื่อแปลงเป็นข้อความ ควรเทียบต้นฉบับเมื่อแก้ข้อมูล

ทดสอบ `node scripts/test-chatbot-real-retrieval.cjs`, `test-chatbot-knowledge.cjs`, `test-chatbot.cjs`, `test-chatbot-images.cjs` และ `test-chatbot-pages.cjs` ตามส่วนที่แก้ การทดสอบค้นคืน PDF สี่คำถามเคยผ่านในเครื่อง แต่ยังไม่ได้ยืนยันคำตอบ Gemini จริงครบวงจร สคริปต์ `test-chatbot-new-pdf.cjs` ที่สร้างเพื่อทดสอบยังเป็น untracked ณ วันที่จัดทำ จึงต้องตกลงว่าจะเก็บหรือ commit ก่อนอ้างว่าอยู่ใน repository

การเพิ่มเอกสารใหม่: ตรวจสิทธิ์ใช้ข้อมูลและความถูกต้องของ PDF → แยกข้อความ/OCR และบันทึก source กับหน้า → เพิ่มลง data โดยไม่ลบข้อมูลเดิม → ตรวจภาพ/index หากต้องแสดงภาพ → เพิ่ม tracing สำหรับไฟล์ใหม่ → ทดสอบ retrieval ด้วยคำถามหลายแบบและทดสอบคำตอบจริงบน staging → ตรวจการอ้างอิงและข้อมูลอ่อนไหวก่อน deploy สคริปต์ build บางตัวสร้างไฟล์ชุดใหญ่ใหม่ ให้สำรองและอ่านโค้ดก่อนใช้งาน

## 9 Deploy และปฏิบัติการ

README ระบุให้ใช้ Vercel project เดียว โดยตั้ง root directory เป็น `frontend` และ framework เป็น Next.js ตั้ง environment ผ่านระบบจัดการ secret ของ hosting และยืนยัน OAuth callback กับฐานข้อมูลที่ถูกต้อง การ push ไป remote ไม่ยืนยันว่า deploy สำเร็จ ต้องตรวจ build log, deployment ที่ใช้งานจริง, commit SHA และ health endpoint แยกกัน

ก่อน release: review diff และสิทธิ์, ตรวจ migration/backup, ทดสอบบน staging, ตรวจข้อมูลและภาพ chatbot, รัน typecheck/build และสคริปต์ที่เกี่ยวข้อง, จากนั้นตรวจ login, หน้าหลัก, การอ่าน/บันทึกข้อมูลทดสอบ, export และ chatbot หลัง deploy โดยไม่ใช้ข้อมูลผู้ป่วยจริงในการ smoke test เตรียมวิธีกลับไป deployment ก่อนหน้าและแผน rollback ฐานข้อมูลซึ่งอาจไม่ย้อนกลับพร้อมการ deploy

เมื่อเกิดปัญหา: ตรวจ `/api/health` และ log ที่ไม่เปิดเผยข้อมูลลับ; แยกปัญหา DB, session/OAuth, permission, AI key/โควตา และไฟล์ที่ tracing ไม่ครบ; บันทึกเวลาปัญหา commit และ request ที่เกี่ยวข้องโดยหลีกเลี่ยงข้อมูลส่วนบุคคล ระบบ AI ส่งข้อมูลบางส่วนออกไปยังผู้ให้บริการภายนอก ต้องยืนยันนโยบายและการกำจัดข้อมูลอ่อนไหวก่อนใช้ข้อมูลจริง

## 10 สถานะและรายการส่งต่อ

- `main` ณ วันที่ตรวจคือ `e746fbb` ตรง `origin/main`; อย่ายึดค่านี้แทนการตรวจล่าสุด
- พบไฟล์ untracked `.codex-vercel-node/`, `frontend/.codex-vercel-node/`, `tmp/` และ `frontend/scripts/test-chatbot-new-pdf.cjs` ห้ามลบหรือ commit เหมารวมโดยไม่ตรวจเจ้าของและเนื้อหา
- ยังไม่ได้ยืนยัน URL production, ผู้ดูแล, สิทธิ์ Vercel, ค่า environment, สถานะ migration production, backup, การกู้คืน หรือผลทดสอบ chatbot กับ Gemini จริง ต้องให้ผู้รับผิดชอบยืนยัน
- เอกสาร README และ `docs/department-code-login.md` มีข้อมูลที่อาจล้าสมัย โดยเฉพาะสิทธิ์รหัสบุคลากรและค่าเริ่มต้นโมเดล ควรปรับหลังตรวจพฤติกรรมจริง
- ก่อนรับงานครบถ้วน ควรส่งมอบสิทธิ์ Git/Vercel/DB/OAuth/Gemini ผ่านช่องทางปลอดภัย, ผู้ติดต่อ, ขั้นตอน backup/restore, ผัง environment, รายการ migration ที่ใช้จริง, ขั้นตอน release/rollback และผลทดสอบ staging ให้ผู้รับช่วง
