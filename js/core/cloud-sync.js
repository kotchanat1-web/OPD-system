/* ==========================================================================
   OPD System - Supabase Cloud Synchronization
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const CloudSyncModule = {
      client: null,
      realtimeChannel: null,
      isSyncing: false,
      status: 'offline', // 'connected', 'connecting', 'offline', 'error'
      lastSyncTime: null,
      sqlSchema: "-- ==============================================================================\n-- สคริปต์สร้างฐานข้อมูล Supabase สำหรับระบบ OPD คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์\n-- วิธีใช้: นำโค้ดทั้งหมดนี้ไปวางในหน้า \"SQL Editor\" ของ Supabase แล้วกดปุ่ม \"RUN\"\n-- ==============================================================================\n\n-- 1. ตารางผู้ป่วย (opd_patients)\ncreate table if not exists public.opd_patients (\n    patient_id text primary key,\n    hn text not null,\n    national_id text,\n    title text,\n    first_name text not null,\n    last_name text not null,\n    sex text,\n    dob text,\n    phone text,\n    rights text default 'UC',\n    chronic text,\n    drug_allergy text,\n    address text,\n    note text,\n    raw_data jsonb,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 2. ตารางการเข้ารับบริการ / AN (opd_visits)\ncreate table if not exists public.opd_visits (\n    visit_id text primary key,\n    an text not null,\n    hn text not null,\n    patient_id text not null,\n    patient_name text,\n    visit_date text,\n    queue_no text,\n    queue_type text default 'ทั่วไป',\n    status text default 'waiting', -- waiting, examining, lab_wait, pharmacy, completed, cancelled\n    doctor text,\n    doctor_id text,\n    doctor_license text,\n    cc text, -- Chief Complaint\n    pi text, -- Present Illness\n    pe text, -- Physical Examination\n    diagnosis text,\n    vitals jsonb, -- bp_sys, bp_dia, pr, rr, temp, weight, height, bmi, o2_sat\n    drugs jsonb, -- array of prescribed drugs\n    labs jsonb, -- array of lab orders & results\n    procedures jsonb, -- array of procedures & DF\n    billing jsonb, -- total, discount, net, payment_type\n    certificates jsonb, -- medical certificate data\n    audit_logs jsonb,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 3. ตารางคลังยาและเวชภัณฑ์ (opd_drugs)\ncreate table if not exists public.opd_drugs (\n    drug_id text primary key,\n    generic_name text not null,\n    strength text,\n    dosage_form text,\n    trade_name text,\n    unit text,\n    purchase_price numeric default 0,\n    cost_price numeric default 0,\n    sale_price numeric default 0,\n    stock numeric default 0,\n    min_stock numeric default 10,\n    drawer text,\n    code text,\n    dosage text,\n    category text,\n    usage_instruction text,\n    usage_text text,\n    warning text,\n    drawer text,\n    active boolean default true,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 4. ตารางการนัดหมาย (opd_appointments)\ncreate table if not exists public.opd_appointments (\n    appointment_id text primary key,\n    patient_id text not null,\n    hn text not null,\n    patient_name text not null,\n    doctor text,\n    appt_date text not null,\n    appt_time text,\n    reason text,\n    status text default 'scheduled', -- scheduled, arrived, completed, cancelled\n    note text,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 5. ตารางหัตถการ (opd_procedures)\ncreate table if not exists public.opd_procedures (\n    proc_id text primary key,\n    code text,\n    name text not null,\n    category text,\n    price numeric default 0,\n    df_price numeric default 0,\n    active boolean default true,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 6. ตารางตรวจทางห้องปฏิบัติการ (opd_labs)\ncreate table if not exists public.opd_labs (\n    lab_id text primary key,\n    code text,\n    name text not null,\n    category text,\n    price numeric default 0,\n    normal_range text,\n    unit text,\n    active boolean default true,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 7. ตารางชุดแล็บ (opd_lab_sets)\ncreate table if not exists public.opd_lab_sets (\n    set_id text primary key,\n    name text not null,\n    category text,\n    description text,\n    items jsonb,\n    price numeric default 0,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 8. ตารางชุดยาที่ใช้บ่อย (opd_drug_groups)\ncreate table if not exists public.opd_drug_groups (\n    group_id text primary key,\n    name text not null,\n    description text,\n    items jsonb,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 9. ตารางเทมเพลตตรวจร่างกาย (opd_pe_templates)\ncreate table if not exists public.opd_pe_templates (\n    template_id text primary key,\n    title text not null,\n    category text,\n    content text,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 10. ตารางแพทย์และเจ้าหน้าที่ (opd_doctors)\ncreate table if not exists public.opd_doctors (\n    doctor_id text primary key,\n    title text,\n    first_name text not null,\n    last_name text not null,\n    license_no text,\n    specialty text,\n    phone text,\n    active boolean default true,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 11. ตาราง Audit Logs บันทึกการใช้งาน (opd_audit_logs)\ncreate table if not exists public.opd_audit_logs (\n    id bigint generated always as identity primary key,\n    action text,\n    user_role text,\n    doctor_name text,\n    details jsonb,\n    timestamp text,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 12. ตารางประวัติการรับเข้า & ปรับราคายา (opd_drug_price_history)\ncreate table if not exists public.opd_drug_price_history (\n    history_id text primary key,\n    drug_id text not null,\n    generic_name text not null,\n    trade_name text,\n    type text not null,\n    old_cost numeric default 0,\n    new_cost numeric default 0,\n    old_price numeric default 0,\n    new_price numeric default 0,\n    qty_change numeric default 0,\n    stock_before numeric default 0,\n    stock_after numeric default 0,\n    ref_invoice text,\n    note text,\n    operator text,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 13. ตาราง System Configs (opd_system_configs)\ncreate table if not exists public.opd_system_configs (\n    key text primary key,\n    value jsonb,\n    updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- 14. ตารางความเคลื่อนไหวสต็อกยาและเวชภัณฑ์ (opd_stock_transactions)\ncreate table if not exists public.opd_stock_transactions (\n    tx_id text primary key,\n    drug_id text not null,\n    generic_name text,\n    trade_name text,\n    visit_id text,\n    type text not null,\n    qty numeric not null,\n    cost_price numeric default 0,\n    sale_price numeric default 0,\n    stock_before numeric default 0,\n    stock_after numeric default 0,\n    reference_no text,\n    note text,\n    operator text,\n    created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\n-- ==============================================================================\n-- สร้าง Indexes เพื่อความเร็วในการค้นหา\n-- ==============================================================================\ncreate index if not exists idx_patients_hn on public.opd_patients(hn);\ncreate index if not exists idx_patients_cid on public.opd_patients(national_id);\ncreate index if not exists idx_patients_name on public.opd_patients(first_name, last_name);\ncreate index if not exists idx_visits_an on public.opd_visits(an);\ncreate index if not exists idx_visits_hn on public.opd_visits(hn);\ncreate index if not exists idx_visits_date on public.opd_visits(visit_date);\ncreate index if not exists idx_visits_status on public.opd_visits(status);\ncreate index if not exists idx_appointments_date on public.opd_appointments(appt_date);\ncreate index if not exists idx_drug_history_drug_id on public.opd_drug_price_history(drug_id);\ncreate index if not exists idx_drug_history_created_at on public.opd_drug_price_history(created_at);\ncreate index if not exists idx_stock_tx_drug_id on public.opd_stock_transactions(drug_id);\ncreate index if not exists idx_stock_tx_visit_id on public.opd_stock_transactions(visit_id);\ncreate index if not exists idx_stock_tx_created_at on public.opd_stock_transactions(created_at);\n\n-- ==============================================================================\n-- เปิดใช้งาน Row Level Security (RLS) พร้อม Allow All สำหรับใช้งานผ่าน Anon Key\n-- ==============================================================================\nalter table public.opd_patients enable row level security;\nalter table public.opd_visits enable row level security;\nalter table public.opd_drugs enable row level security;\nalter table public.opd_appointments enable row level security;\nalter table public.opd_procedures enable row level security;\nalter table public.opd_labs enable row level security;\nalter table public.opd_lab_sets enable row level security;\nalter table public.opd_drug_groups enable row level security;\nalter table public.opd_pe_templates enable row level security;\nalter table public.opd_doctors enable row level security;\nalter table public.opd_audit_logs enable row level security;\nalter table public.opd_drug_price_history enable row level security;\nalter table public.opd_system_configs enable row level security;\nalter table public.opd_stock_transactions enable row level security;\n\n-- สร้าง Policy ให้อ่าน/เขียน/แก้ไขได้สะดวกผ่าน Anon Key\ncreate policy \"Allow all operations for anon on opd_patients\" on public.opd_patients for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_visits\" on public.opd_visits for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_drugs\" on public.opd_drugs for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_appointments\" on public.opd_appointments for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_procedures\" on public.opd_procedures for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_labs\" on public.opd_labs for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_lab_sets\" on public.opd_lab_sets for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_drug_groups\" on public.opd_drug_groups for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_pe_templates\" on public.opd_pe_templates for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_doctors\" on public.opd_doctors for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_audit_logs\" on public.opd_audit_logs for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_drug_price_history\" on public.opd_drug_price_history for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_system_configs\" on public.opd_system_configs for all using (true) with check (true);\ncreate policy \"Allow all operations for anon on opd_stock_transactions\" on public.opd_stock_transactions for all using (true) with check (true);\n\n-- ==============================================================================\n-- เปิดใช้งาน Realtime Broadcast สำหรับตารางหลัก (เพื่อให้ทุกเครื่องอัปเดตทันที)\n-- ==============================================================================\ndo $\nbegin\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_patients') then\n    alter publication supabase_realtime add table public.opd_patients;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_visits') then\n    alter publication supabase_realtime add table public.opd_visits;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drugs') then\n    alter publication supabase_realtime add table public.opd_drugs;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_appointments') then\n    alter publication supabase_realtime add table public.opd_appointments;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_procedures') then\n    alter publication supabase_realtime add table public.opd_procedures;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_labs') then\n    alter publication supabase_realtime add table public.opd_labs;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drug_groups') then\n    alter publication supabase_realtime add table public.opd_drug_groups;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_pe_templates') then\n    alter publication supabase_realtime add table public.opd_pe_templates;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_doctors') then\n    alter publication supabase_realtime add table public.opd_doctors;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_drug_price_history') then\n    alter publication supabase_realtime add table public.opd_drug_price_history;\n  end if;\n  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'opd_stock_transactions') then\n    alter publication supabase_realtime add table public.opd_stock_transactions;\n  end if;\nend $;\n",

      TABLE_MAP: {
        'opd_nakhonsawan_stock_tx_v1': { table: 'opd_stock_transactions', pk: 'tx_id' },
        'opd_nakhonsawan_drug_price_history_v1': { table: 'opd_drug_price_history', pk: 'history_id' },
        'opd_nakhonsawan_patients_v5': { table: 'opd_patients', pk: 'patient_id' },
        'opd_nakhonsawan_visits_v7': { table: 'opd_visits', pk: 'visit_id' },
        'opd_nakhonsawan_drugs_v7': { table: 'opd_drugs', pk: 'drug_id' },
        'opd_nakhonsawan_appointments_v5': { table: 'opd_appointments', pk: 'appointment_id' },
        'opd_nakhonsawan_procedures_v4': { table: 'opd_procedures', pk: 'proc_id' },
        'opd_nakhonsawan_labs_v4': { table: 'opd_labs', pk: 'lab_id' },
        'opd_nakhonsawan_lab_sets_v1': { table: 'opd_lab_sets', pk: 'set_id' },
        'opd_nakhonsawan_drug_groups_v4': { table: 'opd_drug_groups', pk: 'group_id' },
        'opd_nakhonsawan_pe_templates_v5': { table: 'opd_pe_templates', pk: 'template_id' },
        'opd_nakhonsawan_doctors_v4': { table: 'opd_doctors', pk: 'doctor_id' }
      },

      getConfig() {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },

      isReady() {
        return this.client !== null && this.status === 'connected';
      },

            serializeForCloud(table, item) {
        if (!item) return item;
        if (table === 'opd_drugs') {
          return {
            drug_id: item.drug_id,
            generic_name: item.generic_name || '',
            strength: item.strength || '',
            dosage_form: item.dosage_form || 'Tablet',
            trade_name: item.trade_name || '',
            unit: item.unit || 'เม็ด',
            purchase_price: Number(item.purchase_price !== undefined ? item.purchase_price : (item.cost_price || 0)),
            cost_price: Number(item.purchase_price !== undefined ? item.purchase_price : (item.cost_price || 0)),
            sale_price: Number(item.sale_price || 0),
            stock: Number(item.stock || 0),
            min_stock: Number(item.min_stock !== undefined ? item.min_stock : 10),
            drawer: item.drawer || '',
            active: item.active !== false
          };
        }
        if (table === 'opd_visits') {
          const labOrders = Array.isArray(item.labs) ? item.labs : [];
          const labFiles = Array.isArray(item.lab_attachments) ? item.lab_attachments : [];
          
          let serializedLabs = labOrders;
          if (labFiles.length > 0) {
            serializedLabs = {
              items: labOrders,
              attachments: labFiles
            };
          }

          return {
            visit_id: item.visit_id || ('V_' + Date.now()),
            an: item.an || '',
            hn: item.hn || '',
            patient_id: item.patient_id || item.hn || '',
            patient_name: item.patient_name || '',
            visit_date: item.visit_date || new Date().toISOString().slice(0, 16).replace('T', ' '),
            queue_no: item.queue_no || '',
            queue_type: item.service_type || item.queue_type || 'ทั่วไป',
            status: item.status || 'OPEN',
            doctor: item.doctor || 'นพ. กชณัฐ พันธุ์วรรธนะสิน',
            doctor_id: item.doctor_id || '',
            doctor_license: item.doctor_license || '',
            cc: item.chief_complaint || item.cc || '',
            pi: item.present_illness || item.pi || '',
            pe: item.physical_exam || item.pe || '',
            diagnosis: Array.isArray(item.diagnoses) ? JSON.stringify(item.diagnoses) : (item.diagnosis || ''),
            vitals: item.vitals || {},
            drugs: item.prescriptions || item.drugs || [],
            labs: serializedLabs,
            procedures: item.procedures || [],
            billing: item.billing || {},
            certificates: item.certificates || {},
            audit_logs: item.audit_logs || []
          };
        }
        if (table === 'opd_patients') {
          return {
            patient_id: item.patient_id || ('P_' + Date.now()),
            hn: item.hn || '',
            national_id: item.national_id || '',
            title: item.title || '',
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            sex: item.sex || '',
            dob: item.dob || '',
            phone: item.phone || '',
            rights: item.rights || 'UC',
            chronic: item.chronic || '',
            drug_allergy: item.drug_allergy || '',
            address: item.address || '',
            note: item.note || ''
          };
        }
        if (table === 'opd_appointments') {
          const apptId = item.appointment_id || item.app_id || ('APP_' + Date.now());
          const dateVal = item.appt_date || item.date || '';
          const timeVal = item.appt_time || item.time || '09:00';
          return {
            appointment_id: apptId,
            patient_id: item.patient_id || item.hn || '',
            hn: item.hn || '',
            patient_name: item.patient_name || '',
            doctor: item.doctor || 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน',
            appt_date: dateVal,
            appt_time: timeVal,
            reason: item.reason || '',
            status: item.status || 'PENDING',
            note: item.note || ''
          };
        }
        return item;
      },

      deserializeFromCloud(table, row) {
        if (!row) return row;
        if (table === 'opd_drugs') {
          return {
            drug_id: row.drug_id,
            generic_name: row.generic_name || '',
            strength: row.strength || row.dosage || '',
            dosage_form: row.dosage_form || 'Tablet',
            trade_name: row.trade_name || '',
            unit: row.unit || 'เม็ด',
            purchase_price: Number(row.purchase_price !== undefined ? row.purchase_price : (row.cost_price || 0)),
            cost_price: Number(row.purchase_price !== undefined ? row.purchase_price : (row.cost_price || 0)),
            sale_price: Number(row.sale_price || 0),
            stock: Number(row.stock || 0),
            min_stock: Number(row.min_stock !== undefined ? row.min_stock : 10),
            drawer: row.drawer || '',
            active: row.active !== false
          };
        }
        if (table === 'opd_visits') {
          let diagnosesList = [];
          if (row.diagnosis) {
            try {
              if (typeof row.diagnosis === 'string' && row.diagnosis.startsWith('[')) {
                diagnosesList = JSON.parse(row.diagnosis);
              } else if (typeof row.diagnosis === 'string') {
                diagnosesList = [{ code: row.diagnosis, name: row.diagnosis, type: 'Principal Dx' }];
              }
            } catch(e) {}
          }

          let labsList = [];
          let labAttachments = [];
          if (Array.isArray(row.labs)) {
            labsList = row.labs;
          } else if (row.labs && typeof row.labs === 'object') {
            labsList = Array.isArray(row.labs.items) ? row.labs.items : (Array.isArray(row.labs.orders) ? row.labs.orders : []);
            labAttachments = Array.isArray(row.labs.attachments) ? row.labs.attachments : (Array.isArray(row.labs.lab_attachments) ? row.labs.lab_attachments : []);
          }
          if (Array.isArray(row.lab_attachments) && row.lab_attachments.length > 0) {
            labAttachments = row.lab_attachments;
          }

          if (labAttachments.length > 0 && typeof LabStorageDB !== 'undefined') {
            LabStorageDB.saveFilesBatch(labAttachments);
          }

          return {
            ...row,
            service_type: row.queue_type || row.service_type || 'ทั่วไป',
            chief_complaint: row.cc || row.chief_complaint || '',
            present_illness: row.pi || row.present_illness || '',
            physical_exam: row.pe || row.physical_exam || '',
            diagnoses: diagnosesList,
            prescriptions: row.drugs || row.prescriptions || [],
            procedures: row.procedures || [],
            labs: labsList,
            lab_attachments: labAttachments,
            vitals: row.vitals || {},
            billing: row.billing || {}
          };
        }
        if (table === 'opd_patients') {
          return {
            ...row,
            age: Utils.calcAge(row.dob)
          };
        }
        if (table === 'opd_appointments') {
          const apptId = row.appointment_id || row.app_id || ('APP_' + Date.now());
          const dateVal = row.appt_date || row.date || '';
          const timeVal = row.appt_time || row.time || '09:00';
          return {
            app_id: apptId,
            appointment_id: apptId,
            hn: row.hn || '',
            patient_id: row.patient_id || row.hn || '',
            patient_name: row.patient_name || '',
            doctor: row.doctor || 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน',
            date: dateVal,
            appt_date: dateVal,
            time: timeVal,
            appt_time: timeVal,
            reason: row.reason || '',
            status: row.status || 'PENDING',
            note: row.note || ''
          };
        }
        return row;
      },

      async upsertRecord(table, item) {
        if (!this.isReady() || !item) return;
        try {
          const payload = this.serializeForCloud(table, item);
          const { error } = await this.client.from(table).upsert(payload);
          if (error) console.error(`Error upserting record to ${table}:`, error);
        } catch(e) {
          console.error(`Exception upserting record to ${table}:`, e);
        }
      },

      async deleteRecord(table, pkField, pkValue) {
        if (!this.isReady() || !pkValue) return;
        try {
          const { error } = await this.client.from(table).delete().eq(pkField, pkValue);
          if (error) console.error(`Error deleting record from ${table}:`, error);
        } catch(e) {
          console.error(`Exception deleting record from ${table}:`, e);
        }
      },

      async saveConfigKey(key, value) {
        if (!this.isReady()) return;
        try {
          await this.client.from('opd_system_configs').upsert({
            key: key,
            value: value,
            updated_at: new Date().toISOString()
          });
        } catch(e) {
          console.error('Error saving config key to cloud:', e);
        }
      },

      async loadSystemConfigsFromCloud() {
        if (!this.isReady()) return;
        try {
          const { data, error } = await this.client.from('opd_system_configs').select('*');
          if (error || !data) return;
          data.forEach(cfg => {
            if (cfg.key === 'user_passwords' && cfg.value) {
              localStorage.setItem(STORAGE_KEYS.USER_PASSWORDS, JSON.stringify(cfg.value));
            }
          });
        } catch(e) {}
      },

      async init() {
        const cfg = this.getConfig();
        const urlInput = document.getElementById('cfg-supabase-url');
        const keyInput = document.getElementById('cfg-supabase-key');
        if (urlInput && cfg?.url) urlInput.value = cfg.url;
        if (keyInput && cfg?.key) keyInput.value = cfg.key;

        const pre = document.getElementById('sql-schema-pre');
        if (pre) pre.textContent = this.sqlSchema;

        if (cfg && cfg.url && cfg.key) {
          await this.connect(cfg.url, cfg.key, false);
        } else {
          this.updateStatusBadge('offline', 'Local Mode');
          this.renderCloudInfoCard();
        }
      },

      async connect(url, key, isManual = false) {
        if (!url || !key) {
          this.updateStatusBadge('offline', 'Local Mode');
          this.renderCloudInfoCard();
          return false;
        }

        if (typeof window.supabase === 'undefined') {
          console.warn('Supabase SDK not loaded.');
          this.updateStatusBadge('error', 'ไม่พบ Supabase SDK');
          this.renderCloudInfoCard();
          return false;
        }

        this.updateStatusBadge('connecting', 'กำลังเชื่อมต่อ Cloud...');

        try {
          this.client = window.supabase.createClient(url, key, {
            auth: { persistSession: false }
          });

          // Test connection by reading 1 patient record
          const { data, error } = await this.client.from('opd_patients').select('patient_id').limit(1);
          if (error) throw error;

          this.status = 'connected';
          this.updateStatusBadge('connected', '🟢 Cloud Synced');
          this.renderCloudInfoCard();

          // Subscribe to Realtime Postgres Changes
          this.subscribeRealtime();

          // Auto-purge any legacy assistant Kanchana / DOC3 from Supabase Cloud opd_doctors
          try {
            await this.client.from('opd_doctors').delete().eq('doctor_id', 'DOC3');
            await this.client.from('opd_doctors').delete().ilike('first_name', '%กาญจนา%');
          } catch(e) {}

          // Pull any updates from cloud
          this.loadSystemConfigsFromCloud();
          this.pullLatestFromCloud(false);

          if (isManual) {
            alert('🎉 เชื่อมต่อ Supabase Cloud Database สำเร็จ! พร้อมซิงค์ข้อมูล Real-time ทุกเครื่องเรียบร้อยแล้ว');
          }
          return true;
        } catch (err) {
          console.error('Supabase connection failed:', err);
          this.status = 'error';
          this.updateStatusBadge('error', '🔴 เชื่อมต่อไม่สำเร็จ');
          this.renderCloudInfoCard();
          if (isManual) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase:\n' + (err.message || JSON.stringify(err)) + '\n\nคำแนะนำ:\n1. ตรวจสอบว่าได้รันคำสั่ง SQL สร้างตารางใน Supabase แล้วหรือไม่\n2. ตรวจสอบ URL และ Anon Key ให้ถูกต้อง');
          }
          return false;
        }
      },

      disconnect() {
        if (this.realtimeChannel) {
          this.client?.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
        this.client = null;
        this.status = 'offline';
        localStorage.removeItem(STORAGE_KEYS.CLOUD_CONFIG);
        const urlInput = document.getElementById('cfg-supabase-url');
        const keyInput = document.getElementById('cfg-supabase-key');
        if (urlInput) urlInput.value = '';
        if (keyInput) keyInput.value = '';
        this.updateStatusBadge('offline', 'Local Mode');
        this.renderCloudInfoCard();
        alert('ตัดการเชื่อมต่อ Cloud เรียบร้อย ระบบกลับสู่โหมด Local');
      },

      async saveConfig() {
        const url = (document.getElementById('cfg-supabase-url')?.value || '').trim();
        const key = (document.getElementById('cfg-supabase-key')?.value || '').trim();

        if (!url || !key) {
          alert('กรุณากรอก Supabase URL และ Anon Key ให้ครบถ้วน');
          return;
        }

        localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify({ url, key }));
        await this.connect(url, key, true);
      },

      updateStatusBadge(status, text) {
        const textEl = document.getElementById('cloud-status-text');
        const dotEl = document.getElementById('cloud-status-dot');

        if (dotEl) {
          if (status === 'connected') dotEl.style.background = '#10b981';
          else if (status === 'connecting') dotEl.style.background = '#f59e0b';
          else if (status === 'error') dotEl.style.background = '#ef4444';
          else dotEl.style.background = '#94a3b8';
        }

        if (textEl) {
          textEl.innerText = text;
        }
      },

      updateTopbarStatus(status, text) {
        return this.updateStatusBadge(status, text);
      },

      renderCloudInfoCard() {
        const cardEl = document.getElementById('cloud-status-info-card');
        if (!cardEl) return;

        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];
        const visits = DB.get(STORAGE_KEYS.VISITS) || [];
        const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];

        let lastSyncStr = 'ยังไม่มีประวัติการซิงค์ในรอบนี้';
        const savedSyncTime = this.lastSyncTime || localStorage.getItem('opd_last_cloud_sync_time');
        if (savedSyncTime) {
          const d = new Date(savedSyncTime);
          if (!isNaN(d.getTime())) {
            lastSyncStr = d.toLocaleString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }) + ' น.';
          }
        }

        if (this.status === 'connected') {
          cardEl.innerHTML = `
            <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 18px; color: #065f46;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 44px; height: 44px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                    <i data-lucide="check-circle" style="color: #059669; width: 26px; height: 26px;"></i>
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span style="font-weight: 700; font-size: 1.05rem; color: #065f46;">🟢 เชื่อมต่อ Supabase Cloud สำเร็จ (Realtime Sync พร้อมทำงาน)</span>
                      <span class="badge badge-success" style="font-size: 0.76rem;">ออนไลน์ (Live)</span>
                    </div>
                    <div style="font-size: 0.84rem; color: #047857; margin: 4px 0 6px;">
                      เมื่อเครื่องใดเปิด AN, สั่งยา, หรือลงทะเบียนคนไข้ ข้อมูลจะส่งข้ามเครื่องแบบ Realtime ทันที ⚡
                    </div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.8rem; color: #065f46; background: rgba(255,255,255,0.6); padding: 6px 12px; border-radius: 6px; border: 1px solid #a7f3d0; margin-top: 6px;">
                      <div><strong>📊 ข้อมูลในระบบ:</strong> ผู้ป่วย <strong>${patients.length.toLocaleString()}</strong> ราย | การตรวจ/AN <strong>${visits.length.toLocaleString()}</strong> เคส | ยา <strong>${drugs.length.toLocaleString()}</strong> รายการ</div>
                      <div><strong>⚡ อัปเดต Cloud ล่าสุด:</strong> <span style="font-weight: 700; color: #047857;">${lastSyncStr}</span></div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button class="btn btn-emerald btn-sm" onclick="CloudSyncModule.pushAllToCloud()" title="อัปโหลดข้อมูลทั้งหมดขึ้น Cloud"><i data-lucide="upload-cloud"></i> ซิงค์ขึ้น Cloud</button>
                  <button class="btn btn-outline btn-sm" onclick="CloudSyncModule.pullLatestFromCloud(true)" title="ดึงข้อมูลล่าสุดจาก Cloud"><i data-lucide="refresh-cw"></i> ดึงข้อมูลล่าสุด</button>
                  <button class="btn btn-danger btn-sm" onclick="CloudSyncModule.disconnect()"><i data-lucide="power"></i> ตัดการเชื่อมต่อ</button>
                </div>
              </div>
            </div>
          `;
        } else {
          cardEl.innerHTML = `
            <div style="background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 12px; padding: 16px; color: #92400e;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <i data-lucide="cloud-off" style="color: #d97706; width: 24px; height: 24px;"></i>
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 0.95rem; color: #92400e;">🟡 ระบบกำลังทำงานในโหมด Local Storage (ใช้งานเฉพาะในเครื่องนี้)</div>
                  <p style="font-size: 0.82rem; color: #78350f; margin: 2px 0 0;">หากต้องการให้ใช้งานร่วมกันหลายเครื่อง ให้กรอก Supabase URL และ Anon Key ด้านล่างแล้วกด "บันทึกและเชื่อมต่อ Cloud"</p>
                </div>
              </div>
            </div>
          `;
        }
        lucide.createIcons();
      },

      subscribeRealtime() {
        if (!this.client) return;
        if (this.realtimeChannel) {
          this.client.removeChannel(this.realtimeChannel);
        }

        this.realtimeChannel = this.client.channel('opd-realtime-channel')
          .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            this.handleRealtimeChange(payload);
          })
          .subscribe((status) => {
            console.log('Supabase realtime subscription status:', status);
          });
      },

      _notifyDebounceTimer: null,
      debouncedNotifyUpdate(table, record) {
        clearTimeout(this._notifyDebounceTimer);
        this._notifyDebounceTimer = setTimeout(() => {
          if (table === 'opd_visits' && State.selectedVisit) {
            const currentVisits = DB.get(STORAGE_KEYS.VISITS) || [];
            const exists = currentVisits.some(x => x.visit_id === State.selectedVisit.visit_id);
            if (!exists) {
              State.selectedVisit = null;
              const emptySt = document.getElementById('chart-empty-state');
              const formCont = document.getElementById('chart-form-content');
              const actEl = document.getElementById('chart-actions');
              if (emptySt) emptySt.style.display = 'block';
              if (formCont) formCont.style.display = 'none';
              if (actEl) actEl.style.display = 'none';
            }
          }
          this.notifyRealtimeUpdate(table, record);
        }, 120);
      },

      handleRealtimeChange(payload) {
        const { table, eventType, new: newRecord, old: oldRecord } = payload;
        console.log(`[Realtime Sync] ${eventType} on ${table}:`, newRecord || oldRecord);

        const now = new Date();
        this.lastSyncTime = now;
        localStorage.setItem('opd_last_cloud_sync_time', now.toISOString());

        if (table === 'opd_system_configs') {
          if (newRecord && newRecord.key === 'user_passwords' && newRecord.value) {
            try {
              localStorage.setItem(STORAGE_KEYS.USER_PASSWORDS, JSON.stringify(newRecord.value));
              this.showSyncToast('🔑 รหัสผ่านระบบได้รับการอัปเดตแบบ Realtime แล้ว');
            } catch(e) {}
          }
          return;
        }

        let storageKey = null;
        let pk = 'id';

        for (const [sKey, conf] of Object.entries(this.TABLE_MAP)) {
          if (conf.table === table) {
            storageKey = sKey;
            pk = conf.pk;
            break;
          }
        }

        if (!storageKey) return;

        let localList = DB.get(storageKey) || [];

        if (eventType === 'INSERT') {
          const mapped = this.deserializeFromCloud(table, newRecord);
          const idx = localList.findIndex(item => item[pk] === mapped[pk]);
          if (idx === -1) {
            localList.unshift(mapped);
          } else {
            localList[idx] = mapped;
          }
          if (table === 'opd_visits' && State.selectedVisit && State.selectedVisit.visit_id === mapped.visit_id) {
            if (mapped.lab_attachments && mapped.lab_attachments.length > 0) {
              State.selectedVisit.lab_attachments = mapped.lab_attachments;
              VisitModule.renderLabAttachments();
            }
          }
          DB.set(storageKey, localList, true);
          this.debouncedNotifyUpdate(table, mapped);
        } else if (eventType === 'UPDATE') {
          const mapped = this.deserializeFromCloud(table, newRecord);
          const idx = localList.findIndex(item => item[pk] === mapped[pk]);
          if (idx !== -1) {
            localList[idx] = mapped;
          } else {
            localList.push(mapped);
          }
          if (table === 'opd_visits' && State.selectedVisit && State.selectedVisit.visit_id === mapped.visit_id) {
            if (mapped.lab_attachments && mapped.lab_attachments.length > 0) {
              State.selectedVisit.lab_attachments = mapped.lab_attachments;
              VisitModule.renderLabAttachments();
            }
          }
          DB.set(storageKey, localList, true);
          this.debouncedNotifyUpdate(table, mapped);
        } else if (eventType === 'DELETE') {
          localList = localList.filter(item => item[pk] !== oldRecord[pk]);
          DB.set(storageKey, localList, true);
          this.debouncedNotifyUpdate(table, oldRecord);
        }
      },

      notifyRealtimeUpdate(table, record) {
        if (State.currentTab === 'tab-dashboard') DashboardModule.render();
        if (State.currentTab === 'tab-patients') PatientModule.render();
        if (State.currentTab === 'tab-opd') {
          // อัปเดตเฉพาะคิวฝั่งซ้าย เพื่อไม่ให้รบกวนแพทย์ขณะพิมพ์ตรวจรักษา
          VisitModule.renderVisitList();
        }
        if (State.currentTab === 'tab-an-master') AnMasterModule.render();
        if (State.currentTab === 'tab-appointments') AppointmentModule.render();
        if (State.currentTab === 'tab-drugs') DrugModule.render();
        if (State.currentTab === 'tab-procedures') ProcedureModule.render();
        if (State.currentTab === 'tab-labs') LabModule.render();
        if (State.currentTab === 'tab-reports') ReportModule.render();
        if (State.currentTab === 'tab-billing') BillingModule.render();
        if (State.currentTab === 'tab-doctors') DoctorModule.render();

        const tableNamesTh = {
          'opd_patients': 'ข้อมูลผู้ป่วย',
          'opd_visits': 'การเปิด AN / ตรวจรักษา',
          'opd_drugs': 'คลังยา',
          'opd_appointments': 'การนัดหมาย',
          'opd_stock_transactions': 'การเคลื่อนไหวสต็อก'
        };
        const thName = tableNamesTh[table] || table;
        this.showSyncToast(`⚡ อัปเดต ${thName} จากอุปกรณ์อื่นแล้ว`);
      },

      showSyncToast(msg) {
        let toast = document.getElementById('cloud-sync-toast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'cloud-sync-toast';
          toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#10b981;padding:12px 20px;border-radius:12px;font-size:0.86rem;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;gap:10px;transition:opacity 0.3s;pointer-events:none;opacity:0;border:1.5px solid #10b981;';
          document.body.appendChild(toast);
        }
        toast.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%;box-shadow:0 0 8px #10b981;"></span> ${msg}`;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
          toast.style.opacity = '0';
        }, 2800);
      },

      async syncKeyToCloud(storageKey, dataArray) {
        if (!this.isReady() || !Array.isArray(dataArray)) return;
        const conf = this.TABLE_MAP[storageKey];
        if (!conf) return;

        try {
          const batchSize = 100;
          for (let i = 0; i < dataArray.length; i += batchSize) {
            const batch = dataArray.slice(i, i + batchSize);
            const serialized = batch.map(item => this.serializeForCloud(conf.table, item));
            const { error } = await this.client.from(conf.table).upsert(serialized);
            if (error) console.error(`Batch sync error on ${conf.table}:`, error);
          }
          const now = new Date();
          this.lastSyncTime = now;
          localStorage.setItem('opd_last_cloud_sync_time', now.toISOString());
        } catch (e) {
          console.error(`Exception during full key sync on ${conf.table}:`, e);
        }
      },

      async pushAllToCloud() {
        if (!this.isReady()) {
          alert('กรุณาเชื่อมต่อ Supabase Cloud ให้สำเร็จก่อนทำการซิงค์ข้อมูล');
          return;
        }

        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];
        const visits = DB.get(STORAGE_KEYS.VISITS) || [];
        const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];

        if (!confirm('⚡ ยืนยันการซิงค์ข้อมูลทั้งหมดในเครื่องขึ้น Cloud หรือไม่?\n\n- ผู้ป่วย: ' + patients.length.toLocaleString() + ' ราย\n- การตรวจ/AN: ' + visits.length.toLocaleString() + ' รายการ\n- คลังยา: ' + drugs.length.toLocaleString() + ' รายการ\n\nข้อมูลทั้งหมดจะถูกซิงค์ขึ้น Supabase Cloud ทันที')) {
          return;
        }

        const btn = document.getElementById('btn-seed-cloud');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i data-lucide="loader" class="spin"></i> กำลังซิงค์ข้อมูลทั้งหมดขึ้น Cloud...';
          lucide.createIcons();
        }

        try {
          const keysToSync = [
            STORAGE_KEYS.PATIENTS,
            STORAGE_KEYS.DRUGS,
            STORAGE_KEYS.PROCEDURES,
            STORAGE_KEYS.LABS,
            STORAGE_KEYS.LAB_SETS,
            STORAGE_KEYS.DRUG_GROUPS,
            STORAGE_KEYS.PE_TEMPLATES,
            STORAGE_KEYS.DOCTORS,
            STORAGE_KEYS.APPOINTMENTS,
            STORAGE_KEYS.VISITS,
            STORAGE_KEYS.STOCK_TRANSACTIONS,
            STORAGE_KEYS.DRUG_PRICE_HISTORY
          ];

          for (const sKey of keysToSync) {
            const conf = this.TABLE_MAP[sKey];
            if (!conf) continue;
            const data = DB.get(sKey) || [];
            if (data.length > 0) {
              const serialized = data.map(item => this.serializeForCloud(conf.table, item));
              const batchSize = 100;
              for (let i = 0; i < serialized.length; i += batchSize) {
                const batch = serialized.slice(i, i + batchSize);
                const { error } = await this.client.from(conf.table).upsert(batch);
                if (error) throw error;
              }
            }
          }

          // Sync system configs & user passwords to Cloud
          try {
            if (typeof AuthModule !== 'undefined' && AuthModule.getAllPasswords) {
              const passwords = AuthModule.getAllPasswords();
              await this.client.from('opd_system_configs').upsert({
                key: 'user_passwords',
                value: passwords,
                updated_at: new Date().toISOString()
              });
            }
          } catch(e) {
            console.warn('Config sync warning:', e);
          }

          const now = new Date();
          this.lastSyncTime = now;
          localStorage.setItem('opd_last_cloud_sync_time', now.toISOString());
          this.renderCloudInfoCard();
          this.updateStatusBadge('connected', '🟢 Cloud Synced');

          this.showSyncToast('✅ ซิงค์ข้อมูลทั้งหมดขึ้น Cloud เรียบร้อยแล้ว');
          alert('🎉 ซิงค์ข้อมูลทั้งหมดขึ้น Supabase Cloud สำเร็จเรียบร้อยแล้ว!\n(อัปเดตล่าสุด: ' + now.toLocaleString('th-TH') + ')\nทุกอุปกรณ์และเครื่องอื่นๆ จะได้รับข้อมูลที่ตรงกันทันที ⚡');
        } catch (err) {
          console.error('Error during pushAllToCloud:', err);
          alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล:\n' + (err.message || err));
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="upload-cloud"></i> ⚡ ซิงค์ข้อมูลทั้งหมดขึ้น Cloud (Push to Cloud)';
            lucide.createIcons();
          }
        }
      },

      initialSeedToCloud() {
        return this.pushAllToCloud();
      },

      async pullLatestFromCloud(showNotification = false) {
        if (!this.isReady()) return;

        try {
          for (const [sKey, conf] of Object.entries(this.TABLE_MAP)) {
            const { data, error } = await this.client.from(conf.table).select('*').limit(3000);
            if (!error && Array.isArray(data)) {
              if (conf.table === 'opd_drugs') {
                const isOutdated = data.length < 196 || data.some(d => d.drug_id === 'D1' || d.drug_id === 'D5');
                if (isOutdated) {
                  console.warn(`[CloudSync] Cloud opd_drugs has outdated/legacy data (${data.length} items). Auto-migrating Cloud to Master (196 items)...`);
                  try {
                    await this.client.from('opd_drugs').delete().in('drug_id', ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11']);
                  } catch(e) {}
                  await this.syncKeyToCloud(sKey, REAL_DRUGS_DB);
                  continue;
                }
              }
              if (data.length > 0) {
                let deserialized = data.map(row => this.deserializeFromCloud(conf.table, row));
                if (conf.table === 'opd_doctors') {
                  deserialized = deserialized.filter(d => d && d.doctor_id !== 'DOC3' && !(d.first_name && d.first_name.includes('กาญจนา')));
                }
                DB.set(sKey, deserialized, true);
              }
            }
          }
          const now = new Date();
          this.lastSyncTime = now;
          localStorage.setItem('opd_last_cloud_sync_time', now.toISOString());
          this.renderCloudInfoCard();
          App.renderAll();
          if (showNotification) {
            this.showSyncToast('📥 ดึงข้อมูลล่าสุดจาก Cloud เรียบร้อยแล้ว');
            alert('📥 ดึงข้อมูลล่าสุดจาก Supabase Cloud ลงเครื่องเรียบร้อยแล้ว!\n(อัปเดตล่าสุด: ' + now.toLocaleString('th-TH') + ')');
          }
        } catch (err) {
          console.error('Error pulling latest from cloud:', err);
          if (showNotification) {
            alert('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Cloud: ' + err.message);
          }
        }
      },

      toggleSqlHelper() {
        const box = document.getElementById('sql-helper-box');
        if (!box) return;
        const isHidden = box.style.display === 'none';
        box.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          const pre = document.getElementById('sql-schema-pre');
          if (pre) pre.textContent = this.sqlSchema;
        }
        lucide.createIcons();
      },

      copySqlSchema() {
        navigator.clipboard.writeText(this.sqlSchema).then(() => {
          alert('📋 คัดลอกคำสั่ง SQL ทั้งหมดเรียบร้อยแล้ว! นำไปวางในหน้า SQL Editor บน Supabase แล้วกด RUN ได้ทันที');
        }).catch(() => {
          alert('กรุณาคัดลอกข้อความในกรอบด้วยตนเอง (Ctrl + C)');
        });
      }
    };