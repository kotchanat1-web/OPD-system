# PRD — OPD Clinic Web App (MVP)

## 1. เป้าหมายโครงการ
สร้าง Web App สำหรับใช้งาน OPD ในคลินิก แทนระบบ Google Sheet เดิม โดย **ย้ายข้อมูลเก่ามาใช้งานต่อได้ทันที** และลดขั้นตอนการทำงานของเจ้าหน้าที่/แพทย์ให้เหลือระบบหลักที่จำเป็นก่อน

**MVP เน้น 3 กลุ่มฟีเจอร์:**
1. รับคนไข้ + เวชระเบียน OPD
2. รายการยา/Stock + สั่งยา
3. คิดเงิน + เอกสาร + บันทึกสิทธิ/A-Med ในลักษณะส่วนลด

> ฟีเจอร์อื่น เช่น รายงานเชิงลึก, dashboard, notification, integration ภายนอกแบบอัตโนมัติ ให้ทำหลัง MVP

---

## 2. ขอบเขต MVP

### MVP-1: รับเคสใหม่ + เวชระเบียน OPD
**ต้องทำ**
- ค้นหาผู้ป่วยจาก HN / ชื่อ / เบอร์โทร
- สร้างผู้ป่วยใหม่
- ออก Visit/AN ใหม่
- บันทึก
  - Chief Complaint
  - Present Illness
  - PMH / Drug Allergy
  - Vital Signs
  - Physical Examination
  - Assessment / Diagnosis
  - Treatment / Plan
- แสดงประวัติการรักษาครั้งก่อน
- รองรับการแก้ไขข้อมูลก่อนปิด Visit
- ปิด Visit และล็อกข้อมูลบางส่วนเพื่อป้องกันการแก้ย้อนหลังโดยไม่ตั้งใจ

**Acceptance Criteria**
- เจ้าหน้าที่รับเคสเดิมได้ภายใน 1 หน้าจอ
- แพทย์เปิด Visit แล้วเห็นข้อมูลเดิม + บันทึกครั้งปัจจุบันในหน้าเดียว
- ทุก Visit ต้องผูกกับ Patient ID และวันเวลาอย่างชัดเจน

### MVP-2: ยา + Stock + รายการยา
**ต้องทำ**
- Drug Master แยก
  - Generic Name
  - Strength (mg/ml/etc.)
  - Dosage Form
  - Trade Name
  - Unit
  - ราคาซื้อ
  - ราคาขาย
  - Stock คงเหลือ
  - จุดเตือน Stock ต่ำ (ขั้นต่ำ)
- เพิ่มยาใหม่ / แก้ไขยา
- บันทึกการซื้อยาเข้า Stock
- จ่ายยาแล้วตัด Stock อัตโนมัติ
- คืนยา/ยกเลิกการจ่ายต้องคืน Stock
- แสดงยา Generic เดียวกัน + Strength เดียวกัน เพื่อช่วยเปรียบเทียบราคา
- ใบสั่งยาผูกกับ Visit
- รองรับวิธีใช้ยาแบบข้อความอิสระใน MVP

**หลักสำคัญ**
> ห้ามใช้ชื่อการค้าเป็นตัวระบุยาเพียงอย่างเดียว ต้องมี `DrugID` กลาง และผูกกับ Generic + Strength เพื่อรองรับหลาย Trade Name

### MVP-3: คิดเงิน + เอกสาร + A-Med/ส่วนลด
**ต้องทำ**
- สรุปค่าใช้จ่ายจาก
  - ค่ายา
  - ค่าหัตถการ
  - ค่าบริการอื่น
- เพิ่ม/แก้รายการหัตถการและราคาจาก Master
- บันทึกส่วนลด
- ทำรายการ A-Med/สิทธิ สปสช. ใน MVP เป็น **รายการส่วนลด/ยอดหัก** ก่อน โดยเก็บข้อมูลประกอบเพื่อรองรับการเชื่อมระบบจริงภายหลัง
- ออกใบเสร็จ
- ออกใบรับรองแพทย์
  - ลาป่วย
  - สมัครงาน
  - ใบขับขี่
- พิมพ์ / Save PDF จาก Browser

**Acceptance Criteria**
- ปิด Visit แล้วสร้างยอดชำระได้อัตโนมัติ
- ใบเสร็จและใบรับรองใช้ข้อมูล Patient/Visit เดิม ไม่ต้องพิมพ์ซ้ำ
- รายการ A-Med/ส่วนลดต้องแยกจากยอดขายจริงและตรวจสอบย้อนหลังได้

---

## 3. สิ่งที่ยังไม่ทำใน MVP
- เชื่อม API A-Med/สปสช. แบบอัตโนมัติ
- ระบบบัญชีเต็มรูปแบบ
- Purchasing workflow หลายขั้น
- ระบบนัดหมาย
- Queue Management ขั้นสูง
- Dashboard เชิงธุรกิจ
- Mobile App แยก
- LINE OA / Notification
- AI ช่วยวินิจฉัยหรือเขียนเวชระเบียนอัตโนมัติ

---

## 4. Data Model หลัก

```text
Patient
- patient_id (PK)
- hn
- title
- first_name
- last_name
- dob
- sex
- phone
- address
- national_id (ถ้าจำเป็น)
- drug_allergy
- created_at
- updated_at

Visit
- visit_id (PK)
- patient_id (FK)
- visit_date
- doctor
- chief_complaint
- present_illness
- vital_signs
- physical_exam
- assessment
- plan
- status
- created_at
- closed_at

Drug
- drug_id (PK)
- generic_name
- strength
- dosage_form
- trade_name
- unit
- purchase_price
- sale_price
- min_stock
- active

StockTransaction
- stock_tx_id (PK)
- drug_id (FK)
- type (PURCHASE/SALE/RETURN/ADJUST)
- qty
- unit_cost
- reference_id
- created_at

Prescription
- prescription_id (PK)
- visit_id (FK)
- drug_id (FK)
- qty
- sig
- unit_price
- amount

Procedure
- procedure_id (PK)
- name
- category
- price
- active

Charge
- charge_id (PK)
- visit_id (FK)
- type (DRUG/PROCEDURE/SERVICE)
- reference_id
- description
- qty
- unit_price
- amount

Payment
- payment_id (PK)
- visit_id (FK)
- subtotal
- discount
- amed_discount
- total
- payment_method
- paid_at

Certificate
- certificate_id (PK)
- visit_id (FK)
- type
- details
- issued_at

AuditLog
- log_id (PK)
- user_id
- action
- table_name
- record_id
- timestamp
```

---

## 5. Migration จาก Google Sheet เดิม

### เป้าหมาย
ข้อมูลเดิมต้องนำเข้าแล้วใช้งานต่อได้ โดย **ไม่ลบ Google Sheet เดิมจนกว่าจะตรวจสอบข้อมูลครบ**

### Migration Strategy
1. Export Google Sheet เป็น XLSX/CSV
2. สำรวจทุก Sheet และ mapping column
3. แปลงข้อมูลเข้าตารางใหม่
4. สร้าง ID กลางสำหรับ Patient / Drug / Visit
5. ตรวจ duplicate ผู้ป่วยและยา
6. Import ข้อมูลเก่าแบบ batch
7. ทำ reconciliation เช่น
   - จำนวนคนไข้
   - จำนวน Visit
   - จำนวนยา
   - Stock
   - ยอดขายรวม
8. หลังตรวจสอบจึงเริ่มใช้ Web App เป็นระบบหลัก

> เนื่องจากโครงสร้าง Google Sheet ปัจจุบันอาจเปลี่ยนได้ ให้ทำ `import mapping` แยกจาก business logic เพื่อให้รองรับการเปลี่ยนชื่อคอลัมน์ได้ง่าย

---

## 6. โครงสร้างไฟล์ Frontend

แนะนำเริ่มด้วย **HTML + CSS + Vanilla JS แบบ Modular** เพื่อให้ AI สร้างและแก้ไขง่ายก่อน แล้วค่อยเปลี่ยน framework ภายหลังหากจำเป็น

```text
opd-app/
├── index.html
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── print.css
├── js/
│   ├── app.js
│   ├── api.js
│   ├── state.js
│   ├── utils.js
│   ├── patients.js
│   ├── visits.js
│   ├── drugs.js
│   ├── stock.js
│   ├── billing.js
│   ├── certificates.js
│   └── migration.js
├── pages/
│   ├── patient.html
│   ├── visit.html
│   ├── pharmacy.html
│   ├── billing.html
│   └── master-data.html
└── assets/
    └── logo/
```

### HTML
ใช้เป็นโครงสร้างหน้าและ semantic form เป็นหลัก
- ไม่ใส่ business logic ใน HTML
- Form ทุกตัวมี `id` ชัดเจน
- ตารางใช้ component structure เดียวกัน

### CSS
- `base.css` → font, reset, variables
- `layout.css` → sidebar, header, content
- `components.css` → button, form, table, modal, badge
- `print.css` → ใบเสร็จ / ใบรับรอง / เอกสารพิมพ์

### JavaScript
- `app.js` → boot app / routing
- `api.js` → ติดต่อ Backend/Database เท่านั้น
- `state.js` → current patient/current visit/current order
- `patients.js` → patient workflow
- `visits.js` → OPD workflow
- `drugs.js` → Drug Master
- `stock.js` → stock transaction
- `billing.js` → charge/payment
- `certificates.js` → document generation
- `migration.js` → import/validate legacy data

> หลักการสำคัญ: UI ไม่ควรเขียน Database โดยตรง ต้องผ่าน `api.js` หรือ service layer

---

## 7. Backend / Database ที่แนะนำ

สำหรับ MVP แนะนำใช้ **PostgreSQL + Supabase** หรือ Backend ที่มี REST API ชัดเจน เพราะข้อมูล OPD/Stock/Payment เป็น relational data และต้องมี audit trail

ขั้นต่ำต้องมี
- Authentication
- Role: Admin / Staff / Doctor
- Database backup
- Audit Log
- Transaction สำหรับการตัด Stock + คิดเงิน

---

## 8. UX Flow หลัก

```text
เปิดระบบ
   ↓
ค้นหา HN / ชื่อ
   ↓
[เดิม] เปิด Visit ใหม่  ──┐
[ใหม่] ลงทะเบียนผู้ป่วย  │
                          ↓
                    OPD Visit
                          ↓
                 ซักประวัติ/ตรวจ
                          ↓
                    วินิจฉัย
                          ↓
              สั่งยา / หัตถการ
                          ↓
                 ตัด Stock อัตโนมัติ
                          ↓
                    สรุปค่าใช้จ่าย
                          ↓
               A-Med/ส่วนลด (ถ้ามี)
                          ↓
                    รับชำระเงิน
                          ↓
          ใบเสร็จ / ใบรับรองแพทย์
                          ↓
                      ปิด Visit
```

---

## 9. Definition of Done สำหรับ MVP

- [ ] ค้นหา/สร้างผู้ป่วยได้
- [ ] สร้าง Visit และบันทึกเวชระเบียนได้
- [ ] สั่งยาและหัตถการได้
- [ ] ตัด Stock ได้จริงและตรวจสอบย้อนกลับได้
- [ ] เพิ่มยาใหม่ / เพิ่มหัตถการใหม่ได้
- [ ] เปรียบเทียบยา Generic + Strength เดียวกันได้
- [ ] คิดเงินและส่วนลดได้
- [ ] บันทึก A-Med/สิทธิในรูปแบบส่วนลดได้
- [ ] พิมพ์ใบเสร็จได้
- [ ] พิมพ์ใบรับรอง 3 แบบได้
- [ ] Import ข้อมูลเก่าได้
- [ ] มี Backup และ Audit Log

---

# 10. ลำดับการสั่ง AI ให้สร้างระบบทีละข้อ

## Step 1 — สร้าง Project Skeleton
**Prompt**
```text
สร้างโครงสร้างโปรเจกต์ Web App OPD ตาม PRD นี้ด้วย HTML/CSS/Vanilla JS แบบ modular
สร้างเฉพาะ skeleton ก่อน ห้ามเขียน business logic เยอะ
ต้องมี index.html, css/, js/, pages/, assets/
เขียน README อธิบายวิธีรันโปรเจกต์
```

## Step 2 — สร้าง Database Schema
**Prompt**
```text
จาก PRD นี้ ออกแบบ PostgreSQL schema สำหรับ Patient, Visit, Drug,
StockTransaction, Prescription, Procedure, Charge, Payment, Certificate,
AuditLog และ User
กำหนด PK/FK/index/constraint ให้พร้อมใช้งานจริง
แยก migration SQL เป็นไฟล์
```

## Step 3 — ทำ Patient + Visit ก่อน
**Prompt**
```text
สร้าง MVP Patient + Visit ตาม PRD
ทำหน้าค้นหาผู้ป่วย, ลงทะเบียนผู้ป่วยใหม่, เปิด Visit,
บันทึก CC, PI, Vital Signs, PE, Assessment, Plan และปิด Visit
ใช้ api.js แยกจาก UI และห้าม hardcode data
```

## Step 4 — ทำ Drug Master + Stock
**Prompt**
```text
สร้าง Drug Master และ Stock module
รองรับ Generic Name + Strength + Dosage Form + Trade Name
รองรับเพิ่มยาใหม่, ซื้อยาเข้า, จ่ายยาออก, คืนยา, ปรับ stock
ทุก stock change ต้องบันทึก StockTransaction
```

## Step 5 — ทำ Prescription + เปรียบเทียบราคา
**Prompt**
```text
เพิ่ม Prescription ใน Visit
เมื่อเลือก Generic + Strength ให้แสดง Trade Name ทั้งหมดที่ตรงกัน
แสดงราคาขายและราคาซื้อเพื่อเปรียบเทียบ
เมื่อยืนยันการจ่ายยาให้สร้าง stock transaction แบบ SALE และหัก stock
```

## Step 6 — ทำ Billing
**Prompt**
```text
สร้าง Billing module รวมค่ายา + ค่าหัตถการ + ค่าบริการ
รองรับ discount และ amed_discount แยก field กัน
คำนวณ subtotal, discount, total ให้ชัดเจน
เมื่อปิดบิลแล้วห้ามแก้ยอดโดยตรง ให้สร้าง adjustment transaction
```

## Step 7 — ทำเอกสาร
**Prompt**
```text
สร้างระบบพิมพ์ใบเสร็จและใบรับรองแพทย์ 3 แบบ:
1) ลาป่วย 2) สมัครงาน 3) ใบขับขี่
ข้อมูลต้องดึงจาก Patient + Visit อัตโนมัติ
ทำ print.css สำหรับ A4 และออกแบบให้พิมพ์จาก browser ได้
```

## Step 8 — Migration ข้อมูลเดิม
**Prompt**
```text
สร้าง migration/import tool สำหรับข้อมูล Google Sheet เดิม
รับ CSV/XLSX เป็น input
ทำ column mapping แยกจาก business logic
ตรวจ duplicate patient/drug
แสดง validation error ก่อน import
และสร้าง import report หลัง import
ห้ามเขียนทับข้อมูลเดิมโดยไม่แจ้งเตือน
```

## Step 9 — Test ทั้งระบบ
**Prompt**
```text
สร้าง test cases สำหรับ workflow หลักตั้งแต่
รับคนไข้ → Visit → สั่งยา → ตัด stock → Billing → A-Med discount → Receipt
รวม edge cases เช่น stock ไม่พอ, ยกเลิกยา, คืนยา, discount มากกว่ายอด,
ปิด Visit แล้วแก้ข้อมูล และ duplicate patient
```

## Step 10 — Production Hardening
**Prompt**
```text
ตรวจ codebase ทั้งหมดตาม PRD
หา security issue, data integrity issue, race condition ของ stock,
validation ที่ขาด, audit log ที่ขาด และสิทธิ์ของ user
แก้เฉพาะจุดที่จำเป็นสำหรับ production
ห้าม refactor ใหญ่ที่ไม่เกี่ยวกับ MVP
```

---

## 11. หลักการพัฒนาเพื่อไม่ให้โปรเจกต์บาน

1. ทำ **Patient → Visit → Drug/Stock → Billing** ตามลำดับ
2. ทุกครั้งที่สั่ง AI ให้แก้ทีละ module และบอกไฟล์ที่อนุญาตให้แก้
3. ห้ามให้ AI เปลี่ยน Database schema เองโดยไม่มี migration
4. ห้ามให้ AI ทำหลาย feature ใน prompt เดียว
5. ก่อนเริ่ม feature ถัดไป ต้องทดสอบ feature เดิมก่อน
6. Data ที่มาจาก Google Sheet ถือเป็น **Legacy Data** และต้องมีขั้นตอน validation ก่อน import
7. A-Med ใน MVP ให้เก็บเป็น transaction/discount data ก่อน ไม่ทำ integration จริงจน workflow หลักนิ่ง

## 12. MVP Release Goal

เมื่อจบ MVP เจ้าหน้าที่ควรสามารถทำงานครบหนึ่ง Visit ได้โดยไม่ต้องเปิด Google Sheet เดิม:

**ค้นหาคนไข้ → เปิด Visit → ตรวจ → สั่งยา → ตัด Stock → คิดเงิน → บันทึก A-Med/ส่วนลด → รับเงิน → พิมพ์ใบเสร็จ/ใบรับรอง → ปิด Visit**
