/* ==========================================================================
   OPD System - Laboratory & Clinical Procedures
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const LabModule = {
      render() {
        const query = (document.getElementById('lab-search-input')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('lab-cat-filter')?.value || '';
        const labs = DB.get(STORAGE_KEYS.LABS);
        const tbody = document.querySelector('#lab-master-table tbody');
        if (!tbody) return;

        const filtered = labs.filter(l => {
          const matchQuery = !query || l.name.toLowerCase().includes(query) || (l.category && l.category.toLowerCase().includes(query));
          const matchCat = !catFilter || l.category === catFilter;
          return matchQuery && matchCat;
        });

        tbody.innerHTML = filtered.map(l => 
          '<tr><td><span class="badge badge-gray">' + l.lab_id + '</span></td><td><strong>' + l.name + '</strong></td>' +
          '<td><span class="badge badge-primary">' + (l.category || 'Lab') + '</span></td>' +
          '<td><strong style="color: #1e40af;">฿' + Number(l.price).toFixed(2) + '</strong></td>' +
          '<td><span class="badge ' + (l.active !== false ? 'badge-success' : 'badge-danger') + '">' + (l.active !== false ? 'เปิด' : 'ปิด') + '</span></td>' +
          '<td><button class="btn btn-outline btn-sm" onclick="LabModule.openEditModal(\'' + l.lab_id + '\')"><i data-lucide="edit-2"></i> แก้ราคา</button></td></tr>'
        ).join('');
        lucide.createIcons();
      },
      switchSubTab(type) {
        const singleBtn = document.getElementById('tab-btn-lab-single');
        const setsBtn = document.getElementById('tab-btn-lab-sets');
        const singleView = document.getElementById('subview-lab-single');
        const setsView = document.getElementById('subview-lab-sets');
        const addLabBtn = document.getElementById('btn-add-lab-master');
        const addSetBtn = document.getElementById('btn-add-lab-set');

        if (type === 'sets') {
          if (singleBtn) singleBtn.className = 'btn btn-outline btn-sm';
          if (setsBtn) setsBtn.className = 'btn btn-primary btn-sm';
          if (singleView) singleView.style.display = 'none';
          if (setsView) setsView.style.display = 'block';
          if (addLabBtn) addLabBtn.style.display = 'none';
          if (addSetBtn) addSetBtn.style.display = 'inline-flex';
          LabSetModule.render();
        } else {
          if (singleBtn) singleBtn.className = 'btn btn-primary btn-sm';
          if (setsBtn) setsBtn.className = 'btn btn-outline btn-sm';
          if (singleView) singleView.style.display = 'block';
          if (setsView) setsView.style.display = 'none';
          if (addLabBtn) addLabBtn.style.display = 'inline-flex';
          if (addSetBtn) addSetBtn.style.display = 'none';
          this.render();
        }
        lucide.createIcons();
      },
      openNewLabModal() {
        if (!AuthModule.requireAdmin("เพิ่มรายการ Lab")) return;
        document.getElementById('form-lab').reset();
        document.getElementById('lb-id').value = '';
        document.getElementById('modal-lab-master').classList.add('active');
        lucide.createIcons();
      },
      openEditModal(labId) {
        if (!AuthModule.requireAdmin("แก้ไขราคา Lab")) return;
        const l = DB.get(STORAGE_KEYS.LABS).find(x => x.lab_id === labId);
        if (!l) return;
        document.getElementById('lb-id').value = l.lab_id;
        document.getElementById('lb-name').value = l.name;
        document.getElementById('lb-cat').value = l.category || 'HEMATOLOGY';
        document.getElementById('lb-price').value = l.price;
        document.getElementById('modal-lab-master').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-lab-master').classList.remove('active'); },
      saveLab() {
        const name = document.getElementById('lb-name').value.trim();
        if (!name) { alert('กรุณากรอกชื่อ Lab'); return; }
        const id = document.getElementById('lb-id').value;
        const labs = DB.get(STORAGE_KEYS.LABS);
        const data = {
          lab_id: id || ('LAB_' + Date.now()),
          name: name,
          category: document.getElementById('lb-cat').value,
          price: parseFloat(document.getElementById('lb-price').value) || 0,
          active: true
        };
        if (id) {
          const idx = labs.findIndex(x => x.lab_id === id);
          if (idx !== -1) labs[idx] = data;
        } else {
          labs.push(data);
        }
        DB.upsertItem(STORAGE_KEYS.LABS, data);
        this.closeModal();
        this.render();
        VisitModule.renderLabsDropdown();
        alert('บันทึกข้อมูล Lab เรียบร้อย');
      }
    };

const LabSetModule = {
      render() {
        const query = (document.getElementById('lab-set-search-input')?.value || '').toLowerCase().trim();
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const tbody = document.querySelector('#lab-sets-master-table tbody');
        if (!tbody) return;

        const filtered = sets.filter(s => {
          return !query || s.name.toLowerCase().includes(query) || (s.category && s.category.toLowerCase().includes(query)) || (s.description && s.description.toLowerCase().includes(query));
        });

        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--slate-400); padding: 18px;">ไม่พบชุดตรวจ Lab ที่ค้นหา</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(s => {
          const itemsHtml = (s.items || []).map(i => '<span class="badge badge-gray" style="font-size: 0.72rem; margin: 1px;">' + i.name + '</span>').join(' ');
          return '<tr>' +
            '<td><strong>' + s.name + '</strong></td>' +
            '<td><span class="badge badge-primary">' + (s.category || 'ชุดตรวจ') + '</span></td>' +
            '<td style="max-width: 340px;"><div style="font-size: 0.76rem; color: var(--slate-600); margin-bottom: 3px;">' + (s.description || '-') + '</div><div>' + itemsHtml + '</div></td>' +
            '<td><strong style="color: var(--primary-700);">' + (s.items || []).length + ' รายการ</strong></td>' +
            '<td><strong style="color: #047857;">฿' + Number(s.price).toFixed(2) + '</strong></td>' +
            '<td><div style="display: flex; gap: 4px;">' +
              '<button class="btn btn-outline btn-sm" onclick="LabSetModule.openEditModal(\'' + s.set_id + '\')"><i data-lucide="edit-2"></i></button>' +
              '<button class="btn btn-danger btn-sm" onclick="LabSetModule.deleteSet(\'' + s.set_id + '\')"><i data-lucide="trash-2"></i></button>' +
            '</div></td>' +
          '</tr>';
        }).join('');
        lucide.createIcons();
      },
      openNewModal() {
        document.getElementById('modal-lab-set-title').innerHTML = '<i data-lucide="layers"></i> สร้างชุดตรวจ Lab ใหม่ (New Lab Package)';
        document.getElementById('form-lab-set').reset();
        document.getElementById('ls-id').value = '';
        document.getElementById('ls-items-container').innerHTML = '';
        this.addLabItemRow();
        document.getElementById('modal-lab-set').classList.add('active');
        lucide.createIcons();
      },
      openEditModal(setId) {
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const s = sets.find(x => x.set_id === setId);
        if (!s) return;

        document.getElementById('modal-lab-set-title').innerHTML = '<i data-lucide="edit"></i> แก้ไขชุดตรวจ Lab: ' + s.name;
        document.getElementById('ls-id').value = s.set_id;
        document.getElementById('ls-name').value = s.name;
        document.getElementById('ls-cat').value = s.category || '';
        document.getElementById('ls-desc').value = s.description || '';
        document.getElementById('ls-price').value = s.price || 0;

        const container = document.getElementById('ls-items-container');
        container.innerHTML = '';
        (s.items || []).forEach(item => {
          this.addLabItemRow(item.lab_id);
        });
        if ((s.items || []).length === 0) this.addLabItemRow();

        document.getElementById('modal-lab-set').classList.add('active');
        lucide.createIcons();
      },
      closeModal() {
        document.getElementById('modal-lab-set').classList.remove('active');
      },
      addLabItemRow(selectedLabId = '') {
        const container = document.getElementById('ls-items-container');
        if (!container) return;
        const labs = DB.get(STORAGE_KEYS.LABS).filter(l => l.active !== false);

        const row = document.createElement('div');
        row.className = 'ls-item-row';
        row.style.cssText = 'display: flex; gap: 8px; align-items: center;';

        const opts = labs.map(l => '<option value="' + l.lab_id + '" data-price="' + l.price + '" ' + (l.lab_id === selectedLabId ? 'selected' : '') + '>[' + l.category + '] ' + l.name + ' (฿' + Number(l.price).toFixed(2) + ')</option>').join('');

        row.innerHTML = '<select class="form-select ls-lab-select" style="flex: 1; font-size: 0.82rem;" onchange="LabSetModule.recalcSetSumPrice()"><option value="">-- เลือกรายการตรวจ Lab --</option>' + opts + '</select>' +
          '<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); LabSetModule.recalcSetSumPrice();"><i data-lucide="trash-2"></i></button>';

        container.appendChild(row);
        lucide.createIcons();
        this.recalcSetSumPrice();
      },
      recalcSetSumPrice() {
        const selects = document.querySelectorAll('.ls-lab-select');
        const labs = DB.get(STORAGE_KEYS.LABS);
        let sum = 0;
        selects.forEach(sel => {
          const l = labs.find(x => x.lab_id === sel.value);
          if (l) sum += (l.price || 0);
        });
        const priceInput = document.getElementById('ls-price');
        if (priceInput && (!priceInput.value || priceInput.dataset.autoCalc === 'true' || priceInput.value === '0')) {
          priceInput.value = sum;
          priceInput.dataset.autoCalc = 'true';
        }
      },
      saveSet() {
        const name = document.getElementById('ls-name').value.trim();
        if (!name) { alert('กรุณากรอกชื่อชุดตรวจ Lab'); return; }

        const labs = DB.get(STORAGE_KEYS.LABS);
        const selects = document.querySelectorAll('.ls-lab-select');
        const items = [];
        selects.forEach(sel => {
          if (sel.value) {
            const l = labs.find(x => x.lab_id === sel.value);
            if (l && !items.some(i => i.lab_id === l.lab_id)) {
              items.push({ lab_id: l.lab_id, name: l.name, category: l.category, price: l.price });
            }
          }
        });

        if (items.length === 0) { alert('กรุณาเลือกรายการ Lab อย่างน้อย 1 รายการในชุด'); return; }

        const id = document.getElementById('ls-id').value;
        const sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        const setObj = {
          set_id: id || ('SET_' + Date.now()),
          name: name,
          category: document.getElementById('ls-cat').value.trim() || 'ชุดตรวจ',
          description: document.getElementById('ls-desc').value.trim() || items.map(i => i.name).join(', '),
          items: items,
          price: parseFloat(document.getElementById('ls-price').value) || items.reduce((s, i) => s + (i.price || 0), 0)
        };

        if (id) {
          const idx = sets.findIndex(x => x.set_id === id);
          if (idx !== -1) sets[idx] = setObj;
          else sets.push(setObj);
        } else {
          sets.push(setObj);
        }

        DB.set(STORAGE_KEYS.LAB_SETS, sets);
        this.closeModal();
        this.render();
        VisitModule.renderLabSetsDropdown();
        VisitModule.renderLabQuickChips();
        alert('บันทึกชุดตรวจ Lab "' + setObj.name + '" เรียบร้อย');
      },
      deleteSet(setId) {
        if (!confirm('ต้องการลบชุดตรวจ Lab นี้หรือไม่?')) return;
        let sets = DB.get(STORAGE_KEYS.LAB_SETS) || DEFAULT_LAB_SETS;
        sets = sets.filter(x => x.set_id !== setId);
        DB.set(STORAGE_KEYS.LAB_SETS, sets);
        this.render();
        VisitModule.renderLabSetsDropdown();
        VisitModule.renderLabQuickChips();
      }
    };

const ProcedureModule = {
      render() {
        const procs = DB.get(STORAGE_KEYS.PROCEDURES);
        document.querySelector('#procedure-master-table tbody').innerHTML = procs.map(p => {
          const df = (p.df_price !== undefined && p.df_price !== null) ? Number(p.df_price) : 0;
          return '<tr><td><span class="badge badge-gray">' + p.proc_id + '</span></td>' +
            '<td><strong>' + p.name + '</strong></td>' +
            '<td><span class="badge badge-primary">' + (p.category || 'บริการทั่วไป') + '</span></td>' +
            '<td><strong style="color: var(--primary-700);">฿' + Number(p.price).toFixed(2) + '</strong></td>' +
            '<td><strong style="color: #047857; background: #ecfdf5; padding: 3px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">฿' + df.toFixed(2) + '</strong></td>' +
            '<td><span class="badge ' + (p.active !== false ? 'badge-success' : 'badge-danger') + '">' + (p.active !== false ? 'เปิด' : 'ปิด') + '</span></td>' +
            '<td><button class="btn btn-outline btn-sm" onclick="ProcedureModule.openEditModal(\'' + p.proc_id + '\')"><i data-lucide="edit-2"></i> แก้ไข</button></td></tr>';
        }).join('');
        lucide.createIcons();
      },
      openNewModal() {
        if (!AuthModule.requireAdmin("เพิ่มหัตถการ")) return;
        document.getElementById('form-procedure').reset();
        document.getElementById('pr-id').value = '';
        document.getElementById('pr-df-price').value = '0';
        document.getElementById('modal-procedure-master').classList.add('active');
        lucide.createIcons();
      },
      openEditModal(procId) {
        if (!AuthModule.requireAdmin("แก้ไขราคาหัตถการ")) return;
        const p = DB.get(STORAGE_KEYS.PROCEDURES).find(x => x.proc_id === procId);
        if (!p) return;
        document.getElementById('pr-id').value = p.proc_id;
        document.getElementById('pr-name').value = p.name;
        document.getElementById('pr-category').value = p.category || 'บริการทั่วไป';
        document.getElementById('pr-price').value = p.price;
        document.getElementById('pr-df-price').value = (p.df_price !== undefined && p.df_price !== null) ? p.df_price : Math.round(Number(p.price || 0) * 0.35);
        document.getElementById('modal-procedure-master').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-procedure-master').classList.remove('active'); },
      saveProcedure() {
        const name = document.getElementById('pr-name').value.trim();
        if (!name) { alert('กรุณากรอกชื่อหัตถการ'); return; }
        const id = document.getElementById('pr-id').value;
        const procs = DB.get(STORAGE_KEYS.PROCEDURES);
        const data = {
          proc_id: id || ('PROC_' + Date.now()),
          name: name,
          category: document.getElementById('pr-category').value,
          price: parseFloat(document.getElementById('pr-price').value) || 0,
          df_price: parseFloat(document.getElementById('pr-df-price').value) || 0,
          active: true
        };
        if (id) {
          const idx = procs.findIndex(x => x.proc_id === id);
          if (idx !== -1) procs[idx] = data;
        } else {
          procs.push(data);
        }
        DB.upsertItem(STORAGE_KEYS.PROCEDURES, data);
        this.closeModal();
        this.render();
        if (typeof TreatmentModule !== 'undefined' && TreatmentModule.renderProceduresDropdown) {
          TreatmentModule.renderProceduresDropdown();
        }
        alert('บันทึกหัตถการและกำหนดค่า DF เรียบร้อย');
      }
    };