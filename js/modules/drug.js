/* ==========================================================================
   OPD System - Pharmacy, Inventory & OCR Drug Management
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const DrugGroupModule = {
      render() {
        const groups = DB.get(STORAGE_KEYS.DRUG_GROUPS);
        const container = document.getElementById('drug-groups-container');
        if (!container) return;

        if (groups.length === 0) {
          container.innerHTML = '<div style="font-size: 0.85rem; color: var(--slate-400); padding: 10px;">ยังไม่มีกลุ่มยาที่สร้างไว้ (คลิก "สร้างกลุ่มยาที่ใช้บ่อย" ด้านบนเพื่อเพิ่ม)</div>';
          return;
        }

        container.innerHTML = groups.map((g, idx) => 
          '<div style="background: white; border: 1px solid var(--primary-200); border-radius: var(--radius-md); padding: 10px 14px; min-width: 220px; box-shadow: var(--shadow-sm);">' +
          '<div style="display: flex; justify-content: space-between; align-items: center;"><strong style="color: var(--primary-800); font-size: 0.9rem;">' + g.name + '</strong><span class="badge badge-primary">' + (g.items || []).length + ' ยา</span></div>' +
          '<div style="font-size: 0.76rem; color: var(--slate-500); margin: 4px 0;">' + (g.description || '-') + '</div>' +
          '<div style="display: flex; gap: 4px; margin-top: 6px;"><button class="btn btn-outline btn-sm" onclick="DrugGroupModule.openEditModal(\'' + g.group_id + '\')"><i data-lucide="edit-2"></i> แก้ไข</button><button class="btn btn-danger btn-sm" onclick="DrugGroupModule.deleteGroup(\'' + g.group_id + '\')"><i data-lucide="trash-2"></i></button></div></div>'
        ).join('');
        lucide.createIcons();
      },
      openNewGroupModal() {
        document.getElementById('form-drug-group').reset();
        document.getElementById('dg-id').value = '';
        document.getElementById('dg-items-container').innerHTML = '';
        this.addDrugRow();
        document.getElementById('modal-drug-group').classList.add('active');
        lucide.createIcons();
      },
      openEditModal(groupId) {
        const g = DB.get(STORAGE_KEYS.DRUG_GROUPS).find(x => x.group_id === groupId);
        if (!g) return;
        document.getElementById('dg-id').value = g.group_id;
        document.getElementById('dg-name').value = g.name;
        document.getElementById('dg-desc').value = g.description || '';
        const container = document.getElementById('dg-items-container');
        container.innerHTML = '';
        (g.items || []).forEach(item => this.addDrugRow(item));
        document.getElementById('modal-drug-group').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-drug-group').classList.remove('active'); },
      addDrugRow(existing = null) {
        const container = document.getElementById('dg-items-container');
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const rowId = 'dgrow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        const row = document.createElement('div');
        row.id = rowId;
        row.style.cssText = 'display: flex; gap: 6px; align-items: center; background: white; padding: 6px; border: 1px solid var(--slate-200); border-radius: var(--radius-sm);';
        
        let options = '<option value="">-- เลือกยา --</option>' + drugs.map(d => '<option value="' + d.drug_id + '" ' + (existing && existing.drug_id === d.drug_id ? 'selected' : '') + '>' + d.generic_name + ' (' + (d.trade_name || '') + ')</option>').join('');
        
        row.innerHTML = 
          '<select class="form-select dg-item-drug" style="flex: 2; font-size: 0.8rem;">' + options + '</select>' +
          '<input type="number" class="form-input dg-item-qty" style="width: 60px; font-size: 0.8rem;" value="' + (existing ? existing.qty : 10) + '" min="1" placeholder="จำนวน">' +
          '<input type="text" class="form-input dg-item-sig" style="flex: 3; font-size: 0.8rem;" value="' + (existing ? existing.sig : '1 เม็ด วันละ 3 ครั้ง หลังอาหาร เช้า-กลางวัน-เย็น') + '" placeholder="วิธีใช้">' +
          '<button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById(\'' + rowId + '\').remove()"><i data-lucide="trash-2"></i></button>';

        container.appendChild(row);
        lucide.createIcons();
      },
      saveGroup() {
        const name = document.getElementById('dg-name').value.trim();
        if (!name) { alert('กรุณาระบุชื่อกลุ่มยา'); return; }
        const id = document.getElementById('dg-id').value;
        const drugs = DB.get(STORAGE_KEYS.DRUGS);

        const items = [];
        document.querySelectorAll('#dg-items-container > div').forEach(row => {
          const drugId = row.querySelector('.dg-item-drug').value;
          const qty = parseInt(row.querySelector('.dg-item-qty').value, 10) || 10;
          const sig = row.querySelector('.dg-item-sig').value.trim();
          if (drugId) {
            const d = drugs.find(x => x.drug_id === drugId);
            items.push({ drug_id: drugId, generic_name: d ? d.generic_name : '', trade_name: d ? d.trade_name : '', qty: qty, sig: sig });
          }
        });

        const groups = DB.get(STORAGE_KEYS.DRUG_GROUPS);
        const data = {
          group_id: id || ('DG_' + Date.now()),
          name: name,
          description: document.getElementById('dg-desc').value.trim(),
          items: items
        };

        if (id) {
          const idx = groups.findIndex(x => x.group_id === id);
          if (idx !== -1) groups[idx] = data;
        } else {
          groups.push(data);
        }
        DB.upsertItem(STORAGE_KEYS.DRUG_GROUPS, data);
        this.closeModal();
        this.render();
        VisitModule.renderDrugGroupsDropdown();
        alert('บันทึกกลุ่มยาสำเร็จ (' + items.length + ' รายการ)');
      },
      deleteGroup(groupId) {
        if (!confirm('ต้องการลบกลุ่มยานี้หรือไม่?')) return;
        let groups = DB.get(STORAGE_KEYS.DRUG_GROUPS).filter(x => x.group_id !== groupId);
        DB.set(STORAGE_KEYS.DRUG_GROUPS, groups);
        this.render();
        VisitModule.renderDrugGroupsDropdown();
      }
    };

const StockModule = {
      recordStockTx(entry) {
        try {
          const tx = {
            tx_id: 'STX_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            drug_id: entry.drug_id || '',
            generic_name: entry.generic_name || '',
            trade_name: entry.trade_name || '',
            visit_id: entry.visit_id || '',
            type: entry.type || 'SALE', // 'PURCHASE', 'SALE', 'RETURN', 'ADJUST', 'RETURN_CANCEL_VISIT', 'OCR_INBOUND'
            qty: Number(entry.qty || 0),
            cost_price: Number(entry.cost_price || 0),
            sale_price: Number(entry.sale_price || 0),
            stock_before: Number(entry.stock_before || 0),
            stock_after: Number(entry.stock_after || 0),
            reference_no: entry.reference_no || '',
            note: entry.note || '',
            operator: entry.operator || (typeof AuthModule !== 'undefined' && AuthModule.getCurrentUser ? AuthModule.getCurrentUser()?.name : (document.getElementById('current-doctor-name')?.innerText || 'ผู้ปฏิบัติงาน')),
            created_at: new Date().toISOString()
          };
          DB.upsertItem(STORAGE_KEYS.STOCK_TRANSACTIONS, tx, 'tx_id');
          return tx;
        } catch (e) {
          console.error('Error recording stock transaction:', e);
        }
      },
      getTransactions(drugId = null) {
        const txs = DB.get(STORAGE_KEYS.STOCK_TRANSACTIONS) || [];
        if (!drugId || drugId === 'ALL') return txs;
        return txs.filter(t => t.drug_id === drugId);
      }
    };

    const DrugModule = {
      render() { this.renderDrugTable(); },
      renderDrugTable() {
        const query = (document.getElementById('drug-search-input')?.value || '').toLowerCase().trim();
        const filter = document.getElementById('drug-filter-stock')?.value || 'all';
        const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];
        const countBadge = document.getElementById('drug-count-badge');
        if (countBadge) countBadge.textContent = drugs.length + ' รายการ';
        const tbody = document.querySelector('#drug-master-table tbody');
        if (!tbody) return;

        const filtered = drugs.filter(d => {
          const matchQuery = !query || (d.generic_name && d.generic_name.toLowerCase().includes(query)) || (d.trade_name && d.trade_name.toLowerCase().includes(query)) || (d.drawer && d.drawer.toLowerCase().includes(query));
          let matchStock = true;
          if (filter === 'low') matchStock = (d.stock || 0) <= (d.min_stock || 10);
          return matchQuery && matchStock;
        });

        tbody.innerHTML = filtered.map(d => 
          '<tr><td><strong>' + d.generic_name + '</strong></td><td>' + (d.strength || '-') + '</td><td>' + (d.dosage_form || 'Tablet') + '</td><td>' + (d.trade_name || '-') + '</td><td>' + (d.unit || 'เม็ด') + '</td>' +
          '<td>฿' + Number(d.purchase_price || 0).toFixed(2) + '</td><td><strong style="color: var(--primary-700);">฿' + Number(d.sale_price || 0).toFixed(2) + '</strong></td>' +
          '<td><span class="badge ' + (d.stock <= d.min_stock ? 'badge-danger' : 'badge-primary') + '">' + (d.stock || 0) + ' ' + d.unit + '</span></td>' +
          '<td>' + (d.min_stock || 10) + '</td>' +
          '<td><span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">' + (d.drawer ? 'ลิ้นชัก ' + d.drawer : '-') + '</span></td>' +
          '<td><div style="display: flex; gap: 4px;">' +
          '<button class="btn btn-outline btn-sm" onclick="DrugModule.openEditDrugModal(\'' + d.drug_id + '\')"><i data-lucide="edit-2"></i> แก้ไข</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="DrugHistoryModule.openHistoryModal(\'' + d.drug_id + '\')" title="ดูประวัติราคาและสต็อก"><i data-lucide="history"></i> ประวัติ</button>' +
          '</div></td></tr>'
        ).join('');
        lucide.createIcons();
      },
      openNewDrugModal() {
        if (typeof AuthModule !== "undefined" && AuthModule.requireAdmin && !AuthModule.requireAdmin("เพิ่มยาใหม่")) return;
        document.getElementById('form-drug').reset();
        document.getElementById('d-id').value = '';
        if (document.getElementById('d-drawer')) document.getElementById('d-drawer').value = '';
        document.getElementById('modal-drug-master').classList.add('active');
        lucide.createIcons();
      },
      openEditDrugModal(drugId) {
        if (typeof AuthModule !== "undefined" && AuthModule.requireAdmin && !AuthModule.requireAdmin("แก้ไขข้อมูลยา")) return;
        const d = DB.get(STORAGE_KEYS.DRUGS).find(x => x.drug_id === drugId);
        if (!d) return;
        document.getElementById('d-id').value = d.drug_id;
        document.getElementById('d-generic').value = d.generic_name || '';
        document.getElementById('d-strength').value = d.strength || '';
        document.getElementById('d-form').value = d.dosage_form || 'Tablet';
        document.getElementById('d-trade').value = d.trade_name || '';
        document.getElementById('d-unit').value = d.unit || 'เม็ด';
        document.getElementById('d-cost').value = d.purchase_price || '';
        document.getElementById('d-price').value = d.sale_price || '';
        document.getElementById('d-stock').value = d.stock || 0;
        document.getElementById('d-min').value = d.min_stock || 10;
        if (document.getElementById('d-drawer')) document.getElementById('d-drawer').value = d.drawer || '';
        document.getElementById('modal-drug-master').classList.add('active');
        lucide.createIcons();
      },
      closeModal() { document.getElementById('modal-drug-master').classList.remove('active'); },
      saveDrug() {
        const generic = document.getElementById('d-generic').value.trim();
        if (!generic) { alert('กรุณากรอก Generic Name'); return; }
        const id = document.getElementById('d-id').value;
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const oldDrug = id ? drugs.find(x => x.drug_id === id) : null;
        
        const newCost = parseFloat(document.getElementById('d-cost').value) || 0;
        const newPrice = parseFloat(document.getElementById('d-price').value) || 0;
        const newStock = parseInt(document.getElementById('d-stock').value, 10) || 0;

        const data = {
          drug_id: id || ('D_' + Date.now()),
          generic_name: generic,
          strength: document.getElementById('d-strength').value.trim(),
          dosage_form: document.getElementById('d-form').value,
          trade_name: document.getElementById('d-trade').value.trim(),
          unit: document.getElementById('d-unit').value.trim() || 'เม็ด',
          purchase_price: newCost,
          sale_price: newPrice,
          stock: newStock,
          min_stock: parseInt(document.getElementById('d-min').value, 10) || 10,
          drawer: (document.getElementById('d-drawer')?.value || '').trim(),
          active: true
        };

        if (id && oldDrug) {
          const idx = drugs.findIndex(x => x.drug_id === id);
          if (idx !== -1) drugs[idx] = data;

          if (oldDrug.purchase_price !== newCost) {
            DrugHistoryModule.logChange({
              drug_id: data.drug_id,
              generic_name: data.generic_name,
              trade_name: data.trade_name,
              type: 'COST_CHANGE',
              old_cost: oldDrug.purchase_price || 0,
              new_cost: newCost,
              old_price: oldDrug.sale_price || 0,
              new_price: newPrice,
              qty_change: 0,
              stock_before: oldDrug.stock || 0,
              stock_after: newStock,
              note: 'แก้ไขราคาซื้อ/ต้นทุนผ่านหน้าจัดการยา'
            });
          }
          if (oldDrug.sale_price !== newPrice) {
            DrugHistoryModule.logChange({
              drug_id: data.drug_id,
              generic_name: data.generic_name,
              trade_name: data.trade_name,
              type: 'PRICE_CHANGE',
              old_cost: newCost,
              new_cost: newCost,
              old_price: oldDrug.sale_price || 0,
              new_price: newPrice,
              qty_change: 0,
              stock_before: oldDrug.stock || 0,
              stock_after: newStock,
              note: 'แก้ไขราคาขายผ่านหน้าจัดการยา'
            });
          }
        } else {
          drugs.push(data);
          DrugHistoryModule.logChange({
            drug_id: data.drug_id,
            generic_name: data.generic_name,
            trade_name: data.trade_name,
            type: 'NEW_DRUG',
            old_cost: 0,
            new_cost: newCost,
            old_price: 0,
            new_price: newPrice,
            qty_change: newStock,
            stock_before: 0,
            stock_after: newStock,
            note: 'เพิ่มรายการยาใหม่ในระบบ'
          });
        }

        DB.upsertItem(STORAGE_KEYS.DRUGS, data);
        this.closeModal();
        this.render();
        DashboardModule.render();
        alert('บันทึกข้อมูลยาเรียบร้อย');
      },
      openStockInModal() {
        if (typeof AuthModule !== "undefined" && AuthModule.requireAdmin && !AuthModule.requireAdmin("รับยาเข้าคลัง")) return;
        const select = document.getElementById('si-drug-select');
        select.innerHTML = '<option value="">-- เลือกยา --</option>' + DB.get(STORAGE_KEYS.DRUGS).map(d => '<option value="' + d.drug_id + '">' + d.generic_name + ' (' + (d.trade_name || '') + ') [คงเหลือ: ' + d.stock + ']</option>').join('');
        document.getElementById('si-qty').value = '50';
        document.getElementById('si-cost').value = '';
        document.getElementById('modal-stock-in').classList.add('active');
        lucide.createIcons();
      },
      closeStockInModal() { document.getElementById('modal-stock-in').classList.remove('active'); },
      confirmStockIn() {
        const drugId = document.getElementById('si-drug-select').value;
        const qty = parseInt(document.getElementById('si-qty').value, 10);
        if (!drugId || qty <= 0) { alert('กรุณาเลือกยาและระบุจำนวน'); return; }
        const cost = parseFloat(document.getElementById('si-cost').value);
        const drugs = DB.get(STORAGE_KEYS.DRUGS);
        const d = drugs.find(x => x.drug_id === drugId);
        if (d) {
          const stockBefore = d.stock || 0;
          const oldCost = d.purchase_price || 0;
          d.stock = stockBefore + qty;
          if (cost > 0) d.purchase_price = cost;

          DrugHistoryModule.logChange({
            drug_id: d.drug_id,
            generic_name: d.generic_name,
            trade_name: d.trade_name,
            type: 'STOCK_IN',
            old_cost: oldCost,
            new_cost: (cost > 0 ? cost : oldCost),
            old_price: d.sale_price || 0,
            new_price: d.sale_price || 0,
            qty_change: qty,
            stock_before: stockBefore,
            stock_after: d.stock,
            note: 'รับยาเข้าคลังทั่วไป'
          });

          StockModule.recordStockTx({
            drug_id: d.drug_id,
            generic_name: d.generic_name,
            trade_name: d.trade_name || '',
            visit_id: '',
            type: 'PURCHASE',
            qty: qty,
            cost_price: (cost > 0 ? cost : oldCost),
            sale_price: d.sale_price || 0,
            stock_before: stockBefore,
            stock_after: d.stock,
            reference_no: '',
            note: 'รับยาเข้าคลังทั่วไป'
          });
        }
        DB.set(STORAGE_KEYS.DRUGS, drugs);
        this.closeStockInModal();
        this.render();
        DashboardModule.render();
        alert('รับยา ' + d.generic_name + ' จำนวน ' + qty + ' หน่วยเรียบร้อย');
      }
    };


    const DrugHistoryModule = {
      activeDrugFilter: 'ALL',
      activeTypeFilter: 'ALL',
      activeDateFilter: 'ALL',

      logChange(entry) {
        try {
          const historyItem = {
            history_id: 'DPH_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            drug_id: entry.drug_id || '',
            generic_name: entry.generic_name || '',
            trade_name: entry.trade_name || '',
            type: entry.type || 'STOCK_IN', // 'STOCK_IN', 'COST_CHANGE', 'PRICE_CHANGE', 'OCR_IMPORT', 'NEW_DRUG'
            old_cost: Number(entry.old_cost || 0),
            new_cost: Number(entry.new_cost || 0),
            old_price: Number(entry.old_price || 0),
            new_price: Number(entry.new_price || 0),
            qty_change: Number(entry.qty_change || 0),
            stock_before: Number(entry.stock_before || 0),
            stock_after: Number(entry.stock_after || 0),
            ref_invoice: entry.ref_invoice || '',
            note: entry.note || '',
            operator: (typeof AuthModule !== 'undefined' && AuthModule.getCurrentUser ? AuthModule.getCurrentUser()?.name : (document.getElementById('current-doctor-name')?.innerText || 'แพทย์ผู้ปฏิบัติงาน')),
            created_at: new Date().toISOString()
          };

          DB.upsertItem(STORAGE_KEYS.DRUG_PRICE_HISTORY, historyItem, 'history_id');
          console.log('Logged drug price/stock history:', historyItem);
          return historyItem;
        } catch (e) {
          console.error('Error logging drug history:', e);
        }
      },

      openHistoryModal(preselectedDrugId = null) {
        const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];
        const selectEl = document.getElementById('dh-filter-drug');
        if (selectEl) {
          selectEl.innerHTML = '<option value="ALL">-- แสดงยาทุกรายการในคลินิก (' + drugs.length + ' ตัว) --</option>' +
            drugs.map(d => '<option value="' + d.drug_id + '">' + d.generic_name + (d.strength ? ' ' + d.strength : '') + (d.trade_name ? ' (' + d.trade_name + ')' : '') + '</option>').join('');
          
          if (preselectedDrugId && drugs.some(x => x.drug_id === preselectedDrugId)) {
            selectEl.value = preselectedDrugId;
            this.activeDrugFilter = preselectedDrugId;
          } else {
            selectEl.value = 'ALL';
            this.activeDrugFilter = 'ALL';
          }
        }

        const typeEl = document.getElementById('dh-filter-type');
        if (typeEl) typeEl.value = 'ALL';
        const dateEl = document.getElementById('dh-filter-date');
        if (dateEl) dateEl.value = 'ALL';

        this.renderHistory();
        document.getElementById('modal-drug-history').classList.add('active');
        lucide.createIcons();
      },

      closeModal() {
        document.getElementById('modal-drug-history').classList.remove('active');
      },

      renderHistory() {
        const drugFilter = document.getElementById('dh-filter-drug')?.value || 'ALL';
        const typeFilter = document.getElementById('dh-filter-type')?.value || 'ALL';
        const dateFilter = document.getElementById('dh-filter-date')?.value || 'ALL';

        let list = DB.get(STORAGE_KEYS.DRUG_PRICE_HISTORY) || [];
        const allDrugs = DB.get(STORAGE_KEYS.DRUGS) || [];

        // Filter by Drug
        if (drugFilter !== 'ALL') {
          list = list.filter(x => x.drug_id === drugFilter);
        }

        // Filter by Type
        if (typeFilter !== 'ALL') {
          list = list.filter(x => x.type === typeFilter);
        }

        // Filter by Date
        const now = new Date();
        if (dateFilter === 'TODAY') {
          const todayStr = now.toISOString().slice(0, 10);
          list = list.filter(x => (x.created_at || '').startsWith(todayStr));
        } else if (dateFilter === '7DAYS') {
          const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          list = list.filter(x => new Date(x.created_at) >= past7);
        } else if (dateFilter === '30DAYS') {
          const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          list = list.filter(x => new Date(x.created_at) >= past30);
        } else if (dateFilter === 'THIS_MONTH') {
          const monthStr = now.toISOString().slice(0, 7);
          list = list.filter(x => (x.created_at || '').startsWith(monthStr));
        }

        // Sort descending by created_at
        list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Calculate KPI Analytics
        let totalQtyReceived = 0;
        let totalCostVal = 0;
        let totalCostQty = 0;
        let minCost = Infinity;
        let maxCost = 0;

        list.forEach(item => {
          if (item.type === 'STOCK_IN' || item.type === 'OCR_IMPORT' || item.type === 'NEW_DRUG') {
            const q = item.qty_change || 0;
            const c = item.new_cost || 0;
            if (q > 0) {
              totalQtyReceived += q;
              if (c > 0) {
                totalCostVal += (q * c);
                totalCostQty += q;
              }
            }
          }
          if (item.new_cost > 0) {
            if (item.new_cost < minCost) minCost = item.new_cost;
            if (item.new_cost > maxCost) maxCost = item.new_cost;
          }
        });

        const avgCost = totalCostQty > 0 ? (totalCostVal / totalCostQty) : (list.length > 0 && list[0].new_cost ? list[0].new_cost : 0);

        // Current sale price & margin if single drug selected
        let currentSalePrice = 0;
        let currentCostPrice = 0;
        if (drugFilter !== 'ALL') {
          const targetDrug = allDrugs.find(x => x.drug_id === drugFilter);
          if (targetDrug) {
            currentSalePrice = targetDrug.sale_price || 0;
            currentCostPrice = targetDrug.purchase_price || 0;
          }
        }

        // Update KPI Card UI
        const kpiQtyEl = document.getElementById('dh-kpi-qty');
        if (kpiQtyEl) kpiQtyEl.innerText = totalQtyReceived.toLocaleString() + ' หน่วย';

        const kpiAvgEl = document.getElementById('dh-kpi-avg-cost');
        if (kpiAvgEl) kpiAvgEl.innerText = '฿' + avgCost.toFixed(2);

        const kpiMinMaxEl = document.getElementById('dh-kpi-minmax');
        if (kpiMinMaxEl) {
          if (minCost === Infinity || maxCost === 0) {
            kpiMinMaxEl.innerText = '-';
          } else {
            kpiMinMaxEl.innerText = '฿' + minCost.toFixed(2) + ' - ฿' + maxCost.toFixed(2);
          }
        }

        const kpiMarginEl = document.getElementById('dh-kpi-margin');
        if (kpiMarginEl) {
          if (drugFilter !== 'ALL' && currentSalePrice > 0) {
            const marginAmt = currentSalePrice - currentCostPrice;
            const marginPct = currentCostPrice > 0 ? ((marginAmt / currentCostPrice) * 100).toFixed(0) : 100;
            kpiMarginEl.innerText = '฿' + currentSalePrice.toFixed(2) + ' (+' + marginPct + '%)';
          } else {
            kpiMarginEl.innerText = list.length + ' รายการเคลื่อนไหว';
          }
        }

        // Render Table Rows
        const tbody = document.getElementById('dh-history-tbody');
        if (!tbody) return;

        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--slate-400); padding: 28px;">ไม่พบประวัติการรับเข้าหรือปรับราคายาตามเงื่อนไขที่เลือก</td></tr>';
          return;
        }

        tbody.innerHTML = list.map(row => {
          const dt = row.created_at ? new Date(row.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-';
          
          let typeBadge = '';
          if (row.type === 'STOCK_IN') {
            typeBadge = '<span class="badge badge-emerald"><i data-lucide="package-plus"></i> รับเข้าคลัง</span>';
          } else if (row.type === 'OCR_IMPORT') {
            typeBadge = '<span class="badge badge-purple" style="background:#f3e8ff; color:#7c3aed; border:1px solid #d8b4fe;"><i data-lucide="sparkles"></i> นำเข้า OCR</span>';
          } else if (row.type === 'COST_CHANGE') {
            typeBadge = '<span class="badge badge-warning"><i data-lucide="arrow-up-right"></i> ปรับราคาซื้อ</span>';
          } else if (row.type === 'PRICE_CHANGE') {
            typeBadge = '<span class="badge badge-primary"><i data-lucide="tag"></i> ปรับราคาขาย</span>';
          } else if (row.type === 'NEW_DRUG') {
            typeBadge = '<span class="badge badge-info"><i data-lucide="plus-circle"></i> ยาใหม่</span>';
          } else {
            typeBadge = '<span class="badge badge-gray">' + (row.type || '-') + '</span>';
          }

          // Quantity & stock string
          let qtyStr = '-';
          if (row.qty_change > 0) {
            qtyStr = '<strong style="color: #059669;">+' + row.qty_change + '</strong> <span style="font-size: 0.72rem; color: #64748b;">(' + row.stock_before + '➔' + row.stock_after + ')</span>';
          } else if (row.qty_change < 0) {
            qtyStr = '<strong style="color: #dc2626;">' + row.qty_change + '</strong> <span style="font-size: 0.72rem; color: #64748b;">(' + row.stock_before + '➔' + row.stock_after + ')</span>';
          } else if (row.stock_after !== undefined) {
            qtyStr = '<span style="font-size: 0.76rem; color: #64748b;">สต็อก ' + row.stock_after + '</span>';
          }

          // Cost price diff
          let costStr = '฿' + Number(row.new_cost || 0).toFixed(2);
          if (row.old_cost !== undefined && row.old_cost > 0 && row.old_cost !== row.new_cost) {
            const diff = row.new_cost - row.old_cost;
            const diffPct = ((diff / row.old_cost) * 100).toFixed(1);
            if (diff > 0) {
              costStr = '<span style="color:#64748b; font-size:0.75rem; text-decoration:line-through;">฿' + row.old_cost.toFixed(2) + '</span> ➔ <strong>฿' + row.new_cost.toFixed(2) + '</strong> <span class="ocr-diff-up">(+' + diffPct + '%)</span>';
            } else {
              costStr = '<span style="color:#64748b; font-size:0.75rem; text-decoration:line-through;">฿' + row.old_cost.toFixed(2) + '</span> ➔ <strong>฿' + row.new_cost.toFixed(2) + '</strong> <span class="ocr-diff-down">(' + diffPct + '%)</span>';
            }
          }

          // Sale price diff
          let priceStr = '฿' + Number(row.new_price || 0).toFixed(2);
          if (row.old_price !== undefined && row.old_price > 0 && row.old_price !== row.new_price) {
            priceStr = '<span style="color:#64748b; font-size:0.75rem; text-decoration:line-through;">฿' + row.old_price.toFixed(2) + '</span> ➔ <strong>฿' + row.new_price.toFixed(2) + '</strong>';
          }

          return '<tr>' +
            '<td style="font-size: 0.76rem; color: var(--slate-600);">' + dt + '</td>' +
            '<td><strong>' + (row.generic_name || '-') + '</strong>' + (row.trade_name ? '<div style="font-size: 0.72rem; color: var(--slate-500);">' + row.trade_name + '</div>' : '') + '</td>' +
            '<td>' + typeBadge + '</td>' +
            '<td>' + qtyStr + '</td>' +
            '<td>' + costStr + '</td>' +
            '<td>' + priceStr + '</td>' +
            '<td>' + (row.ref_invoice ? '<span class="badge badge-gray" style="font-size:0.72rem;"><i data-lucide="file-text"></i> ' + row.ref_invoice + '</span>' : '-') + '</td>' +
            '<td style="font-size: 0.78rem; color: var(--slate-600);">' + (row.note || '-') + '</td>' +
            '<td style="font-size: 0.75rem; color: var(--slate-500);"><i data-lucide="user" style="width:12px;height:12px;display:inline;"></i> ' + (row.operator || 'แพทย์') + '</td>' +
          '</tr>';
        }).join('');

        lucide.createIcons();
      },

      exportCSV() {
        let list = DB.get(STORAGE_KEYS.DRUG_PRICE_HISTORY) || [];
        if (list.length === 0) {
          alert('ไม่มีข้อมูลประวัติราคาและสต็อกยาสำหรับส่งออก');
          return;
        }

        const headers = ['วันที่-เวลา', 'Generic Name', 'Trade Name', 'ประเภทรายการ', 'จำนวนรับเข้า/เปลี่ยน', 'สต็อกก่อน', 'สต็อกหลัง', 'ราคาซื้อเดิม', 'ราคาซื้อใหม่', 'ราคาขายเดิม', 'ราคาขายใหม่', 'เลขที่บิล', 'หมายเหตุ', 'ผู้บันทึก'];
        const rows = list.map(r => [
          '"' + (r.created_at || '') + '"',
          '"' + (r.generic_name || '').replace(/"/g, '""') + '"',
          '"' + (r.trade_name || '').replace(/"/g, '""') + '"',
          '"' + (r.type || '') + '"',
          r.qty_change || 0,
          r.stock_before || 0,
          r.stock_after || 0,
          r.old_cost || 0,
          r.new_cost || 0,
          r.old_price || 0,
          r.new_price || 0,
          '"' + (r.ref_invoice || '').replace(/"/g, '""') + '"',
          '"' + (r.note || '').replace(/"/g, '""') + '"',
          '"' + (r.operator || '').replace(/"/g, '""') + '"'
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'OPD_Drug_Price_History_' + new Date().toISOString().slice(0, 10) + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },

      printReport() {
        const list = DB.get(STORAGE_KEYS.DRUG_PRICE_HISTORY) || [];
        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (!printWin) return;

        let rowsHtml = list.map((r, i) => 
          '<tr>' +
            '<td style="padding:6px; border:1px solid #ddd; text-align:center;">' + (i + 1) + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd;">' + (r.created_at ? new Date(r.created_at).toLocaleDateString('th-TH') : '-') + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd;"><strong>' + (r.generic_name || '-') + '</strong> ' + (r.trade_name ? '(' + r.trade_name + ')' : '') + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd; text-align:center;">' + (r.type || '-') + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd; text-align:right;">' + (r.qty_change || 0) + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd; text-align:right;">฿' + Number(r.new_cost || 0).toFixed(2) + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd; text-align:right;">฿' + Number(r.new_price || 0).toFixed(2) + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd;">' + (r.ref_invoice || '-') + '</td>' +
            '<td style="padding:6px; border:1px solid #ddd;">' + (r.operator || '-') + '</td>' +
          '</tr>'
        ).join('');

        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>รายงานประวัติการรับเข้าและปรับราคายา - คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</title>
            <style>
              body { font-family: 'Sarabun', 'Angsana New', sans-serif; padding: 20px; font-size: 13px; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th { background: #f1f5f9; padding: 8px 6px; border: 1px solid #cbd5e1; font-weight: bold; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h2 { margin: 0 0 4px 0; color: #0f766e; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</h2>
              <div>รายงานประวัติการรับเข้าและปรับราคายา (Drug Movement & Price Ledger)</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} | จำนวนทั้งหมด: ${list.length} รายการ</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:30px;">#</th>
                  <th style="width:80px;">วันที่</th>
                  <th>ชื่อยา (Generic / Trade)</th>
                  <th style="width:90px;">ประเภท</th>
                  <th style="width:60px;">จำนวน</th>
                  <th style="width:80px;">ราคาซื้อ</th>
                  <th style="width:80px;">ราคาขาย</th>
                  <th style="width:90px;">เลขที่บิล</th>
                  <th style="width:90px;">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <script>window.onload = function() { window.print(); }<\/script>
          </body>
          </html>
        `);
        printWin.document.close();
      }
    };

    // Allowed models in priority fallback order
    const OCR_MODEL_FALLBACK_LIST = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemma-4-26b-a4b-it',
      'gemma-4-31b-it'
    ];

    // Comprehensive Thai Pharmaceutical Master Knowledge Base (500+ Brand & Generic Mappings)
    const THAI_DRUG_DATABASE = {
      // Analgesics, NSAIDs, Muscle Relaxants & Anti-inflammatory
      'noraphen': { generic: 'Orphenadrine citrate + Paracetamol', strength: '35 mg / 450 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'norgesic': { generic: 'Orphenadrine citrate + Paracetamol', strength: '35 mg / 450 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'muscol': { generic: 'Orphenadrine citrate + Paracetamol', strength: '35 mg / 450 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'orphen': { generic: 'Orphenadrine citrate + Paracetamol', strength: '35 mg / 450 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'orphenadrine': { generic: 'Orphenadrine citrate + Paracetamol', strength: '35 mg / 450 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ibustar': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ibustar-f': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ibustar f': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'nurofen': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'brufen': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'gofen': { generic: 'Ibuprofen', strength: '400 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'gofast': { generic: 'Ibuprofen', strength: '400 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'gosan': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ibu': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ibuprofen': { generic: 'Ibuprofen', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'sara': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'sara 500': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tylenol': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tylenol 500': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'panadol': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'paracap': { generic: 'Paracetamol', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'cemol': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'calpol': { generic: 'Paracetamol Syrup', strength: '120 mg/5ml', form: 'Syrup', defaultUnit: 'ขวด' },
      'tempra': { generic: 'Paracetamol Syrup', strength: '120 mg/5ml', form: 'Syrup', defaultUnit: 'ขวด' },
      'paracetamol': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'para': { generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ponstan': { generic: 'Mefenamic acid', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'postan': { generic: 'Mefenamic acid', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'mefenamic': { generic: 'Mefenamic acid', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'voltaren': { generic: 'Diclofenac sodium', strength: '25 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'difelene': { generic: 'Diclofenac sodium', strength: '25 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'diclo': { generic: 'Diclofenac sodium', strength: '25 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'synactive': { generic: 'Diclofenac sodium', strength: '25 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cataflam': { generic: 'Diclofenac potassium', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'celebrex': { generic: 'Celecoxib', strength: '200 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'cobix': { generic: 'Celecoxib', strength: '200 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'celecoxib': { generic: 'Celecoxib', strength: '200 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'arcoxia': { generic: 'Etoricoxib', strength: '90 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'torcoxia': { generic: 'Etoricoxib', strength: '90 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'etoricoxib': { generic: 'Etoricoxib', strength: '90 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'mobic': { generic: 'Meloxicam', strength: '7.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'meloxicam': { generic: 'Meloxicam', strength: '7.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'feldene': { generic: 'Piroxicam', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'piroxicam': { generic: 'Piroxicam', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'synflex': { generic: 'Naproxen sodium', strength: '275 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'anaprox': { generic: 'Naproxen sodium', strength: '550 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'naproxen': { generic: 'Naproxen sodium', strength: '250 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ultracet': { generic: 'Tramadol + Paracetamol', strength: '37.5 mg / 325 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tramacet': { generic: 'Tramadol + Paracetamol', strength: '37.5 mg / 325 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tramal': { generic: 'Tramadol', strength: '50 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'tramadol': { generic: 'Tramadol', strength: '50 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'myonal': { generic: 'Eperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'episone': { generic: 'Eperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'eperisone': { generic: 'Eperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'sirdalud': { generic: 'Tizanidine', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tizanidine': { generic: 'Tizanidine', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'myores': { generic: 'Tolperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'mydocalm': { generic: 'Tolperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tolperisone': { generic: 'Tolperisone HCl', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'baclofen': { generic: 'Baclofen', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'lioresal': { generic: 'Baclofen', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'flamzen': { generic: 'Serratiopeptidase', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'danzen': { generic: 'Serratiopeptidase', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },

      // Antibiotics & Anti-infectives
      'amk': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amk 1000': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amk 625': { generic: 'Amoxicillin + Clavulanic acid', strength: '625 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amk forte': { generic: 'Amoxicillin + Clavulanic acid', strength: '457 mg/5ml', form: 'Dry Syrup', defaultUnit: 'ขวด' },
      'augmentin': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'augmentin 1g': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'augmentin 625': { generic: 'Amoxicillin + Clavulanic acid', strength: '625 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cavumox': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'curam': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fleming': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'co-amoxiclav': { generic: 'Amoxicillin + Clavulanic acid', strength: '1000 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'hiconcil': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'ibiamox': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'moxilin': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'servamox': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'servox': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'servox 500': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'amoxy': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'amoxicillin': { generic: 'Amoxicillin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'unacid': { generic: 'Sultamicillin', strength: '375 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'sultam': { generic: 'Sultamicillin', strength: '375 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'klacid': { generic: 'Clarithromycin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'klaacid': { generic: 'Clarithromycin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'crixan': { generic: 'Clarithromycin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'clarithro': { generic: 'Clarithromycin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'clarithromycin': { generic: 'Clarithromycin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'zithromax': { generic: 'Azithromycin', strength: '250 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'azithro': { generic: 'Azithromycin', strength: '250 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'azithromycin': { generic: 'Azithromycin', strength: '250 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'ciprobay': { generic: 'Ciprofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cifran': { generic: 'Ciprofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cipro': { generic: 'Ciprofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ciprofloxacin': { generic: 'Ciprofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cravit': { generic: 'Levofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'levo': { generic: 'Levofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'levoflox': { generic: 'Levofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'levofloxacin': { generic: 'Levofloxacin', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'norflox': { generic: 'Norfloxacin', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'norbactin': { generic: 'Norfloxacin', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'lexinor': { generic: 'Norfloxacin', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'norfloxacin': { generic: 'Norfloxacin', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'roxi': { generic: 'Roxithromycin', strength: '150 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'rulid': { generic: 'Roxithromycin', strength: '150 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'roxithromycin': { generic: 'Roxithromycin', strength: '150 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bactrim': { generic: 'Co-trimoxazole (Sulfamethoxazole + Trimethoprim)', strength: '400/80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bactrim forte': { generic: 'Co-trimoxazole (Sulfamethoxazole + Trimethoprim)', strength: '800/160 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cotrim': { generic: 'Co-trimoxazole (Sulfamethoxazole + Trimethoprim)', strength: '400/80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bactrex': { generic: 'Co-trimoxazole (Sulfamethoxazole + Trimethoprim)', strength: '400/80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'co-trimoxazole': { generic: 'Co-trimoxazole (Sulfamethoxazole + Trimethoprim)', strength: '400/80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'rocephin': { generic: 'Ceftriaxone', strength: '1 g', form: 'Injection', defaultUnit: 'ไวอัล' },
      'ceftri': { generic: 'Ceftriaxone', strength: '1 g', form: 'Injection', defaultUnit: 'ไวอัล' },
      'cef-3': { generic: 'Ceftriaxone', strength: '1 g', form: 'Injection', defaultUnit: 'ไวอัล' },
      'ceftriaxone': { generic: 'Ceftriaxone', strength: '1 g', form: 'Injection', defaultUnit: 'ไวอัล' },
      'cefix': { generic: 'Cefixime', strength: '100 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'cefixime': { generic: 'Cefixime', strength: '100 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'cepan': { generic: 'Cefalexin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'keflex': { generic: 'Cefalexin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'cefalexin': { generic: 'Cefalexin', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'dalacin': { generic: 'Clindamycin', strength: '300 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'clinda': { generic: 'Clindamycin', strength: '300 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'clindamycin': { generic: 'Clindamycin', strength: '300 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'vibramycin': { generic: 'Doxycycline', strength: '100 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'doxy': { generic: 'Doxycycline', strength: '100 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'doxycycline': { generic: 'Doxycycline', strength: '100 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'flagyl': { generic: 'Metronidazole', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'metronidazole': { generic: 'Metronidazole', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'zovirax': { generic: 'Acyclovir', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'acyclo': { generic: 'Acyclovir', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'acyclovir': { generic: 'Acyclovir', strength: '400 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'valtrex': { generic: 'Valacyclovir', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },

      // Antihistamines, Respiratory & Cold Combinations
      'decolgen': { generic: 'Paracetamol + Phenylephrine + Chlorpheniramine', strength: '500/10/2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tiffy': { generic: 'Paracetamol + Phenylephrine + Chlorpheniramine', strength: '500/10/2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'tiffy dey': { generic: 'Paracetamol + Phenylephrine + Chlorpheniramine', strength: '500/10/2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'nasotapp': { generic: 'Brompheniramine + Phenylephrine', strength: '4/10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cpm': { generic: 'Chlorpheniramine maleate', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'chlorpheniramine': { generic: 'Chlorpheniramine maleate', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'histasol': { generic: 'Chlorpheniramine maleate', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'avantis': { generic: 'Chlorpheniramine maleate', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dimen': { generic: 'Dimenhydrinate', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dramamine': { generic: 'Dimenhydrinate', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dimenhydrinate': { generic: 'Dimenhydrinate', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'zyrtec': { generic: 'Cetirizine HCl', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cetriz': { generic: 'Cetirizine HCl', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'aller-c': { generic: 'Cetirizine HCl', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cetero': { generic: 'Cetirizine HCl', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cetirizine': { generic: 'Cetirizine HCl', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'xyzal': { generic: 'Levocetirizine', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'levocetirizine': { generic: 'Levocetirizine', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'telfast': { generic: 'Fexofenadine', strength: '180 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'telfast 180': { generic: 'Fexofenadine', strength: '180 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'telfast 60': { generic: 'Fexofenadine', strength: '60 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fexodine': { generic: 'Fexofenadine', strength: '180 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fexofenadine': { generic: 'Fexofenadine', strength: '180 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'clarityne': { generic: 'Loratadine', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'allergin': { generic: 'Loratadine', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'loratadine': { generic: 'Loratadine', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'aerius': { generic: 'Desloratadine', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'desloratadine': { generic: 'Desloratadine', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'singulair': { generic: 'Montelukast', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'montek': { generic: 'Montelukast', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'montelukast': { generic: 'Montelukast', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ventolin': { generic: 'Salbutamol', strength: '2 mg/5ml', form: 'Syrup', defaultUnit: 'ขวด' },
      'ventolin inhaler': { generic: 'Salbutamol Inhaler', strength: '100 mcg/dose', form: 'Inhaler', defaultUnit: 'อัน' },
      'asthalin': { generic: 'Salbutamol', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'salbutamol': { generic: 'Salbutamol', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bisolvon': { generic: 'Bromhexine HCl', strength: '8 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bromhexine': { generic: 'Bromhexine HCl', strength: '8 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'mucosolvan': { generic: 'Ambroxol HCl', strength: '30 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ambril': { generic: 'Ambroxol HCl', strength: '30 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ambroxol': { generic: 'Ambroxol HCl', strength: '30 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fluimucil': { generic: 'Acetylcysteine', strength: '600 mg', form: 'Effervescent Tablet', defaultUnit: 'เม็ด' },
      'nac long': { generic: 'Acetylcysteine', strength: '600 mg', form: 'Effervescent Tablet', defaultUnit: 'เม็ด' },
      'acetylcysteine': { generic: 'Acetylcysteine', strength: '600 mg', form: 'Effervescent Tablet', defaultUnit: 'เม็ด' },
      'flemex': { generic: 'Carbocisteine', strength: '375 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'solmux': { generic: 'Carbocisteine', strength: '500 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'carbocisteine': { generic: 'Carbocisteine', strength: '375 mg', form: 'Tablet', defaultUnit: 'เม็ด' },

      // Gastrointestinal System
      'air-x': { generic: 'Simethicone', strength: '80 mg', form: 'Chewable Tablet', defaultUnit: 'เม็ด' },
      'de-gas': { generic: 'Simethicone', strength: '80 mg', form: 'Chewable Tablet', defaultUnit: 'เม็ด' },
      'disflatyl': { generic: 'Simethicone', strength: '40 mg', form: 'Chewable Tablet', defaultUnit: 'เม็ด' },
      'simethicone': { generic: 'Simethicone', strength: '80 mg', form: 'Chewable Tablet', defaultUnit: 'เม็ด' },
      'antacil': { generic: 'Aluminium hydroxide + Magnesium hydroxide + Simethicone', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'alum-mag': { generic: 'Aluminium hydroxide + Magnesium hydroxide', strength: '', form: 'Suspension', defaultUnit: 'ขวด' },
      'kremil-s': { generic: 'Aluminium hydroxide + Magnesium hydroxide + Dicyclomine', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'gaviscon': { generic: 'Sodium alginate + Antacid', strength: '', form: 'Sachet', defaultUnit: 'ซอง' },
      'miracid': { generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'losec': { generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'ocid': { generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'o-mep': { generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'omeprazole': { generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'nexium': { generic: 'Esomeprazole', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'esomeprazole': { generic: 'Esomeprazole', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'controloc': { generic: 'Pantoprazole', strength: '40 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'pantoprazole': { generic: 'Pantoprazole', strength: '40 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'pariet': { generic: 'Rabeprazole', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'rabeprazole': { generic: 'Rabeprazole', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dexilant': { generic: 'Dexlansoprazole', strength: '60 mg', form: 'Capsule', defaultUnit: 'แคปซูล' },
      'motilium': { generic: 'Domperidone', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'miridon': { generic: 'Domperidone', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'moti': { generic: 'Domperidone', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'domper': { generic: 'Domperidone', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'domperidone': { generic: 'Domperidone', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'plasil': { generic: 'Metoclopramide', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'metoclopramide': { generic: 'Metoclopramide', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'buscopan': { generic: 'Hyoscine butylbromide', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'hyoscine': { generic: 'Hyoscine butylbromide', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'senokot': { generic: 'Senna extract', strength: '7.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'senna': { generic: 'Senna extract', strength: '7.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dulcolax': { generic: 'Bisacodyl', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bisacodyl': { generic: 'Bisacodyl', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'smecta': { generic: 'Dioctahedral smectite', strength: '3 g', form: 'Sachet', defaultUnit: 'ซอง' },
      'royal-d': { generic: 'Oral Rehydration Salts (ORS)', strength: '', form: 'Sachet', defaultUnit: 'ซอง' },
      'oreda': { generic: 'Oral Rehydration Salts (ORS)', strength: '', form: 'Sachet', defaultUnit: 'ซอง' },
      'ors': { generic: 'Oral Rehydration Salts (ORS)', strength: '', form: 'Sachet', defaultUnit: 'ซอง' },

      // Cardiovascular, Endocrine, Lipid & Chronic
      'glucophage': { generic: 'Metformin HCl', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'siamformet': { generic: 'Metformin HCl', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'metfor': { generic: 'Metformin HCl', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'metformin': { generic: 'Metformin HCl', strength: '500 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'diamicron': { generic: 'Gliclazide', strength: '60 mg', form: 'MR Tablet', defaultUnit: 'เม็ด' },
      'gliclazide': { generic: 'Gliclazide', strength: '60 mg', form: 'MR Tablet', defaultUnit: 'เม็ด' },
      'amaryl': { generic: 'Glimepiride', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'glimepiride': { generic: 'Glimepiride', strength: '2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'januvia': { generic: 'Sitagliptin', strength: '100 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'sitagliptin': { generic: 'Sitagliptin', strength: '100 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'galvus': { generic: 'Vildagliptin', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'vildagliptin': { generic: 'Vildagliptin', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'forxiga': { generic: 'Dapagliflozin', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dapagliflozin': { generic: 'Dapagliflozin', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'jardiance': { generic: 'Empagliflozin', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'empagliflozin': { generic: 'Empagliflozin', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'norvasc': { generic: 'Amlodipine besylate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amcard': { generic: 'Amlodipine besylate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amlopin': { generic: 'Amlodipine besylate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'amlodipine': { generic: 'Amlodipine besylate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cozaar': { generic: 'Losartan potassium', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'losar': { generic: 'Losartan potassium', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'losartan': { generic: 'Losartan potassium', strength: '50 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'diovan': { generic: 'Valsartan', strength: '80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'valsartan': { generic: 'Valsartan', strength: '80 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'micardis': { generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'telmisartan': { generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'concor': { generic: 'Bisoprolol fumarate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bisoprolol': { generic: 'Bisoprolol fumarate', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'betaloc': { generic: 'Metoprolol tartrate', strength: '100 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'metoprolol': { generic: 'Metoprolol tartrate', strength: '100 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'lipitor': { generic: 'Atorvastatin calcium', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'atorva': { generic: 'Atorvastatin calcium', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ator': { generic: 'Atorvastatin calcium', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'atorvastatin': { generic: 'Atorvastatin calcium', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'crestor': { generic: 'Rosuvastatin calcium', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'rosuva': { generic: 'Rosuvastatin calcium', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'rosuvastatin': { generic: 'Rosuvastatin calcium', strength: '10 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'zocor': { generic: 'Simvastatin', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'simva': { generic: 'Simvastatin', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'bestatin': { generic: 'Simvastatin', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'simvastatin': { generic: 'Simvastatin', strength: '20 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'plavix': { generic: 'Clopidogrel bisulfate', strength: '75 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'clopid': { generic: 'Clopidogrel bisulfate', strength: '75 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'clopidogrel': { generic: 'Clopidogrel bisulfate', strength: '75 mg', form: 'Tablet', defaultUnit: 'เม็ด' },

      // Steroids, Topicals, Vitamins & Minerals
      'prednisolone': { generic: 'Prednisolone', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'pred-5': { generic: 'Prednisolone', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dexa': { generic: 'Dexamethasone', strength: '0.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'dexamethasone': { generic: 'Dexamethasone', strength: '0.5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'medrol': { generic: 'Methylprednisolone', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'methylpred': { generic: 'Methylprednisolone', strength: '4 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fucidin': { generic: 'Fusidic acid', strength: '2%', form: 'Cream / Ointment', defaultUnit: 'หลอด' },
      'garamycin': { generic: 'Gentamicin sulfate', strength: '0.1%', form: 'Cream / Eye Drops', defaultUnit: 'หลอด' },
      'canesten': { generic: 'Clotrimazole', strength: '1%', form: 'Cream', defaultUnit: 'หลอด' },
      'clotrimazole': { generic: 'Clotrimazole', strength: '1%', form: 'Cream', defaultUnit: 'หลอด' },
      'daktarin': { generic: 'Miconazole nitrate', strength: '2%', form: 'Oral Gel / Cream', defaultUnit: 'หลอด' },
      'nizoral': { generic: 'Ketoconazole', strength: '2%', form: 'Cream / Shampoo', defaultUnit: 'หลอด' },
      'ketoconazole': { generic: 'Ketoconazole', strength: '2%', form: 'Cream / Shampoo', defaultUnit: 'หลอด' },
      'b-complex': { generic: 'Vitamin B Complex', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'b-co': { generic: 'Vitamin B Complex', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'alindamin': { generic: 'Vitamin B Complex', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'neurobion': { generic: 'Vitamin B1 + B6 + B12', strength: '100/200/0.2 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'vit b1-6-12': { generic: 'Vitamin B1 + B6 + B12', strength: '', form: 'Tablet', defaultUnit: 'เม็ด' },
      'folic': { generic: 'Folic acid', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'folic acid': { generic: 'Folic acid', strength: '5 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'ferrous': { generic: 'Ferrous fumarate', strength: '200 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'fuma': { generic: 'Ferrous fumarate', strength: '200 mg', form: 'Tablet', defaultUnit: 'เม็ด' },
      'calcium-d': { generic: 'Calcium carbonate + Vitamin D3', strength: '600 mg / 200 IU', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cal-d': { generic: 'Calcium carbonate + Vitamin D3', strength: '600 mg / 200 IU', form: 'Tablet', defaultUnit: 'เม็ด' },
      'cdr': { generic: 'Calcium + Vitamin C + D + B6', strength: '', form: 'Effervescent Tablet', defaultUnit: 'หลอด' }
    };

    // Advanced Clinical Pharmacological Enricher & Canonical Matcher
    function enrichOpdDrugItem(item) {
      if (!item || typeof item !== 'object') return item;

      let tradeKey = (item.trade_name || '').toLowerCase().trim();
      let genericKey = (item.generic_name || '').toLowerCase().trim();

      // Clean distributor prefixes & package suffixes (e.g. "Tab. Noraphen 500mg (S.R.O.)" -> "noraphen")
      const cleanKey = (text) => {
        return text
          .replace(/\s*\([^)]*\)/g, '') // remove parenthesized distributor
          .replace(/^(tab|cap|syr|inj|cream|oint|sachet|dr|drops?|solution|susp|amp|vial)[\.\s]+/i, '')
          .replace(/\b(\d+mg|\d+g|\d+ml|\d+%|forte|plus|comp|max|d|sr|xr|cr|retard)\b/gi, '')
          .replace(/[-_\/\.]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const cTrade = cleanKey(tradeKey);
      const cGeneric = cleanKey(genericKey);

      // 1. Direct match on Thai Drug Database
      let match = THAI_DRUG_DATABASE[tradeKey] || 
                  THAI_DRUG_DATABASE[cTrade] || 
                  THAI_DRUG_DATABASE[genericKey] || 
                  THAI_DRUG_DATABASE[cGeneric];

      // 2. Word-level prefix matching (e.g. "Noraphen 500" -> "noraphen")
      if (!match) {
        const tWords = cTrade.split(' ');
        if (tWords.length > 0 && THAI_DRUG_DATABASE[tWords[0]]) {
          match = THAI_DRUG_DATABASE[tWords[0]];
        }
        const gWords = cGeneric.split(' ');
        if (!match && gWords.length > 0 && THAI_DRUG_DATABASE[gWords[0]]) {
          match = THAI_DRUG_DATABASE[gWords[0]];
        }
      }

      // 3. Fuzzy partial matching in database keys
      if (!match && cTrade.length >= 3) {
        for (const [k, v] of Object.entries(THAI_DRUG_DATABASE)) {
          if (k.startsWith(cTrade) || cTrade.startsWith(k) || (k.length >= 4 && cTrade.includes(k))) {
            match = v;
            break;
          }
        }
      }

      // 4. Cross-check against active Clinic Drug Master (STORAGE_KEYS.DRUGS)
      let clinicMatch = null;
      try {
        const existingDrugs = (typeof DB !== 'undefined' && DB.get) ? (DB.get(STORAGE_KEYS.DRUGS) || []) : [];
        if (existingDrugs.length > 0) {
          clinicMatch = existingDrugs.find(d => {
            const dGen = (d.generic_name || '').toLowerCase().trim();
            const dTrade = (d.trade_name || '').toLowerCase().trim();
            return (cTrade && dTrade && (dTrade === cTrade || dTrade.includes(cTrade) || cTrade.includes(dTrade))) ||
                   (cGeneric && dGen && (dGen === cGeneric || dGen.includes(cGeneric) || cGeneric.includes(dGen)));
          });
        }
      } catch(_) {}

      if (clinicMatch) {
        item.generic_name = clinicMatch.generic_name;
        if (!item.strength && clinicMatch.strength) item.strength = clinicMatch.strength;
        if (!item.dosage_form && clinicMatch.dosage_form) item.dosage_form = clinicMatch.dosage_form;
        if (!item.unit && clinicMatch.unit) item.unit = clinicMatch.unit;
      } else if (match) {
        // Apply enriched standard details
        if (!item.generic_name || genericKey === tradeKey || genericKey.includes('unknown') || genericKey.includes('parac') || genericKey.length < 4 || cGeneric === cTrade) {
          item.generic_name = match.generic;
        }
        if (!item.strength && match.strength) {
          item.strength = match.strength;
        }
        if (!item.dosage_form || item.dosage_form.toLowerCase() === 'drug' || item.dosage_form.toLowerCase() === 'medicine') {
          item.dosage_form = match.form;
        }
        if (!item.unit) {
          item.unit = match.defaultUnit;
        }
      }

      // 5. Clean up truncated abbreviations in Generic Name (e.g. "Orphenadrine + Parac" -> "Orphenadrine citrate + Paracetamol")
      if (item.generic_name) {
        let g = item.generic_name;
        g = g.replace(/\bparac\b/gi, 'Paracetamol')
             .replace(/\bpara\b/gi, 'Paracetamol')
             .replace(/\bamoxy\b/gi, 'Amoxicillin')
             .replace(/\bamox\b/gi, 'Amoxicillin')
             .replace(/\bcpm\b/gi, 'Chlorpheniramine maleate')
             .replace(/\bors\b/gi, 'Oral Rehydration Salts (ORS)')
             .replace(/\bmetfor\b/gi, 'Metformin')
             .replace(/\bamlopin\b/gi, 'Amlodipine')
             .replace(/\bsimva\b/gi, 'Simvastatin')
             .replace(/\batorva\b/gi, 'Atorvastatin')
             .replace(/\bclav\b/gi, 'Clavulanic acid')
             .trim();
        item.generic_name = g;
      }

      if (item.strength) {
        item.strength = String(item.strength).replace(/(\d+)(mg|mcg|g|ml|%)/gi, '$1 $2').trim();
      }

      const cost = parseFloat(item.cost_price || item.unit_price || item.price || 0) || 0;
      item.cost_price = Math.round(cost * 100) / 100;
      item.quantity = parseInt(item.quantity || item.qty || 1, 10) || 1;

      return item;
    }

    const DrugOcrModule = {
      scannedRows: [],
      selectedIndices: new Set(),
      currentImageData: null,
      currentMimeType: 'image/jpeg',
      cameraStream: null,

      getApiKey() {
        return localStorage.getItem('ocr_gemini_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('opd_gemini_api_key') || '';
      },

      setApiKey(key) {
        if (key) {
          localStorage.setItem('ocr_gemini_api_key', key);
          localStorage.setItem('gemini_api_key', key);
          localStorage.setItem('opd_gemini_api_key', key);
        }
      },

      toggleFullscreen() {
        const c = document.getElementById('modal-ocr-container');
        const btn = document.getElementById('ocr-btn-fullscreen');
        if (c) {
          c.classList.toggle('modal-ocr-fullscreen');
          const isFull = c.classList.contains('modal-ocr-fullscreen');
          if (btn) btn.innerHTML = isFull ? '<i data-lucide="minimize-2"></i> ย่อขนาด' : '<i data-lucide="maximize-2"></i> เต็มจอ';
          lucide.createIcons();
        }
      },

      toggleUploadPanel() {
        const dropzone = document.getElementById('ocr-dropzone');
        const camBox = document.getElementById('ocr-camera-box');
        const btn = document.getElementById('ocr-toggle-panel-btn');
        if (!dropzone) return;
        const isHidden = dropzone.style.display === 'none';
        if (isHidden) {
          dropzone.style.display = 'block';
          if (btn) btn.innerHTML = '<i data-lucide="chevron-up"></i> ย่อแผงสแกน';
        } else {
          dropzone.style.display = 'none';
          if (camBox) camBox.style.display = 'none';
          if (btn) btn.innerHTML = '<i data-lucide="chevron-down"></i> ขยายแผงสแกน';
        }
        lucide.createIcons();
      },

      populateGenericDatalist() {
        const dl = document.getElementById('ocr-generic-names-datalist');
        if (!dl) return;
        const set = new Set();
        // Add from Thai Drug DB
        Object.values(THAI_DRUG_DATABASE).forEach(d => { if (d.generic) set.add(d.generic); });
        // Add from Clinic Drugs
        try {
          const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];
          drugs.forEach(d => { if (d.generic_name) set.add(d.generic_name); });
        } catch(_) {}
        dl.innerHTML = Array.from(set).sort().map(g => '<option value="' + g.replace(/"/g, '&quot;') + '"></option>').join('');
      },

      openModal() {
        this.populateGenericDatalist();
        if (typeof AuthModule !== "undefined" && AuthModule.requireAdmin && !AuthModule.requireAdmin("ระบบ AI OCR นำเข้ายา")) return;
        this.selectedIndices.clear();
        const today = new Date().toISOString().slice(0, 10);
        const dateInput = document.getElementById('ocr-invoice-date');
        if (dateInput && !dateInput.value) dateInput.value = today;

        const modal = document.getElementById('modal-ocr-drug-inbound');
        if (modal) modal.classList.add('active');
        lucide.createIcons();
        this.renderOcrTable();
      },

      closeModal() {
        this.stopCamera();
        const modal = document.getElementById('modal-ocr-drug-inbound');
        if (modal) modal.classList.remove('active');
      },

      openApiKeyModal() {
        const input = document.getElementById('ocr-api-key-input');
        if (input) input.value = this.getApiKey();
        const statusBox = document.getElementById('ocr-api-test-status');
        if (statusBox) statusBox.innerHTML = '';
        document.getElementById('modal-ocr-api-key').classList.add('active');
        lucide.createIcons();
      },

      closeApiKeyModal() {
        document.getElementById('modal-ocr-api-key').classList.remove('active');
      },

      saveApiKey() {
        const input = document.getElementById('ocr-api-key-input');
        const key = input ? input.value.trim() : '';
        if (!key) { alert('กรุณาระบุ Gemini API Key'); return; }
        this.setApiKey(key);
        this.closeApiKeyModal();
        alert('บันทึก Gemini API Key เรียบร้อยแล้ว พร้อมใช้งาน');
      },

      async testApiKey() {
        const input = document.getElementById('ocr-api-key-input');
        const key = input ? input.value.trim() : '';
        const statusBox = document.getElementById('ocr-api-test-status');
        if (!key) {
          if (statusBox) statusBox.innerHTML = '<div style="color: #dc2626; font-size: 0.82rem;">กรุณากรอก API Key ก่อนทดสอบ</div>';
          return;
        }
        if (statusBox) statusBox.innerHTML = '<div style="color: #7c3aed; font-size: 0.82rem;"><i data-lucide="loader-2" class="spin"></i> กำลังทดสอบเชื่อมต่อ Google Gemini API...</div>';
        lucide.createIcons();

        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello, respond with OK only' }] }]
            })
          });
          const data = await res.json();
          if (res.ok && data?.candidates) {
            statusBox.innerHTML = '<div style="color: #059669; font-size: 0.85rem; font-weight: 600;">✅ การเชื่อมต่อสำเร็จ! API Key ใช้งานได้ปกติ (gemini-3.6-flash)</div>';
          } else {
            const errMsg = data?.error?.message || res.statusText;
            statusBox.innerHTML = `<div style="color: #dc2626; font-size: 0.82rem;">❌ เชื่อมต่อไม่สำเร็จ: ${errMsg}</div>`;
          }
        } catch (e) {
          statusBox.innerHTML = `<div style="color: #dc2626; font-size: 0.82rem;">❌ เกิดข้อผิดพลาด: ${e.message}</div>`;
        }
        lucide.createIcons();
      },

      // File Upload Handlers
      onDragOver(e) { e.preventDefault(); document.getElementById('ocr-dropzone')?.classList.add('dragover'); },
      onDragLeave(e) { e.preventDefault(); document.getElementById('ocr-dropzone')?.classList.remove('dragover'); },
      onDrop(e) {
        e.preventDefault();
        document.getElementById('ocr-dropzone')?.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          this.onFileSelected(e.dataTransfer.files);
        }
      },

      async onFileSelected(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        const hint = document.getElementById('ocr-file-name-hint');
        if (hint) hint.innerText = `📄 ไฟล์ที่เลือก: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

        if (file.type === 'application/pdf') {
          this.currentMimeType = 'application/pdf';
          const reader = new FileReader();
          reader.onload = async (e) => {
            const typedarray = new Uint8Array(e.target.result);
            try {
              if (window.pdfjsLib) {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                this.currentImageData = dataUrl.split(',')[1];
                this.currentMimeType = 'image/jpeg';
                this.showPreviewThumbnail(dataUrl, file.name);
              } else {
                const b64 = e.target.result.split(',')[1];
                this.currentImageData = b64;
                this.showPreviewThumbnail('', file.name);
              }
            } catch(err) {
              console.error('PDF parsing error:', err);
              alert('ไม่สามารถอ่านไฟล์ PDF ได้ กรุณาลองใช้รูปถ่ายแทน');
            }
          };
          reader.readAsArrayBuffer(file);
        } else if (file.type.startsWith('image/')) {
          this.currentMimeType = file.type || 'image/jpeg';
          const reader = new FileReader();
          reader.onload = (e) => {
            const full = e.target.result;
            this.currentImageData = full.split(',')[1];
            this.showPreviewThumbnail(full, file.name);
          };
          reader.readAsDataURL(file);
        } else {
          alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG) หรือเอกสาร PDF');
        }
      },

      showPreviewThumbnail(src, name) {
        const bar = document.getElementById('ocr-preview-bar');
        const img = document.getElementById('ocr-preview-thumb');
        const txt = document.getElementById('ocr-preview-text');
        if (bar && img && txt) {
          bar.style.display = 'flex';
          img.src = src || '';
          img.style.display = src ? 'block' : 'none';
          txt.innerText = `พร้อมสแกน: ${name}`;
        }
      },

      clearFile() {
        this.currentImageData = null;
        const bar = document.getElementById('ocr-preview-bar');
        if (bar) bar.style.display = 'none';
        const input = document.getElementById('ocr-file-input');
        if (input) input.value = '';
        const hint = document.getElementById('ocr-file-name-hint');
        if (hint) hint.innerText = 'รองรับไฟล์สลิป, ใบเสร็จยา, เอกสารสั่งซื้อ และบิลส่งของทุกประเภท';
      },

      viewFullImage() {
        if (!this.currentImageData) return;
        const win = window.open();
        win.document.write(`<img src="data:${this.currentMimeType};base64,${this.currentImageData}" style="max-width:100%;">`);
      },

      // Camera Handlers
      async toggleCamera() {
        if (this.cameraStream) {
          this.stopCamera();
        } else {
          await this.startCamera();
        }
      },

      async startCamera() {
        try {
          const box = document.getElementById('ocr-camera-box');
          const video = document.getElementById('ocr-camera-video');
          const btnText = document.getElementById('ocr-cam-btn-text');
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
          this.cameraStream = stream;
          if (video) video.srcObject = stream;
          if (box) box.style.display = 'block';
          if (btnText) btnText.innerText = 'ปิดกล้อง';
          lucide.createIcons();
        } catch(err) {
          console.error('Camera error:', err);
          alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์: ' + err.message);
        }
      },

      stopCamera() {
        if (this.cameraStream) {
          this.cameraStream.getTracks().forEach(t => t.stop());
          this.cameraStream = null;
        }
        const box = document.getElementById('ocr-camera-box');
        const btnText = document.getElementById('ocr-cam-btn-text');
        if (box) box.style.display = 'none';
        if (btnText) btnText.innerText = 'เปิดกล้องถ่าย';
      },

      captureCamera() {
        const video = document.getElementById('ocr-camera-video');
        if (!video || !this.cameraStream) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        this.currentImageData = dataUrl.split(',')[1];
        this.currentMimeType = 'image/jpeg';
        this.showPreviewThumbnail(dataUrl, 'ภาพถ่ายจากกล้อง (' + new Date().toLocaleTimeString() + ')');
        this.stopCamera();
        alert('ถ่ายภาพใบเสร็จเรียบร้อยแล้ว กดปุ่ม "สแกนด้วย AI" เพื่อเริ่มวิเคราะห์');
      },

      // AI OCR Scanning Engine with Specialized Pharmacist Prompt & Auto-Failover
      async runOcr() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
          alert('กรุณาตั้งค่า Gemini API Key ก่อนเริ่มสแกน');
          this.openApiKeyModal();
          return;
        }

        if (!this.currentImageData) {
          alert('กรุณาเลือกไฟล์รูปภาพใบเสร็จ หรือถ่ายรูปจากกล้องก่อน');
          return;
        }

        const loader = document.getElementById('ocr-loading-state');
        const tableSec = document.getElementById('ocr-table-section');
        const runBtn = document.getElementById('ocr-run-btn');
        const statusBadge = document.getElementById('ocr-model-status-badge');

        if (loader) loader.style.display = 'block';
        if (tableSec) tableSec.style.opacity = '0.4';
        if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> กำลังสแกน...'; }
        if (statusBadge) statusBadge.innerText = 'กำลังประมวลผล...';
        lucide.createIcons();

        const selectedModel = document.getElementById('ocr-model-select')?.value || 'gemini-3.6-flash';
        const isFailoverEnabled = document.getElementById('ocr-failover-checkbox')?.checked !== false;

        let candidateModels = [selectedModel];
        if (isFailoverEnabled) {
          const others = OCR_MODEL_FALLBACK_LIST.filter(m => m !== selectedModel);
          candidateModels = candidateModels.concat(others);
        }

        const prompt = `You are an elite Clinical Pharmacist and Medical Document OCR Extraction Engine specializing in Thai and International Pharmaceutical Invoices, OPD Prescription Slips, and Clinic Drug Receipts.
Analyze the attached receipt/invoice with the utmost pharmacological accuracy.
Extract active pharmaceutical ingredients (Generic Names/INN) and trade names with zero hallucination.

TASK: Extract every pharmaceutical line item from this medical purchase order or pharmacy invoice and format into a standardized 6-column inventory structure.

CRITICAL PHARMACEUTICAL EXTRACTION RULES:
1. "generic_name": The standardized International Nonproprietary Name (INN) in English.
   - You MUST identify the full active ingredient even if only the Trade Name is printed!
   - STRICT ACCURACY RULES:
     * NEVER truncate or abbreviate drug names (e.g. NEVER output "Orphenadrine + Parac"; ALWAYS output "Orphenadrine citrate + Paracetamol").
     * For combination drugs, write all active ingredients in full:
       - "Noraphen" / "Norgesic" / "Muscol" -> "Orphenadrine citrate + Paracetamol"
       - "Ibustar" / "Ibustar-F" / "Gofen" / "Nurofen" -> "Ibuprofen"
       - "Amk" / "Augmentin" / "Cavumox" / "Fleming" -> "Amoxicillin + Clavulanic acid"
       - "Decolgen" / "Tiffy" -> "Paracetamol + Phenylephrine + Chlorpheniramine"
       - "Ultracet" / "Tramacet" -> "Tramadol + Paracetamol"
       - "Bactrim" / "Cotrim" -> "Co-trimoxazole (Sulfamethoxazole + Trimethoprim)"
       - "Antacil" / "Alum-Mag" -> "Aluminium hydroxide + Magnesium hydroxide + Simethicone"
       - "Air-X" / "De-gas" -> "Simethicone"
   - Examples of Thai Trade Name to Generic Name mappings:
     * "Amk" / "Augmentin" / "Cavumox" / "Curam" / "Fleming" -> "Augmentin (Amoxy/Clav)" or "Amoxicillin"
     * "Hiconcil" / "Ibiamox" / "Moxilin" / "Amoxy" -> "Amoxicillin"
     * "Klacid" / "Klaacid" / "Crixan" -> "Clarithromycin"
     * "Zithromax" / "Azithro" -> "Azithromycin"
     * "Ciprobay" / "Cifran" / "Cipro" -> "Ciprofloxacin"
     * "Cravit" / "Levo" -> "Levofloxacin"
     * "Ponstan" / "Postan" -> "Mefenamic Acid"
     * "Nurofen" / "Brufen" / "Ibu" -> "Ibuprofen"
     * "Voltaren" / "Difelene" -> "Diclofenac Sodium"
     * "Celebrex" / "Cobix" -> "Celecoxib"
     * "Arcoxia" / "Torcoxia" -> "Etoricoxib"
     * "Sara" / "Tylenol" / "Panadol" / "Paracap" / "Cemol" -> "Paracetamol"
     * "Ultracet" / "Tramacet" -> "Tramadol + Paracetamol"
     * "Norgesic" / "Muscol" -> "Orphenadrine + Paracetamol"
     * "Myonal" / "Episone" -> "Eperisone HCl"
     * "Sirdalud" -> "Tizanidine"
     * "Zyrtec" / "Cetriz" / "Aller-C" -> "Cetirizine HCl"
     * "Telfast" / "Fexodine" -> "Fexofenadine"
     * "Xyzal" -> "Levocetirizine"
     * "Clarityne" / "Allergin" -> "Loratadine"
     * "Aerius" -> "Desloratadine"
     * "Singulair" / "Montek" -> "Montelukast"
     * "Ventolin" / "Asthalin" -> "Salbutamol"
     * "Bisolvon" -> "Bromhexine HCl"
     * "Mucosolvan" / "Ambril" -> "Ambroxol HCl"
     * "Fluimucil" / "NAC long" / "Flemex" -> "Acetylcysteine"
     * "Losec" / "Miracid" / "Ocid" -> "Omeprazole"
     * "Nexium" -> "Esomeprazole"
     * "Controloc" -> "Pantoprazole"
     * "Pariet" -> "Rabeprazole"
     * "Motilium" / "Miridon" -> "Domperidone"
     * "Plasil" -> "Metoclopramide"
     * "Buscopan" -> "Hyoscine butylbromide"
     * "Air-X" / "Disflatyl" -> "Simethicone"
     * "Glucophage" / "Siamformet" -> "Metformin"
     * "Diamicron" -> "Gliclazide"
     * "Norvasc" / "Amcard" -> "Amlodipine"
     * "Cozaar" -> "Losartan"
     * "Lipitor" / "Atorva" -> "Atorvastatin"
     * "Crestor" / "Rosuva" -> "Rosuvastatin"
     * "Zocor" / "Bestatin" -> "Simvastatin"
     * "Plavix" -> "Clopidogrel"
     * "Royal-D" / "Oreda" -> "Oral Rehydration Salts (ORS)"

2. "strength": Drug potency with unit (e.g. "1000 mg", "500 mg", "625 mg", "120 mg/5ml", "10%", "500 mcg").
3. "dosage_form": English formulation (e.g. "Tablet", "Capsule", "Syrup", "Suspension", "Cream", "Ointment", "Eye Drop", "Injection", "Sachet", "Ampoule", "Gel").
4. "trade_name": Commercial brand name / Trade name as printed on the invoice (e.g. "Amk", "Fleming / GSK", "Sara 500", "Tylenol Syrup", "Royal-D").
5. "unit": Smallest single dispensing inventory unit in Thai (e.g. "เม็ด", "แคปซูล", "ขวด", "ซอง", "หลอด", "แอมพูล", "ไวอัล").
6. "quantity": Number of units received (numeric).
7. "cost_price": Purchase price PER SMALLEST DISPENSING UNIT (Float with 2 decimals).
   - UNIT PRICE CALCULATION: Divide package price by total smallest units contained:
     * 1 bottle of 500 tablets @ 4,700 THB -> cost_price = 4700 / 500 = 9.40 (THB/เม็ด)
     * 1 box of 14 tablets @ 130.20 THB -> cost_price = 130.20 / 14 = 9.30 (THB/เม็ด)
     * 1 dozen (12 bottles) @ 384.00 THB -> cost_price = 384 / 12 = 32.00 (THB/ขวด)
     * 1 box of 50 sachets @ 225.00 THB -> cost_price = 225 / 50 = 4.50 (THB/ซอง)
8. "invoice_ref": Invoice or receipt number if visible (string).
9. "vendor_name": Vendor or pharmaceutical distributor company (string).

JSON Schema:
{
  "invoice_ref": "string | null",
  "vendor_name": "string | null",
  "items": [
    {
      "generic_name": "string",
      "strength": "string",
      "dosage_form": "string",
      "trade_name": "string",
      "unit": "string",
      "quantity": 100,
      "cost_price": 0.0
    }
  ]
}
Return ONLY valid JSON without markdown wrapping.`;

        let successResult = null;
        let successfulModel = null;
        let lastError = null;

        for (let i = 0; i < candidateModels.length; i++) {
          const modelToTry = candidateModels[i];
          if (statusBadge) statusBadge.innerText = `กำลังลองโมเดล: ${modelToTry} (${i+1}/${candidateModels.length})...`;

          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: this.currentMimeType,
                        data: this.currentImageData
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0.1,
                  topP: 0.95,
                  maxOutputTokens: 8192
                }
              })
            });

            if (!response.ok) {
              let errMsg = `HTTP ${response.status}: ${response.statusText}`;
              try {
                const errJson = await response.json();
                if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
              } catch(_) {}
              throw new Error(errMsg);
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
              const textParts = data.candidates[0].content.parts.map(p => p.text || '').join('\n').trim();
              let cleaned = textParts.replace(/^\`\`\`[a-z]*\s*/i, '').replace(/\`\`\`\s*$/i, '').trim();
              
              let parsed;
              try {
                parsed = JSON.parse(cleaned);
              } catch(e) {
                const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                else throw e;
              }

              successResult = parsed;
              successfulModel = modelToTry;
              break; // Succeeded!
            } else {
              throw new Error('Gemini API ส่งการตอบกลับที่ไม่มีเนื้อหา');
            }
          } catch (err) {
            lastError = err;
            console.warn(`Model ${modelToTry} failed:`, err);
            if (!isFailoverEnabled) break;
          }
        }

        if (loader) loader.style.display = 'none';
        if (tableSec) tableSec.style.opacity = '1';
        if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '<i data-lucide="play"></i> สแกนด้วย AI'; }
        lucide.createIcons();

        if (successResult) {
          if (statusBadge) statusBadge.innerText = `✅ สแกนสำเร็จด้วย ${successfulModel}`;

          if (successResult.invoice_ref && !document.getElementById('ocr-invoice-ref').value) {
            document.getElementById('ocr-invoice-ref').value = successResult.invoice_ref;
          }
          if (successResult.vendor_name && !document.getElementById('ocr-vendor-name').value) {
            document.getElementById('ocr-vendor-name').value = successResult.vendor_name;
          }

          let rawItems = Array.isArray(successResult.items) ? successResult.items : (Array.isArray(successResult) ? successResult : (successResult.data || successResult.drugs || []));
          rawItems = rawItems.map(item => enrichOpdDrugItem(item));

          if (rawItems.length === 0) {
            alert('AI ไม่พบรายการยาในเอกสาร กรุณาตรวจสอบความคมชัดของรูปภาพแล้วลองใหม่อีกครั้ง');
          } else {
            this.processExtractedItems(rawItems);
            const dropzone = document.getElementById('ocr-dropzone');
            const toggleBtn = document.getElementById('ocr-toggle-panel-btn');
            if (dropzone) dropzone.style.display = 'none';
            if (toggleBtn) toggleBtn.innerHTML = '<i data-lucide="chevron-down"></i> ขยายแผงสแกน';
            lucide.createIcons();
          }
        } else {
          if (statusBadge) statusBadge.innerText = '❌ การสแกนล้มเหลว';
          alert('การประมวลผลล้มเหลว: ' + (lastError ? lastError.message : 'ไม่สามารถอ่านข้อมูลได้'));
        }
      },

      processExtractedItems(rawItems) {
        const existingDrugs = DB.get(STORAGE_KEYS.DRUGS) || [];
        this.selectedIndices.clear();

        this.scannedRows = rawItems.map((item, idx) => {
          const genName = (item.generic_name || item.name || '').trim();
          const tradeName = (item.trade_name || '').trim();
          const strength = (item.strength || '').trim();
          const form = (item.dosage_form || item.form || 'Tablet').trim();
          const unit = (item.unit || 'เม็ด').trim();
          const qty = parseInt(item.quantity || item.qty, 10) || 1;
          const cost = parseFloat(item.cost_price || item.unit_price || item.cost || item.price) || 0;

          // Intelligent Matching against Clinic Drug Master
          let matchedDrug = null;

          // 1. Exact Match on Generic + Strength
          if (genName) {
            matchedDrug = existingDrugs.find(d => 
              (d.generic_name || '').toLowerCase().trim() === genName.toLowerCase().trim() && 
              (!strength || !d.strength || (d.strength || '').toLowerCase().trim() === strength.toLowerCase().trim())
            );
          }

          // 2. Exact Match on Generic alone
          if (!matchedDrug && genName) {
            matchedDrug = existingDrugs.find(d => 
              (d.generic_name || '').toLowerCase().trim() === genName.toLowerCase().trim()
            );
          }

          // 3. Exact Match on Trade Name
          if (!matchedDrug && tradeName) {
            matchedDrug = existingDrugs.find(d => 
              (d.trade_name || '').toLowerCase().trim() === tradeName.toLowerCase().trim()
            );
          }

          let salePrice = 0;
          let action = 'new';
          if (matchedDrug) {
            action = 'stock_in';
            // รายการยาเดิมในคลัง: ยึดราคาขายเดิมของคลินิกไว้เสมอ
            salePrice = matchedDrug.sale_price !== undefined && matchedDrug.sale_price !== null && matchedDrug.sale_price > 0 
              ? matchedDrug.sale_price 
              : Number((cost * 1.5).toFixed(2));
          } else {
            action = 'new';
            // รายการยาใหม่: คำนวณราคาขายแนะนำเริ่มต้น (+50% Markup)
            salePrice = Number((cost * 1.5).toFixed(2));
          }

          return {
            row_id: 'ROW_' + Date.now() + '_' + idx,
            generic_name: genName || (matchedDrug ? matchedDrug.generic_name : ''),
            strength: strength || (matchedDrug ? matchedDrug.strength : ''),
            dosage_form: form || (matchedDrug ? matchedDrug.dosage_form : 'Tablet'),
            trade_name: tradeName || (matchedDrug ? matchedDrug.trade_name : ''),
            unit: unit || (matchedDrug ? matchedDrug.unit : 'เม็ด'),
            quantity: qty,
            cost_price: cost,
            sale_price: salePrice,
            matched_drug_id: matchedDrug ? matchedDrug.drug_id : null,
            matched_drug: matchedDrug,
            action: action
          };
        });

        // เลือกทุกรายการที่สแกนได้โดยอัตโนมัติ เพื่อให้ผู้ใช้ตรวจสอบและกดยืนยันนำเข้าได้ทันที
        this.scannedRows.forEach((_, idx) => this.selectedIndices.add(idx));

        this.renderOcrTable();
      },

      renderOcrTable() {
        const tbody = document.getElementById('ocr-review-tbody');
        const countBadge = document.getElementById('ocr-items-count-badge');
        const summaryBar = document.getElementById('ocr-summary-bar');
        const checkAll = document.getElementById('ocr-check-all');
        if (!tbody) return;

        if (this.scannedRows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--slate-400); padding: 30px;">ยังไม่มีรายการยาที่สแกน กรุณาอัปโหลดใบเสร็จหรือเปิดกล้องถ่ายภาพ</td></tr>';
          if (countBadge) countBadge.innerHTML = 'รายการที่สแกนได้: <strong>0</strong> รายการ';
          if (summaryBar) summaryBar.innerHTML = 'จำนวนรับเข้ารวม: <strong>0</strong> ชิ้น | มูลค่ารับเข้ารวม: <strong style="color: #047857;">฿0.00</strong>';
          if (checkAll) checkAll.checked = false;
          return;
        }

        if (countBadge) countBadge.innerHTML = `รายการที่สแกนได้: <strong>${this.scannedRows.length}</strong> รายการ (เลือก ${this.selectedIndices.size} รายการ)`;

        let totalQty = 0;
        let totalVal = 0;

        tbody.innerHTML = this.scannedRows.map((row, idx) => {
          const isChecked = this.selectedIndices.has(idx);
          const isMatched = !!row.matched_drug;
          if (row.action !== 'skip') {
            totalQty += (row.quantity || 0);
            totalVal += ((row.quantity || 0) * (row.cost_price || 0));
          }

          let matchBadge = '';
          if (isMatched) {
            matchBadge = `<div class="ocr-badge-match"><i data-lucide="check-circle"></i> ตรงกับ ${row.matched_drug.generic_name} (สต็อก: ${row.matched_drug.stock || 0})</div>`;
          } else {
            matchBadge = `<div class="ocr-badge-new"><i data-lucide="sparkles"></i> ยาตัวใหม่ (จะสร้างรหัสยาใหม่)</div>`;
          }

          return `
            <tr class="${isChecked ? 'row-selected' : ''}">
              <td style="text-align: center; vertical-align: middle;">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="DrugOcrModule.toggleRowSelect(${idx}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
              </td>
              <td>
                <input type="text" class="form-input" value="${row.generic_name || ''}" onchange="DrugOcrModule.updateField(${idx}, 'generic_name', this.value)" placeholder="Generic Name" list="ocr-generic-names-datalist" style="font-weight: 700; color: #0f172a; min-width: 170px;">
              </td>
              <td>
                <input type="text" class="form-input" value="${row.strength || ''}" onchange="DrugOcrModule.updateField(${idx}, 'strength', this.value)" placeholder="เช่น 500 mg" style="text-align: center; min-width: 85px;">
              </td>
              <td>
                <select class="form-select" onchange="DrugOcrModule.updateField(${idx}, 'dosage_form', this.value)" style="min-width: 110px;">
                  <option value="Tablet" ${row.dosage_form === 'Tablet' ? 'selected' : ''}>Tablet (เม็ด)</option>
                  <option value="Capsule" ${row.dosage_form === 'Capsule' ? 'selected' : ''}>Capsule (แคปซูล)</option>
                  <option value="Syrup" ${row.dosage_form === 'Syrup' ? 'selected' : ''}>Syrup (น้ำเชื่อม)</option>
                  <option value="Suspension" ${row.dosage_form === 'Suspension' ? 'selected' : ''}>Suspension (ยาน้ำแขวนตะกอน)</option>
                  <option value="Cream" ${row.dosage_form === 'Cream' ? 'selected' : ''}>Cream (ครีม)</option>
                  <option value="Ointment" ${row.dosage_form === 'Ointment' ? 'selected' : ''}>Ointment (ขี้ผึ้ง)</option>
                  <option value="Injection" ${row.dosage_form === 'Injection' ? 'selected' : ''}>Injection (ยาฉีด)</option>
                  <option value="Eye Drops" ${row.dosage_form === 'Eye Drops' ? 'selected' : ''}>Eye Drops (ยาหยอดตา)</option>
                  <option value="Ear Drops" ${row.dosage_form === 'Ear Drops' ? 'selected' : ''}>Ear Drops (ยาหยอดหู)</option>
                  <option value="Nasal Spray" ${row.dosage_form === 'Nasal Spray' ? 'selected' : ''}>Nasal Spray (พ่นจมูก)</option>
                  <option value="Inhaler" ${row.dosage_form === 'Inhaler' ? 'selected' : ''}>Inhaler (ยาพ่นสูด)</option>
                  <option value="Solution" ${row.dosage_form === 'Solution' ? 'selected' : ''}>Solution (สารละลาย)</option>
                  <option value="Medical Supply" ${row.dosage_form === 'Medical Supply' ? 'selected' : ''}>Medical Supply (เวชภัณฑ์)</option>
                  <option value="Other" ${row.dosage_form === 'Other' ? 'selected' : ''}>Other (อื่นๆ)</option>
                </select>
              </td>
              <td>
                <input type="text" class="form-input" value="${row.trade_name || ''}" onchange="DrugOcrModule.updateField(${idx}, 'trade_name', this.value)" placeholder="Trade Name" style="min-width: 130px;">
              </td>
              <td>
                <input type="text" class="form-input" value="${row.unit || 'เม็ด'}" onchange="DrugOcrModule.updateField(${idx}, 'unit', this.value)" placeholder="หน่วย" style="text-align: center; min-width: 65px;">
              </td>
              <td>
                <input type="number" class="form-input" value="${row.quantity || 1}" min="1" onchange="DrugOcrModule.updateField(${idx}, 'quantity', parseInt(this.value, 10) || 1)" style="font-weight: 700; text-align: center; min-width: 80px;">
              </td>
              <td>
                <input type="number" step="0.01" class="form-input" value="${row.cost_price || 0}" onchange="DrugOcrModule.updateField(${idx}, 'cost_price', parseFloat(this.value) || 0)" style="color: #b45309; font-weight: 700; text-align: right; min-width: 85px;">
              </td>
              <td>
                <input type="number" step="0.01" class="form-input" value="${row.sale_price || 0}" onchange="DrugOcrModule.updateField(${idx}, 'sale_price', parseFloat(this.value) || 0)" style="color: #047857; font-weight: 700; text-align: right; min-width: 85px;">
              </td>
              <td>
                ${matchBadge}
              </td>
              <td>
                <select class="form-select" onchange="DrugOcrModule.updateField(${idx}, 'action', this.value)" style="font-weight: 600; font-size: 0.8rem; min-width: 135px;">
                  <option value="stock_in" ${row.action === 'stock_in' ? 'selected' : ''}>📦 เพิ่มสต็อกเดิม</option>
                  <option value="new" ${row.action === 'new' ? 'selected' : ''}>✨ นำเข้ายาใหม่</option>
                  <option value="skip" ${row.action === 'skip' ? 'selected' : ''}>❌ ข้าม (ไม่นำเข้า)</option>
                </select>
              </td>
              <td style="text-align: center; vertical-align: middle;">
                <button class="btn btn-sm" style="color: #dc2626; padding: 4px 6px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px;" onclick="DrugOcrModule.deleteRow(${idx})" title="ลบแถวนี้"><i data-lucide="trash-2"></i></button>
              </td>
            </tr>
          `;
        }).join('');

        if (summaryBar) {
          summaryBar.innerHTML = `จำนวนรับเข้ารวม: <strong>${totalQty.toLocaleString()}</strong> หน่วย | มูลค่ารับเข้ารวม: <strong style="color: #047857;">฿${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
        }

        if (checkAll) {
          checkAll.checked = this.scannedRows.length > 0 && this.selectedIndices.size === this.scannedRows.length;
        }

        lucide.createIcons();
      },

      updateField(index, field, value) {
        if (this.scannedRows[index]) {
          this.scannedRows[index][field] = value;
          if (field === 'generic_name' || field === 'strength' || field === 'trade_name') {
            this.reCheckMatch(index);
          }
          this.renderOcrTable();
        }
      },

      reCheckMatch(index) {
        const row = this.scannedRows[index];
        if (!row) return;
        const existingDrugs = DB.get(STORAGE_KEYS.DRUGS) || [];
        const genName = (row.generic_name || '').toLowerCase().trim();
        const tradeName = (row.trade_name || '').toLowerCase().trim();

        let matched = existingDrugs.find(d => 
          (d.generic_name || '').toLowerCase().trim() === genName || 
          (tradeName && (d.trade_name || '').toLowerCase().trim() === tradeName)
        );

        row.matched_drug = matched || null;
        row.matched_drug_id = matched ? matched.drug_id : null;
        if (matched) {
          if (row.action === 'new') row.action = 'stock_in';
          if (matched.sale_price > 0) row.sale_price = matched.sale_price;
        }
      },

      toggleSelectAll(checked) {
        if (checked) {
          this.selectedIndices = new Set(this.scannedRows.map((_, i) => i));
        } else {
          this.selectedIndices.clear();
        }
        this.renderOcrTable();
      },

      toggleRowSelect(index, checked) {
        if (checked) {
          this.selectedIndices.add(index);
        } else {
          this.selectedIndices.delete(index);
        }
        this.renderOcrTable();
      },

      mergeSelectedRows() {
        const indices = Array.from(this.selectedIndices).sort((a, b) => a - b);
        if (indices.length < 2) {
          alert('กรุณาเลือก (ติ๊กถูก) รายการที่ต้องการรวมอย่างน้อย 2 รายการ');
          return;
        }

        const itemsToMerge = indices.map(i => this.scannedRows[i]);
        
        let totalQty = 0;
        let totalCostVal = 0;

        itemsToMerge.forEach(item => {
          const q = item.quantity || 1;
          const c = item.cost_price || 0;
          totalQty += q;
          totalCostVal += (q * c);
        });

        const weightedAvgCost = totalQty > 0 ? (totalCostVal / totalQty) : 0;
        const primary = itemsToMerge[0];
        const mergedItem = {
          ...primary,
          row_id: 'MERGED_' + Date.now(),
          quantity: totalQty,
          cost_price: Number(weightedAvgCost.toFixed(2)),
          sale_price: primary.sale_price > 0 ? primary.sale_price : Number((weightedAvgCost * 1.5).toFixed(2))
        };

        const newRows = [];
        let inserted = false;
        this.scannedRows.forEach((r, idx) => {
          if (indices.includes(idx)) {
            if (!inserted) {
              newRows.push(mergedItem);
              inserted = true;
            }
          } else {
            newRows.push(r);
          }
        });

        this.scannedRows = newRows;
        this.selectedIndices.clear();
        this.renderOcrTable();

        alert(`✅ รวม ${itemsToMerge.length} รายการเป็นรายการเดียวสำเร็จ!
- ชื่อยา: ${mergedItem.generic_name}
- จำนวนรวม: ${totalQty} ${mergedItem.unit}
- ต้นทุนเฉลี่ยถ่วงน้ำหนัก: ฿${weightedAvgCost.toFixed(2)} / หน่วย`);
      },

      deleteSelectedRows() {
        if (this.selectedIndices.size === 0) {
          alert('กรุณาเลือกรายการที่ต้องการลบ');
          return;
        }
        if (!confirm(`ต้องการลบรายการที่เลือกจำนวน ${this.selectedIndices.size} รายการหรือไม่?`)) return;

        this.scannedRows = this.scannedRows.filter((_, idx) => !this.selectedIndices.has(idx));
        this.selectedIndices.clear();
        this.renderOcrTable();
      },

      deleteRow(index) {
        this.scannedRows.splice(index, 1);
        this.selectedIndices.delete(index);
        this.renderOcrTable();
      },

      addNewRow() {
        this.scannedRows.push({
          row_id: 'ROW_' + Date.now() + '_' + this.scannedRows.length,
          generic_name: '',
          strength: '',
          dosage_form: 'Tablet',
          trade_name: '',
          unit: 'เม็ด',
          quantity: 50,
          cost_price: 0,
          sale_price: 0,
          matched_drug_id: null,
          matched_drug: null,
          action: 'new'
        });
        this.renderOcrTable();
      },

      applyAutoMarkup(percent) {
        if (this.scannedRows.length === 0) return;

        // หากผู้ใช้ติ๊กเลือกแถวไว้ ให้คำนวณเฉพาะแถวที่เลือก
        // หากไม่ได้ติ๊กเลือก ให้คำนวณเฉพาะรายการยาใหม่ (action === 'new' หรือไม่มียาเดิม) ยาเดิมจะคงราคาขายเดิมไว้เสมอ
        let targetIndices = [];
        let isOnlyNew = false;

        if (this.selectedIndices.size > 0) {
          targetIndices = Array.from(this.selectedIndices);
        } else {
          isOnlyNew = true;
          targetIndices = this.scannedRows
            .map((r, i) => (r.action === 'new' || !r.matched_drug_id) ? i : -1)
            .filter(i => i !== -1);
        }

        if (targetIndices.length === 0) {
          alert('ไม่พบรายการยาใหม่ที่จะคำนวณราคาขาย (รายการยาทั้งหมดเป็นยาเดิมที่มีราคาขายในระบบอยู่แล้ว หากต้องการปรับราคาเฉพาะรายการใดเป็นพิเศษ ให้ติ๊กถูกหน้าแถวนั้นแล้วกดคำนวณ)');
          return;
        }

        const multiplier = 1 + (percent / 100);
        targetIndices.forEach(idx => {
          const row = this.scannedRows[idx];
          if (row && row.cost_price > 0) {
            row.sale_price = Number((row.cost_price * multiplier).toFixed(2));
          }
        });

        this.renderOcrTable();
        if (isOnlyNew) {
          alert(`✅ คำนวณราคาขายอัตโนมัติ (+${percent}%) สำหรับรายการยาใหม่จำนวน ${targetIndices.length} รายการเรียบร้อยแล้ว (รายการยาเดิมในคลินิกยังคงยึดราคาขายเดิมไว้)`);
        } else {
          alert(`✅ คำนวณราคาขายอัตโนมัติ (+${percent}%) สำหรับรายการที่เลือกจำนวน ${targetIndices.length} รายการเรียบร้อย`);
        }
      },

      confirmBatchImport() {
        const activeRows = this.scannedRows.filter(r => r.action !== 'skip');
        if (activeRows.length === 0) {
          alert('ไม่มีรายการยาที่จะนำเข้า (ทุกรายการถูกข้ามหรือไม่มีข้อมูล)');
          return;
        }

        for (let i = 0; i < activeRows.length; i++) {
          const r = activeRows[i];
          if (!r.generic_name || !r.generic_name.trim()) {
            alert(`รายการที่ ${i + 1} ไม่มีชื่อ Generic Name กรุณาระบุชื่อยาก่อนบันทึก`);
            return;
          }
          if (r.quantity <= 0) {
            alert(`รายการ ${r.generic_name} ระบุจำนวนไม่ถูกต้อง (ต้องมากกว่า 0)`);
            return;
          }
        }

        const invoiceRef = document.getElementById('ocr-invoice-ref')?.value.trim() || '';
        const vendorName = document.getElementById('ocr-vendor-name')?.value.trim() || '';
        const fullRef = invoiceRef + (vendorName ? ' (' + vendorName + ')' : '');

        const drugs = DB.get(STORAGE_KEYS.DRUGS) || [];
        let updatedCount = 0;
        let newCount = 0;
        let totalStockAdded = 0;

        activeRows.forEach(row => {
          const qty = Number(row.quantity) || 1;
          const cost = Number(row.cost_price) || 0;
          const sale = Number(row.sale_price) || 0;

          if (row.action === 'stock_in' && row.matched_drug_id) {
            const d = drugs.find(x => x.drug_id === row.matched_drug_id);
            if (d) {
              const stockBefore = d.stock || 0;
              const oldCost = d.purchase_price || 0;
              const oldSale = d.sale_price || 0;

              d.stock = stockBefore + qty;
              if (cost > 0) d.purchase_price = cost;
              if (sale > 0) d.sale_price = sale;
              if (row.strength && !d.strength) d.strength = row.strength;
              if (row.trade_name && !d.trade_name) d.trade_name = row.trade_name;

              totalStockAdded += qty;
              updatedCount++;

              DrugHistoryModule.logChange({
                drug_id: d.drug_id,
                generic_name: d.generic_name,
                trade_name: d.trade_name,
                type: 'OCR_IMPORT',
                old_cost: oldCost,
                new_cost: (cost > 0 ? cost : oldCost),
                old_price: oldSale,
                new_price: (sale > 0 ? sale : oldSale),
                qty_change: qty,
                stock_before: stockBefore,
                stock_after: d.stock,
                ref_invoice: fullRef,
                note: 'รับยาเข้าคลังผ่าน AI OCR สแกนใบเสร็จ'
              });

              StockModule.recordStockTx({
                drug_id: d.drug_id,
                generic_name: d.generic_name,
                trade_name: d.trade_name || '',
                visit_id: '',
                type: 'OCR_INBOUND',
                qty: qty,
                cost_price: (cost > 0 ? cost : oldCost),
                sale_price: (sale > 0 ? sale : oldSale),
                stock_before: stockBefore,
                stock_after: d.stock,
                reference_no: fullRef,
                note: 'รับยาเข้าคลังผ่าน AI OCR'
              });
            }
          } else {
            const newDrugId = 'D_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const newDrug = {
              drug_id: newDrugId,
              generic_name: row.generic_name.trim(),
              strength: row.strength ? row.strength.trim() : '',
              dosage_form: row.dosage_form || 'Tablet',
              trade_name: row.trade_name ? row.trade_name.trim() : '',
              unit: row.unit ? row.unit.trim() : 'เม็ด',
              purchase_price: cost,
              sale_price: sale,
              stock: qty,
              min_stock: 10,
              active: true
            };

            drugs.push(newDrug);
            totalStockAdded += qty;
            newCount++;

            DrugHistoryModule.logChange({
              drug_id: newDrugId,
              generic_name: newDrug.generic_name,
              trade_name: newDrug.trade_name,
              type: 'NEW_DRUG',
              old_cost: 0,
              new_cost: cost,
              old_price: 0,
              new_price: sale,
              qty_change: qty,
              stock_before: 0,
              stock_after: qty,
              ref_invoice: fullRef,
              note: 'สร้างรายการยาใหม่ผ่าน AI OCR สแกนใบเสร็จ'
            });

            StockModule.recordStockTx({
              drug_id: newDrugId,
              generic_name: newDrug.generic_name,
              trade_name: newDrug.trade_name || '',
              visit_id: '',
              type: 'OCR_INBOUND',
              qty: qty,
              cost_price: cost,
              sale_price: sale,
              stock_before: 0,
              stock_after: qty,
              reference_no: fullRef,
              note: 'สร้างรายการยาใหม่และรับเข้าผ่าน AI OCR'
            });
          }
        });

        DB.set(STORAGE_KEYS.DRUGS, drugs);
        DrugModule.renderDrugTable();
        DashboardModule.render();

        this.closeModal();
        alert(`🎉 นำเข้าข้อมูลยาและอัปเดตสต็อกเรียบร้อยแล้ว!\n\n- เพิ่มสต็อกยาเดิม: ${updatedCount} รายการ\n- สร้างยาใหม่: ${newCount} รายการ\n- จำนวนรับเข้ารวม: ${totalStockAdded.toLocaleString()} หน่วย\n- บันทึกประวัติราคาและสต็อกลงระบบเรียบร้อย`);
      }
    };

const LabelModule = {
      render() {
        const visits = DB.get(STORAGE_KEYS.VISITS);
        const select = document.getElementById('label-visit-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือก Visit เพื่อพิมพ์ฉลากยา --</option>' + visits.map(v => '<option value="' + v.visit_id + '" ' + (State.selectedVisit?.visit_id === v.visit_id ? 'selected' : '') + '>' + v.an + ' - ' + v.patient_name + ' (' + (v.prescriptions || []).length + ' ยา)</option>').join('');
        if (State.selectedVisit) this.loadVisit(State.selectedVisit.visit_id);
      },
      loadVisit(visitId) {
        const v = DB.get(STORAGE_KEYS.VISITS).find(x => x.visit_id === visitId);
        const container = document.getElementById('label-preview-container');
        if (!container) return;
        if (!v || !v.prescriptions || v.prescriptions.length === 0) {
          container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--slate-400);">Visit นี้ยังไม่มีรายการยา</div>';
          return;
        }
        container.innerHTML = v.prescriptions.map((p, idx) => 
          '<div class="label-sticker">' +
          '<div class="lbl-header"><span>คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span><span>โทร. 098-3825767</span></div>' +
          '<div class="lbl-patient"><strong>HN: ' + v.hn + '</strong> | <strong>คุณ ' + v.patient_name + '</strong><div style="font-size: 0.72rem; color: #64748b;">วันที่: ' + v.visit_date.slice(0, 10) + '</div></div>' +
          '<div class="lbl-drug">' + p.generic_name + ' <span style="font-size: 0.82rem; font-weight: normal; color: #475569;">(' + (p.trade_name || '') + ')</span></div>' +
          '<div class="lbl-sig">👉 ' + (p.sig || 'รับประทานตามแพทย์สั่ง') + '</div>' +
          '<div class="lbl-footer"><span>จำนวน: <strong>' + p.qty + '</strong> หน่วย</span><button class="btn btn-outline btn-sm no-print" onclick="LabelModule.printSingleSticker(' + idx + ')" style="padding: 2px 6px; font-size: 0.72rem;"><i data-lucide="printer" style="width:12px;height:12px;"></i> พิมพ์ใบนี้</button></div></div>'
        ).join('');
        lucide.createIcons();
      },
      printVisitLabels(visitId) {
        if (visitId) State.selectedVisit = DB.get(STORAGE_KEYS.VISITS).find(v => v.visit_id === visitId);
        App.switchTab('tab-labels');
        this.printCurrentStickers();
      },
      printCurrentStickers() {
        const stickersHtml = document.getElementById('label-preview-container').innerHTML;
        const w = window.open('', '', 'width=850,height=900');
        w.document.write('<html><head><title>พิมพ์ฉลากยา</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Sarabun,sans-serif;padding:20px;}.label-sticker-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}.label-sticker{border:2px dashed #0f766e;border-radius:8px;padding:14px;page-break-inside:avoid;min-height:170px;display:flex;flex-direction:column;justify-content:space-between;}.lbl-header{font-size:13px;font-weight:bold;color:#0f766e;border-bottom:1px solid #ccc;padding-bottom:4px;display:flex;justify-content:space-between;}.lbl-patient{font-size:13px;margin:4px 0;}.lbl-drug{font-size:15px;font-weight:bold;margin:4px 0;}.lbl-sig{font-size:14px;font-weight:bold;background:#f0fdf4;padding:6px;border-radius:4px;line-height:1.4;margin:4px 0;}.lbl-footer{font-size:12px;color:#555;display:flex;justify-content:space-between;border-top:1px dotted #ccc;padding-top:4px;}.no-print{display:none !important;}</style></head><body><div class="label-sticker-grid">' + stickersHtml + '</div>' + '<' + 'script>window.onload=function(){window.print();window.close();}<' + '/script>' + '</body></html>');
        w.document.close();
      },
      printSingleSticker(idx) {
        const stickers = document.querySelectorAll('.label-sticker');
        if (stickers[idx]) {
          const w = window.open('', '', 'width=500,height=450');
          w.document.write('<html><head><title>พิมพ์ฉลากยา</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Sarabun,sans-serif;padding:15px;}.label-sticker{border:2px dashed #0f766e;border-radius:8px;padding:14px;}.lbl-header{font-size:13px;font-weight:bold;color:#0f766e;border-bottom:1px solid #ccc;padding-bottom:4px;display:flex;justify-content:space-between;}.lbl-patient{font-size:13px;margin:4px 0;}.lbl-drug{font-size:15px;font-weight:bold;margin:4px 0;}.lbl-sig{font-size:14px;font-weight:bold;background:#f0fdf4;padding:6px;border-radius:4px;line-height:1.4;margin:4px 0;}.lbl-footer{font-size:12px;color:#555;display:flex;justify-content:space-between;border-top:1px dotted #ccc;padding-top:4px;}.no-print{display:none !important;}</style></head><body>' + stickers[idx].outerHTML + '' + '<' + 'script>window.onload=function(){window.print();window.close();}<' + '/script>' + '</body></html>');
          w.document.close();
        }
      }
    };