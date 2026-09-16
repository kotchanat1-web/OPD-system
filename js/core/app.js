/* ==========================================================================
   OPD System - Application Bootstrap & Navigation
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const App = {
      async init() {
        await DB.init();
        LoginModule.init();
        AuthModule.init();
        CloudSyncModule.init();
        this.setupNavigation();
        this.setupRealtimeClock();
        this.renderAll();
        PeTemplateModule.init();
        lucide.createIcons();
      },
      toggleSidebar() {
        if (window.innerWidth <= 768) {
          document.body.classList.toggle('sidebar-open');
        } else {
          document.body.classList.toggle('sidebar-collapsed');
        }
        lucide.createIcons();
      },
      openSidebar() {
        if (window.innerWidth <= 768) {
          document.body.classList.add('sidebar-open');
        } else {
          document.body.classList.remove('sidebar-collapsed');
        }
      },
      closeSidebar() {
        document.body.classList.remove('sidebar-open');
      },
      setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
          item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            this.switchTab(tabId);
            this.closeSidebar();
          });
        });
        window.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            QuickSearchModal.open();
          }
        });
      },
      switchTab(tabId) {
        this.closeSidebar();
        State.currentTab = tabId;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.nav-item[data-tab="' + tabId + '"]')?.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(tabId)?.classList.add('active');

        if (tabId === 'tab-dashboard') DashboardModule.render();
        if (tabId === 'tab-patients') PatientModule.render();
        if (tabId === 'tab-opd') VisitModule.render();
        if (tabId === 'tab-an-master') AnMasterModule.render();
        if (tabId === 'tab-appointments') AppointmentModule.render();
        if (tabId === 'tab-drugs') { DrugModule.render(); DrugGroupModule.render(); }
        if (tabId === 'tab-labs') { LabModule.render(); LabSetModule.render(); }
        if (tabId === 'tab-procedures') ProcedureModule.render();
        if (tabId === 'tab-doctors') DoctorModule.render();
        if (tabId === 'tab-billing') BillingModule.render();
        if (tabId === 'tab-labels') LabelModule.render();
        if (tabId === 'tab-reports') ReportModule.render();
        if (tabId === 'tab-df-reports') DFModule.render();
        if (tabId === 'tab-certificates') CertificateModule.render();

        lucide.createIcons();
      },
      setupRealtimeClock() {
        const updateClock = () => {
          const now = new Date();
          const clockEl = document.getElementById('live-clock');
          if (clockEl) {
            clockEl.innerHTML = '<i data-lucide="calendar"></i> <span>' + Utils.formatDateThai(now.toISOString()) + '</span>';
            lucide.createIcons();
          }
        };
        updateClock();
        setInterval(updateClock, 30000);
      },
      setActivePatient(patient) {
        State.selectedPatient = patient;
        document.getElementById('sp-name').textContent = (patient.title || '') + patient.first_name + ' ' + patient.last_name;
        document.getElementById('sp-hn').textContent = 'HN: ' + patient.hn;
        document.getElementById('sp-rights').textContent = 'สิทธิ: ' + (patient.rights || 'UC');
      },
      renderAll() {
        DashboardModule.render();
        PatientModule.render();
        VisitModule.render();
        if (typeof AnMasterModule !== 'undefined') AnMasterModule.render();
        AppointmentModule.render();
        DrugModule.render();
        DrugGroupModule.render();
        LabModule.render();
        if (typeof LabSetModule !== 'undefined') LabSetModule.render();
        ProcedureModule.render();
        BillingModule.render();
        LabelModule.render();
        ReportModule.render();
        if (typeof DFModule !== 'undefined') DFModule.render();
        CertificateModule.render();
      }
    };

const DashboardModule = {
      render() {
        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const visits = DB.get(STORAGE_KEYS.VISITS);
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const apps = DB.get(STORAGE_KEYS.APPOINTMENTS);

        document.getElementById('stat-total-patients').textContent = patients.length;
        const patBadge = document.getElementById('badge-patient-count');
        if (patBadge) patBadge.textContent = patients.length;

        const now = new Date();
        const localTodayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayStr = now.toISOString().slice(0, 10);
        const thaiTodayShort = Utils.formatDateShort(localTodayStr);

        // Filter ONLY visits occurred TODAY
        const todayVisits = visits.filter(v => v.visit_date && (v.visit_date.startsWith(localTodayStr) || v.visit_date.startsWith(todayStr)));
        document.getElementById('stat-today-visits').textContent = todayVisits.length;
        
        // OPEN Queue count for today
        const todayOpenQueue = todayVisits.filter(v => v.status === 'OPEN').length;
        document.getElementById('badge-queue-count').textContent = todayOpenQueue;

        // AN Master badge count
        const anBadge = document.getElementById('badge-an-count');
        if (anBadge) anBadge.textContent = visits.length;

        // Filter ONLY appointments scheduled for TODAY
        const todayApps = apps.filter(a => (a.date === localTodayStr || a.date === todayStr) && a.status !== 'CANCELLED');
        document.getElementById('stat-today-appointments').textContent = todayApps.length;
        document.getElementById('badge-appoint-count').textContent = todayApps.length;

        // Calculate Revenue ONLY from TODAY's PAID visits
        const todayRevenue = todayVisits.filter(v => v.status === 'CLOSED' || v.billing?.paid).reduce((sum, v) => sum + (v.billing?.total || 0), 0);
        document.getElementById('stat-today-revenue').textContent = '฿' + todayRevenue.toLocaleString();

        const lowStockDrugs = drugs.filter(d => (d.stock || 0) <= (d.min_stock || 10));
        document.getElementById('badge-lowstock-count').textContent = lowStockDrugs.length;

        const visitsBody = document.querySelector('#dashboard-visits-table tbody');
        if (visitsBody) {
          const displayVisits = (todayVisits.length > 0 ? todayVisits : visits).slice(-5).reverse();
          if (displayVisits.length === 0) {
            visitsBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--slate-400); padding: 16px;">ไม่มีรายการ Visit สำหรับวันนี้</td></tr>';
          } else {
            visitsBody.innerHTML = displayVisits.map(v => 
              '<tr><td><strong>' + v.an + '</strong></td><td>' + v.hn + '</td><td>' + v.patient_name + '</td>' +
              '<td>' + (v.chief_complaint?.slice(0, 25) || '-') + '</td>' +
              '<td><span class="badge ' + (v.status === 'CLOSED' ? 'badge-success' : 'badge-warning') + '">' + (v.status === 'CLOSED' ? 'ตรวจเสร็จ' : 'รอตรวจ') + '</span></td>' +
              '<td><button class="btn btn-secondary btn-sm" onclick="VisitModule.selectVisitForChart(\'' + v.visit_id + '\')"><i data-lucide="edit-3"></i> เปิดดู</button></td></tr>'
            ).join('');
          }
        }

        const appBody = document.querySelector('#dashboard-appointments-table tbody');
        if (appBody) {
          if (todayApps.length === 0) {
            appBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--slate-400); padding: 18px;"><i data-lucide="calendar-check" style="width: 28px; height: 28px; margin-bottom: 4px; opacity: 0.5;"></i><div>ไม่มีผู้ป่วยนัดหมายสำหรับวันนี้ (' + thaiTodayShort + ')</div></td></tr>';
          } else {
            appBody.innerHTML = todayApps.map(a => 
              '<tr><td><strong>' + a.hn + '</strong></td>' +
              '<td>' + a.patient_name + '</td>' +
              '<td><strong style="color: var(--primary-700);">' + (a.time || '09:00') + ' น.</strong></td>' +
              '<td>' + (a.reason || '-') + '</td>' +
              '<td><span class="badge badge-blue">รอนัดวันนี้</span></td></tr>'
            ).join('');
          }
        }
        lucide.createIcons();
      }
    };

const DoctorModule = {
      render() {
        this.populateDropdowns();
        const allStaff = (DB.get(STORAGE_KEYS.DOCTORS) || []).filter(d => d && d.doctor_id !== 'DOC3' && !(d.first_name && d.first_name.includes('กาญจนา')));

        // แยกหมวดหมู่: 1. แพทย์ผู้ตรวจรักษา (Doctor) | 2. บุคลากรวิชาชีพอื่น สำหรับจัดสรร DF (Staff for DF)
        const doctors = allStaff.filter(d => (d.title && d.title.includes('แพทย์')) || d.doctor_id === 'DOC1' || (d.license_no && !d.license_no.startsWith('พ.') && d.license_no !== '-'));
        const dfStaff = allStaff.filter(d => !doctors.some(x => x.doctor_id === d.doctor_id));

        const tbodyDocs = document.querySelector('#doctor-table-doctors-only tbody');
        const tbodyDf = document.querySelector('#doctor-table-staff-df tbody');

        const renderRow = (d, isDoctor = false) => {
          let licDisplay = '-';
          if (d.license_no && d.license_no.trim() !== '' && d.license_no.trim() !== '-') {
            const rawLic = d.license_no.trim();
            if (rawLic.startsWith('ว.') || rawLic.startsWith('พ.') || rawLic.startsWith('ภ.') || rawLic.startsWith('ท.')) {
              licDisplay = rawLic;
            } else if (isDoctor) {
              licDisplay = 'ว. ' + rawLic;
            } else if ((d.title || '').includes('พว') || (d.specialty || '').includes('พยาบาล')) {
              licDisplay = 'พ. ' + rawLic;
            } else {
              licDisplay = rawLic;
            }
          }

          let badgeClass = isDoctor ? 'badge-primary' : 'badge-emerald';
          const titleOrSpec = ((d.title || '') + ' ' + (d.specialty || '')).toLowerCase();
          if (titleOrSpec.includes('ผช') || titleOrSpec.includes('ผู้ช่วย')) badgeClass = 'badge-warning';
          else if (titleOrSpec.includes('ภก') || titleOrSpec.includes('ภญ') || titleOrSpec.includes('เภสัช')) badgeClass = 'badge-purple';
          else if (titleOrSpec.includes('จนท') || titleOrSpec.includes('เจ้าหน้าที่')) badgeClass = 'badge-gray';

          const actionBtns = isDoctor
            ? `<button class="btn btn-outline btn-sm" onclick="DoctorModule.openEditModal('${d.doctor_id}')"><i data-lucide="edit-2"></i> แก้ไข</button>`
            : `<div style="display: flex; gap: 4px;">
                <button class="btn btn-outline btn-sm" onclick="DoctorModule.openEditModal('${d.doctor_id}')"><i data-lucide="edit-2"></i> แก้ไข</button>
                <button class="btn btn-danger btn-sm" onclick="DoctorModule.deleteDoctor('${d.doctor_id}')" title="ลบรายชื่อ"><i data-lucide="trash-2"></i> ลบ</button>
               </div>`;

          return '<tr>' +
            '<td><span class="badge badge-gray">' + d.doctor_id + '</span></td>' +
            '<td><strong>' + (d.title || '') + ' ' + d.first_name + ' ' + d.last_name + '</strong></td>' +
            '<td><strong style="color: #0f766e;">' + licDisplay + '</strong></td>' +
            '<td><span class="badge ' + badgeClass + '">' + (d.specialty || (isDoctor ? 'แพทย์เวชปฏิบัติทั่วไป' : 'บุคลากร')) + '</span></td>' +
            '<td>' + (d.phone || '-') + '</td>' +
            '<td><span class="badge ' + (d.active !== false ? 'badge-success' : 'badge-danger') + '">' + (d.active !== false ? 'ปฏิบัติงาน' : 'ระงับ') + '</span></td>' +
            '<td>' + actionBtns + '</td>' +
          '</tr>';
        };

        if (tbodyDocs) {
          if (doctors.length === 0) {
            tbodyDocs.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--slate-400);">ยังไม่มีข้อมูลแพทย์</td></tr>';
          } else {
            tbodyDocs.innerHTML = doctors.map(d => renderRow(d, true)).join('');
          }
        }

        if (tbodyDf) {
          if (dfStaff.length === 0) {
            tbodyDf.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 18px;">ยังไม่มีรายชื่อบุคลากรอื่นสำหรับลง DF (กดปุ่ม "เพิ่มรายชื่อลง DF" เพื่อเพิ่มพยาบาล/ผู้ช่วย/เจ้าหน้าที่)</td></tr>';
          } else {
            tbodyDf.innerHTML = dfStaff.map(d => renderRow(d, false)).join('');
          }
        }

        lucide.createIcons();
      },
      populateDropdowns() {
        const allStaff = DB.get(STORAGE_KEYS.DOCTORS).filter(d => d.active !== false);
        // รายชื่อเฉพาะแพทย์ (สำหรับห้องตรวจ & ใบรับรองแพทย์)
        const doctorsOnly = allStaff.filter(d => (d.title && d.title.includes('แพทย์')) || d.doctor_id === 'DOC1' || (d.license_no && !d.license_no.startsWith('พ.') && d.license_no !== '-'));
        const docList = doctorsOnly.length > 0 ? doctorsOnly : allStaff;

        const doctorOptionsHtml = docList.map(d => {
          const fullName = (d.title || 'นายแพทย์') + ' ' + d.first_name + ' ' + d.last_name;
          const lic = d.license_no ? ' (' + (d.license_no.startsWith('ว.') ? d.license_no : ('ว. ' + d.license_no)) + ')' : '';
          return '<option value="' + d.doctor_id + '">' + fullName + lic + '</option>';
        }).join('');

        // 2. Chart Header Doctor Select
        const chartSelect = document.getElementById('v-chart-doctor-select');
        if (chartSelect) {
          chartSelect.innerHTML = doctorOptionsHtml;
          if (State.selectedVisit?.doctor_id) chartSelect.value = State.selectedVisit.doctor_id;
        }

        // 3. Certificates Doctor Select
        const certSelect = document.getElementById('cert-doctor-select');
        if (certSelect) {
          certSelect.innerHTML = doctorOptionsHtml;
          this.updateCertDoctorFields();
        }

        // 4. Performer Select in Visit Chart (all staff for DF)
        if (typeof VisitModule !== 'undefined' && VisitModule.renderStaffPerformerDropdown) {
          VisitModule.renderStaffPerformerDropdown();
        }

        // 5. Staff Filter in DF Module (all staff for DF)
        if (typeof DFModule !== 'undefined' && DFModule.populateStaffFilter) {
          DFModule.populateStaffFilter();
        }
      },
      onStaffTypeChange(type) {
        const titleEl = document.getElementById('doc-title');
        const specEl = document.getElementById('doc-spec');
        const licEl = document.getElementById('doc-license');
        if (!titleEl || !specEl) return;

        if (type === 'NURSE') {
          titleEl.value = 'พว.';
          specEl.value = 'พยาบาลวิชาชีพปฏิบัติการ';
          if (licEl) licEl.placeholder = 'เช่น พ. 114589';
        } else if (type === 'AIDE') {
          titleEl.value = 'ผช.';
          specEl.value = 'ผู้ช่วยพยาบาล';
          if (licEl) licEl.placeholder = '- (ถ้ามี)';
        } else if (type === 'PHARMACIST') {
          titleEl.value = 'ภก.';
          specEl.value = 'เภสัชกรคลินิก';
          if (licEl) licEl.placeholder = 'เช่น ภ. 23561';
        } else if (type === 'STAFF') {
          titleEl.value = 'จนท.';
          specEl.value = 'เจ้าหน้าที่เวชระเบียน / คลินิก';
          if (licEl) licEl.placeholder = '-';
        } else {
          titleEl.value = 'นายแพทย์';
          specEl.value = 'แพทย์เวชปฏิบัติทั่วไป';
          if (licEl) licEl.placeholder = 'เช่น ว. 69870';
        }
      },
      updateCertDoctorFields() {
        const certSelect = document.getElementById('cert-doctor-select');
        if (!certSelect) return;
        const docId = certSelect.value;
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const realDoctor = docs.find(x => x.doctor_id === docId) || docs.find(x => (x.title && x.title.includes('แพทย์')) || x.doctor_id === 'DOC1') || docs[0];
        if (realDoctor) {
          const fullName = (realDoctor.title || 'นายแพทย์') + ' ' + realDoctor.first_name + ' ' + realDoctor.last_name;
          document.getElementById('cert-doctor-name').value = fullName;
          document.getElementById('cert-doctor-license').value = realDoctor.license_no || '69870';
        }
      },
      openNewModal() {
        document.getElementById('form-doctor').reset();
        document.getElementById('doc-id').value = '';
        const roleType = document.getElementById('doc-role-type');
        if (roleType) roleType.value = 'NURSE';
        this.onStaffTypeChange('NURSE');
        document.getElementById('modal-doc-title').innerHTML = '<i data-lucide="user-plus"></i> เพิ่มรายชื่อบุคลากร (สำหรับจัดสรร DF)';
        document.getElementById('modal-doctor-master').classList.add('active');
        lucide.createIcons();
      },
      openEditModal(docId) {
        const d = DB.get(STORAGE_KEYS.DOCTORS).find(x => x.doctor_id === docId);
        if (!d) return;
        document.getElementById('doc-id').value = d.doctor_id;
        
        const roleType = document.getElementById('doc-role-type');
        if (roleType) {
          if ((d.title || '').includes('พว') || (d.title || '').includes('พยาบาล') || (d.specialty || '').includes('พยาบาล')) {
            roleType.value = 'NURSE';
          } else if ((d.title || '').includes('ผช') || (d.specialty || '').includes('ผู้ช่วย')) {
            roleType.value = 'AIDE';
          } else if ((d.title || '').includes('ภก') || (d.title || '').includes('ภญ') || (d.specialty || '').includes('เภสัช')) {
            roleType.value = 'PHARMACIST';
          } else if ((d.title || '').includes('จนท') || (d.specialty || '').includes('เจ้าหน้าที่')) {
            roleType.value = 'STAFF';
          } else {
            roleType.value = 'DOCTOR';
          }
        }

        document.getElementById('doc-title').value = d.title || 'พว.';
        document.getElementById('doc-fname').value = d.first_name || '';
        document.getElementById('doc-lname').value = d.last_name || '';
        document.getElementById('doc-license').value = d.license_no || '';
        document.getElementById('doc-spec').value = d.specialty || 'ผู้ช่วยพยาบาล';
        document.getElementById('doc-phone').value = d.phone || '';
        document.getElementById('doc-active').value = String(d.active !== false);
        document.getElementById('modal-doc-title').innerHTML = '<i data-lucide="edit-2"></i> แก้ไขข้อมูลบุคลากร';
        document.getElementById('modal-doctor-master').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-doctor-master').classList.remove('active'); },
      saveDoctor() {
        const fname = document.getElementById('doc-fname').value.trim();
        const lname = document.getElementById('doc-lname').value.trim();
        const lic = document.getElementById('doc-license').value.trim();
        if (!fname || !lname) { alert('กรุณาระบุชื่อและนามสกุล'); return; }

        const id = document.getElementById('doc-id').value;
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const data = {
          doctor_id: id || ('DOC_' + Date.now()),
          title: document.getElementById('doc-title').value,
          first_name: fname,
          last_name: lname,
          license_no: lic,
          specialty: document.getElementById('doc-spec').value.trim() || 'ผู้ช่วยพยาบาล',
          phone: document.getElementById('doc-phone').value.trim(),
          active: document.getElementById('doc-active').value === 'true'
        };

        if (id) {
          const idx = docs.findIndex(x => x.doctor_id === id);
          if (idx !== -1) docs[idx] = data;
        } else {
          docs.push(data);
        }
        DB.upsertItem(STORAGE_KEYS.DOCTORS, data, 'doctor_id');
        this.closeModal();
        this.render();
        alert('บันทึกข้อมูลบุคลากร ' + data.title + ' ' + data.first_name + ' ' + data.last_name + ' เรียบร้อย');
      },
      async deleteDoctor(docId) {
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const target = docs.find(x => x.doctor_id === docId);
        const name = target ? ((target.title || '') + ' ' + target.first_name + ' ' + target.last_name) : docId;
        if (!confirm(`ต้องการลบรายชื่อ "${name}" ออกจากระบบบุคลากรสำหรับลง DF หรือไม่?`)) return;
        
        let newDocs = docs.filter(x => x.doctor_id !== docId);
        if (newDocs.length === 0) { alert('ต้องมีแพทย์ในระบบอย่างน้อย 1 ท่าน'); return; }
        
        // 1. Delete from local storage and trigger DB.deleteItem
        DB.deleteItem(STORAGE_KEYS.DOCTORS, docId, 'doctor_id');

        // 2. Explicitly delete permanently from Supabase Cloud opd_doctors table
        if (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady()) {
          try {
            await CloudSyncModule.client.from('opd_doctors').delete().eq('doctor_id', docId);
            CloudSyncModule.showSyncToast(`🗑️ ลบข้อมูลบุคลากร "${name}" ออกจาก Cloud เรียบร้อยแล้ว`);
          } catch(e) {
            console.error('Error deleting doctor from cloud:', e);
          }
        }
        this.render();
      }
    };

const MigrationModule = {
      restoreDrugsDB() {
        if (typeof AuthModule !== "undefined" && AuthModule.requireAdmin && !AuthModule.requireAdmin("รีโหลดคลังยาตาม Master")) return;
        if (!confirm('⚠️ ต้องการล้างข้อมูลยาเดิมและรีโหลดคลังยาตาม Master ล่าสุด (' + REAL_DRUGS_DB.length + ' รายการ) หรือไม่?')) return;
        ['opd_nakhonsawan_drugs_v1', 'opd_nakhonsawan_drugs_v2', 'opd_nakhonsawan_drugs_v3', 'opd_nakhonsawan_drugs_v4', 'opd_nakhonsawan_drugs_v5', 'opd_nakhonsawan_drugs_v6'].forEach(k => {
          try { localStorage.removeItem(k); } catch(e) {}
          try { if (typeof localforage !== 'undefined') localforage.removeItem(k); } catch(e) {}
        });
        DB.set(STORAGE_KEYS.DRUGS, REAL_DRUGS_DB);
        if (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady()) {
          CloudSyncModule.client.from('opd_drugs').delete().in('drug_id', ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11']).then(() => {
            CloudSyncModule.syncKeyToCloud(STORAGE_KEYS.DRUGS, REAL_DRUGS_DB);
          }).catch(() => {
            CloudSyncModule.syncKeyToCloud(STORAGE_KEYS.DRUGS, REAL_DRUGS_DB);
          });
        }
        alert('🎉 รีโหลดคลังยาตาม Master สำเร็จเรียบร้อย! มีรายการยาทั้งหมด ' + REAL_DRUGS_DB.length + ' รายการ (และซิงค์ขึ้น Cloud)');
        if (typeof DrugModule !== 'undefined') DrugModule.render();
        App.renderAll();
      },
      restoreMainDB() {
        if (!confirm('ต้องการรีโหลดข้อมูลผู้ป่วยเดิมทั้งหมด (' + REAL_PATIENTS_DB.length + ' ราย) หรือไม่? (ประวัติ Visit จะเริ่มต้นใหม่ที่ AN02-01500)')) return;
        // Purge legacy keys
        ['opd_nakhonsawan_visits_v1', 'opd_nakhonsawan_visits_v2', 'opd_nakhonsawan_visits_v3', 'opd_nakhonsawan_visits_v4', 'opd_nakhonsawan_visits_v5', 'opd_nakhonsawan_visits_v6', 'opd_visits_data'].forEach(k => {
          try { localStorage.removeItem(k); } catch(e) {}
        });
        DB.set(STORAGE_KEYS.PATIENTS, REAL_PATIENTS_DB);
        DB.set(STORAGE_KEYS.VISITS, []);
        alert('ซิงค์ข้อมูลสำเร็จ! โหลด ' + REAL_PATIENTS_DB.length + ' ผู้ป่วยเรียบร้อยแล้ว (AN เริ่มที่ AN02-01500)');
        App.renderAll();
      },
      exportDataJSON() {
        const fullBackup = {
          app: "OPD Nakhonsawan Healthcare",
          exported_at: new Date().toISOString(),
          patients: DB.get(STORAGE_KEYS.PATIENTS),
          visits: DB.get(STORAGE_KEYS.VISITS),
          drugs: DB.get(STORAGE_KEYS.DRUGS),
          labs: DB.get(STORAGE_KEYS.LABS),
          procedures: DB.get(STORAGE_KEYS.PROCEDURES),
          drug_groups: DB.get(STORAGE_KEYS.DRUG_GROUPS),
          appointments: DB.get(STORAGE_KEYS.APPOINTMENTS),
          audit_logs: DB.get(STORAGE_KEYS.AUDIT_LOGS)
        };
        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = 'OPD_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      importDataJSON() {
        const fileInput = document.getElementById('import-file-input');
        if (!fileInput.files || fileInput.files.length === 0) { alert('กรุณาเลือกไฟล์ JSON'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data.patients) DB.set(STORAGE_KEYS.PATIENTS, data.patients);
            if (data.drugs) DB.set(STORAGE_KEYS.DRUGS, data.drugs);
            if (data.visits) DB.set(STORAGE_KEYS.VISITS, data.visits);
            if (data.labs) DB.set(STORAGE_KEYS.LABS, data.labs);
            if (data.procedures) DB.set(STORAGE_KEYS.PROCEDURES, data.procedures);
            if (data.drug_groups) DB.set(STORAGE_KEYS.DRUG_GROUPS, data.drug_groups);
            if (data.appointments) DB.set(STORAGE_KEYS.APPOINTMENTS, data.appointments);
            alert('นำเข้าข้อมูลสำเร็จ!');
            App.renderAll();
          } catch (err) { alert('ไฟล์ไม่ถูกต้อง'); }
        };
        reader.readAsText(fileInput.files[0]);
      }
    };

document.addEventListener('DOMContentLoaded', async () => { await App.init(); });
