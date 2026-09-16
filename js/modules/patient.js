/* ==========================================================================
   OPD System - Patient Registry & Medical Records
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const PatientModule = {
      render() { this.handleSearch(); },
      handleSearch() {
        const rawInput = (document.getElementById('patient-search-input')?.value || '').trim();
        const query = rawInput.toLowerCase();
        const digitsQuery = rawInput.replace(/[^0-9]/g, '');
        const rightsFilter = document.getElementById('patient-rights-filter')?.value || '';
        const patients = DB.get(STORAGE_KEYS.PATIENTS);

        const filtered = patients.filter(p => {
          if (rightsFilter && p.rights !== rightsFilter) return false;
          if (!query) return true;

          // 1. Match HN
          if (p.hn) {
            const pLower = p.hn.toLowerCase();
            if (pLower.includes(query) || (digitsQuery && p.hn.replace(/[^0-9]/g, '').includes(digitsQuery))) return true;
          }

          // 2. Match Name (First name, Last name, Full name)
          const full = ((p.title || '') + (p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase();
          if (full.includes(query)) return true;
          if (p.first_name && p.first_name.toLowerCase().includes(query)) return true;
          if (p.last_name && p.last_name.toLowerCase().includes(query)) return true;

          // 3. Match National ID (CID) - formatted or digits only
          if (p.national_id) {
            if (p.national_id.includes(query)) return true;
            if (digitsQuery && digitsQuery.length >= 2 && p.national_id.replace(/[^0-9]/g, '').includes(digitsQuery)) return true;
          }

          // 4. Match Phone
          if (p.phone) {
            if (p.phone.includes(query)) return true;
            if (digitsQuery && digitsQuery.length >= 3 && p.phone.replace(/[^0-9]/g, '').includes(digitsQuery)) return true;
          }

          // 5. Match Chronic
          if (p.chronic && p.chronic.toLowerCase().includes(query)) return true;

          return false;
        });

        const tbody = document.querySelector('#patient-master-table tbody');
        if (tbody) {
          if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--slate-400); padding: 24px;"><i data-lucide="user-x" style="width: 32px; height: 32px; margin-bottom: 6px; opacity: 0.5;"></i><div>ไม่พบข้อมูลผู้ป่วยที่ตรงกับการค้นหา "' + rawInput + '"</div></td></tr>';
          } else {
            tbody.innerHTML = filtered.map(p => 
              '<tr><td><strong style="color: var(--primary-700);">' + p.hn + '</strong></td>' +
              '<td>' + (p.national_id || '-') + '</td>' +
              '<td><strong>' + (p.title || '') + p.first_name + ' ' + p.last_name + '</strong></td>' +
              '<td>' + (p.sex || '-') + '</td><td>' + (p.phone || '-') + '</td>' +
              '<td><span class="badge badge-primary">' + (p.rights || 'UC') + '</span></td>' +
              '<td>' + (p.chronic ? '<span class="badge badge-gray">' + p.chronic + '</span>' : '-') + '</td>' +
              '<td>' + (p.drug_allergy ? '<span class="badge badge-danger"><i data-lucide="alert-triangle"></i> ' + p.drug_allergy + '</span>' : '-') + '</td>' +
              '<td><div style="display: flex; gap: 4px;"><button class="btn btn-secondary btn-sm" onclick="PatientModule.selectAndOpenVisit(\'' + p.patient_id + '\')"><i data-lucide="stethoscope"></i> ตรวจ</button><button class="btn btn-outline btn-sm" style="color: #0f766e;" onclick="PatientHistoryModule.openHistoryForCurrentPatient(\'' + p.hn + '\')" title="ดูประวัติการตรวจทั้งหมด"><i data-lucide="history"></i> ประวัติ</button><button class="btn btn-outline btn-sm" onclick="PatientModule.openEditPatientModal(\'' + p.patient_id + '\')"><i data-lucide="edit-2"></i></button></div></td></tr>'
            ).join('');
          }
          lucide.createIcons();
        }
      },
      openNewPatientModal() {
        document.getElementById('modal-patient-title').innerHTML = '<i data-lucide="user-plus"></i> ลงทะเบียนผู้ป่วยใหม่';
        document.getElementById('form-patient').reset();
        document.getElementById('p-id').value = '';
        document.getElementById('p-hn').value = Utils.generateHN(DB.get(STORAGE_KEYS.PATIENTS));
        document.getElementById('modal-patient').classList.add('active');
        lucide.createIcons();
      },
      openEditPatientModal(patientId) {
        const p = DB.get(STORAGE_KEYS.PATIENTS).find(x => x.patient_id === patientId);
        if (!p) return;
        document.getElementById('p-id').value = p.patient_id;
        document.getElementById('p-hn').value = p.hn;
        document.getElementById('p-national-id').value = p.national_id || '';
        document.getElementById('p-rights').value = p.rights || 'UC';
        document.getElementById('p-title').value = p.title || 'นาย';
        document.getElementById('p-firstname').value = p.first_name || '';
        document.getElementById('p-lastname').value = p.last_name || '';
        document.getElementById('p-sex').value = p.sex || 'ชาย';
        document.getElementById('p-dob').value = p.dob || '';
        document.getElementById('p-phone').value = p.phone || '';
        document.getElementById('p-chronic').value = p.chronic || '';
        document.getElementById('p-allergy').value = p.drug_allergy || '';
        document.getElementById('p-address').value = p.address || '';
        document.getElementById('modal-patient').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-patient').classList.remove('active'); },
      savePatient() {
        const id = document.getElementById('p-id').value;
        const firstName = document.getElementById('p-firstname').value.trim();
        const lastName = document.getElementById('p-lastname').value.trim();
        if (!firstName || !lastName) { alert('กรุณากรอกชื่อและนามสกุล'); return; }

        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const data = {
          patient_id: id || ('P_' + Date.now()),
          hn: document.getElementById('p-hn').value,
          national_id: document.getElementById('p-national-id').value.trim(),
          rights: document.getElementById('p-rights').value,
          title: document.getElementById('p-title').value,
          first_name: firstName,
          last_name: lastName,
          sex: document.getElementById('p-sex').value,
          dob: document.getElementById('p-dob').value.trim(),
          phone: document.getElementById('p-phone').value.trim(),
          chronic: document.getElementById('p-chronic').value.trim(),
          drug_allergy: document.getElementById('p-allergy').value.trim(),
          address: document.getElementById('p-address').value.trim()
        };

        if (id) {
          const idx = patients.findIndex(x => x.patient_id === id);
          if (idx !== -1) patients[idx] = data;
        } else { patients.push(data); }
        DB.upsertItem(STORAGE_KEYS.PATIENTS, data);
        this.closeModal();
        this.render();
        App.setActivePatient(data);
        DashboardModule.render();
        alert('บันทึกข้อมูล ' + data.first_name + ' ' + data.last_name + ' เรียบร้อย');
      },
      selectAndOpenVisit(patientId) {
        const p = DB.get(STORAGE_KEYS.PATIENTS).find(x => x.patient_id === patientId);
        if (!p) return;
        App.setActivePatient(p);
        App.switchTab('tab-opd');
        VisitModule.openNewVisitModal(p.patient_id);
      }
    };

const PatientHistoryModule = {
      currentPatient: null,
      currentVisits: [],

      openHistoryForCurrentPatient(hn = null) {
        let patientHN = hn;
        if (!patientHN && State.selectedVisit) patientHN = State.selectedVisit.hn;
        if (!patientHN && State.activePatient) patientHN = State.activePatient.hn;

        if (!patientHN) {
          alert('กรุณาเลือกผู้ป่วยก่อนเรียกดูประวัติ');
          return;
        }

        const patient = DB.get(STORAGE_KEYS.PATIENTS).find(p => p.hn === patientHN);
        if (!patient) { alert('ไม่พบข้อมูลผู้ป่วย'); return; }

        this.currentPatient = patient;
        const allVisits = DB.get(STORAGE_KEYS.VISITS).filter(v => v.hn === patientHN);
        // Sort visits newest first
        this.currentVisits = allVisits.slice().sort((a, b) => new Date(b.visit_date || 0) - new Date(a.visit_date || 0));

        // Count lab attachments
        let totalLabFiles = 0;
        this.currentVisits.forEach(v => {
          if (v.lab_attachments) totalLabFiles += v.lab_attachments.length;
        });

        document.getElementById('ph-modal-title').innerHTML = '<i data-lucide="history"></i> ประวัติการตรวจ: ' + (patient.title || '') + patient.first_name + ' ' + patient.last_name;
        document.getElementById('ph-modal-subtitle').innerHTML = 'HN: <strong>' + patient.hn + '</strong> | สิทธิ: ' + (patient.rights || 'UC') + ' | แพ้ยา: <span style="color:#fecdd3;font-weight:700;">' + (patient.drug_allergy || 'ไม่มี') + '</span>';
        document.getElementById('ph-count-visits').textContent = this.currentVisits.length;
        document.getElementById('ph-count-lab-files').textContent = totalLabFiles;

        this.switchTab('timeline');
        document.getElementById('modal-patient-history').classList.add('active');
        lucide.createIcons();
      },
      closeModal() {
        document.getElementById('modal-patient-history').classList.remove('active');
      },
      switchTab(tabName) {
        ['timeline', 'vitals', 'labs', 'drugs'].forEach(t => {
          const btn = document.getElementById('tab-btn-ph-' + t);
          const pane = document.getElementById('ph-tab-pane-' + t);
          if (btn) btn.className = (t === tabName) ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
          if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
        });

        if (tabName === 'timeline') this.renderTimeline();
        else if (tabName === 'vitals') this.renderVitalsTable();
        else if (tabName === 'labs') this.renderLabGallery();
        else if (tabName === 'drugs') this.renderDrugsHistory();
        lucide.createIcons();
      },
      renderTimeline() {
        const container = document.getElementById('ph-timeline-container');
        if (!container) return;

        if (this.currentVisits.length === 0) {
          container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px;"><i data-lucide="folder-open" style="width: 40px; height: 40px; margin-bottom: 8px;"></i><p>ยังไม่มีประวัติการตรวจในระบบ</p></div>';
          return;
        }

        container.innerHTML = this.currentVisits.map(v => {
          const isCurrent = State.selectedVisit && State.selectedVisit.visit_id === v.visit_id;
          const drugsList = (v.prescriptions || []).map(p => '<span class="badge badge-primary" style="font-size: 0.75rem; margin-right: 4px; margin-bottom: 4px;">' + p.generic_name + ' x ' + p.qty + '</span>').join('');
          const labsList = (v.labs || []).map(l => '<span class="badge badge-blue" style="font-size: 0.75rem; margin-right: 4px;">' + l.name + (l.result ? ' (ผล: ' + l.result + ')' : '') + '</span>').join('');
          const filesList = (v.lab_attachments || []).map(f => '<button class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 2px 6px;" onclick="PatientHistoryModule.previewHistoryFile(\'' + v.visit_id + '\', \'' + f.id + '\')"><i data-lucide="paperclip"></i> ' + f.name + '</button>').join('');

          return '<div class="history-timeline-item">' +
            '<div style="background: white; border: 1.5px solid ' + (isCurrent ? '#0d9488' : '#e2e8f0') + '; border-radius: 10px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">' +
              '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                  '<strong style="font-size: 0.95rem; color: #0f766e;">🗓️ ' + Utils.formatDateShort(v.visit_date) + ' (' + (v.visit_date ? v.visit_date.slice(11, 16) : '') + ')</strong>' +
                  '<span class="badge badge-gray">AN: ' + v.an + '</span>' +
                  (isCurrent ? '<span class="badge badge-success">📍 Visit ที่กำลังตรวจอยู่นี้</span>' : '') +
                '</div>' +
                '<div style="display: flex; gap: 6px;">' +
                  (!isCurrent && (v.prescriptions || []).length > 0 ? '<button class="btn btn-emerald btn-sm" onclick="PatientHistoryModule.applyRemedFromHistory(\'' + v.visit_id + '\')"><i data-lucide="rotate-ccw"></i> ⚡ Re-med ยาตาม Visit นี้</button>' : '') +
                '</div>' +
              '</div>' +

              '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; margin-bottom: 8px;">' +
                '<div><strong>BP:</strong> ' + (v.vitals?.bp || '-') + ' mmHg</div>' +
                '<div><strong>PR:</strong> ' + (v.vitals?.pr || '-') + ' /min</div>' +
                '<div><strong>BT:</strong> ' + (v.vitals?.temp || '-') + ' °C</div>' +
                '<div><strong>BW/HT:</strong> ' + (v.vitals?.weight ? (v.vitals.weight + 'kg') : '-') + ' / ' + (v.vitals?.height ? (v.vitals.height + 'cm') : '-') + '</div>' +
                '<div><strong>BMI:</strong> <span style="font-weight: 700; color: #0d9488;">' + (v.vitals?.bmi || '-') + '</span></div>' +
              '</div>' +

              '<div style="font-size: 0.84rem; color: #334155; margin-bottom: 6px;"><strong>อาการสำคัญ (CC):</strong> ' + (v.chief_complaint || '-') + '</div>' +
              (v.present_illness ? '<div style="font-size: 0.82rem; color: #475569; margin-bottom: 6px;"><strong>ประวัติ (PI):</strong> ' + v.present_illness + '</div>' : '') +
              (v.physical_exam ? '<div style="font-size: 0.82rem; color: #475569; margin-bottom: 6px;"><strong>ตรวจร่างกาย (PE):</strong> ' + v.physical_exam + '</div>' : '') +
              '<div style="font-size: 0.86rem; color: #0f172a; margin-bottom: 8px;"><strong>การวินิจฉัย (Dx):</strong> <span class="badge badge-success" style="font-size: 0.82rem;">' + (v.assessment || '-') + '</span></div>' +

              (drugsList ? '<div style="margin-top: 8px; font-size: 0.82rem;"><strong>💊 รายการยาที่ได้รับ:</strong><div style="margin-top: 4px; display: flex; flex-wrap: wrap;">' + drugsList + '</div></div>' : '') +
              (labsList ? '<div style="margin-top: 8px; font-size: 0.82rem;"><strong>🧪 แลปที่สั่ง:</strong><div style="margin-top: 4px; display: flex; flex-wrap: wrap;">' + labsList + '</div></div>' : '') +
              (filesList ? '<div style="margin-top: 8px; font-size: 0.82rem;"><strong>📎 ไฟล์ผลแลป/เอกสารแนบ:</strong><div style="margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap;">' + filesList + '</div></div>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      },
      renderVitalsTable() {
        const tbody = document.querySelector('#ph-vitals-table tbody');
        if (!tbody) return;

        if (this.currentVisits.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #94a3b8;">ไม่พบข้อมูลสัญญาณชีพ</td></tr>';
          return;
        }

        tbody.innerHTML = this.currentVisits.map(v => 
          '<tr>' +
            '<td><strong>' + Utils.formatDateShort(v.visit_date) + '</strong></td>' +
            '<td>' + v.an + '</td>' +
            '<td><strong style="color: #0f766e;">' + (v.vitals?.bp || '-') + '</strong></td>' +
            '<td>' + (v.vitals?.pr || '-') + '</td>' +
            '<td>' + (v.vitals?.temp || '-') + '</td>' +
            '<td>' + (v.vitals?.weight || '-') + '</td>' +
            '<td>' + (v.vitals?.height || '-') + '</td>' +
            '<td><strong>' + (v.vitals?.bmi || '-') + '</strong></td>' +
            '<td>' + (v.chief_complaint || '-') + '</td>' +
          '</tr>'
        ).join('');
      },
      renderLabGallery() {
        const gallery = document.getElementById('ph-lab-gallery');
        if (!gallery) return;

        const allFiles = [];
        this.currentVisits.forEach(v => {
          (v.lab_attachments || []).forEach(f => {
            allFiles.push({ ...f, visit_an: v.an, visit_date: v.visit_date, visit_id: v.visit_id });
          });
        });

        if (allFiles.length === 0) {
          gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;"><i data-lucide="flask-conical" style="width: 40px; height: 40px; margin-bottom: 8px;"></i><p>ไม่พบไฟล์ผลแลปหรือเอกสารแนบในประวัติของผู้ป่วยรายนี้</p></div>';
          return;
        }

        gallery.innerHTML = allFiles.map(file => {
          const isImage = file.type && file.type.startsWith('image/');
          const sizeKb = file.size ? (file.size / 1024).toFixed(1) + ' KB' : '';
          return '<div class="lab-attachment-card" style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
            '<div class="lab-thumb-wrap" style="height: 100px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 6px; overflow: hidden; cursor: pointer;" onclick="PatientHistoryModule.previewHistoryFile(\'' + file.visit_id + '\', \'' + file.id + '\')">' +
              (isImage ? '<img id="ph-thumb-' + file.id + '" src="' + (file.data || '') + '" alt="' + (file.name || '') + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">' : '<i data-lucide="file-text" style="width: 36px; height: 36px; color: #dc2626;"></i>') +
            '</div>' +
            '<div style="font-size: 0.78rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + (file.name || '') + '">' + (file.name || 'ไฟล์ผลตรวจ') + '</div>' +
            '<div style="font-size: 0.72rem; color: #0d9488; margin: 2px 0;">Visit: ' + file.visit_an + ' (' + Utils.formatDateShort(file.visit_date) + ')' + (sizeKb ? ' | ' + sizeKb : '') + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm" style="font-size: 0.74rem; width: 100%; margin-top: 4px;" onclick="PatientHistoryModule.previewHistoryFile(\'' + file.visit_id + '\', \'' + file.id + '\')"><i data-lucide="eye"></i> เปิดดูไฟล์</button>' +
          '</div>';
        }).join('');
        lucide.createIcons();

        // Async load missing thumbnail data from LabStorageDB
        allFiles.forEach(async (file) => {
          if (!file.data && typeof LabStorageDB !== 'undefined') {
            const dbFile = await LabStorageDB.getFile(file.id);
            if (dbFile && dbFile.data) {
              file.data = dbFile.data;
              const imgEl = document.getElementById('ph-thumb-' + file.id);
              if (imgEl && imgEl.tagName === 'IMG') imgEl.src = file.data;
            }
          }
        });
      },
      renderDrugsHistory() {
        const tbody = document.querySelector('#ph-drugs-history-table tbody');
        if (!tbody) return;

        const allDrugs = [];
        this.currentVisits.forEach(v => {
          (v.prescriptions || []).forEach(p => {
            allDrugs.push({ ...p, visit_an: v.an, visit_date: v.visit_date, assessment: v.assessment, visit_id: v.visit_id });
          });
        });

        if (allDrugs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">ไม่พบประวัติการสั่งยา</td></tr>';
          return;
        }

        tbody.innerHTML = allDrugs.map(d => 
          '<tr>' +
            '<td><strong>' + Utils.formatDateShort(d.visit_date) + '</strong></td>' +
            '<td>' + d.visit_an + '</td>' +
            '<td><strong style="color: #0f766e;">' + d.generic_name + '</strong></td>' +
            '<td>' + (d.trade_name || '-') + '</td>' +
            '<td>' + (d.sig || '-') + '</td>' +
            '<td>' + d.qty + '</td>' +
            '<td><span class="badge badge-gray">' + (d.assessment || '-') + '</span></td>' +
            '<td><button class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 2px 6px;" onclick="PatientHistoryModule.applySingleDrug(\'' + d.drug_id + '\', \'' + (d.generic_name || '').replace(/'/g, "\\'") + '\', \'' + (d.trade_name || '').replace(/'/g, "\\'") + '\', ' + d.qty + ', \'' + (d.sig || '').replace(/'/g, "\\'") + '\')"><i data-lucide="plus"></i> เอายานี้</button></td>' +
          '</tr>'
        ).join('');
      },
      async previewHistoryFile(visitId, fileId) {
        const v = DB.get(STORAGE_KEYS.VISITS).find(x => x.visit_id === visitId);
        if (!v) return;
        let file = (v.lab_attachments || []).find(f => f.id === fileId);
        if (!file) return;

        if (!file.data && typeof LabStorageDB !== 'undefined') {
          const dbFile = await LabStorageDB.getFile(fileId);
          if (dbFile && dbFile.data) {
            file.data = dbFile.data;
          }
        }
        if (!file.data) {
          alert('ไม่พบข้อมูลเนื้อหาของไฟล์นี้ (อาจถูกลบไปแล้ว)');
          return;
        }

        const isImage = file.type && file.type.startsWith('image/');
        const bodyEl = document.getElementById('lab-preview-body');
        const titleEl = document.getElementById('lab-preview-title');
        const metaEl = document.getElementById('lab-preview-meta');
        const downloadBtn = document.getElementById('lab-preview-download-btn');

        titleEl.innerHTML = '<i data-lucide="file-text"></i> ' + (file.name || 'ไฟล์ผลตรวจ');
        metaEl.textContent = 'Visit: ' + v.an + ' | ขนาด: ' + (file.size ? (file.size / 1024).toFixed(1) + ' KB' : '-') + ' | ชนิด: ' + (file.type || 'เอกสาร');
        downloadBtn.href = file.data;
        downloadBtn.download = file.name || 'lab_result';

        if (isImage) {
          bodyEl.innerHTML = '<img src="' + file.data + '" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 6px;">';
        } else {
          bodyEl.innerHTML = '<iframe src="' + file.data + '" style="width: 100%; height: 70vh; border: none; border-radius: 6px; background: white;"></iframe>';
        }
        document.getElementById('modal-lab-file-preview').classList.add('active');
        lucide.createIcons();
      },
      applyRemedFromHistory(fromVisitId) {
        VisitModule.applyRemedFromVisit(fromVisitId);
        this.closeModal();
      },
      applySingleDrug(drugId, genericName, tradeName, qty, sig) {
        if (!State.selectedVisit) { alert('กรุณาเลือก Visit ที่กำลังตรวจก่อน'); return; }
        if (!State.selectedVisit.prescriptions) State.selectedVisit.prescriptions = [];

        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const d = drugs.find(x => x.drug_id === drugId);
        const price = d ? d.sale_price : 0;
        const itemQty = qty || 10;

        State.selectedVisit.prescriptions.push({
          drug_id: drugId,
          generic_name: genericName,
          trade_name: tradeName,
          qty: itemQty,
          sig: sig || '',
          unit_price: price,
          amount: price * itemQty
        });

        if (d) {
          const stockBefore = d.stock || 0;
          d.stock = Math.max(0, stockBefore - itemQty);
          StockModule.recordStockTx({
            drug_id: d.drug_id,
            generic_name: d.generic_name,
            trade_name: d.trade_name || '',
            visit_id: State.selectedVisit.visit_id,
            type: 'SALE',
            qty: itemQty,
            cost_price: d.purchase_price || 0,
            sale_price: price,
            stock_before: stockBefore,
            stock_after: d.stock,
            reference_no: State.selectedVisit.an || '',
            note: 'สั่งจ่ายยาจากประวัติผู้ป่วย: ' + genericName
          });
        }
        DB.set(STORAGE_KEYS.DRUGS, drugs);

        VisitModule.renderPrescriptionTable();
        DashboardModule.render();
        alert('เพิ่มยา "' + genericName + '" ใน Visit ปัจจุบันเรียบร้อย');
      }
    };

const QuickSearchModal = {
      open() {
        document.getElementById('qs-input').value = '';
        this.handleSearch();
        document.getElementById('modal-quick-search').classList.add('active');
        setTimeout(() => document.getElementById('qs-input').focus(), 100);
        lucide.createIcons();
      },
      close() { document.getElementById('modal-quick-search').classList.remove('active'); },
      handleSearch() {
        const query = (document.getElementById('qs-input')?.value || '').toLowerCase().trim();
        const resultsEl = document.getElementById('qs-results');
        if (!resultsEl) return;
        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        let html = '';

        const matchedPatients = patients.filter(p => !query || p.hn.toLowerCase().includes(query) || p.first_name.toLowerCase().includes(query) || p.last_name.toLowerCase().includes(query)).slice(0, 3);
        if (matchedPatients.length > 0) {
          html += '<div style="font-size: 0.74rem; font-weight: 600; color: var(--primary-700); text-transform: uppercase;">ผู้ป่วย (Patients)</div>';
          matchedPatients.forEach(p => {
            html += '<div style="padding: 6px 8px; background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-md); cursor: pointer; display: flex; justify-content: space-between;" onclick="PatientModule.selectAndOpenVisit(\'' + p.patient_id + '\'); QuickSearchModal.close();"><div><strong>' + (p.title || '') + p.first_name + ' ' + p.last_name + '</strong> <span style="font-size: 0.76rem; color: var(--slate-500);">HN: ' + p.hn + '</span></div><span class="badge badge-primary">ตรวจ</span></div>';
          });
        }

        const matchedDrugs = drugs.filter(d => !query || d.generic_name.toLowerCase().includes(query) || (d.trade_name && d.trade_name.toLowerCase().includes(query))).slice(0, 3);
        if (matchedDrugs.length > 0) {
          html += '<div style="font-size: 0.74rem; font-weight: 600; color: var(--secondary-600); text-transform: uppercase; margin-top: 6px;">ยา (Drugs)</div>';
          matchedDrugs.forEach(d => {
            html += '<div style="padding: 6px 8px; background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-md); cursor: pointer; display: flex; justify-content: space-between;" onclick="App.switchTab(\'tab-drugs\'); DrugModule.openEditDrugModal(\'' + d.drug_id + '\'); QuickSearchModal.close();"><div><strong>' + d.generic_name + '</strong> <span style="font-size: 0.76rem; color: var(--slate-500);">(' + (d.trade_name || '-') + ')</span></div><span style="font-size: 0.82rem; font-weight: 600; color: var(--primary-700);">฿' + Number(d.sale_price).toFixed(2) + '</span></div>';
          });
        }
        resultsEl.innerHTML = html || '<div style="text-align: center; padding: 16px; color: var(--slate-400);">ไม่พบผลลัพธ์</div>';
        lucide.createIcons();
      }
    };