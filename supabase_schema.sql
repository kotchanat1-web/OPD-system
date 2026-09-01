-- ==============================================================================
-- สคริปต์สร้างฐานข้อมูล Supabase สำหรับระบบ OPD คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
-- วิธีใช้: นำโค้ดทั้งหมดนี้ไปวางในหน้า "SQL Editor" ของ Supabase แล้วกดปุ่ม "RUN"
-- ==============================================================================

-- 1. ตารางผู้ป่วย (opd_patients)
create table if not exists public.opd_patients (
    patient_id text primary key,
    hn text not null,
    national_id text,
    title text,
    first_name text not null,
    last_name text not null,
    sex text,
    dob text,
    phone text,
    rights text default 'UC',
    chronic text,
    drug_allergy text,
    address text,
    note text,
    raw_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ตารางการเข้ารับบริการ / AN (opd_visits)
create table if not exists public.opd_visits (
    visit_id text primary key,
    an text not null,
    hn text not null,
    patient_id text not null,
    patient_name text,
    visit_date text,
    queue_no text,
    queue_type text default 'ทั่วไป',
    status text default 'waiting', -- waiting, examining, lab_wait, pharmacy, completed, cancelled
    doctor text,
    doctor_id text,
    doctor_license text,
    cc text, -- Chief Complaint
    pi text, -- Present Illness
    pe text, -- Physical Examination
    diagnosis text,
    vitals jsonb, -- bp_sys, bp_dia, pr, rr, temp, weight, height, bmi, o2_sat
    drugs jsonb, -- array of prescribed drugs
    labs jsonb, -- array of lab orders & results / attachments
    procedures jsonb, -- array of procedures & DF
    billing jsonb, -- total, discount, net, payment_type
    certificates jsonb, -- medical certificate data
    audit_logs jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ตารางคลังยาและเวชภัณฑ์ (opd_drugs)
create table if not exists public.opd_drugs (
    drug_id text primary key,
    code text,
    trade_name text,
    generic_name text not null,
    dosage text,
    unit text,
    cost_price numeric default 0,
    sale_price numeric default 0,
    stock numeric default 0,
    category text,
    usage_instruction text,
    usage_text text,
    warning text,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ตารางการนัดหมาย (opd_appointments)
create table if not exists public.opd_appointments (
    appointment_id text primary key,
    patient_id text not null,
    hn text not null,
    patient_name text not null,
    doctor text,
    appt_date text not null,
    appt_time text,
    reason text,
    status text default 'scheduled', -- scheduled, arrived, completed, cancelled
    note text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ตารางหัตถการ (opd_procedures)
create table if not exists public.opd_procedures (
    proc_id text primary key,
    code text,
    name text not null,
    category text,
    price numeric default 0,
    df_price numeric default 0,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ตารางตรวจทางห้องปฏิบัติการ (opd_labs)
create table if not exists public.opd_labs (
    lab_id text primary key,
    code text,
    name text not null,
    category text,
    price numeric default 0,
    normal_range text,
    unit text,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. ตารางชุดแล็บ (opd_lab_sets)
create table if not exists public.opd_lab_sets (
    set_id text primary key,
    name text not null,
    category text,
    description text,
    items jsonb,
    price numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ตารางชุดยาที่ใช้บ่อย (opd_drug_groups)
create table if not exists public.opd_drug_groups (
    group_id text primary key,
    name text not null,
    description text,
    items jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. ตารางเทมเพลตตรวจร่างกาย (opd_pe_templates)
create table if not exists public.opd_pe_templates (
    template_id text primary key,
    title text not null,
    category text,
    content text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. ตารางแพทย์และเจ้าหน้าที่ (opd_doctors)
create table if not exists public.opd_doctors (
    doctor_id text primary key,
    title text,
    first_name text not null,
    last_name text not null,
    license_no text,
    specialty text,
    phone text,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. ตาราง Audit Logs บันทึกการใช้งาน (opd_audit_logs)
create table if not exists public.opd_audit_logs (
    id bigint generated always as identity primary key,
    action text,
    user_role text,
    doctor_name text,
    details jsonb,
    timestamp text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. ตารางประวัติการรับเข้า & ปรับราคายา (opd_drug_price_history)
create table if not exists public.opd_drug_price_history (
    history_id text primary key,
    drug_id text not null,
    generic_name text not null,
    trade_name text,
    type text not null, -- 'STOCK_IN', 'COST_CHANGE', 'PRICE_CHANGE', 'OCR_IMPORT', 'NEW_DRUG'
    old_cost numeric default 0,
    new_cost numeric default 0,
    old_price numeric default 0,
    new_price numeric default 0,
    qty_change numeric default 0,
    stock_before numeric default 0,
    stock_after numeric default 0,
    ref_invoice text,
    note text,
    operator text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. ตาราง System Configs (opd_system_configs)
create table if not exists public.opd_system_configs (
    key text primary key,
    value jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. ตารางความเคลื่อนไหวสต็อกยาและเวชภัณฑ์ (opd_stock_transactions)
create table if not exists public.opd_stock_transactions (
    tx_id text primary key,
    drug_id text not null,
    generic_name text,
    trade_name text,
    visit_id text,
    type text not null, -- 'PURCHASE', 'SALE', 'RETURN', 'ADJUST', 'RETURN_CANCEL_VISIT', 'OCR_INBOUND'
    qty numeric not null,
    cost_price numeric default 0,
    sale_price numeric default 0,
    stock_before numeric default 0,
    stock_after numeric default 0,
    reference_no text, -- AN or Invoice No.
    note text,
    operator text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- สร้าง Indexes เพื่อความเร็วในการค้นหา
-- ==============================================================================
create index if not exists idx_patients_hn on public.opd_patients(hn);
create index if not exists idx_patients_cid on public.opd_patients(national_id);
create index if not exists idx_patients_name on public.opd_patients(first_name, last_name);
create index if not exists idx_visits_an on public.opd_visits(an);
create index if not exists idx_visits_hn on public.opd_visits(hn);
create index if not exists idx_visits_date on public.opd_visits(visit_date);
create index if not exists idx_visits_status on public.opd_visits(status);
create index if not exists idx_appointments_date on public.opd_appointments(appt_date);
create index if not exists idx_drug_history_drug_id on public.opd_drug_price_history(drug_id);
create index if not exists idx_drug_history_created_at on public.opd_drug_price_history(created_at);
create index if not exists idx_stock_tx_drug_id on public.opd_stock_transactions(drug_id);
create index if not exists idx_stock_tx_visit_id on public.opd_stock_transactions(visit_id);
create index if not exists idx_stock_tx_created_at on public.opd_stock_transactions(created_at);

-- ==============================================================================
-- เปิดใช้งาน Row Level Security (RLS) พร้อม Allow All สำหรับใช้งานผ่าน Anon Key
-- ==============================================================================
alter table public.opd_patients enable row level security;
alter table public.opd_visits enable row level security;
alter table public.opd_drugs enable row level security;
alter table public.opd_appointments enable row level security;
alter table public.opd_procedures enable row level security;
alter table public.opd_labs enable row level security;
alter table public.opd_lab_sets enable row level security;
alter table public.opd_drug_groups enable row level security;
alter table public.opd_pe_templates enable row level security;
alter table public.opd_doctors enable row level security;
alter table public.opd_audit_logs enable row level security;
alter table public.opd_drug_price_history enable row level security;
alter table public.opd_system_configs enable row level security;
alter table public.opd_stock_transactions enable row level security;

-- สร้าง Policy ให้อ่าน/เขียน/แก้ไขได้สะดวกผ่าน Anon Key
create policy "Allow all operations for anon on opd_patients" on public.opd_patients for all using (true) with check (true);
create policy "Allow all operations for anon on opd_visits" on public.opd_visits for all using (true) with check (true);
create policy "Allow all operations for anon on opd_drugs" on public.opd_drugs for all using (true) with check (true);
create policy "Allow all operations for anon on opd_appointments" on public.opd_appointments for all using (true) with check (true);
create policy "Allow all operations for anon on opd_procedures" on public.opd_procedures for all using (true) with check (true);
create policy "Allow all operations for anon on opd_labs" on public.opd_labs for all using (true) with check (true);
create policy "Allow all operations for anon on opd_lab_sets" on public.opd_lab_sets for all using (true) with check (true);
create policy "Allow all operations for anon on opd_drug_groups" on public.opd_drug_groups for all using (true) with check (true);
create policy "Allow all operations for anon on opd_pe_templates" on public.opd_pe_templates for all using (true) with check (true);
create policy "Allow all operations for anon on opd_doctors" on public.opd_doctors for all using (true) with check (true);
create policy "Allow all operations for anon on opd_audit_logs" on public.opd_audit_logs for all using (true) with check (true);
create policy "Allow all operations for anon on opd_drug_price_history" on public.opd_drug_price_history for all using (true) with check (true);
create policy "Allow all operations for anon on opd_system_configs" on public.opd_system_configs for all using (true) with check (true);
create policy "Allow all operations for anon on opd_stock_transactions" on public.opd_stock_transactions for all using (true) with check (true);

-- ==============================================================================
-- เปิดใช้งาน Realtime Broadcast สำหรับตารางหลัก (เพื่อให้ทุกเครื่องอัปเดตทันที)
-- ==============================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_patients') then
    alter publication supabase_realtime add table public.opd_patients;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_visits') then
    alter publication supabase_realtime add table public.opd_visits;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drugs') then
    alter publication supabase_realtime add table public.opd_drugs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_appointments') then
    alter publication supabase_realtime add table public.opd_appointments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_procedures') then
    alter publication supabase_realtime add table public.opd_procedures;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_labs') then
    alter publication supabase_realtime add table public.opd_labs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drug_groups') then
    alter publication supabase_realtime add table public.opd_drug_groups;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_pe_templates') then
    alter publication supabase_realtime add table public.opd_pe_templates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_doctors') then
    alter publication supabase_realtime add table public.opd_doctors;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drug_price_history') then
    alter publication supabase_realtime add table public.opd_drug_price_history;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_stock_transactions') then
    alter publication supabase_realtime add table public.opd_stock_transactions;
  end if;
end $$;
