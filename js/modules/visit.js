/* ==========================================================================
   OPD System - Doctor Examination & Visit Management
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const VisitModule = {
      onDoctorChange(docId) {
        if (!State.selectedVisit) return;
        const d = DB.get(STORAGE_KEYS.DOCTORS).find(x => x.doctor_id === docId);
        if (d) {
          State.selectedVisit.doctor_id = d.doctor_id;
          State.selectedVisit.doctor = (d.title || '') + ' ' + d.first_name + ' ' + d.last_name;
          State.selectedVisit.doctor_license = d.license_no;
          const visits = DB.get(STORAGE_KEYS.VISITS);
          const idx = visits.findIndex(x => x.visit_id === State.selectedVisit.visit_id);
          if (idx !== -1) visits[idx] = State.selectedVisit;
          DB.set(STORAGE_KEYS.VISITS, visits);
        }
      },
      render() {
        this.renderProceduresDropdown();
        this.renderStaffPerformerDropdown();
        this.renderLabsDropdown();
        this.renderLabSetsDropdown();
        this.renderLabQuickChips();
        this.renderDrugGroupsDropdown();
        
        // Ensure today is default selected if filter is empty
        const filterInput = document.getElementById('visit-filter-date');
        if (filterInput && !filterInput.value && !this._userClearedDate) {
          const now = new Date();
          filterInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        }

        this.renderVisitList();
        if (State.selectedVisit) this.loadVisitToChart(State.selectedVisit);
      },
      _userClearedDate: false,
      renderProceduresDropdown() {
        const procs = DB.get(STORAGE_KEYS.PROCEDURES);
        const select = document.getElementById('proc-quick-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือกหัตถการ / บริการ --</option>' + procs.filter(p => p.active !== false).map(p => {
          const dfTxt = (p.df_price !== undefined && p.df_price !== null) ? ' | DF ฿' + Number(p.df_price).toFixed(0) : '';
          return '<option value="' + p.proc_id + '">' + p.name + ' (฿' + Number(p.price).toFixed(2) + dfTxt + ')</option>';
        }).join('');
      },
      renderStaffPerformerDropdown() {
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const select = document.getElementById('proc-performer-select');
        if (!select) return;
        const currentActiveDoc = AuthModule.getActiveDoctorName();
        select.innerHTML = docs.filter(d => d.active !== false).map(d => {
          const name = (d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name;
          const pos = d.specialty ? ' (' + d.specialty + ')' : '';
          const isSelected = (name === currentActiveDoc || (State.selectedVisit && name === State.selectedVisit.doctor)) ? 'selected' : '';
          return '<option value="' + name + '" ' + isSelected + '>' + name + pos + '</option>';
        }).join('');
      },
      renderLabsDropdown() {
        const labs = DB.get(STORAGE_KEYS.LABS);
        const select = document.getElementById('lab-quick-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือกรายการตรวจ Lab เดี่ยว --</option>' + labs.filter(l => l.active !== false).map(l => '<option value="' + l.lab_id + '">[' + l.category + '] ' + l.name + ' (฿' + Number(l.price).toFixed(2) + ')</option>').join('');
      },
      renderLabSetsDropdown() {
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const select = document.getElementById('lab-set-quick-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือกสั่งทั้งชุดตรวจ Lab (Set) --</option>' + sets.map(s => '<option value="' + s.set_id + '">' + s.name + ' (' + (s.items || []).length + ' รายการ - ฿' + Number(s.price).toFixed(2) + ')</option>').join('');
      },
      renderLabQuickChips() {
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const container = document.getElementById('quick-lab-chips-container');
        if (!container) return;
        container.innerHTML = sets.slice(0, 6).map(s => 
          '<button type="button" class="btn btn-sm" style="padding: 2px 7px; font-size: 0.72rem; background: white; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 12px; cursor: pointer;" onclick="VisitModule.applyLabSetById(\'' + s.set_id + '\')" title="' + (s.description || '') + '"><i data-lucide="plus" style="width: 10px; height: 10px; display: inline;"></i> ' + s.name.split(' ')[0] + ' (' + (s.items || []).length + ')</button>'
        ).join('');
        lucide.createIcons();
      },
      renderDrugGroupsDropdown() {
        const groups = DB.get(STORAGE_KEYS.DRUG_GROUPS);
        const select = document.getElementById('quick-drug-group-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือกสั่งทั้งชุดยา (Group) --</option>' + groups.map(g => '<option value="' + g.group_id + '">' + g.name + ' (' + (g.items || []).length + ' รายการ)</option>').join('');
      },
      setTodayDateFilter() {
        this._userClearedDate = false;
        const now = new Date();
        document.getElementById('visit-filter-date').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        this.renderVisitList();
      },
      clearDateFilter() {
        this._userClearedDate = true;
        document.getElementById('visit-filter-date').value = '';
        this.renderVisitList();
      },
      renderVisitList() {
        const query = (document.getElementById('visit-search-input')?.value || '').toLowerCase().trim();
        const dateFilter = document.getElementById('visit-filter-date')?.value || '';
        const visits = DB.get(STORAGE_KEYS.VISITS);
        const container = document.getElementById('visit-queue-list');
        if (!container) return;

        const filtered = visits.filter(v => {
          const matchQuery = !query || (v.an && v.an.toLowerCase().includes(query)) || (v.hn && v.hn.toLowerCase().includes(query)) || (v.patient_name && v.patient_name.toLowerCase().includes(query));
          const matchDate = !dateFilter || (v.visit_date && v.visit_date.startsWith(dateFilter));
          return matchQuery && matchDate;
        });

        container.innerHTML = filtered.slice().reverse().map(v => {
          const isSelected = State.selectedVisit && State.selectedVisit.visit_id === v.visit_id;
          return '<div class="card" style="padding: 8px; margin-bottom: 0; cursor: pointer; border-color: ' + (isSelected ? 'var(--primary-500)' : 'var(--slate-200)') + '; background: ' + (isSelected ? 'var(--primary-50)' : 'white') + ';" onclick="VisitModule.selectVisitForChart(\'' + v.visit_id + '\')">' +
            '<div style="display: flex; justify-content: space-between; align-items: center;"><strong style="color: var(--primary-700); font-size: 0.82rem;">' + v.an + '</strong><span class="badge ' + (v.status === 'CLOSED' ? 'badge-success' : 'badge-warning') + '">' + (v.status === 'CLOSED' ? 'เสร็จ' : 'รอตรวจ') + '</span></div>' +
            '<div style="font-weight: 600; font-size: 0.86rem; margin-top: 1px;">' + v.patient_name + '</div>' +
            '<div style="font-size: 0.72rem; color: var(--slate-500); display: flex; justify-content: space-between; margin-top: 1px;"><span>HN: ' + v.hn + '</span><span>' + (v.visit_date ? v.visit_date.slice(0, 10) : '') + '</span></div></div>';
        }).join('');
      },
      selectVisitForChart(visitId) {
        const v = DB.get(STORAGE_KEYS.VISITS).find(x => x.visit_id === visitId);
        if (!v) return;
        State.selectedVisit = v;
        App.switchTab('tab-opd');
        this.renderVisitList();
        this.loadVisitToChart(v);
      },
      loadVisitToChart(v) {
        document.getElementById('chart-empty-state').style.display = 'none';
        document.getElementById('chart-form-content').style.display = 'block';
        document.getElementById('chart-actions').style.display = 'flex';

        document.getElementById('chart-title').innerHTML = '<i data-lucide="clipboard-list"></i> เวชระเบียน: ' + v.patient_name + ' (' + v.an + ' / ' + v.hn + ')';
        document.getElementById('chart-subtitle').textContent = 'วันที่: ' + v.visit_date + ' | สิทธิ: ' + (v.service_type || 'OPD') + ' | สถานะ: ' + (v.status === 'CLOSED' ? 'ปิดบิลแล้ว' : 'กำลังตรวจ');

        const reopenBtn = document.getElementById('btn-reopen-visit');
        if (reopenBtn) reopenBtn.style.display = (v.status === 'CLOSED') ? 'inline-flex' : 'none';

        const patient = DB.get(STORAGE_KEYS.PATIENTS).find(p => p.hn === v.hn);
        if (patient) {
          App.setActivePatient(patient);
          const allergyBanner = document.getElementById('chart-allergy-banner');
          if (patient.drug_allergy) {
            allergyBanner.style.display = 'flex';
            document.getElementById('chart-allergy-text').textContent = patient.drug_allergy;
          } else { allergyBanner.style.display = 'none'; }

          // Auto Pre-fill previous weight & height if not already filled
          if (!v.vitals?.weight || !v.vitals?.height) {
            const pastVisits = DB.get(STORAGE_KEYS.VISITS).filter(x => x.hn === v.hn && x.visit_id !== v.visit_id && x.vitals?.weight);
            if (pastVisits.length > 0) {
              const lastV = pastVisits[pastVisits.length - 1];
              if (!v.vitals) v.vitals = {};
              if (!v.vitals.weight) v.vitals.weight = lastV.vitals.weight;
              if (!v.vitals.height && lastV.vitals.height) v.vitals.height = lastV.vitals.height;
              if (v.vitals.weight && v.vitals.height) {
                const w = parseFloat(v.vitals.weight);
                const h = parseFloat(v.vitals.height);
                if (w > 0 && h > 0) v.vitals.bmi = (w / ((h / 100) * (h / 100))).toFixed(2);
              }
              document.getElementById('v-prev-note').innerHTML = '⚡ (ดึงน้ำหนัก/ส่วนสูงเดิมครั้งก่อน: <strong>' + lastV.vitals.weight + ' kg</strong> / <strong>' + (lastV.vitals.height || '-') + ' cm</strong>)';
            } else {
              document.getElementById('v-prev-note').textContent = '';
            }
          } else {
            document.getElementById('v-prev-note').textContent = '';
          }
        }

        document.getElementById('v-bp').value = v.vitals?.bp || '';
        document.getElementById('v-pr').value = v.vitals?.pr || '';
        document.getElementById('v-temp').value = v.vitals?.temp || '';
        document.getElementById('v-weight').value = v.vitals?.weight || '';
        document.getElementById('v-height').value = v.vitals?.height || '';
        document.getElementById('v-bmi').value = v.vitals?.bmi || '';

        document.getElementById('v-cc').value = v.chief_complaint || '';
        document.getElementById('v-pi').value = v.present_illness || '';
        document.getElementById('v-pe').value = v.physical_exam || '';
        document.getElementById('v-dx').value = '';

        // Initialize Diagnoses Array
        if (!v.diagnoses) {
          v.diagnoses = [];
          if (v.assessment && v.assessment.trim()) {
            const parts = v.assessment.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach((p, idx) => {
              v.diagnoses.push({
                code: p.split(' ')[0] || 'DX',
                name: p,
                type: idx === 0 ? 'PRIMARY' : 'SECONDARY'
              });
            });
          }
        }
        this.renderDxChips();

        document.getElementById('v-app-date').value = v.appointment?.date || '';
        document.getElementById('v-app-time').value = v.appointment?.time || '09:00';
        document.getElementById('v-app-reason').value = v.appointment?.reason || '';

        this.renderPrescriptionTable();
        this.renderLabsTable();
        this.renderLabAttachments();
        this.renderProcedureRows();
        lucide.createIcons();
      },

      /* Smart BP and BT Auto-formatting */
      formatBP(input) {
        let val = input.value.replace(/[^0-9/]/g, '');
        if (!val.includes('/')) {
          if (val.length === 4) {
            // E.g. 9060 -> 90/60
            if (parseInt(val.slice(0, 2), 10) >= 80 && parseInt(val.slice(0, 2), 10) <= 99) {
              val = val.slice(0, 2) + '/' + val.slice(2);
            }
          } else if (val.length === 5) {
            // E.g. 12080 -> 120/80, 11070 -> 110/70
            val = val.slice(0, 3) + '/' + val.slice(3, 5);
          } else if (val.length >= 6) {
            // E.g. 140100 -> 140/100
            val = val.slice(0, 3) + '/' + val.slice(3);
          }
        }
        input.value = val;
      },
      onBlurBP(input) {
        let val = input.value.trim().replace(/[^0-9/]/g, '');
        if (val && !val.includes('/')) {
          if (val.length === 4) {
            val = val.slice(0, 2) + '/' + val.slice(2);
          } else if (val.length === 5) {
            val = val.slice(0, 3) + '/' + val.slice(3);
          } else if (val.length === 6) {
            val = val.slice(0, 3) + '/' + val.slice(3);
          }
        }
        input.value = val;
      },
      formatBT(input) {
        let val = input.value.replace(/[^0-9.]/g, '');
        if (!val.includes('.') && val.length === 3) {
          // E.g. 365 -> 36.5, 370 -> 37.0
          val = val.slice(0, 2) + '.' + val.slice(2);
        }
        input.value = val;
      },
      onBlurBT(input) {
        let val = input.value.trim().replace(/[^0-9.]/g, '');
        if (val && !val.includes('.')) {
          if (val.length === 2) {
            val = val + '.0'; // E.g. 36 -> 36.0, 37 -> 37.0
          } else if (val.length === 3) {
            val = val.slice(0, 2) + '.' + val.slice(2);
          }
        }
        input.value = val;
      },
      calcVitals() {
        const w = parseFloat(document.getElementById('v-weight')?.value);
        const h = parseFloat(document.getElementById('v-height')?.value);
        const bmiEl = document.getElementById('v-bmi');
        if (w > 0 && h > 0) bmiEl.value = (w / ((h / 100) * (h / 100))).toFixed(2);
        else bmiEl.value = '';
      },

      /* Multiple Diagnoses (ICD-10) Management */
      searchICD10(query) {
        const box = document.getElementById('icd10-autocomplete-box');
        if (!box) return;
        query = query.toLowerCase().trim();
        if (!query) { box.style.display = 'none'; return; }

        const matches = ICD10_DATA.filter(item => 
          item.code.toLowerCase().includes(query) || item.name_th.toLowerCase().includes(query) || item.name_en.toLowerCase().includes(query)
        ).slice(0, 8);

        if (matches.length === 0) { box.style.display = 'none'; return; }

        box.innerHTML = matches.map(m => 
          '<div class="autocomplete-item" onclick="VisitModule.selectICD10(\'' + m.code + '\', \'' + m.name_th.replace(/'/g, "\\'") + '\', \'' + m.name_en.replace(/'/g, "\\'") + '\')">' +
            '<strong>' + m.code + '</strong> - ' + m.name_th + ' <span style="font-size:0.75rem; color:#64748b;">(' + m.name_en + ')</span>' +
          '</div>'
        ).join('');
        box.style.display = 'block';
      },
      selectICD10(code, nameTh, nameEn) {
        if (!State.selectedVisit) return;
        if (!State.selectedVisit.diagnoses) State.selectedVisit.diagnoses = [];
        
        const isFirst = State.selectedVisit.diagnoses.length === 0;
        const exists = State.selectedVisit.diagnoses.some(d => d.code === code);
        if (!exists) {
          State.selectedVisit.diagnoses.push({
            code: code,
            name: code + ' ' + nameTh,
            name_th: nameTh,
            name_en: nameEn,
            type: isFirst ? 'PRIMARY' : 'SECONDARY'
          });
        }
        document.getElementById('v-dx').value = '';
        document.getElementById('icd10-autocomplete-box').style.display = 'none';
        this.syncDxAssessmentText();
        this.renderDxChips();
      },
      addCustomDiagnosis(val) {
        val = (val || '').trim();
        if (!val || !State.selectedVisit) return;
        if (!State.selectedVisit.diagnoses) State.selectedVisit.diagnoses = [];

        const isFirst = State.selectedVisit.diagnoses.length === 0;
        State.selectedVisit.diagnoses.push({
          code: val.split(' ')[0] || 'DX',
          name: val,
          name_th: val,
          name_en: '',
          type: isFirst ? 'PRIMARY' : 'SECONDARY'
        });
        document.getElementById('v-dx').value = '';
        document.getElementById('icd10-autocomplete-box').style.display = 'none';
        this.syncDxAssessmentText();
        this.renderDxChips();
      },
      removeDiagnosis(idx) {
        if (!State.selectedVisit?.diagnoses) return;
        State.selectedVisit.diagnoses.splice(idx, 1);
        if (State.selectedVisit.diagnoses.length > 0 && !State.selectedVisit.diagnoses.some(d => d.type === 'PRIMARY')) {
          State.selectedVisit.diagnoses[0].type = 'PRIMARY';
        }
        this.syncDxAssessmentText();
        this.renderDxChips();
      },
      toggleDxType(idx) {
        if (!State.selectedVisit?.diagnoses || !State.selectedVisit.diagnoses[idx]) return;
        const d = State.selectedVisit.diagnoses[idx];
        d.type = (d.type === 'PRIMARY') ? 'SECONDARY' : 'PRIMARY';
        this.syncDxAssessmentText();
        this.renderDxChips();
      },
      syncDxAssessmentText() {
        if (!State.selectedVisit) return;
        const list = State.selectedVisit.diagnoses || [];
        State.selectedVisit.assessment = list.map(d => (d.type === 'PRIMARY' ? '★ ' : '') + d.name).join(', ');
      },
      renderDxChips() {
        const container = document.getElementById('visit-dx-chips');
        if (!container) return;
        const list = State.selectedVisit?.diagnoses || [];
        if (list.length === 0) {
          container.innerHTML = '<span style="font-size: 0.76rem; color: #94a3b8; font-style: italic;">ยังไม่ได้ระบุการวินิจฉัยโรค (กดพิมพ์ค้นหาหรือเลือกจากรายการ)</span>';
          return;
        }
        container.innerHTML = list.map((d, idx) => {
          const isPrimary = d.type === 'PRIMARY';
          return '<div class="dx-chip ' + (isPrimary ? 'primary' : 'secondary') + '" title="คลิกเพื่อสลับเป็น ' + (isPrimary ? 'โรคร่วม (Secondary)' : 'โรคหลัก (Primary)') + '">' +
            '<span style="cursor: pointer;" onclick="VisitModule.toggleDxType(' + idx + ')">' +
              (isPrimary ? '★ <strong>[โรคหลัก]</strong> ' : '<strong>[โรคร่วม]</strong> ') + d.name +
            '</span>' +
            '<i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: #64748b; margin-left: 2px;" onclick="VisitModule.removeDiagnosis(' + idx + ')"></i>' +
          '</div>';
        }).join('');
        lucide.createIcons();
      },

      /* Re-med Select */
      openRemedModal() {
        if (!State.selectedVisit) return;
        const currentHN = State.selectedVisit.hn;
        const visits = DB.get(STORAGE_KEYS.VISITS).filter(v => v.hn === currentHN && v.visit_id !== State.selectedVisit.visit_id && v.prescriptions && v.prescriptions.length > 0);
        const tbody = document.querySelector('#remed-visits-table tbody');
        if (!tbody) return;

        if (visits.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--slate-400);">ไม่พบประวัติการสั่งยาครั้งก่อนหน้าของผู้ป่วยรายนี้</td></tr>';
        } else {
          tbody.innerHTML = visits.map(v => 
            '<tr><td><strong>' + (v.visit_date ? v.visit_date.slice(0, 10) : '-') + '</strong></td>' +
            '<td>' + v.an + '</td><td>' + (v.assessment || '-') + '</td>' +
            '<td>' + (v.prescriptions || []).map(p => p.generic_name + ' x ' + p.qty).join(', ') + '</td>' +
            '<td><button class="btn btn-emerald btn-sm" onclick="VisitModule.applyRemedFromVisit(\'' + v.visit_id + '\')"><i data-lucide="check"></i> เอายาตาม Visit นี้</button></td></tr>'
          ).join('');
        }
        document.getElementById('modal-remed-select').classList.add('active');
        lucide.createIcons();
      },
      closeRemedModal() { document.getElementById('modal-remed-select').classList.remove('active'); },
      applyRemedFromVisit(fromVisitId) {
        const fromV = DB.get(STORAGE_KEYS.VISITS).find(v => v.visit_id === fromVisitId);
        if (!fromV || !State.selectedVisit) return;

        if (!State.selectedVisit.prescriptions) State.selectedVisit.prescriptions = [];
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        fromV.prescriptions.forEach(p => {
          State.selectedVisit.prescriptions.push({ ...p });
          const d = drugs.find(x => x.drug_id === p.drug_id);
          if (d) {
            const stockBefore = d.stock || 0;
            d.stock = Math.max(0, stockBefore - p.qty);
            StockModule.recordStockTx({
              drug_id: d.drug_id,
              generic_name: d.generic_name,
              trade_name: d.trade_name || '',
              visit_id: State.selectedVisit.visit_id,
              type: 'SALE',
              qty: p.qty,
              cost_price: d.purchase_price || 0,
              sale_price: p.unit_price || 0,
              stock_before: stockBefore,
              stock_after: d.stock,
              reference_no: State.selectedVisit.an || '',
              note: 'สั่งจ่ายยาผ่าน Re-med จาก Visit ' + (fromV.an || '')
            });
          }
        });
        DB.set(STORAGE_KEYS.DRUGS, drugs);
        this.closeRemedModal();
        this.renderPrescriptionTable();
        DashboardModule.render();
        alert('ดึงรายการยาเดิมจาก Visit ' + fromV.an + ' สำเร็จ');
      },
      applySelectedDrugGroup() {
        const groupId = document.getElementById('quick-drug-group-select').value;
        if (!groupId || !State.selectedVisit) return;
        const g = DB.get(STORAGE_KEYS.DRUG_GROUPS).find(x => x.group_id === groupId);
        if (!g || !g.items || g.items.length === 0) { alert('กลุ่มยานี้ยังไม่มีรายการยา'); return; }

        if (!State.selectedVisit.prescriptions) State.selectedVisit.prescriptions = [];
        const drugs = DB.get(STORAGE_KEYS.DRUGS);

        g.items.forEach(item => {
          const d = drugs.find(x => x.drug_id === item.drug_id);
          const qty = item.qty || 10;
          State.selectedVisit.prescriptions.push({
            drug_id: item.drug_id,
            generic_name: item.generic_name,
            trade_name: item.trade_name || '',
            qty: qty,
            sig: item.sig || '',
            unit_price: d ? d.sale_price : 0,
            amount: (d ? d.sale_price : 0) * qty
          });
          if (d) {
            const stockBefore = d.stock || 0;
            d.stock = Math.max(0, stockBefore - qty);
            StockModule.recordStockTx({
              drug_id: d.drug_id,
              generic_name: d.generic_name,
              trade_name: d.trade_name || '',
              visit_id: State.selectedVisit.visit_id,
              type: 'SALE',
              qty: qty,
              cost_price: d.purchase_price || 0,
              sale_price: d.sale_price || 0,
              stock_before: stockBefore,
              stock_after: d.stock,
              reference_no: State.selectedVisit.an || '',
              note: 'สั่งจ่ายชุดยา: ' + g.name
            });
          }
        });
        DB.set(STORAGE_KEYS.DRUGS, drugs);
        this.renderPrescriptionTable();
        document.getElementById('quick-drug-group-select').value = '';
        DashboardModule.render();
        alert('สั่งจ่ายกลุ่มยา: ' + g.name + ' สำเร็จ (' + g.items.length + ' รายการ)');
      },
      openNewVisitModal(preselectedPatientId = null) {
        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const select = document.getElementById('nv-patient-select');
        select.innerHTML = '<option value="">-- เลือกผู้ป่วย --</option>' + patients.map(p => '<option value="' + p.patient_id + '" ' + (preselectedPatientId === p.patient_id ? 'selected' : '') + '>' + p.hn + ' - ' + (p.title || '') + p.first_name + ' ' + p.last_name + '</option>').join('');
        document.getElementById('nv-an').value = Utils.generateAN(DB.get(STORAGE_KEYS.VISITS));
        document.getElementById('nv-cc').value = '';
        document.getElementById('modal-new-visit').classList.add('active');
        lucide.createIcons();
      },
      closeNewVisitModal() { document.getElementById('modal-new-visit').classList.remove('active'); },
      onSelectPatientForVisit(patientId) {
        const p = DB.get(STORAGE_KEYS.PATIENTS).find(x => x.patient_id === patientId);
        if (p) App.setActivePatient(p);
      },
      createVisit() {
        const patientId = document.getElementById('nv-patient-select').value;
        if (!patientId) { alert('กรุณาเลือกผู้ป่วย'); return; }
        const patient = DB.get(STORAGE_KEYS.PATIENTS).find(p => p.patient_id === patientId);
        const visits = DB.get(STORAGE_KEYS.VISITS);

        // Pre-fill weight & height from past visits
        const pastVisits = visits.filter(x => x.hn === patient.hn && x.vitals?.weight);
        const lastVitals = (pastVisits.length > 0) ? pastVisits[pastVisits.length - 1].vitals : { bp: "", pr: "", temp: "", weight: "", height: "", bmi: "" };

                const allProcs = DB.get(STORAGE_KEYS.PROCEDURES) || [];
        const defaultProc = allProcs.find(x => x.proc_id === 'PROC1' || x.name === 'ตรวจรักษาโรคทั่วไป OPD') || {
          proc_id: "PROC1",
          name: "ตรวจรักษาโรคทั่วไป OPD",
          category: "บริการทั่วไป",
          price: 150.00,
          df_price: 150.00
        };
        const defaultPrice = Number(defaultProc.price || 150.00);
        const defaultDfPrice = (defaultProc.df_price !== undefined && defaultProc.df_price !== null) ? Number(defaultProc.df_price) : defaultPrice;

        const sType = document.getElementById('nv-service-type').value;
        const isAmed2 = (sType === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)');
        const isAmed1 = (sType === 'A-Med สปสช. (เก็บส่วนต่าง)' || sType === 'A-Med');
        const isAmed = isAmed1 || isAmed2;
        const initAmedDeduct = isAmed ? 180.00 : 0.00;
        let initTotal = defaultPrice;
        let initPayMethod = 'เงินสด';
        let initClinicSupport = 0;

        if (isAmed2) {
          initTotal = 0.00;
          initClinicSupport = Math.max(0, defaultPrice - initAmedDeduct);
          initPayMethod = 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)';
        } else if (isAmed1) {
          initTotal = Math.max(0, defaultPrice - initAmedDeduct);
          initPayMethod = 'A-Med สปสช. (เก็บส่วนต่าง)';
        }

        const newVisit = {
          visit_id: 'V_' + Date.now(),
          patient_id: patient.patient_id,
          an: document.getElementById('nv-an').value,
          hn: patient.hn,
          patient_name: (patient.title || '') + patient.first_name + ' ' + patient.last_name,
          visit_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          doctor: AuthModule.getActiveDoctorName(),
          service_type: sType,
          vitals: { ...lastVitals, bp: "", pr: "", temp: "" },
          chief_complaint: document.getElementById('nv-cc').value.trim() || "มาตรวจรักษาทั่วไป",
          present_illness: "", physical_exam: "", assessment: "", treatment_plan: "",
          diagnoses: [],
          prescriptions: [],
          labs: [],
          lab_attachments: [],
          procedures: [{ proc_id: defaultProc.proc_id || "PROC1", name: defaultProc.name || "ตรวจรักษาโรคทั่วไป OPD", category: defaultProc.category || "บริการทั่วไป", price: defaultPrice, df_price: defaultDfPrice, performer_name: AuthModule.getActiveDoctorName() }],
          appointment: null,
          status: "OPEN",
          billing: {
            subtotal: defaultPrice,
            discount: 0,
            amed_type: isAmed2 ? 'AMED_FREE' : (isAmed1 ? 'AMED_COPAY' : null),
            amed_discount: initAmedDeduct,
            amed_clinic_support: initClinicSupport,
            total: initTotal,
            paid: false,
            payment_method: initPayMethod
          }
        };

        visits.push(newVisit);
        DB.upsertItem(STORAGE_KEYS.VISITS, newVisit);
        this.closeNewVisitModal();
        this.selectVisitForChart(newVisit.visit_id);
        DashboardModule.render();
      },
      renderPrescriptionTable() {
        const v = State.selectedVisit;
        const tbody = document.getElementById('visit-drugs-body');
        if (!tbody || !v) return;
        if (!v.prescriptions || v.prescriptions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--slate-400);">ยังไม่มีรายการยา</td></tr>';
          return;
        }
        tbody.innerHTML = v.prescriptions.map((p, idx) => 
          '<tr><td><strong>' + p.generic_name + '</strong></td><td>' + (p.trade_name || '-') + '</td>' +
          '<td><input type="text" class="form-input" style="padding: 3px 6px; font-size: 0.8rem;" value="' + (p.sig || '') + '" onchange="VisitModule.updateDrugSig(' + idx + ', this.value)"></td>' +
          '<td><input type="number" class="form-input" style="width: 60px; padding: 3px 6px; font-size: 0.8rem;" value="' + p.qty + '" min="1" onchange="VisitModule.updateDrugQty(' + idx + ', this.value)"></td>' +
          '<td>฿' + Number(p.unit_price).toFixed(2) + '</td><td><strong>฿' + Number(p.amount).toFixed(2) + '</strong></td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="VisitModule.removeDrugFromVisit(' + idx + ')"><i data-lucide="trash-2"></i></button></td></tr>'
        ).join('');
        lucide.createIcons();
      },
      renderLabsTable() {
        const v = State.selectedVisit;
        const tbody = document.getElementById('visit-labs-body');
        if (!tbody || !v) return;
        if (!v.labs || v.labs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--slate-400);">ยังไม่มีการสั่ง Lab</td></tr>';
          return;
        }
        tbody.innerHTML = v.labs.map((l, idx) => 
          '<tr><td><strong>' + l.name + '</strong></td><td><span class="badge badge-primary">' + (l.category || 'Lab') + '</span></td>' +
          '<td><input type="text" class="form-input" style="padding: 3px 6px; font-size: 0.8rem;" placeholder="ระบุผลตรวจ..." value="' + (l.result || '') + '" onchange="VisitModule.updateLabResult(' + idx + ', this.value)"></td>' +
          '<td>฿' + Number(l.price).toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="VisitModule.removeLab(' + idx + ')"><i data-lucide="trash-2"></i></button></td></tr>'
        ).join('');
        lucide.createIcons();
      },
      addSelectedLab() {
        const labId = document.getElementById('lab-quick-select').value;
        const l = DB.get(STORAGE_KEYS.LABS).find(x => x.lab_id === labId);
        if (!l || !State.selectedVisit) return;
        if (!State.selectedVisit.labs) State.selectedVisit.labs = [];
        State.selectedVisit.labs.push({ lab_id: l.lab_id, name: l.name, category: l.category, price: l.price, result: "" });
        this.renderLabsTable();
        document.getElementById('lab-quick-select').value = '';
      },
      applySelectedLabSet() {
        const setId = document.getElementById('lab-set-quick-select').value;
        if (!setId) { alert('กรุณาเลือกชุดตรวจ Lab ที่ต้องการ'); return; }
        this.applyLabSetById(setId);
        document.getElementById('lab-set-quick-select').value = '';
      },
      applyLabSetById(setId) {
        if (!State.selectedVisit) { alert('กรุณาเลือกหรือเปิด Visit ก่อนสั่งตรวจ Lab'); return; }
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const setObj = sets.find(s => s.set_id === setId);
        if (!setObj || !setObj.items) return;

        if (!State.selectedVisit.labs) State.selectedVisit.labs = [];
        let addedCount = 0;
        setObj.items.forEach(item => {
          const already = State.selectedVisit.labs.some(existing => existing.lab_id === item.lab_id || existing.name === item.name);
          if (!already) {
            State.selectedVisit.labs.push({
              lab_id: item.lab_id,
              name: item.name,
              category: item.category || 'BIOCHEMISTRY',
              price: item.price || 0,
              result: ""
            });
            addedCount++;
          }
        });
        this.renderLabsTable();
        alert('สั่งชุดตรวจ "' + setObj.name + '" เรียบร้อย (เพิ่ม ' + addedCount + ' รายการ)');
      },
      multiLabSelectedIds: new Set(),
      openMultiLabModal() {
        if (!State.selectedVisit) { alert('กรุณาเลือกหรือเปิด Visit ก่อนสั่งตรวจ Lab'); return; }
        this.multiLabSelectedIds.clear();
        document.getElementById('multi-lab-search-input').value = '';
        document.getElementById('multi-lab-cat-filter').value = '';
        this.renderMultiLabList();
        document.getElementById('modal-multi-lab').classList.add('active');
        lucide.createIcons();
      },
      closeMultiLabModal() {
        document.getElementById('modal-multi-lab').classList.remove('active');
      },
      renderMultiLabList() {
        const query = (document.getElementById('multi-lab-search-input')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('multi-lab-cat-filter')?.value || '';
        const labs = DB.get(STORAGE_KEYS.LABS).filter(l => l.active !== false);
        const container = document.getElementById('multi-lab-checkbox-container');
        if (!container) return;

        const filtered = labs.filter(l => {
          const matchQuery = !query || l.name.toLowerCase().includes(query) || (l.category && l.category.toLowerCase().includes(query));
          const matchCat = !catFilter || l.category === catFilter;
          return matchQuery && matchCat;
        });

        container.innerHTML = filtered.map(l => {
          const isChecked = this.multiLabSelectedIds.has(l.lab_id);
          return '<label style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px; background: ' + (isChecked ? '#eff6ff' : 'var(--slate-50)') + '; border: 1px solid ' + (isChecked ? '#3b82f6' : 'var(--slate-200)') + '; border-radius: var(--radius-md); cursor: pointer; user-select: none;">' +
            '<input type="checkbox" style="margin-top: 3px; cursor: pointer;" value="' + l.lab_id + '" ' + (isChecked ? 'checked' : '') + ' onchange="VisitModule.toggleMultiLabItem(\'' + l.lab_id + '\', this.checked)">' +
            '<div style="flex: 1;">' +
              '<div style="font-weight: 600; font-size: 0.84rem; color: var(--slate-800);">' + l.name + '</div>' +
              '<div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--slate-500); margin-top: 2px;">' +
                '<span>' + l.category + '</span>' +
                '<strong style="color: #047857;">฿' + Number(l.price).toFixed(2) + '</strong>' +
              '</div>' +
            '</div>' +
          '</label>';
        }).join('');

        this.updateMultiLabSummary();
      },
      toggleMultiLabItem(labId, isChecked) {
        if (isChecked) this.multiLabSelectedIds.add(labId);
        else this.multiLabSelectedIds.delete(labId);
        this.updateMultiLabSummary();
      },
      selectAllFilteredLabs() {
        const query = (document.getElementById('multi-lab-search-input')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('multi-lab-cat-filter')?.value || '';
        const labs = DB.get(STORAGE_KEYS.LABS).filter(l => l.active !== false);
        labs.filter(l => {
          const matchQuery = !query || l.name.toLowerCase().includes(query) || (l.category && l.category.toLowerCase().includes(query));
          const matchCat = !catFilter || l.category === catFilter;
          return matchQuery && matchCat;
        }).forEach(l => this.multiLabSelectedIds.add(l.lab_id));
        this.renderMultiLabList();
      },
      clearMultiLabSelection() {
        this.multiLabSelectedIds.clear();
        this.renderMultiLabList();
      },
      updateMultiLabSummary() {
        const countEl = document.getElementById('multi-lab-selected-count');
        const priceEl = document.getElementById('multi-lab-selected-price');
        const labs = DB.get(STORAGE_KEYS.LABS);
        let total = 0;
        this.multiLabSelectedIds.forEach(id => {
          const l = labs.find(x => x.lab_id === id);
          if (l) total += (l.price || 0);
        });
        if (countEl) countEl.textContent = this.multiLabSelectedIds.size;
        if (priceEl) priceEl.textContent = '฿' + total.toLocaleString();
      },
      confirmAddMultiLabs() {
        if (!State.selectedVisit) return;
        if (this.multiLabSelectedIds.size === 0) { alert('กรุณาติ๊กเลือกอย่างน้อย 1 รายการ Lab'); return; }
        const labs = DB.get(STORAGE_KEYS.LABS);
        if (!State.selectedVisit.labs) State.selectedVisit.labs = [];
        let added = 0;
        this.multiLabSelectedIds.forEach(id => {
          const l = labs.find(x => x.lab_id === id);
          if (l) {
            const exists = State.selectedVisit.labs.some(x => x.lab_id === l.lab_id);
            if (!exists) {
              State.selectedVisit.labs.push({ lab_id: l.lab_id, name: l.name, category: l.category, price: l.price, result: "" });
              added++;
            }
          }
        });
        this.closeMultiLabModal();
        this.renderLabsTable();
        alert('เพิ่มรายการ Lab ' + added + ' รายการเข้า Visit เรียบร้อย');
      },
      removeLab(idx) {
        if (!State.selectedVisit?.labs) return;
        State.selectedVisit.labs.splice(idx, 1);
        this.renderLabsTable();
      },
      updateLabResult(idx, val) { if (State.selectedVisit?.labs[idx]) State.selectedVisit.labs[idx].result = val; },

      /* Drag and Drop Lab Attachments */
      onLabDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('visit-lab-dropzone')?.classList.add('dragover');
      },
      onLabDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('visit-lab-dropzone')?.classList.remove('dragover');
      },
      onLabDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('visit-lab-dropzone')?.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          this.onLabFilesSelected(e.dataTransfer.files);
        }
      },
      async onLabFilesSelected(files) {
        if (!files || files.length === 0) return;
        if (!State.selectedVisit) {
          alert('⚠️ กรุณาเลือกหรือเปิดเคส Visit ที่กำลังตรวจทางฝั่งซ้ายก่อนทำการแนบไฟล์ผลตรวจ Lab');
          return;
        }
        if (!State.selectedVisit.lab_attachments) State.selectedVisit.lab_attachments = [];

        const fileArr = Array.from(files);
        let addedCount = 0;
        for (const file of fileArr) {
          try {
            const res = await compressImageFile(file);
            if (res && res.data) {
              const fileItem = {
                id: 'LAB_FILE_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                name: file.name,
                size: res.size,
                type: res.type || file.type || 'application/pdf',
                data: res.data,
                uploaded_at: new Date().toISOString()
              };
              State.selectedVisit.lab_attachments.push(fileItem);
              if (typeof LabStorageDB !== 'undefined') {
                await LabStorageDB.saveFile(fileItem);
              }
              addedCount++;
            }
          } catch(err) {
            console.error('Error processing lab file:', err);
          }
        }
        this.renderLabAttachments();
        const fileInput = document.getElementById('lab-file-input');
        if (fileInput) fileInput.value = '';
        if (addedCount > 0 && typeof CloudSyncModule !== 'undefined' && CloudSyncModule.showSyncToast) {
          CloudSyncModule.showSyncToast('📎 แนบไฟล์ผลตรวจ Lab (' + addedCount + ' ไฟล์) แล้ว - อย่าลืมกดปุ่ม "บันทึก"');
        }
      },
      renderLabAttachments() {
        const container = document.getElementById('visit-lab-attachments-container');
        if (!container || !State.selectedVisit) return;
        const list = State.selectedVisit.lab_attachments || [];

        if (list.length === 0) {
          container.innerHTML = '';
          return;
        }

        container.innerHTML = list.map((item, idx) => {
          const isImage = item.type && item.type.startsWith('image/');
          const isPdf = item.type === 'application/pdf' || (item.name && item.name.toLowerCase().endsWith('.pdf'));
          const sizeKb = item.size ? (item.size / 1024).toFixed(1) + ' KB' : '';

          let thumbHtml = '';
          if (isImage) {
            thumbHtml = '<img id="lab-thumb-' + item.id + '" src="' + (item.data || '') + '" alt="' + (item.name || '') + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
          } else {
            thumbHtml = '<i data-lucide="file-text" style="width: 32px; height: 32px; color: #dc2626;"></i>';
          }

          return '<div class="lab-attachment-card" style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
            '<div class="lab-thumb-wrap" style="height: 90px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 6px; overflow: hidden; cursor: pointer;" onclick="VisitModule.previewLabFile(\'' + item.id + '\')">' +
              thumbHtml +
            '</div>' +
            '<div style="font-size: 0.78rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;" title="' + (item.name || '') + '">' + (item.name || 'ไฟล์ผลแลป') + '</div>' +
            '<div style="font-size: 0.7rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">' +
              '<span>' + sizeKb + '</span>' +
              '<div style="display: flex; gap: 4px;">' +
                '<button type="button" class="btn btn-outline btn-sm" style="padding: 2px 5px; font-size: 0.7rem;" onclick="VisitModule.previewLabFile(\'' + item.id + '\')" title="ดูไฟล์"><i data-lucide="eye"></i></button>' +
                '<button type="button" class="btn btn-danger btn-sm" style="padding: 2px 5px; font-size: 0.7rem;" onclick="VisitModule.removeLabAttachment(' + idx + ')" title="ลบไฟล์"><i data-lucide="trash-2"></i></button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
        lucide.createIcons();

        // Async load missing image data from LabStorageDB
        list.forEach(async (item) => {
          if (!item.data && typeof LabStorageDB !== 'undefined') {
            const dbItem = await LabStorageDB.getFile(item.id);
            if (dbItem && dbItem.data) {
              item.data = dbItem.data;
              const imgEl = document.getElementById('lab-thumb-' + item.id);
              if (imgEl && imgEl.tagName === 'IMG') imgEl.src = item.data;
            }
          }
        });
      },
      async previewLabFile(fileId) {
        if (!State.selectedVisit) return;
        let file = (State.selectedVisit.lab_attachments || []).find(f => f.id === fileId);
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
        metaEl.textContent = 'ขนาด: ' + (file.size ? (file.size / 1024).toFixed(1) + ' KB' : '-') + ' | ชนิด: ' + (file.type || 'เอกสาร');
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
      removeLabAttachment(idx) {
        if (!State.selectedVisit?.lab_attachments) return;
        const item = State.selectedVisit.lab_attachments[idx];
        if (item && item.id && typeof LabStorageDB !== 'undefined') {
          LabStorageDB.deleteFile(item.id);
        }
        State.selectedVisit.lab_attachments.splice(idx, 1);
        this.renderLabAttachments();
      },

      /* Procedures */
      renderProcedureRows() {
        const v = State.selectedVisit;
        const container = document.getElementById('visit-procedures-container');
        if (!container || !v) return;
        const isAdmin = (AuthModule.currentRole === 'ADMIN');
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const defaultDoc = v.doctor || AuthModule.getActiveDoctorName();

        if (!v.procedures || v.procedures.length === 0) {
          container.innerHTML = '<div style="text-align: center; padding: 10px; color: var(--slate-400); font-size: 0.8rem; border: 1px dashed #cbd5e1; border-radius: 6px;">ยังไม่มีรายการหัตถการใน Visit นี้ (สามารถเลือกเพิ่มได้จากช่องด้านบน)</div>';
          return;
        }

        container.innerHTML = v.procedures.map((proc, idx) => {
          const performer = proc.performer_name || defaultDoc;
          
          let staffOptions = docs.filter(d => d.active !== false).map(d => {
            const name = (d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name;
            const pos = d.specialty ? ' (' + d.specialty + ')' : '';
            const isSel = (name === performer) ? 'selected' : '';
            return '<option value="' + name + '" ' + isSel + '>' + name + pos + '</option>';
          }).join('');
          
          if (!docs.some(d => ((d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name) === performer)) {
            staffOptions += '<option value="' + performer + '" selected>' + performer + '</option>';
          }

          return '<div style="display: flex; gap: 8px; align-items: center; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap;">' +
            '<div style="flex: 2; min-width: 160px; font-weight: 500; font-size: 0.85rem; color: #1e293b;">' +
              proc.name +
              (proc.category ? ' <span style="font-size: 0.7rem; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">' + proc.category + '</span>' : '') +
            '</div>' +
            '<div style="flex: 1.5; min-width: 180px;">' +
              '<select class="form-select" style="font-size: 0.78rem; padding: 4px 8px; height: auto;" onchange="VisitModule.updateProcedurePerformer(' + idx + ', this.value)" title="เลือกแพทย์/พยาบาล/ผู้ทำหัตถการ">' +
                staffOptions +
              '</select>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 4px;">' +
              '<span style="font-size: 0.75rem; color: #64748b;">ราคา:</span>' +
              '<input type="number" class="form-input" value="' + proc.price + '" style="width: 80px; font-size: 0.8rem; padding: 4px 6px; text-align: right;" ' + (isAdmin ? '' : 'readonly title="แพทย์ไม่สามารถแก้ไขราคาหัตถการได้"') + ' onchange="VisitModule.updateProcedurePrice(' + idx + ', this.value)">' +
            '</div>' +
            '<button type="button" class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="VisitModule.removeProcedure(' + idx + ')" title="ลบรายการหัตถการ"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>' +
          '</div>';
        }).join('');
        lucide.createIcons();
      },
      addSelectedProcedure() {
        const procId = document.getElementById('proc-quick-select').value;
        if (!procId) { alert('กรุณาเลือกรายการหัตถการที่ต้องการเพิ่ม'); return; }
        const p = DB.get(STORAGE_KEYS.PROCEDURES).find(x => x.proc_id === procId);
        if (!p || !State.selectedVisit) return;
        if (!State.selectedVisit.procedures) State.selectedVisit.procedures = [];
        
        const perfSelect = document.getElementById('proc-performer-select');
        const performer = (perfSelect && perfSelect.value) ? perfSelect.value : (State.selectedVisit.doctor || AuthModule.getActiveDoctorName());
        
        State.selectedVisit.procedures.push({
          proc_id: p.proc_id,
          name: p.name,
          category: p.category || 'บริการทั่วไป',
          price: Number(p.price) || 0,
          df_price: (p.df_price !== undefined && p.df_price !== null) ? Number(p.df_price) : Math.round(Number(p.price || 0) * 0.35),
          performer_name: performer
        });
        this.renderProcedureRows();
        document.getElementById('proc-quick-select').value = '';
      },
      removeProcedure(idx) {
        if (!State.selectedVisit?.procedures) return;
        State.selectedVisit.procedures.splice(idx, 1);
        this.renderProcedureRows();
      },
      updateProcedurePrice(idx, val) {
        if (State.selectedVisit?.procedures[idx]) {
          State.selectedVisit.procedures[idx].price = parseFloat(val) || 0;
        }
      },
      updateProcedurePerformer(idx, val) {
        if (State.selectedVisit?.procedures[idx]) {
          State.selectedVisit.procedures[idx].performer_name = val;
        }
      },
      updateProcedureDF(idx, val) {
        if (State.selectedVisit?.procedures[idx]) {
          State.selectedVisit.procedures[idx].df_price = parseFloat(val) || 0;
        }
      },

      /* Prescription Modal & Liquid/Custom Units */
      openAddDrugToVisitModal() {
        if (!State.selectedVisit) return;
        document.getElementById('modal-drug-search').value = '';
        document.getElementById('selected-drug-details').style.display = 'none';
        document.getElementById('btn-confirm-add-drug').style.display = 'none';
        this.renderDrugSearchInModal();
        document.getElementById('modal-add-drug-visit').classList.add('active');
        lucide.createIcons();
      },
      closeAddDrugModal() { document.getElementById('modal-add-drug-visit').classList.remove('active'); },
      renderDrugSearchInModal() {
        const query = (document.getElementById('modal-drug-search')?.value || '').toLowerCase().trim();
        const drugs = DB.get(STORAGE_KEYS.DRUGS).filter(d => !query || (d.generic_name && d.generic_name.toLowerCase().includes(query)) || (d.trade_name && d.trade_name.toLowerCase().includes(query)) || (d.drawer && d.drawer.toLowerCase().includes(query)));
        document.querySelector('#modal-drug-picker-table tbody').innerHTML = drugs.map(d => 
          '<tr><td><strong>' + d.generic_name + '</strong></td><td>' + (d.strength || '-') + '</td><td><span class="badge badge-primary">' + (d.dosage_form || 'Tablet') + '</span></td><td>' + (d.trade_name || '-') + '</td>' +
          '<td><span class="badge ' + (d.stock <= d.min_stock ? 'badge-danger' : 'badge-primary') + '">' + d.stock + ' ' + d.unit + '</span></td>' +
          '<td><strong>฿' + Number(d.sale_price).toFixed(2) + '</strong></td>' +
          '<td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:600;">' + (d.drawer ? 'ลิ้นชัก ' + d.drawer : '-') + '</span></td>' +
          '<td><button class="btn btn-primary btn-sm" onclick="VisitModule.selectDrugInModal(\'' + d.drug_id + '\')">เลือก</button></td></tr>'
        ).join('');
      },
      selectDrugInModal(drugId) {
        const d = DB.get(STORAGE_KEYS.DRUGS).find(x => x.drug_id === drugId);
        if (!d) return;
        State.selectedDrugToAdd = d;
        document.getElementById('selected-drug-details').style.display = 'block';
        document.getElementById('btn-confirm-add-drug').style.display = 'inline-flex';
        document.getElementById('sd-name').innerHTML = d.generic_name + ' (' + (d.strength || '') + ') - ' + (d.trade_name || '') + ' [฿' + Number(d.sale_price).toFixed(2) + ']' + (d.drawer ? ' <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; margin-left:6px; font-weight:600;">📍 ลิ้นชัก ' + d.drawer + '</span>' : '');
        document.getElementById('sd-dosage-badge').textContent = d.dosage_form || 'Tablet';
        document.getElementById('sd-id').value = d.drug_id;
        document.getElementById('sd-price').value = d.sale_price;

        const isSyrup = d.dosage_form === 'Syrup' || d.dosage_form === 'Suspension' || (d.generic_name && d.generic_name.toLowerCase().includes('syrup'));
        const isCream = d.dosage_form === 'Cream' || d.dosage_form === 'Ointment' || d.dosage_form === 'Gel';
        const isDrops = d.dosage_form === 'Drops' || d.dosage_form === 'Eye Drops';

        if (isSyrup) {
          document.getElementById('sd-dose-amount').value = '1';
          document.getElementById('sd-dose-unit').value = 'ช้อนชา';
          document.getElementById('sd-frequency-select').value = 'วันละ 3 ครั้ง หลังอาหาร เช้า-กลางวัน-เย็น';
          document.getElementById('sd-qty').value = '1';
          document.getElementById('sd-qty-unit-label').textContent = 'ขวด';
        } else if (isCream) {
          document.getElementById('sd-dose-amount').value = '1';
          document.getElementById('sd-dose-unit').value = 'หลอด';
          document.getElementById('sd-frequency-select').value = 'ทาบริเวณที่เป็น วันละ 2-3 ครั้ง เช้า-เย็น';
          document.getElementById('sd-qty').value = '1';
          document.getElementById('sd-qty-unit-label').textContent = 'หลอด';
        } else if (isDrops) {
          document.getElementById('sd-dose-amount').value = '2';
          document.getElementById('sd-dose-unit').value = 'หยด';
          document.getElementById('sd-frequency-select').value = 'หยอดตา/หู วันละ 3-4 ครั้ง';
          document.getElementById('sd-qty').value = '1';
          document.getElementById('sd-qty-unit-label').textContent = 'ขวด';
        } else {
          document.getElementById('sd-dose-amount').value = '1';
          document.getElementById('sd-dose-unit').value = (d.dosage_form === 'Capsule' ? 'แคปซูล' : 'เม็ด');
          document.getElementById('sd-frequency-select').value = 'วันละ 3 ครั้ง หลังอาหาร เช้า-กลางวัน-เย็น';
          document.getElementById('sd-qty').value = '10';
          document.getElementById('sd-qty-unit-label').textContent = (d.dosage_form === 'Capsule' ? 'แคปซูล' : 'เม็ด');
        }

        this.updatePrescriptionSigBuilder();
        lucide.createIcons();
      },
      setQuickDose(amount, unit) {
        document.getElementById('sd-dose-amount').value = amount;
        document.getElementById('sd-dose-unit').value = unit;
        this.updatePrescriptionSigBuilder();
      },
      updatePrescriptionSigBuilder() {
        const amount = document.getElementById('sd-dose-amount').value;
        const unit = document.getElementById('sd-dose-unit').value;
        const freq = document.getElementById('sd-frequency-select').value;
        const sigInput = document.getElementById('sd-sig');

        if (freq === 'CUSTOM') {
          return;
        }

        let verb = 'รับประทาน';
        if (unit === 'ช้อนชา' || unit === 'ช้อนโต๊ะ' || unit.includes('CC')) {
          verb = 'รับประทาน';
        } else if (unit === 'หลอด' || freq.includes('ทา')) {
          verb = 'ใช้';
        } else if (unit === 'หยด' || freq.includes('หยอด')) {
          verb = 'หยอด';
        } else if (unit === 'พ่น' || freq.includes('พ่น')) {
          verb = 'พ่น';
        }

        if (freq.includes('ทาบริเวณที่เป็น')) {
          sigInput.value = 'ทาบริเวณที่เป็น ' + freq.replace('ทาบริเวณที่เป็น ', '');
        } else if (freq.includes('หยอดตา/หู')) {
          sigInput.value = 'หยอดตา/หู ครั้งละ ' + amount + ' ' + unit + ' ' + freq.replace('หยอดตา/หู ', '');
        } else {
          sigInput.value = verb + 'ครั้งละ ' + amount + ' ' + unit + ' ' + freq;
        }
      },
      confirmAddDrugToPrescription() {
        if (!State.selectedVisit || !State.selectedDrugToAdd) return;
        const d = State.selectedDrugToAdd;
        const qty = parseInt(document.getElementById('sd-qty').value, 10) || 1;
        const sig = document.getElementById('sd-sig').value.trim();

        const patient = DB.get(STORAGE_KEYS.PATIENTS).find(p => p.hn === State.selectedVisit.hn);
        if (patient?.drug_allergy && patient.drug_allergy.toLowerCase().includes(d.generic_name.toLowerCase())) {
          if (!confirm('⚠️ คำเตือน: ผู้ป่วยมีประวัติแพ้ยา "' + patient.drug_allergy + '"\nต้องการสั่งยานี้จริงหรือไม่?')) return;
        }

        if (!State.selectedVisit.prescriptions) State.selectedVisit.prescriptions = [];
        State.selectedVisit.prescriptions.push({
          drug_id: d.drug_id,
          generic_name: d.generic_name + ' ' + (d.strength || ''),
          trade_name: d.trade_name,
          qty: qty,
          sig: sig,
          unit_price: d.sale_price,
          amount: d.sale_price * qty
        });

        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const drugObj = drugs.find(x => x.drug_id === d.drug_id);
        if (drugObj) {
          const stockBefore = drugObj.stock || 0;
          drugObj.stock = Math.max(0, stockBefore - qty);
          DB.set(STORAGE_KEYS.DRUGS, drugs);
          StockModule.recordStockTx({
            drug_id: drugObj.drug_id,
            generic_name: drugObj.generic_name,
            trade_name: drugObj.trade_name || '',
            visit_id: State.selectedVisit.visit_id,
            type: 'SALE',
            qty: qty,
            cost_price: drugObj.purchase_price || 0,
            sale_price: d.sale_price || 0,
            stock_before: stockBefore,
            stock_after: drugObj.stock,
            reference_no: State.selectedVisit.an || '',
            note: 'สั่งจ่ายยาสำหรับ Visit ' + (State.selectedVisit.an || '')
          });
        }

        this.closeAddDrugModal();
        this.renderPrescriptionTable();
        DashboardModule.render();
      },
      updateDrugSig(idx, val) { if (State.selectedVisit?.prescriptions[idx]) State.selectedVisit.prescriptions[idx].sig = val; },
      updateDrugQty(idx, val) {
        if (State.selectedVisit?.prescriptions[idx]) {
          const item = State.selectedVisit.prescriptions[idx];
          const oldQty = item.qty || 0;
          const newQty = parseInt(val, 10) || 1;
          const diff = newQty - oldQty;
          item.qty = newQty;
          item.amount = item.qty * item.unit_price;

          if (diff !== 0 && item.drug_id) {
            const drugs = DB.get(STORAGE_KEYS.DRUGS);
            const drugObj = drugs.find(x => x.drug_id === item.drug_id);
            if (drugObj) {
              const stockBefore = drugObj.stock || 0;
              drugObj.stock = Math.max(0, stockBefore - diff);
              DB.set(STORAGE_KEYS.DRUGS, drugs);
              StockModule.recordStockTx({
                drug_id: drugObj.drug_id,
                generic_name: drugObj.generic_name,
                trade_name: drugObj.trade_name || '',
                visit_id: State.selectedVisit.visit_id,
                type: diff > 0 ? 'SALE' : 'RETURN',
                qty: Math.abs(diff),
                cost_price: drugObj.purchase_price || 0,
                sale_price: item.unit_price || 0,
                stock_before: stockBefore,
                stock_after: drugObj.stock,
                reference_no: State.selectedVisit.an || '',
                note: (diff > 0 ? 'ปรับเพิ่มจำนวนยาใน Visit' : 'ปรับลดจำนวนยาใน Visit')
              });
            }
          }
          this.renderPrescriptionTable();
        }
      },
      removeDrugFromVisit(idx) {
        if (!State.selectedVisit?.prescriptions) return;
        const item = State.selectedVisit.prescriptions[idx];
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const drugObj = drugs.find(x => x.drug_id === item.drug_id);
        if (drugObj) {
          const stockBefore = drugObj.stock || 0;
          drugObj.stock = stockBefore + item.qty;
          DB.set(STORAGE_KEYS.DRUGS, drugs);
          StockModule.recordStockTx({
            drug_id: drugObj.drug_id,
            generic_name: drugObj.generic_name,
            trade_name: drugObj.trade_name || '',
            visit_id: State.selectedVisit.visit_id,
            type: 'RETURN',
            qty: item.qty,
            cost_price: drugObj.purchase_price || 0,
            sale_price: item.unit_price || 0,
            stock_before: stockBefore,
            stock_after: drugObj.stock,
            reference_no: State.selectedVisit.an || '',
            note: 'ลบรายการยาออกจาก Visit ' + (State.selectedVisit.an || '')
          });
        }

        State.selectedVisit.prescriptions.splice(idx, 1);
        this.renderPrescriptionTable();
        DashboardModule.render();
      },
      saveCurrentVisitDraft() {
        if (!State.selectedVisit) return;
        const v = State.selectedVisit;
        v.vitals = {
          bp: document.getElementById('v-bp').value.trim(),
          pr: document.getElementById('v-pr').value.trim(),
          temp: document.getElementById('v-temp').value.trim(),
          weight: document.getElementById('v-weight').value.trim(),
          height: document.getElementById('v-height').value.trim(),
          bmi: document.getElementById('v-bmi').value.trim()
        };
        v.chief_complaint = document.getElementById('v-cc').value.trim();
        v.present_illness = document.getElementById('v-pi').value.trim();
        v.physical_exam = document.getElementById('v-pe').value.trim();
        this.syncDxAssessmentText();

        const appDate = document.getElementById('v-app-date').value;
        if (appDate) {
          v.appointment = {
            date: appDate,
            time: document.getElementById('v-app-time').value || '09:00',
            reason: document.getElementById('v-app-reason').value.trim()
          };
          AppointmentModule.syncFromVisit(v);
        } else { v.appointment = null; }

        const medTotal = (v.prescriptions || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const labTotal = (v.labs || []).reduce((sum, l) => sum + (l.price || 0), 0);
        const procTotal = (v.procedures || []).reduce((sum, p) => sum + (p.price || 0), 0);
        const subtotal = medTotal + labTotal + procTotal;

        if (!v.billing) v.billing = {};
        v.billing.subtotal = subtotal;

        const pMethod = v.billing.payment_method || (v.service_type?.includes('A-Med') ? v.service_type : '');
        const isAmed2 = (pMethod === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)' || v.service_type === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)');
        const isAmed1 = (pMethod === 'A-Med สปสช. (เก็บส่วนต่าง)' || pMethod === 'A-Med (สปสช.)' || v.service_type === 'A-Med สปสช. (เก็บส่วนต่าง)' || v.service_type === 'A-Med');
        const isAmed = isAmed1 || isAmed2;
        let amedDeduct = isAmed ? 180.00 : 0;
        v.billing.amed_discount = amedDeduct;
        v.billing.amed_type = isAmed2 ? 'AMED_FREE' : (isAmed1 ? 'AMED_COPAY' : null);

        if (isAmed2) {
          v.billing.amed_clinic_support = Math.max(0, subtotal - (v.billing.discount || 0) - amedDeduct);
          v.billing.total = 0;
        } else {
          v.billing.amed_clinic_support = 0;
          v.billing.total = Math.max(0, subtotal - (v.billing.discount || 0) - amedDeduct);
        }

        // Ensure lab attachments are saved to IndexedDB
        if (v.lab_attachments && v.lab_attachments.length > 0 && typeof LabStorageDB !== 'undefined') {
          LabStorageDB.saveFilesBatch(v.lab_attachments);
        }

        const visits = DB.get(STORAGE_KEYS.VISITS);
        const idx = visits.findIndex(x => x.visit_id === v.visit_id);
        if (idx !== -1) visits[idx] = v;
        DB.upsertItem(STORAGE_KEYS.VISITS, v);

        this.renderLabAttachments();
        this.renderVisitList();
        DashboardModule.render();
        alert('บันทึกข้อมูลเวชระเบียนเรียบร้อยแล้ว');
      },
      closeVisitAndGoBilling() {
        this.saveCurrentVisitDraft();
        App.switchTab('tab-billing');
        BillingModule.loadVisitBilling(State.selectedVisit.visit_id);
      },
      reopenCurrentVisit() {
        if (!State.selectedVisit) return;
        if (!AuthModule.requireAdmin("ปลดล็อกแก้ไขเวชระเบียนที่ปิดบิลแล้ว")) return;
        const reason = prompt('กรุณาระบุเหตุผลการขอปลดล็อกแก้ไข:');
        if (!reason) return;

        State.selectedVisit.status = 'OPEN';
        if (State.selectedVisit.billing) State.selectedVisit.billing.paid = false;

        const visits = DB.get(STORAGE_KEYS.VISITS);
        const idx = visits.findIndex(x => x.visit_id === State.selectedVisit.visit_id);
        if (idx !== -1) visits[idx] = State.selectedVisit;
        DB.set(STORAGE_KEYS.VISITS, visits);

        const logs = DB.get(STORAGE_KEYS.AUDIT_LOGS);
        logs.push({ log_id: 'LOG_' + Date.now(), action: "REOPEN_VISIT", an: State.selectedVisit.an, user: AuthModule.currentRole, reason: reason, timestamp: new Date().toISOString() });
        DB.set(STORAGE_KEYS.AUDIT_LOGS, logs);

        this.loadVisitToChart(State.selectedVisit);
        this.renderVisitList();
        DashboardModule.render();
        alert('ปลดล็อก Visit สำหรับแก้ไขเรียบร้อยแล้ว');
      },
      deleteCurrentVisit() {
        if (!State.selectedVisit) {
          alert('กรุณาเลือก Visit ที่ต้องการลบก่อน');
          return;
        }
        if (!AuthModule.requireAdmin("ลบข้อมูล Visit / การตรวจนี้")) return;

        const an = State.selectedVisit.an || '';
        const name = State.selectedVisit.patient_name || '';
        if (!confirm('⚠️ ยืนยันการลบ Visit ' + an + ' (' + name + ') หรือไม่?\nข้อมูลการตรวจและค่าใช้จ่ายของ Visit นี้จะถูกลบออกจากระบบอย่างถาวร')) return;

        // คืนสต็อกยาทั้งหมดที่สั่งจ่ายใน Visit นี้กลับเข้าคลัง
        const prescriptions = State.selectedVisit.prescriptions || [];
        if (prescriptions.length > 0) {
          const drugs = DB.get(STORAGE_KEYS.DRUGS);
          prescriptions.forEach(p => {
            const d = drugs.find(x => x.drug_id === p.drug_id);
            if (d) {
              const stockBefore = d.stock || 0;
              d.stock = stockBefore + (p.qty || 0);
              StockModule.recordStockTx({
                drug_id: d.drug_id,
                generic_name: d.generic_name,
                trade_name: d.trade_name || '',
                visit_id: State.selectedVisit.visit_id,
                type: 'RETURN_CANCEL_VISIT',
                qty: p.qty || 0,
                cost_price: d.purchase_price || 0,
                sale_price: p.unit_price || 0,
                stock_before: stockBefore,
                stock_after: d.stock,
                reference_no: an,
                note: 'คืนสต็อกยาจากการลบ Visit ' + an
              });
            }
          });
          DB.set(STORAGE_KEYS.DRUGS, drugs);
        }

        const visitId = State.selectedVisit.visit_id;
        DB.deleteItem(STORAGE_KEYS.VISITS, visitId, 'visit_id');

        const logs = DB.get(STORAGE_KEYS.AUDIT_LOGS) || [];
        logs.push({
          log_id: 'LOG_' + Date.now(),
          action: "DELETE_VISIT",
          an: an,
          user: AuthModule.currentRole,
          timestamp: new Date().toISOString()
        });
        DB.set(STORAGE_KEYS.AUDIT_LOGS, logs);

        State.selectedVisit = null;
        const emptySt = document.getElementById('chart-empty-state');
        const formCont = document.getElementById('chart-form-content');
        const actEl = document.getElementById('chart-actions');
        if (emptySt) emptySt.style.display = 'block';
        if (formCont) formCont.style.display = 'none';
        if (actEl) actEl.style.display = 'none';

        this.renderVisitList();
        DashboardModule.render();
        if (typeof AnMasterModule !== 'undefined') AnMasterModule.render();
        if (typeof CertificateModule !== 'undefined') CertificateModule.populateSelect();
        alert('ลบ Visit ' + an + ' เรียบร้อยแล้ว');
      }
    };

    /* Patient Full Medical History Module (เรียกดูข้อมูลเก่า/ย้อนหลังขณะตรวจ) */

const AppointmentModule = {
      render() {
        const filterDate = document.getElementById('app-filter-date')?.value || '';
        const searchKeyword = (document.getElementById('app-search-keyword')?.value || '').trim().toLowerCase();
        const apps = DB.get(STORAGE_KEYS.APPOINTMENTS) || [];
        const tbody = document.querySelector('#appointments-master-table tbody');
        if (!tbody) return;

        let filtered = apps.filter(a => {
          const aDate = (a.date || a.appt_date || '').trim();
          if (!aDate) return false;
          if (filterDate && aDate !== filterDate) return false;
          if (searchKeyword) {
            const matchHn = (a.hn || '').toLowerCase().includes(searchKeyword);
            const matchName = (a.patient_name || '').toLowerCase().includes(searchKeyword);
            if (!matchHn && !matchName) return false;
          }
          return true;
        });

        // Sort by date then time
        filtered.sort((x, y) => {
          const dx = (x.date || x.appt_date || '') + ' ' + (x.time || x.appt_time || '');
          const dy = (y.date || y.appt_date || '') + ' ' + (y.time || y.appt_time || '');
          return dx.localeCompare(dy);
        });

        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--slate-400); padding: 18px;">ไม่พบรายการนัดหมาย</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map((a) => {
          const aId = a.appointment_id || a.app_id;
          const aDate = a.date || a.appt_date || '-';
          const aTime = a.time || a.appt_time || '09:00';
          return '<tr>' +
            '<td><strong>' + (aDate !== '-' ? Utils.formatDateShort(aDate) : '-') + '</strong></td>' +
            '<td>' + aTime + ' น.</td>' +
            '<td>' + (a.hn || '-') + '</td>' +
            '<td><strong>' + (a.patient_name || '-') + '</strong></td>' +
            '<td><span class="badge badge-primary">OPD</span></td>' +
            '<td>' + (a.reason || '-') + '</td>' +
            '<td>' + (a.doctor || 'นพ. กชณัฐ พันธุ์วรรธนะสิน') + '</td>' +
            '<td><div style="display: flex; gap: 4px;">' +
              '<button class="btn btn-outline btn-sm" onclick="AppointmentModule.printSlipById(\'' + aId + '\')"><i data-lucide="printer"></i> ใบนัด</button>' +
              '<button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="AppointmentModule.deleteAppointment(\'' + aId + '\')"><i data-lucide="trash-2"></i> ลบ</button>' +
            '</div></td></tr>';
        }).join('');
        lucide.createIcons();
      },
      setToday() {
        document.getElementById('app-filter-date').value = new Date().toISOString().slice(0, 10);
        this.render();
      },
      clearFilter() {
        document.getElementById('app-filter-date').value = '';
        const searchEl = document.getElementById('app-search-keyword');
        if (searchEl) searchEl.value = '';
        this.render();
      },
      addDays(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        document.getElementById('v-app-date').value = d.toISOString().slice(0, 10);
      },
      saveVisitAppointment() {
        if (!State.selectedVisit) {
          alert('กรุณาเลือกผู้ป่วย/Visit ก่อนทำการบันทึกนัดหมาย');
          return;
        }
        const appDate = (document.getElementById('v-app-date')?.value || '').trim();
        const appTime = (document.getElementById('v-app-time')?.value || '').trim();
        const appReason = (document.getElementById('v-app-reason')?.value || '').trim();

        if (!appDate) {
          alert('⚠️ กรุณาระบุ "วันที่นัด" ก่อนทำการบันทึกนัดหมาย');
          document.getElementById('v-app-date')?.focus();
          return;
        }
        if (!appTime) {
          alert('⚠️ กรุณาระบุ "เวลานัด" ก่อนทำการบันทึกนัดหมาย');
          document.getElementById('v-app-time')?.focus();
          return;
        }

        const v = State.selectedVisit;
        v.appointment = {
          date: appDate,
          appt_date: appDate,
          time: appTime,
          appt_time: appTime,
          reason: appReason
        };

        this.syncFromVisit(v);

        // Update visit draft in DB
        const visits = DB.get(STORAGE_KEYS.VISITS) || [];
        const idx = visits.findIndex(x => x.visit_id === v.visit_id);
        if (idx !== -1) visits[idx] = v;
        DB.upsertItem(STORAGE_KEYS.VISITS, v);

        alert('✅ บันทึกนัดหมายผู้ป่วย "' + v.patient_name + '" วันที่ ' + Utils.formatDateShort(appDate) + ' เวลา ' + appTime + ' น. เรียบร้อยแล้ว');
      },
      syncFromVisit(v) {
        const appDate = v.appointment?.date || v.appointment?.appt_date;
        if (!appDate) return;
        const appTime = v.appointment?.time || v.appointment?.appt_time || '09:00';
        const apps = DB.get(STORAGE_KEYS.APPOINTMENTS) || [];
        const existingIdx = apps.findIndex(a => a.hn === v.hn && ((a.date && a.date === appDate) || (a.appt_date && a.appt_date === appDate)));
        const aid = (existingIdx !== -1) ? (apps[existingIdx].appointment_id || apps[existingIdx].app_id) : ('APP_' + Date.now());
        const item = {
          app_id: aid,
          appointment_id: aid,
          hn: v.hn,
          patient_id: v.patient_id || v.hn,
          patient_name: v.patient_name,
          date: appDate,
          appt_date: appDate,
          time: appTime,
          appt_time: appTime,
          reason: v.appointment?.reason || '',
          doctor: v.doctor || 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน',
          status: "PENDING",
          note: v.appointment?.note || ''
        };
        DB.upsertItem(STORAGE_KEYS.APPOINTMENTS, item, 'appointment_id');
        this.render();
        DashboardModule.render();
      },
      printCurrentSlip() {
        if (!State.selectedVisit) return;
        const appDate = (document.getElementById('v-app-date')?.value || '').trim();
        const appTime = (document.getElementById('v-app-time')?.value || '').trim();
        const appReason = (document.getElementById('v-app-reason')?.value || '').trim();
        if (!appDate) { alert('⚠️ กรุณาระบุ "วันที่นัด" ก่อนพิมพ์ใบนัด'); return; }
        if (!appTime) { alert('⚠️ กรุณาระบุ "เวลานัด" ก่อนพิมพ์ใบนัด'); return; }

        // Auto-save before printing
        State.selectedVisit.appointment = {
          date: appDate,
          appt_date: appDate,
          time: appTime,
          appt_time: appTime,
          reason: appReason
        };
        this.syncFromVisit(State.selectedVisit);

        this.generateAppointmentPrint(State.selectedVisit.hn, State.selectedVisit.patient_name, appDate, appTime, appReason, State.selectedVisit.doctor);
      },
      printSlipById(appId) {
        const a = (DB.get(STORAGE_KEYS.APPOINTMENTS) || []).find(x => (x.appointment_id === appId || x.app_id === appId));
        if (a) {
          const aDate = a.date || a.appt_date || '';
          const aTime = a.time || a.appt_time || '09:00';
          this.generateAppointmentPrint(a.hn, a.patient_name, aDate, aTime, a.reason, a.doctor);
        }
      },
      deleteAppointment(appId) {
        const apps = DB.get(STORAGE_KEYS.APPOINTMENTS) || [];
        const a = apps.find(x => (x.appointment_id === appId || x.app_id === appId));
        if (!a) return;
        const patName = a.patient_name || a.hn;
        const aDate = a.date || a.appt_date || '';
        if (!confirm('ยืนยันต้องการยกเลิก/ลบรายการนัดหมายของ ' + patName + ' (วันที่ ' + (aDate ? Utils.formatDateShort(aDate) : '-') + ') หรือไม่?')) {
          return;
        }
        DB.deleteItem(STORAGE_KEYS.APPOINTMENTS, appId, 'appointment_id');
        const remaining = (DB.get(STORAGE_KEYS.APPOINTMENTS) || []).filter(x => x.appointment_id !== appId && x.app_id !== appId);
        DB.set(STORAGE_KEYS.APPOINTMENTS, remaining);

        this.render();
        DashboardModule.render();
        alert('🗑️ ลบรายการนัดหมายเรียบร้อยแล้ว');
      },
      openNewModal() {
        document.getElementById('app-new-patient-search').value = '';
        document.getElementById('app-new-hn').value = '';
        document.getElementById('app-new-name').value = '';
        document.getElementById('app-new-patient-selected').style.display = 'none';
        document.getElementById('app-new-patient-dropdown').style.display = 'none';

        const d = new Date();
        d.setDate(d.getDate() + 7);
        document.getElementById('app-new-date').value = d.toISOString().slice(0, 10);
        document.getElementById('app-new-time').value = '09:00';
        document.getElementById('app-new-reason').value = '';
        document.getElementById('app-new-note').value = '';

        const docSelect = document.getElementById('app-new-doctor');
        if (docSelect) {
          const doctors = DB.get(STORAGE_KEYS.DOCTORS) || [];
          if (doctors.length > 0) {
            docSelect.innerHTML = doctors.map(doc => {
              const fullName = (doc.title || '') + (doc.first_name || '') + ' ' + (doc.last_name || '');
              return '<option value="' + fullName + '">' + fullName + '</option>';
            }).join('');
          } else {
            docSelect.innerHTML = '<option value="นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน">นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน</option>';
          }
        }

        if (State.selectedVisit) {
          this.selectPatientModal(State.selectedVisit.hn, State.selectedVisit.patient_name);
        }

        document.getElementById('modal-appointment-new')?.classList.add('active');
        lucide.createIcons();
      },
      closeNewModal() {
        document.getElementById('modal-appointment-new')?.classList.remove('active');
      },
      searchPatients(keyword) {
        const kw = (keyword || '').trim().toLowerCase();
        const drop = document.getElementById('app-new-patient-dropdown');
        if (!drop) return;
        if (kw.length === 0) {
          drop.style.display = 'none';
          return;
        }
        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];
        const matched = patients.filter(p => {
          const hnMatch = (p.hn || '').toLowerCase().includes(kw);
          const nameMatch = ((p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase().includes(kw);
          const cidMatch = (p.national_id || '').includes(kw);
          const phoneMatch = (p.phone || '').includes(kw);
          return hnMatch || nameMatch || cidMatch || phoneMatch;
        }).slice(0, 8);

        if (matched.length === 0) {
          drop.innerHTML = '<div style="padding: 10px; color: var(--slate-400); text-align: center; font-size: 0.84rem;">ไม่พบผู้ป่วยที่ตรงกับการค้นหา</div>';
          drop.style.display = 'block';
          return;
        }

        drop.innerHTML = matched.map(p => {
          const fullName = (p.title || '') + (p.first_name || '') + ' ' + (p.last_name || '');
          const safeName = fullName.replace(/'/g, "\'");
          return '<div style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'white\'" onclick="AppointmentModule.selectPatientModal(\'' + p.hn + '\', \'' + safeName + '\')">' +
            '<div><strong>' + fullName + '</strong> <span style="color: var(--slate-500); font-size: 0.8rem;">HN: ' + p.hn + '</span></div>' +
            '<span class="badge badge-outline" style="font-size: 0.72rem;">' + (p.rights || 'UC') + '</span>' +
          '</div>';
        }).join('');
        drop.style.display = 'block';
      },
      selectPatientModal(hn, name) {
        document.getElementById('app-new-hn').value = hn;
        document.getElementById('app-new-name').value = name;
        document.getElementById('app-new-patient-search').value = name + ' (HN: ' + hn + ')';
        document.getElementById('app-new-patient-display').textContent = name + ' (HN: ' + hn + ')';
        document.getElementById('app-new-patient-selected').style.display = 'block';
        document.getElementById('app-new-patient-dropdown').style.display = 'none';
      },
      clearSelectedPatientModal() {
        document.getElementById('app-new-hn').value = '';
        document.getElementById('app-new-name').value = '';
        document.getElementById('app-new-patient-search').value = '';
        document.getElementById('app-new-patient-selected').style.display = 'none';
        document.getElementById('app-new-patient-dropdown').style.display = 'none';
        document.getElementById('app-new-patient-search').focus();
      },
      addDaysModal(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        document.getElementById('app-new-date').value = d.toISOString().slice(0, 10);
      },
      setReasonModal(text) {
        document.getElementById('app-new-reason').value = text;
      },
      saveModalAppointment() {
        const hn = document.getElementById('app-new-hn')?.value || '';
        const name = document.getElementById('app-new-name')?.value || '';
        if (!hn || !name) {
          alert('⚠️ กรุณาค้นหาและเลือกผู้ป่วยก่อนทำการบันทึกนัดหมาย');
          document.getElementById('app-new-patient-search')?.focus();
          return;
        }
        const dateVal = (document.getElementById('app-new-date')?.value || '').trim();
        const timeVal = (document.getElementById('app-new-time')?.value || '').trim();
        if (!dateVal) {
          alert('⚠️ กรุณาระบุ "วันที่นัด" ก่อนทำการบันทึกนัดหมาย');
          document.getElementById('app-new-date')?.focus();
          return;
        }
        if (!timeVal) {
          alert('⚠️ กรุณาระบุ "เวลานัด" ก่อนทำการบันทึกนัดหมาย');
          document.getElementById('app-new-time')?.focus();
          return;
        }
        const reason = (document.getElementById('app-new-reason')?.value || '').trim();
        const doctor = document.getElementById('app-new-doctor')?.value || 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
        const note = (document.getElementById('app-new-note')?.value || '').trim();

        const aid = 'APP_' + Date.now();
        const item = {
          app_id: aid,
          appointment_id: aid,
          hn: hn,
          patient_id: hn,
          patient_name: name,
          date: dateVal,
          appt_date: dateVal,
          time: timeVal,
          appt_time: timeVal,
          reason: reason,
          doctor: doctor,
          status: "PENDING",
          note: note
        };

        DB.upsertItem(STORAGE_KEYS.APPOINTMENTS, item, 'appointment_id');
        this.closeNewModal();
        this.render();
        DashboardModule.render();
        alert('🎉 บันทึกการนัดหมายผู้ป่วย "' + name + '" วันที่ ' + Utils.formatDateShort(dateVal) + ' เวลา ' + timeVal + ' น. เรียบร้อยแล้ว');
      },
      generateAppointmentPrint(hn, name, date, time, reason, doctor) {
        const w = window.open('', '', 'width=600,height=650');
        w.document.write('<html><head><title>ใบนัดตรวจผู้ป่วย</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Sarabun,sans-serif;padding:30px;}.card{border:2px dashed #0f766e;border-radius:12px;padding:24px;text-align:center;}.logo{width:60px;height:60px;margin-bottom:8px;}.info-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0;text-align:left;font-size:14px;line-height:1.8;}</style></head><body><div class="card"><img src="' + CLINIC_LOGO + '" class="logo"><h2 style="margin:0;color:#0f766e;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</h2><p style="font-size:12px;color:#555;margin:4px 0 12px;">ง.69/151 ถ.ดาวดึงส์ ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์ | โทร. 098-3825767</p><h3 style="margin:0;text-decoration:underline;">ใบนัดหมายตรวจรักษา (Appointment Slip)</h3><div class="info-box"><div><strong>ชื่อ-นามสกุล:</strong> ' + name + ' &nbsp;&nbsp; <strong>HN:</strong> ' + hn + '</div><div><strong>วันนัดตรวจ:</strong> <span style="font-size:16px;font-weight:bold;color:#0f766e;">' + Utils.formatDateShort(date) + '</span> &nbsp;&nbsp; <strong>เวลา:</strong> ' + time + ' น.</div><div><strong>เหตุผลการนัด:</strong> ' + (reason || 'ตรวจติดตามอาการ') + '</div><div><strong>แพทย์ผู้นัด:</strong> ' + (doctor || 'นพ. กชณัฐ พันธุ์วรรธนะสิน') + '</div></div><p style="font-size:12px;color:#666;">* กรุณานำใบนัดและบัตรประชาชนมาด้วยในวันตรวจรักษา</p></div>' + '<' + 'script>window.onload=function(){window.print();window.close();}<' + '/script>' + '</body></html>');
        w.document.close();
      }
    };

const PeTemplateModule = {
      init() {
        this.renderQuickDropdownAndChips();
      },
      renderQuickDropdownAndChips() {
        const templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        const select = document.getElementById('pe-quick-template-select');
        if (select) {
          select.innerHTML = '<option value="">-- เลือกชุดคำตรวจร่างกาย --</option>' + templates.map(t => 
            '<option value="' + t.template_id + '">' + t.title + ' (' + t.category + ')</option>'
          ).join('');
        }

        const chipsContainer = document.getElementById('pe-quick-chips');
        if (chipsContainer) {
          chipsContainer.innerHTML = templates.slice(0, 5).map(t =>
            '<button type="button" class="badge badge-primary" style="cursor: pointer; border: 1px solid var(--primary-300); font-size: 0.72rem; padding: 2px 6px;" onclick="PeTemplateModule.applyTemplateToPE(\'' + t.template_id + '\')"><i data-lucide="plus-circle" style="width: 11px; height: 11px;"></i> ' + t.title.split(' ')[0] + '</button>'
          ).join('');
          lucide.createIcons();
        }
      },
      applyTemplateToPE(templateId) {
        if (!templateId) return;
        const templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        const t = templates.find(x => x.template_id === templateId);
        if (!t) return;
        const peTextarea = document.getElementById('v-pe');
        if (!peTextarea) return;

        const currentVal = peTextarea.value.trim();
        if (!currentVal) {
          peTextarea.value = t.content;
        } else {
          peTextarea.value = currentVal + "\n" + t.content;
        }
        document.getElementById('pe-quick-template-select').value = '';
      },
      openManageModal() {
        if (!AuthModule.requireAdmin("จัดการชุดคำตรวจร่างกาย")) return;
        this.renderTable();
        document.getElementById('modal-pe-templates').classList.add('active');
        lucide.createIcons();
      },
      closeManageModal() {
        document.getElementById('modal-pe-templates').classList.remove('active');
        this.renderQuickDropdownAndChips();
      },
      renderTable() {
        const templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        const tbody = document.querySelector('#pe-templates-table tbody');
        if (!tbody) return;

        if (templates.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--slate-400);">ยังไม่มีชุดคำตรวจร่างกาย</td></tr>';
          return;
        }

        tbody.innerHTML = templates.map(t =>
          '<tr><td><strong>' + t.title + '</strong></td>' +
          '<td><span class="badge badge-primary">' + (t.category || 'ทั่วไป') + '</span></td>' +
          '<td style="font-size: 0.78rem; color: var(--slate-700); max-width: 320px; white-space: normal;">' + t.content + '</td>' +
          '<td style="text-align: center;"><div style="display: inline-flex; gap: 4px;"><button class="btn btn-outline btn-sm" onclick="PeTemplateModule.openEditTemplateModal(\'' + t.template_id + '\')"><i data-lucide="edit-2"></i></button><button class="btn btn-danger btn-sm" onclick="PeTemplateModule.deleteTemplate(\'' + t.template_id + '\')"><i data-lucide="trash-2"></i></button></div></td></tr>'
        ).join('');
        lucide.createIcons();
      },
      openNewTemplateModal() {
        document.getElementById('form-pe-template').reset();
        document.getElementById('pe-edit-id').value = '';
        document.getElementById('modal-pe-edit-title').innerHTML = '<i data-lucide="plus"></i> เพิ่มชุดคำตรวจร่างกายใหม่';
        document.getElementById('modal-pe-edit').classList.add('active');
        lucide.createIcons();
      },
      openEditTemplateModal(id) {
        const templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        const t = templates.find(x => x.template_id === id);
        if (!t) return;
        document.getElementById('pe-edit-id').value = t.template_id;
        document.getElementById('pe-edit-title').value = t.title;
        document.getElementById('pe-edit-category').value = t.category || 'ทั่วไป';
        document.getElementById('pe-edit-content').value = t.content;
        document.getElementById('modal-pe-edit-title').innerHTML = '<i data-lucide="edit-2"></i> แก้ไขชุดคำตรวจร่างกาย';
        document.getElementById('modal-pe-edit').classList.add('active');
        lucide.createIcons();
      },
      closeEditModal() {
        document.getElementById('modal-pe-edit').classList.remove('active');
      },
      saveTemplate() {
        const title = document.getElementById('pe-edit-title').value.trim();
        const content = document.getElementById('pe-edit-content').value.trim();
        const category = document.getElementById('pe-edit-category').value;
        const id = document.getElementById('pe-edit-id').value;

        if (!title || !content) { alert('กรุณากรอกชื่อชุดคำและข้อความตรวจร่างกาย'); return; }

        const templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        const data = {
          template_id: id || ('PE_' + Date.now()),
          title: title,
          category: category,
          content: content
        };

        if (id) {
          const idx = templates.findIndex(x => x.template_id === id);
          if (idx !== -1) templates[idx] = data;
        } else {
          templates.push(data);
        }
        DB.upsertItem(STORAGE_KEYS.PE_TEMPLATES, data);
        this.closeEditModal();
        this.renderTable();
        this.renderQuickDropdownAndChips();
        alert('บันทึกชุดคำ "' + data.title + '" เรียบร้อยแล้ว');
      },
      deleteTemplate(id) {
        if (!confirm('ต้องการลบชุดคำตรวจร่างกายนี้หรือไม่?')) return;
        let templates = DB.get(STORAGE_KEYS.PE_TEMPLATES) || [];
        templates = templates.filter(x => x.template_id !== id);
        DB.set(STORAGE_KEYS.PE_TEMPLATES, templates);
        this.renderTable();
        this.renderQuickDropdownAndChips();
      },
      resetDefaults() {
        if (!confirm('ต้องการคืนค่าชุดคำตรวจร่างกายเป็นค่าเริ่มต้นทั้งหมดหรือไม่?')) return;
        DB.set(STORAGE_KEYS.PE_TEMPLATES, [{"template_id":"PE_1","title":"ตรวจปกติทุกระบบ (Normal PE)","category":"ทั่วไป","content":"HEENT: not pale, no jaundice, pharynx not injected. Heart: regular, normal S1S2, no murmur. Lungs: clear, equal breath sounds, no adventitious sounds. Abd: soft, non-tender, normal active bowel sounds. Ext: no edema, good capillary refill."},{"template_id":"PE_2","title":"คออักเสบ / ไข้หวัด (URI / Pharyngitis)","category":"ทางเดินหายใจ","content":"HEENT: mild injected pharynx, tonsils 1+ not enlarged, no exudate, no cervical lymphadenopathy. Heart: regular rhythm, normal S1S2. Lungs: clear to auscultation, no wheezing, no crepitation. Abd: soft, non-tender."},{"template_id":"PE_3","title":"หลอดลมอักเสบ / หอบหืด (Bronchitis / Asthma)","category":"ทางเดินหายใจ","content":"HEENT: mildly injected pharynx. Heart: regular rhythm. Lungs: occasional rhonchi / wheezing both lower lungs, prolonged expiratory phase. Abd: soft, not distended, non-tender."},{"template_id":"PE_4","title":"โรคกระเพาะ / แน่นท้อง (Dyspepsia / Gastritis)","category":"ทางเดินอาหาร","content":"HEENT: normal. Heart & Lungs: clear, normal. Abd: soft, mild tenderness at epigastrium, no guarding, no rebound tenderness, normal active bowel sounds."},{"template_id":"PE_5","title":"อุจจาระร่วงเฉียบพลัน (Acute Diarrhea / AGE)","category":"ทางเดินอาหาร","content":"HEENT: dry lips, tongue not dry. Heart: normal S1S2. Lungs: clear. Abd: soft, generalized mild tenderness, hyperactive bowel sounds, no peritoneal signs. Ext: good skin turgor."},{"template_id":"PE_6","title":"ปวดเมื่อยกล้ามเนื้อ (Myalgia / Back Pain)","category":"กล้ามเนื้อและกระดูก","content":"Musculoskeletal: tenderness over trapezius / lumbar paraspinal muscles, full range of motion, no joint swelling, no erythema, no deformity. Neuro: motor power grade V, sensation intact."},{"template_id":"PE_7","title":"ตรวจสุขภาพทั่วไป (General Health Checkup)","category":"ตรวจสุขภาพ","content":"General: good consciousness, well-oriented, not pale, no jaundice. Heart: regular rhythm, no murmur. Lungs: clear both lung fields. Abd: soft, no hepatosplenomegaly. Ext: no edema."}]);
        this.renderTable();
        this.renderQuickDropdownAndChips();
        alert('คืนค่าชุดคำตรวจร่างกายเป็นค่าเริ่มต้นเรียบร้อย');
      }
    };

const AnMasterModule = {
      render() {
        const rawQuery = (document.getElementById('an-master-search-input')?.value || '').trim();
        const query = rawQuery.toLowerCase();
        const digitsQuery = rawQuery.replace(/[^0-9]/g, '');
        const fromDate = document.getElementById('an-filter-from-date')?.value || '';
        const toDate = document.getElementById('an-filter-to-date')?.value || '';
        const statusFilter = document.getElementById('an-filter-status')?.value || '';

        const visits = DB.get(STORAGE_KEYS.VISITS);

        const filtered = visits.filter(v => {
          // Date range filter
          if (fromDate) {
            const vDate = (v.visit_date || '').slice(0, 10);
            if (vDate < fromDate) return false;
          }
          if (toDate) {
            const vDate = (v.visit_date || '').slice(0, 10);
            if (vDate > toDate) return false;
          }

          // Status filter
          if (statusFilter && v.status !== statusFilter) return false;

          // Text search filter
          if (!query) return true;

          if (v.an && (v.an.toLowerCase().includes(query) || (digitsQuery && v.an.replace(/[^0-9]/g, '').includes(digitsQuery)))) return true;
          if (v.hn && (v.hn.toLowerCase().includes(query) || (digitsQuery && v.hn.replace(/[^0-9]/g, '').includes(digitsQuery)))) return true;
          if (v.patient_name && v.patient_name.toLowerCase().includes(query)) return true;
          if (v.chief_complaint && v.chief_complaint.toLowerCase().includes(query)) return true;
          if (v.assessment && v.assessment.toLowerCase().includes(query)) return true;
          if (v.doctor && v.doctor.toLowerCase().includes(query)) return true;

          return false;
        });

        // Summary statistics
        const totalCount = filtered.length;
        const closedCount = filtered.filter(v => v.status === 'CLOSED').length;
        const openCount = filtered.filter(v => v.status === 'OPEN').length;
        const totalRev = filtered.reduce((sum, v) => sum + (v.billing?.total || 0), 0);

        const countEl = document.getElementById('an-stat-count');
        const closedEl = document.getElementById('an-stat-closed');
        const openEl = document.getElementById('an-stat-open');
        const revEl = document.getElementById('an-stat-revenue');

        if (countEl) countEl.textContent = totalCount;
        if (closedEl) closedEl.textContent = closedCount;
        if (openEl) openEl.textContent = openCount;
        if (revEl) revEl.textContent = '฿' + totalRev.toLocaleString();

        const tbody = document.querySelector('#an-master-table tbody');
        if (!tbody) return;

        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--slate-400); padding: 24px;"><i data-lucide="book-open" style="width: 32px; height: 32px; margin-bottom: 6px; opacity: 0.5;"></i><div>ไม่พบข้อมูล AN ที่ตรงกับเงื่อนไขการค้นหา</div></td></tr>';
          lucide.createIcons();
          return;
        }

        // Sort descending by AN / Date
        const sorted = filtered.slice().sort((a, b) => {
          const anA = parseInt((a.an || '').replace(/[^0-9]/g, ''), 10) || 0;
          const anB = parseInt((b.an || '').replace(/[^0-9]/g, ''), 10) || 0;
          return anB - anA;
        });

        tbody.innerHTML = sorted.map(v => {
          const dxText = (v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(', ') : (v.assessment || v.chief_complaint || '-');
          const totalAmount = v.billing?.total != null ? Number(v.billing.total).toFixed(2) : '0.00';
          const isClosed = v.status === 'CLOSED';

          return '<tr>' +
            '<td><strong style="color: var(--primary-700); font-size: 0.88rem;">' + v.an + '</strong></td>' +
            '<td style="font-size: 0.78rem; color: var(--slate-600);">' + (v.visit_date || '-') + '</td>' +
            '<td><strong style="color: var(--slate-700);">' + v.hn + '</strong></td>' +
            '<td><strong>' + v.patient_name + '</strong></td>' +
            '<td><span class="badge badge-primary" style="font-size: 0.72rem;">' + (v.service_type || 'OPD') + '</span></td>' +
            '<td style="max-width: 220px; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + dxText + '">' + dxText + '</td>' +
            '<td style="font-size: 0.78rem;">' + (v.doctor || '-') + '</td>' +
            '<td><strong style="color: #047857;">฿' + Number(totalAmount).toLocaleString() + '</strong></td>' +
            '<td><span class="badge ' + (isClosed ? 'badge-success' : 'badge-warning') + '">' + (isClosed ? 'เสร็จสิ้น' : 'รอตรวจ') + '</span></td>' +
            '<td><div style="display: flex; gap: 4px;">' +
              '<button class="btn btn-secondary btn-sm" onclick="VisitModule.selectVisitForChart(\'' + v.visit_id + '\')" title="เปิดดูประวัติและตรวจรักษา"><i data-lucide="clipboard-list"></i> ตรวจ</button>' +
              '<button class="btn btn-outline btn-sm" onclick="LabelModule.printVisitLabels(\'' + v.visit_id + '\')" title="พิมพ์ฉลากยา"><i data-lucide="tag"></i></button>' +
            '</div></td>' +
          '</tr>';
        }).join('');

        lucide.createIcons();
      },
      setDatePreset(preset) {
        const fromInput = document.getElementById('an-filter-from-date');
        const toInput = document.getElementById('an-filter-to-date');
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        if (preset === 'today') {
          fromInput.value = todayStr;
          toInput.value = todayStr;
        } else if (preset === 'this_month') {
          const firstDay = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
          fromInput.value = firstDay;
          toInput.value = todayStr;
        } else {
          fromInput.value = '';
          toInput.value = '';
        }
        this.render();
      },
      exportCsv() {
        const visits = DB.get(STORAGE_KEYS.VISITS);
        if (visits.length === 0) { alert('ไม่มีข้อมูลสำหรับส่งออก'); return; }

        let csvContent = "\uFEFFลำดับ AN,วันที่ตรวจ,HN,ชื่อ-นามสกุล,สิทธิ,อาการสำคัญ,การวินิจฉัย,แพทย์ผู้ตรวจ,ยอดเงินรวม (บาท),สถานะ\n";
        visits.forEach(v => {
          const dx = ((v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(';') : (v.assessment || '-')).replace(/"/g, '""');
          const cc = (v.chief_complaint || '-').replace(/"/g, '""');
          const row = [
            '"' + (v.an || '') + '"',
            '"' + (v.visit_date || '') + '"',
            '"' + (v.hn || '') + '"',
            '"' + (v.patient_name || '') + '"',
            '"' + (v.service_type || 'OPD') + '"',
            '"' + cc + '"',
            '"' + dx + '"',
            '"' + (v.doctor || '') + '"',
            (v.billing?.total || 0),
            '"' + (v.status === 'CLOSED' ? 'ตรวจเสร็จ' : 'รอตรวจ') + '"'
          ];
          csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "AN_Master_Export_" + new Date().toISOString().slice(0, 10) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      deleteVisit(visitId) {
        if (!AuthModule.requireAdmin("ลบข้อมูล Visit")) return;
        const visits = DB.get(STORAGE_KEYS.VISITS) || [];
        const v = visits.find(x => x.visit_id === visitId);
        if (!v) return;

        if (!confirm('⚠️ ยืนยันการลบ Visit ' + (v.an || '') + ' (' + (v.patient_name || '') + ') หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้')) return;

        // คืนสต็อกยาทั้งหมดที่สั่งจ่ายใน Visit นี้กลับเข้าคลัง
        const prescriptions = v.prescriptions || [];
        if (prescriptions.length > 0) {
          const drugs = DB.get(STORAGE_KEYS.DRUGS);
          prescriptions.forEach(p => {
            const d = drugs.find(x => x.drug_id === p.drug_id);
            if (d) {
              const stockBefore = d.stock || 0;
              d.stock = stockBefore + (p.qty || 0);
              StockModule.recordStockTx({
                drug_id: d.drug_id,
                generic_name: d.generic_name,
                trade_name: d.trade_name || '',
                visit_id: v.visit_id,
                type: 'RETURN_CANCEL_VISIT',
                qty: p.qty || 0,
                cost_price: d.purchase_price || 0,
                sale_price: p.unit_price || 0,
                stock_before: stockBefore,
                stock_after: d.stock,
                reference_no: v.an || '',
                note: 'คืนสต็อกยาจากการลบ Visit ' + (v.an || '')
              });
            }
          });
          DB.set(STORAGE_KEYS.DRUGS, drugs);
        }

        DB.deleteItem(STORAGE_KEYS.VISITS, visitId, 'visit_id');

        const logs = DB.get(STORAGE_KEYS.AUDIT_LOGS) || [];
        logs.push({
          log_id: 'LOG_' + Date.now(),
          action: "DELETE_VISIT",
          an: v.an || '',
          user: AuthModule.currentRole,
          timestamp: new Date().toISOString()
        });
        DB.set(STORAGE_KEYS.AUDIT_LOGS, logs);

        if (State.selectedVisit?.visit_id === visitId) {
          State.selectedVisit = null;
          const emptySt = document.getElementById('chart-empty-state');
          const formCont = document.getElementById('chart-form-content');
          const actEl = document.getElementById('chart-actions');
          if (emptySt) emptySt.style.display = 'block';
          if (formCont) formCont.style.display = 'none';
          if (actEl) actEl.style.display = 'none';
        }

        this.render();
        VisitModule.renderVisitList();
        DashboardModule.render();
        if (typeof CertificateModule !== 'undefined') CertificateModule.populateSelect();
        alert('ลบ Visit ' + v.an + ' เรียบร้อยแล้ว');
      }
    };