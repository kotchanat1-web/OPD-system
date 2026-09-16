/* ==========================================================================
   OPD System - Cashier, Billing & Financial Reports
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const BillingModule = {
      render() {
        const visits = DB.get(STORAGE_KEYS.VISITS);
        const select = document.getElementById('billing-visit-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- เลือก Visit --</option>' + visits.map(v => '<option value="' + v.visit_id + '" ' + (State.selectedVisit?.visit_id === v.visit_id ? 'selected' : '') + '>' + v.an + ' - ' + v.patient_name + ' (' + (v.status === 'CLOSED' ? 'ชำระแล้ว' : 'ยังไม่ชำระ') + ')</option>').join('');
        if (State.selectedVisit) this.loadVisitBilling(State.selectedVisit.visit_id);
      },
      loadVisitBilling(visitId) {
        const v = DB.get(STORAGE_KEYS.VISITS).find(x => x.visit_id === visitId);
        if (!v) return;
        State.selectedVisit = v;
        document.getElementById('billing-an-badge').textContent = 'AN: ' + v.an;

        let itemsHtml = '';
        (v.prescriptions || []).forEach(p => { itemsHtml += '<tr><td>💊 ' + p.generic_name + '</td><td>' + p.qty + '</td><td>฿' + Number(p.unit_price).toFixed(2) + '</td><td style="text-align: right;">฿' + Number(p.amount).toFixed(2) + '</td></tr>'; });
        (v.labs || []).forEach(l => { itemsHtml += '<tr><td>🧪 Lab: ' + l.name + '</td><td>1</td><td>฿' + Number(l.price).toFixed(2) + '</td><td style="text-align: right;">฿' + Number(l.price).toFixed(2) + '</td></tr>'; });
        (v.procedures || []).forEach(pr => { itemsHtml += '<tr><td>🩺 ' + pr.name + '</td><td>1</td><td>฿' + Number(pr.price).toFixed(2) + '</td><td style="text-align: right;">฿' + Number(pr.price).toFixed(2) + '</td></tr>'; });

        document.getElementById('billing-items-body').innerHTML = itemsHtml || '<tr><td colspan="4" style="text-align: center; color: var(--slate-400);">ไม่มีรายการค่าใช้จ่าย</td></tr>';
        document.getElementById('bill-discount').value = v.billing?.discount || 0;
        const curMethod = v.billing?.payment_method;
        if (curMethod) {
          document.getElementById('bill-payment-method').value = curMethod;
        } else if (v.service_type === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)') {
          document.getElementById('bill-payment-method').value = 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)';
        } else if (v.service_type === 'A-Med สปสช. (เก็บส่วนต่าง)' || v.service_type === 'A-Med') {
          document.getElementById('bill-payment-method').value = 'A-Med สปสช. (เก็บส่วนต่าง)';
        } else {
          document.getElementById('bill-payment-method').value = 'เงินสด';
        }
        this.calcTotal();
        this.renderReceiptPreview(v);
      },
      calcTotal() {
        const v = State.selectedVisit;
        if (!v) return;
        const medTotal = (v.prescriptions || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const labTotal = (v.labs || []).reduce((sum, l) => sum + (l.price || 0), 0);
        const procTotal = (v.procedures || []).reduce((sum, p) => sum + (p.price || 0), 0);
        const subtotal = medTotal + labTotal + procTotal;

        const payMethod = document.getElementById('bill-payment-method').value;
        const isAmed2 = (payMethod === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)');
        const isAmed1 = (payMethod === 'A-Med สปสช. (เก็บส่วนต่าง)' || payMethod === 'A-Med (สปสช.)');
        const isAmed = isAmed1 || isAmed2;
        const amedDeduct = isAmed ? 180.00 : 0.00;
        const discount = parseFloat(document.getElementById('bill-discount').value) || 0;

        let clinicSupport = 0;
        let grandTotal = 0;

        if (isAmed2) {
          // A-Med 2 (ขาประจำ): คลินิกช่วยซับพอร์ตส่วนต่าง คนไข้ไม่ต้องจ่ายเพิ่ม ยอดสุทธิ 0 บาท
          clinicSupport = Math.max(0, subtotal - amedDeduct - discount);
          grandTotal = 0.00;
        } else if (isAmed1) {
          // A-Med 1 (ขาจร): หัก 180 บาท หากเกิน คนไข้ต้องชำระส่วนต่าง
          grandTotal = Math.max(0, subtotal - amedDeduct - discount);
        } else {
          grandTotal = Math.max(0, subtotal - discount);
        }

        document.getElementById('bill-subtotal').textContent = '฿' + subtotal.toFixed(2);
        
        const amedRow = document.getElementById('bill-amed-row');
        if (amedRow) {
          amedRow.style.display = isAmed ? 'flex' : 'none';
          const amedDeductEl = document.getElementById('bill-amed-deduct');
          if (amedDeductEl) amedDeductEl.textContent = '- ฿' + amedDeduct.toFixed(2);
        }

        const amedSupportRow = document.getElementById('bill-amed-support-row');
        if (amedSupportRow) {
          amedSupportRow.style.display = (isAmed2 && clinicSupport > 0) ? 'flex' : 'none';
          const amedSupportEl = document.getElementById('bill-amed-support-amount');
          if (amedSupportEl) amedSupportEl.textContent = '- ฿' + clinicSupport.toFixed(2);
        }

        document.getElementById('bill-total-discount').textContent = '- ฿' + discount.toFixed(2);
        document.getElementById('bill-grand-total').textContent = '฿' + grandTotal.toFixed(2);
        document.getElementById('bill-baht-text').textContent = '(' + Utils.bahtText(grandTotal) + ')';
      },
      confirmPaymentAndGenerateReceipt() {
        const v = State.selectedVisit;
        if (!v) { alert('กรุณาเลือก Visit'); return; }
        const medTotal = (v.prescriptions || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const labTotal = (v.labs || []).reduce((sum, l) => sum + (l.price || 0), 0);
        const procTotal = (v.procedures || []).reduce((sum, p) => sum + (p.price || 0), 0);
        const subtotal = medTotal + labTotal + procTotal;

        const payMethod = document.getElementById('bill-payment-method').value;
        const isAmed2 = (payMethod === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)');
        const isAmed1 = (payMethod === 'A-Med สปสช. (เก็บส่วนต่าง)' || payMethod === 'A-Med (สปสช.)');
        const isAmed = isAmed1 || isAmed2;
        const amedDeduct = isAmed ? 180.00 : 0.00;
        const discount = parseFloat(document.getElementById('bill-discount').value) || 0;

        let clinicSupport = 0;
        let grandTotal = 0;

        if (isAmed2) {
          clinicSupport = Math.max(0, subtotal - amedDeduct - discount);
          grandTotal = 0.00;
        } else if (isAmed1) {
          grandTotal = Math.max(0, subtotal - amedDeduct - discount);
        } else {
          grandTotal = Math.max(0, subtotal - discount);
        }

        // คำนวณต้นทุนยาจริง (Actual Drug Cost)
        const drugsCatalog = DB.get(STORAGE_KEYS.DRUGS) || [];
        let actualDrugCost = 0;
        (v.prescriptions || []).forEach(p => {
          const d = drugsCatalog.find(x => x.drug_id === p.drug_id || (x.generic_name && p.generic_name && x.generic_name.toLowerCase().trim() === p.generic_name.toLowerCase().trim()));
          const cPrice = Number(p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : (d ? (d.purchase_price || d.cost_price) : 0)) || 0;
          actualDrugCost += (cPrice * (Number(p.qty) || 1));
        });

        // รายรับรวมคลินิก (Clinic Total Revenue): ถ้าเป็น A-med จะได้รับ 180 บ. จาก สปสช. + เงินสด/โอนส่วนต่างที่คนไข้จ่าย
        const clinicRevenue = isAmed ? (180.00 + grandTotal) : grandTotal;
        // กำไร/ขาดทุน เทียบราคาขายหน้าร้าน (Vs Selling Price)
        const profitVsSale = isAmed ? (clinicRevenue - subtotal) : (grandTotal - subtotal);
        // กำไร/ขาดทุน เทียบต้นทุนยาจริง (Vs Actual Cost)
        const profitVsCost = isAmed ? (clinicRevenue - actualDrugCost) : (grandTotal - actualDrugCost);

        v.billing = {
          subtotal: subtotal,
          discount: discount,
          amed_discount: amedDeduct,
          amed_type: isAmed2 ? 'AMED_FREE' : (isAmed1 ? 'AMED_COPAY' : null),
          amed_clinic_support: clinicSupport,
          cost_total: actualDrugCost,
          revenue_total: clinicRevenue,
          profit_vs_sale: profitVsSale,
          profit_vs_cost: profitVsCost,
          total: grandTotal,
          paid: true,
          payment_method: payMethod
        };
        v.status = 'CLOSED';

        const visits = DB.get(STORAGE_KEYS.VISITS);
        const idx = visits.findIndex(x => x.visit_id === v.visit_id);
        if (idx !== -1) visits[idx] = v;
        DB.upsertItem(STORAGE_KEYS.VISITS, v);

        this.renderReceiptPreview(v);
        DashboardModule.render();
        ReportModule.render();
        alert('บันทึกรับเงินและปิดบิลเรียบร้อย' + (isAmed2 ? '\nสิทธิ A-Med สปสช. ไม่เก็บส่วนต่าง (ยอดชำระ 0 บาท)' : ''));
      },
      renderReceiptPreview(v) {
        if (!v) return;
        document.getElementById('rec-hn').textContent = v.hn || '-';
        document.getElementById('rec-an').textContent = v.an || '-';
        document.getElementById('rec-name').textContent = v.patient_name || '-';
        document.getElementById('rec-date').textContent = Utils.formatDateThai(v.visit_date || new Date().toISOString().slice(0, 10));
        document.getElementById('rec-rights').textContent = v.service_type || 'OPD';
        document.getElementById('rec-method').textContent = v.billing?.payment_method || (v.service_type === 'A-Med' ? 'A-Med (สปสช.)' : 'เงินสด');

        const dxText = (v.diagnoses && v.diagnoses.length > 0) 
          ? v.diagnoses.map(d => (d.code ? d.code + ' - ' : '') + (d.name || d.name_th || '')).join(', ') 
          : (v.assessment || '-');
        const dxEl = document.getElementById('rec-dx');
        if (dxEl) dxEl.textContent = dxText;

        const sigPatEl = document.getElementById('rec-sig-patient-name');
        if (sigPatEl) sigPatEl.textContent = v.patient_name || 'ผู้ป่วย/ญาติ';

        let count = 1;
        let html = '';
        (v.prescriptions || []).forEach(p => { html += '<tr><td style="text-align:center; padding: 4px 2px;">' + (count++) + '</td><td style="padding: 4px 6px;">ค่ายา: ' + p.generic_name + '</td><td style="text-align:center; padding: 4px 2px;">' + p.qty + '</td><td style="text-align:right; padding: 4px 6px;">฿' + Number(p.amount).toFixed(2) + '</td></tr>'; });
        (v.labs || []).forEach(l => { html += '<tr><td style="text-align:center; padding: 4px 2px;">' + (count++) + '</td><td style="padding: 4px 6px;">ตรวจ Lab: ' + l.name + '</td><td style="text-align:center; padding: 4px 2px;">1</td><td style="text-align:right; padding: 4px 6px;">฿' + Number(l.price).toFixed(2) + '</td></tr>'; });
        (v.procedures || []).forEach(pr => { html += '<tr><td style="text-align:center; padding: 4px 2px;">' + (count++) + '</td><td style="padding: 4px 6px;">' + pr.name + '</td><td style="text-align:center; padding: 4px 2px;">1</td><td style="text-align:right; padding: 4px 6px;">฿' + Number(pr.price).toFixed(2) + '</td></tr>'; });
        if (v.billing?.amed_discount > 0) html += '<tr style="color:#2563eb;"><td style="text-align:center; padding: 4px 2px;">-</td><td style="padding: 4px 6px;">สิทธิ A-Med สปสช. (เหมาจ่าย)</td><td style="text-align:center; padding: 4px 2px;">1</td><td style="text-align:right; padding: 4px 6px;">-180.00</td></tr>';
        if (v.billing?.amed_clinic_support > 0) html += '<tr style="color:#7c3aed;"><td style="text-align:center; padding: 4px 2px;">-</td><td style="padding: 4px 6px;">ส่วนลดสิทธิบัตรทองประจำ (คลินิกซับพอร์ต)</td><td style="text-align:center; padding: 4px 2px;">1</td><td style="text-align:right; padding: 4px 6px;">-' + Number(v.billing.amed_clinic_support).toFixed(2) + '</td></tr>';

        document.getElementById('rec-items-body').innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding: 8px;">ไม่มีรายการ</td></tr>';
        const total = v.billing?.total || 0;
        document.getElementById('rec-total').textContent = '฿' + Number(total).toFixed(2);
        document.getElementById('rec-baht-text').textContent = '(' + Utils.bahtText(total) + ')';
      },
      printReceipt() {
        const v = State.selectedVisit;
        const dxText = v ? ((v.diagnoses && v.diagnoses.length > 0) 
          ? v.diagnoses.map(d => (d.code ? d.code + ' - ' : '') + (d.name || d.name_th || '')).join(', ') 
          : (v.assessment || '-')) : '-';
        const content = document.getElementById('receipt-paper').innerHTML;
        const w = window.open('', '', 'width=520,height=750');
        w.document.write('<!DOCTYPE html><html><head><title>ใบเสร็จรับเงิน (ขนาด A6) - ' + (v ? (v.an || v.hn) : '') + '</title>' +
          '<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">' +
          '<style>' +
          '@page { size: A6 portrait; margin: 4mm 5mm; }' +
          '* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
          'body { font-family: "Prompt", "Sarabun", sans-serif; padding: 4px; margin: 0; font-size: 8.5px; line-height: 1.25; color: #0f172a; background: #fff; }' +
          '#receipt-paper { width: 100% !important; max-width: 100% !important; padding: 0 !important; border: none !important; box-shadow: none !important; }' +
          'table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8px; }' +
          'th { background: #f1f5f9 !important; border: 1px solid #cbd5e1; padding: 3px 4px; font-weight: 600; }' +
          'td { border: 1px solid #e2e8f0; padding: 3px 4px; }' +
          '.no-print { display: none !important; }' +
          '@media print { body { padding: 0; } }' +
          '</style></head><body>' +
          '<div id="receipt-paper">' + content + '</div>' +
          '' + '<' + 'script>window.onload=function(){ window.print(); window.close(); }<' + '/script>' + '</body></html>');
        w.document.close();
      }
    };

const ReportModule = {
      activePreset: 'today',
      activeSubTab: 'financial',

      switchSubTab(subTab) {
        this.activeSubTab = subTab;
        const finSub = document.getElementById('subview-rep-financial');
        const dfSub = document.getElementById('subview-rep-df');
        const btnFin = document.getElementById('tab-btn-rep-financial');
        const btnDf = document.getElementById('tab-btn-rep-df');
        const actFin = document.getElementById('rep-header-actions-financial');
        const actDf = document.getElementById('rep-header-actions-df');

        if (subTab === 'df') {
          if (finSub) finSub.style.display = 'none';
          if (dfSub) dfSub.style.display = 'block';
          if (btnFin) btnFin.className = 'btn btn-outline btn-sm';
          if (btnDf) btnDf.className = 'btn btn-primary btn-sm';
          if (actFin) actFin.style.display = 'none';
          if (actDf) actDf.style.display = 'flex';
          this.renderDfReport();
        } else {
          if (finSub) finSub.style.display = 'block';
          if (dfSub) dfSub.style.display = 'none';
          if (btnFin) btnFin.className = 'btn btn-primary btn-sm';
          if (btnDf) btnDf.className = 'btn btn-outline btn-sm';
          if (actFin) actFin.style.display = 'flex';
          if (actDf) actDf.style.display = 'none';
          this.render();
        }
        lucide.createIcons();
      },

      initDates() {
        const fromInput = document.getElementById('rep-from-date');
        const toInput = document.getElementById('rep-to-date');
        if (!fromInput || !toInput) return;
        if (!fromInput.value || !toInput.value) {
          this.setDatePreset('today');
        }
      },

      setDatePreset(preset) {
        this.activePreset = preset;
        const fromInput = document.getElementById('rep-from-date');
        const toInput = document.getElementById('rep-to-date');
        if (!fromInput || !toInput) return;

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();

        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (dateObj) => dateObj.getFullYear() + '-' + pad(dateObj.getMonth() + 1) + '-' + pad(dateObj.getDate());

        const btns = ['today', 'yesterday', 'this_month', 'last_month', 'all'];
        btns.forEach(b => {
          const el = document.getElementById('btn-rep-' + b.replace('_', '-'));
          if (el) {
            el.className = (b === preset) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
          }
        });

        if (preset === 'today') {
          const todayStr = toDateStr(now);
          fromInput.value = todayStr;
          toInput.value = todayStr;
        } else if (preset === 'yesterday') {
          const yest = new Date(y, m, d - 1);
          fromInput.value = toDateStr(yest);
          toInput.value = toDateStr(yest);
        } else if (preset === 'this_month') {
          fromInput.value = toDateStr(new Date(y, m, 1));
          toInput.value = toDateStr(new Date(y, m + 1, 0));
        } else if (preset === 'last_month') {
          fromInput.value = toDateStr(new Date(y, m - 1, 1));
          toInput.value = toDateStr(new Date(y, m, 0));
        } else if (preset === 'all') {
          fromInput.value = '';
          toInput.value = '';
        }

        this.render();
      },

      handleDateChange() {
        this.activePreset = 'custom';
        const btns = ['today', 'yesterday', 'this_month', 'last_month', 'all'];
        btns.forEach(b => {
          const el = document.getElementById('btn-rep-' + b.replace('_', '-'));
          if (el) el.className = 'btn btn-outline btn-sm';
        });
        this.render();
      },

      getFilteredVisits() {
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const payFilter = document.getElementById('rep-payment-filter')?.value || '';
        const visits = DB.get(STORAGE_KEYS.VISITS) || [];

        return visits.filter(v => {
          // ไม่รวม Visit ที่ถูกยกเลิก
          if (v.status === 'CANCELLED' || v.status === 'cancelled') return false;

          // รายการที่ยังไม่ได้ชำระเงิน (รอตรวจ / กำลังตรวจ / ยังไม่ปิดบิล) จะไม่ขึ้นในรายงานสรุปรายวัน
          // ต้องได้รับการชำระเงินแล้วเท่านั้น (billing.paid === true หรือ status === 'CLOSED' โดยที่ paid ไม่ใช่ false)
          const isPaid = (v.billing && v.billing.paid === true) || (v.status === 'CLOSED' && (!v.billing || v.billing.paid !== false));
          if (!isPaid) return false;

          const vDate = (v.visit_date || '').slice(0, 10);
          if (fromDate && vDate < fromDate) return false;
          if (toDate && vDate > toDate) return false;

          if (payFilter) {
            const method = v.billing?.payment_method || 'เงินสด';
            const isAmedVisit = (v.billing?.amed_discount || 0) > 0 || method.includes('A-Med') || (v.service_type && v.service_type.includes('A-Med'));
            if (payFilter === 'A-Med' && !isAmedVisit) return false;
            if (payFilter === 'A-Med สปสช. (เก็บส่วนต่าง)' && !(method === 'A-Med สปสช. (เก็บส่วนต่าง)' || method === 'A-Med (สปสช.)' || (isAmedVisit && (v.billing?.amed_type === 'AMED_COPAY' || (!v.billing?.amed_type && (v.billing?.total || 0) > 0))))) return false;
            if (payFilter === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)' && !(method === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)' || v.billing?.amed_type === 'AMED_FREE' || (isAmedVisit && (v.billing?.amed_clinic_support || 0) > 0))) return false;
            if (!payFilter.startsWith('A-Med') && method !== payFilter) return false;
          }

          return true;
        });
      },

      render() {
        this.initDates();
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const labelEl = document.getElementById('rep-period-label');

        if (labelEl) {
          if (!fromDate && !toDate) {
            labelEl.textContent = 'ข้อมูลทั้งหมด (All time)';
          } else if (fromDate === toDate) {
            labelEl.textContent = 'ประจำวันที่ ' + Utils.formatDateShort(fromDate);
          } else {
            labelEl.textContent = 'ช่วงวันที่ ' + Utils.formatDateShort(fromDate) + ' ถึง ' + Utils.formatDateShort(toDate);
          }
        }

        const visits = this.getFilteredVisits();
        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];
        const drugsCatalog = DB.get(STORAGE_KEYS.DRUGS) || [];

        let count = visits.length;
        let cashTotal = 0;
        let transferTotal = 0;
        let amedTotal = 0;
        let totalRevenue = 0;

        // A-Med Specific Analytics
        let amedVisitsCount = 0;
        let amedCopayCount = 0;
        let amedFreeCount = 0;
        let amedClaimTotal = 0;

        let amedSaleProfitCount = 0;
        let amedSaleLossCount = 0;
        let amedNetVsSale = 0;

        let amedCostProfitCount = 0;
        let amedCostLossCount = 0;
        let amedNetVsCost = 0;

        visits.forEach(v => {
          const b = v.billing || {};
          const total = Number(b.total || 0);
          if (b.payment_method === 'โอนเงิน/QR') transferTotal += total;
          else if (b.payment_method === 'เงินสด') cashTotal += total;
          else cashTotal += total;

          const method = b.payment_method || '';
          const isAmedVisit = (b.amed_discount || 0) > 0 || method.includes('A-Med') || (v.service_type && v.service_type.includes('A-Med'));

          if (isAmedVisit) {
            amedVisitsCount++;
            const isFree = (method === 'A-Med สปสช. (ไม่เก็บส่วนต่าง/ยอด 0 บ.)' || b.amed_type === 'AMED_FREE' || (b.amed_clinic_support || 0) > 0);
            if (isFree) amedFreeCount++;
            else amedCopayCount++;

            const claimAmt = Number(b.amed_discount || 180.00);
            amedClaimTotal += claimAmt;
            amedTotal += claimAmt;

            const subtotal = Number(b.subtotal || 0);
            const paidAmt = Number(b.total || 0);
            const clinicRevenue = claimAmt + paidAmt;

            // Compute actual drug cost if not cached
            let costTotal = Number(b.cost_total);
            if (isNaN(costTotal) || costTotal === undefined) {
              costTotal = 0;
              (v.prescriptions || []).forEach(p => {
                const d = drugsCatalog.find(x => x.drug_id === p.drug_id || (x.generic_name && p.generic_name && x.generic_name.toLowerCase().trim() === p.generic_name.toLowerCase().trim()));
                const cPrice = Number(p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : (d ? (d.purchase_price || d.cost_price) : 0)) || 0;
                costTotal += (cPrice * (Number(p.qty) || 1));
              });
            }

            const pVsSale = clinicRevenue - subtotal;
            const pVsCost = clinicRevenue - costTotal;

            amedNetVsSale += pVsSale;
            if (pVsSale >= 0) amedSaleProfitCount++;
            else amedSaleLossCount++;

            amedNetVsCost += pVsCost;
            if (pVsCost >= 0) amedCostProfitCount++;
            else amedCostLossCount++;
          }

          totalRevenue += total;
        });

        const countEl = document.getElementById('rep-count');
        const cashEl = document.getElementById('rep-cash');
        const transferEl = document.getElementById('rep-transfer');
        const amedEl = document.getElementById('rep-amed');
        const totalEl = document.getElementById('rep-total');

        if (countEl) countEl.textContent = count;
        if (cashEl) cashEl.textContent = '฿' + cashTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (transferEl) transferEl.textContent = '฿' + transferTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (amedEl) amedEl.textContent = '฿' + amedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (totalEl) totalEl.textContent = '฿' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // Populate A-Med Analytics Banner Cards
        const aTotalCasesEl = document.getElementById('amed-stat-total-cases');
        const aClaimTotalEl = document.getElementById('amed-stat-claim-total');
        const aCopayCasesEl = document.getElementById('amed-stat-copay-cases');
        const aFreeCasesEl = document.getElementById('amed-stat-free-cases');

        const aSaleDiffEl = document.getElementById('amed-stat-sale-diff-total');
        const aSaleProfitCountEl = document.getElementById('amed-stat-sale-profit-count');
        const aSaleLossCountEl = document.getElementById('amed-stat-sale-loss-count');

        const aCostProfitEl = document.getElementById('amed-stat-cost-profit-total');
        const aCostProfitCountEl = document.getElementById('amed-stat-cost-profit-count');
        const aCostLossCountEl = document.getElementById('amed-stat-cost-loss-count');

        if (aTotalCasesEl) aTotalCasesEl.textContent = amedVisitsCount + ' เคส';
        if (aClaimTotalEl) aClaimTotalEl.textContent = '฿' + amedClaimTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (aCopayCasesEl) aCopayCasesEl.textContent = amedCopayCount;
        if (aFreeCasesEl) aFreeCasesEl.textContent = amedFreeCount;

        if (aSaleDiffEl) {
          const sign = amedNetVsSale >= 0 ? '+' : '';
          aSaleDiffEl.textContent = sign + '฿' + amedNetVsSale.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          aSaleDiffEl.style.color = amedNetVsSale >= 0 ? '#059669' : '#dc2626';
        }
        if (aSaleProfitCountEl) aSaleProfitCountEl.textContent = amedSaleProfitCount;
        if (aSaleLossCountEl) aSaleLossCountEl.textContent = amedSaleLossCount;

        if (aCostProfitEl) {
          const sign = amedNetVsCost >= 0 ? '+' : '';
          aCostProfitEl.textContent = sign + '฿' + amedNetVsCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          aCostProfitEl.style.color = amedNetVsCost >= 0 ? '#047857' : '#dc2626';
        }
        if (aCostProfitCountEl) aCostProfitCountEl.textContent = amedCostProfitCount;
        if (aCostLossCountEl) aCostLossCountEl.textContent = amedCostLossCount;

        const tbody = document.querySelector('#rep-table tbody');
        const tfoot = document.getElementById('rep-table-foot');

        if (tbody) {
          if (visits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--slate-400); padding: 20px;">ไม่พบรายการตรวจหรือรายรับในช่วงวันที่เลือก</td></tr>';
            if (tfoot) tfoot.innerHTML = '';
          } else {
            const sorted = visits.slice().sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''));

            tbody.innerHTML = sorted.map(v => {
              const p = patients.find(x => x.hn === v.hn) || {};
              const b = v.billing || {};
              const actualPaid = Number(b.total || 0);
              const method = b.payment_method || 'เงินสด';
              const isAmedVisit = (b.amed_discount || 0) > 0 || method.includes('A-Med') || (v.service_type && v.service_type.includes('A-Med'));
              const amedAmt = isAmedVisit ? Number(b.amed_discount || 180.00) : 0;
              const dxText = (v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(', ') : (v.assessment || '-');

              let amedBadgeHtml = '<span style="color: var(--slate-400); font-size: 0.75rem;">-</span>';
              if (isAmedVisit) {
                const subtotal = Number(b.subtotal || 0);
                const clinicRevenue = amedAmt + actualPaid;

                let costTotal = Number(b.cost_total);
                if (isNaN(costTotal) || costTotal === undefined) {
                  costTotal = 0;
                  (v.prescriptions || []).forEach(pr => {
                    const d = drugsCatalog.find(x => x.drug_id === pr.drug_id || (x.generic_name && pr.generic_name && x.generic_name.toLowerCase().trim() === pr.generic_name.toLowerCase().trim()));
                    const cPrice = Number(pr.cost_price !== undefined && pr.cost_price !== null ? pr.cost_price : (d ? (d.purchase_price || d.cost_price) : 0)) || 0;
                    costTotal += (cPrice * (Number(pr.qty) || 1));
                  });
                }

                const diffVsCost = clinicRevenue - costTotal;
                const diffVsSale = clinicRevenue - subtotal;

                const costLabel = (diffVsCost >= 0 ? '+' : '') + '฿' + diffVsCost.toFixed(2) + ' (ทุน)';
                const saleLabel = (diffVsSale >= 0 ? '+' : '') + '฿' + diffVsSale.toFixed(2) + ' (ขาย)';

                const costBadgeClass = diffVsCost >= 0 ? 'badge-success' : 'badge-danger';
                const saleColor = diffVsSale >= 0 ? '#059669' : '#dc2626';

                amedBadgeHtml = '<div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">' +
                  '<span class="badge ' + costBadgeClass + '" style="font-size: 0.72rem; padding: 2px 6px;" title="กำไร/ขาดทุนเทียบต้นทุนยาจริง">' + costLabel + '</span>' +
                  '<span style="font-size: 0.7rem; font-weight: 600; color: ' + saleColor + ';" title="กำไร/ส่วนต่างเทียบราคาขายหน้าร้าน">' + saleLabel + '</span>' +
                '</div>';
              }

              let payMethodBadgeClass = 'badge-success';
              if (method === 'โอนเงิน/QR') payMethodBadgeClass = 'badge-primary';
              else if (method.includes('A-Med')) payMethodBadgeClass = 'badge-purple';

              return '<tr>' +
                '<td style="font-size: 0.78rem; color: var(--slate-600); white-space: nowrap;">' + (v.visit_date || '-') + '</td>' +
                '<td><strong>' + v.an + '</strong></td>' +
                '<td><span class="badge badge-gray">' + v.hn + '</span></td>' +
                '<td style="font-family: monospace; font-size: 0.78rem;">' + (p.national_id || '-') + '</td>' +
                '<td><strong>' + v.patient_name + '</strong></td>' +
                '<td><span class="badge badge-primary" style="font-size: 0.72rem;">' + (v.service_type || 'OPD') + '</span></td>' +
                '<td style="max-width: 180px; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + dxText + '">' + dxText + '</td>' +
                '<td><span class="badge ' + payMethodBadgeClass + '" style="font-size: 0.74rem;">' + method + '</span></td>' +
                '<td style="text-align: right; font-weight: 600; color: #047857;">฿' + actualPaid.toFixed(2) + '</td>' +
                '<td style="text-align: right; font-weight: 600; color: #7c3aed;">' + (amedAmt > 0 ? ('฿' + amedAmt.toFixed(2)) : '-') + '</td>' +
                '<td style="text-align: center;">' + amedBadgeHtml + '</td>' +
              '</tr>';
            }).join('');

            if (tfoot) {
              const costSign = amedNetVsCost >= 0 ? '+' : '';
              tfoot.innerHTML = '<tr>' +
                '<td colspan="8" style="text-align: right;">รวมทั้งสิ้น (' + count + ' รายการ):</td>' +
                '<td style="text-align: right; color: #047857; font-size: 0.95rem;">฿' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: right; color: #7c3aed; font-size: 0.95rem;">฿' + amedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: center; font-size: 0.82rem; color: ' + (amedNetVsCost >= 0 ? '#047857' : '#dc2626') + '; font-weight: 700;">' + costSign + '฿' + amedNetVsCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
              '</tr>';
            }
          }
        }
        lucide.createIcons();
      },

      // --- DF Sub-Report Methods inside Tab 10 ---
      initDfDates() {
        const fromInput = document.getElementById('rep-df-from-date');
        const toInput = document.getElementById('rep-df-to-date');
        if (!fromInput || !toInput) return;
        if (!fromInput.value || !toInput.value) {
          this.setDfDatePreset('this_month');
        }
      },

      setDfDatePreset(preset) {
        const fromInput = document.getElementById('rep-df-from-date');
        const toInput = document.getElementById('rep-df-to-date');
        if (!fromInput || !toInput) return;

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (dateObj) => dateObj.getFullYear() + '-' + pad(dateObj.getMonth() + 1) + '-' + pad(dateObj.getDate());

        const btns = ['this_month', 'last_month', 'today', 'yesterday', 'all'];
        btns.forEach(b => {
          const el = document.getElementById('btn-rep-df-' + b.replace('_', '-'));
          if (el) {
            el.className = (b === preset) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
          }
        });

        if (preset === 'today') {
          const todayStr = toDateStr(now);
          fromInput.value = todayStr;
          toInput.value = todayStr;
        } else if (preset === 'yesterday') {
          const yest = new Date(y, m, d - 1);
          fromInput.value = toDateStr(yest);
          toInput.value = toDateStr(yest);
        } else if (preset === 'this_month') {
          fromInput.value = toDateStr(new Date(y, m, 1));
          toInput.value = toDateStr(new Date(y, m + 1, 0));
        } else if (preset === 'last_month') {
          fromInput.value = toDateStr(new Date(y, m - 1, 1));
          toInput.value = toDateStr(new Date(y, m, 0));
        } else if (preset === 'all') {
          fromInput.value = '';
          toInput.value = '';
        }

        this.renderDfReport();
      },

      handleDfDateChange() {
        const btns = ['this_month', 'last_month', 'today', 'yesterday', 'all'];
        btns.forEach(b => {
          const el = document.getElementById('btn-rep-df-' + b.replace('_', '-'));
          if (el) el.className = 'btn btn-outline btn-sm';
        });
        this.renderDfReport();
      },

      renderDfReport() {
        this.initDfDates();
        const fromDate = document.getElementById('rep-df-from-date')?.value || '';
        const toDate = document.getElementById('rep-df-to-date')?.value || '';
        const staffVal = document.getElementById('rep-df-performer-filter')?.value || '';
        const catVal = document.getElementById('rep-df-category-filter')?.value || '';
        const labelEl = document.getElementById('rep-df-period-label');

        if (labelEl) {
          if (!fromDate && !toDate) labelEl.textContent = 'ข้อมูลทุกช่วงเวลา';
          else if (fromDate === toDate) labelEl.textContent = 'ประจำวันที่ ' + Utils.formatDateShort(fromDate);
          else labelEl.textContent = Utils.formatDateShort(fromDate) + ' ถึง ' + Utils.formatDateShort(toDate);
        }

        const perfSelect = document.getElementById('rep-df-performer-filter');
        if (perfSelect && perfSelect.options.length <= 1) {
          const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
          let opts = '<option value="">-- บุคลากรทุกคน (All Staff) --</option>';
          docs.forEach(d => {
            const name = (d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name;
            opts += '<option value="' + name + '">' + name + '</option>';
          });
          perfSelect.innerHTML = opts;
        }

        const transactions = DFModule.getFilteredDataCustom ? DFModule.getFilteredDataCustom(fromDate, toDate, staffVal, catVal) : DFModule.getFilteredData();

        let totalRev = 0;
        let totalDf = 0;
        let totalCount = transactions.length;

        const staffMap = new Map();
        transactions.forEach(t => {
          totalRev += t.price;
          totalDf += t.df_amount;

          const rawStaff = t.staff || 'แพทย์ผู้ตรวจ';
          const cleanStaff = rawStaff.replace(/^(นพ.|นายแพทย์|พญ.|แพทย์หญิง|พว.|ผช.|ภก.|ภญ.|ทพ.|ทพญ.|จนท.|นาย|นาง|น.ส.)\s*/g, '').trim();
          const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
          const docObj = docs.find(d => (d.first_name + ' ' + d.last_name).includes(cleanStaff) || cleanStaff.includes(d.first_name));
          const canonicalName = docObj ? ((docObj.title ? docObj.title + ' ' : '') + docObj.first_name + ' ' + docObj.last_name).trim() : rawStaff;
          const mapKey = cleanStaff || canonicalName;

          if (!staffMap.has(mapKey)) {
            staffMap.set(mapKey, {
              name: canonicalName,
              title: docObj?.specialty || 'แพทย์ / บุคลากรทางการแพทย์',
              count: 0,
              revenue: 0,
              df: 0
            });
          }
          const s = staffMap.get(mapKey);
          s.count += 1;
          s.revenue += t.price;
          s.df += t.df_amount;
        });

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setVal('rep-df-cases-count', totalCount + ' ครั้ง');
        setVal('rep-df-proc-revenue', '฿' + totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        setVal('rep-df-total-amount', '฿' + totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        setVal('rep-df-staff-count', staffMap.size + ' คน');

        const staffTbody = document.querySelector('#rep-df-staff-table tbody');
        const staffTfoot = document.getElementById('rep-df-staff-table-foot');
        if (staffTbody) {
          if (staffMap.size === 0) {
            staffTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--slate-400); padding: 18px;">ไม่พบข้อมูลค่าตอบแทน DF ในช่วงเวลาที่เลือก</td></tr>';
            if (staffTfoot) staffTfoot.innerHTML = '';
          } else {
            let sHtml = '';
            let sIdx = 1;
            staffMap.forEach((s) => {
              const pct = totalDf > 0 ? ((s.df / totalDf) * 100).toFixed(1) : '0.0';
              sHtml += '<tr>' +
                '<td style="text-align: center;">' + sIdx++ + '</td>' +
                '<td><strong>' + s.name + '</strong></td>' +
                '<td><span class="badge badge-gray">' + s.title + '</span></td>' +
                '<td style="text-align: center;">' + s.count + '</td>' +
                '<td style="text-align: right;">฿' + s.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: right; font-weight: 700; color: #047857; background: #ecfdf5;">฿' + s.df.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: center;"><span class="badge badge-emerald">' + pct + '%</span></td>' +
                '<td style="text-align: center;"><button class="btn btn-emerald btn-sm" onclick="DFModule.printSingleStaffSlip(\'' + s.name.replace(/'/g, "\\'") + '\')"><i data-lucide="printer"></i> พิมพ์สลิป</button></td>' +
              '</tr>';
            });
            staffTbody.innerHTML = sHtml;

            if (staffTfoot) {
              staffTfoot.innerHTML = '<tr>' +
                '<td colspan="3" style="text-align: right;">รวมทั้งหมด (' + staffMap.size + ' คน):</td>' +
                '<td style="text-align: center;">' + totalCount + '</td>' +
                '<td style="text-align: right;">฿' + totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: right; color: #047857; font-size: 0.95rem;">฿' + totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: center;">100%</td>' +
                '<td></td>' +
              '</tr>';
            }
          }
        }

        const detailTbody = document.querySelector('#rep-df-detail-table tbody');
        const detailTfoot = document.getElementById('rep-df-detail-table-foot');
        if (detailTbody) {
          if (transactions.length === 0) {
            detailTbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--slate-400); padding: 18px;">ไม่พบรายการหัตถการหรือ DF ในช่วงเวลาที่เลือก</td></tr>';
            if (detailTfoot) detailTfoot.innerHTML = '';
          } else {
            let dHtml = '';
            transactions.forEach(t => {
              dHtml += '<tr>' +
                '<td style="font-size: 0.78rem; white-space: nowrap;">' + Utils.formatDateShort(t.date) + ' ' + t.time + '</td>' +
                '<td><strong style="color: var(--primary-700);">' + t.an + '</strong></td>' +
                '<td>' + t.hn + '</td>' +
                '<td><strong>' + t.patient_name + '</strong></td>' +
                '<td><strong>' + t.item_name + '</strong></td>' +
                '<td><span class="badge badge-gray">' + t.category + '</span></td>' +
                '<td style="color: #0f766e;">' + t.staff + '</td>' +
                '<td style="text-align: right;">฿' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: right; font-weight: 700; color: #047857; background: #ecfdf5;">฿' + t.df_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: center;"><span class="badge badge-success">' + t.status + '</span></td>' +
              '</tr>';
            });
            detailTbody.innerHTML = dHtml;

            if (detailTfoot) {
              detailTfoot.innerHTML = '<tr>' +
                '<td colspan="7" style="text-align: right;">รวมทั้งสิ้น (' + transactions.length + ' รายการ):</td>' +
                '<td style="text-align: right;">฿' + totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td style="text-align: right; color: #047857; font-size: 0.95rem;">฿' + totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                '<td></td>' +
              '</tr>';
            }
          }
        }

        lucide.createIcons();
      },

      exportDfCSV() {
        DFModule.exportDFExcel();
      },

      printDfReport() {
        DFModule.printDFSummary();
      },

      filterAmedOnly() {
        const sel = document.getElementById('rep-payment-filter');
        if (sel) {
          sel.value = 'A-Med';
          this.render();
        }
      },

      exportAmedProfitLossCSV() {
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const visits = this.getFilteredVisits().filter(v => (v.billing?.amed_discount || 0) > 0 || (v.service_type && v.service_type.includes('A-Med')) || (v.billing?.payment_method && v.billing.payment_method.includes('A-Med')));
        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];
        const drugsCatalog = DB.get(STORAGE_KEYS.DRUGS) || [];

        if (visits.length === 0) {
          alert('ไม่พบรายการเคส A-Med ในช่วงวันที่เลือก');
          return;
        }

        let csv = '\uFEFFวันที่รับบริการ,AN,HN,เลขบัตรประชาชน,ชื่อ-นามสกุล,สิทธิการรักษา,วิธีชำระเงิน,การวินิจฉัย,ยอดราคาขายเต็ม (บาท),ต้นทุนยาจริง (บาท),ยอดเบิก A-Med (บาท),ยอดคนไข้จ่ายเพิ่ม (บาท),รายรับรวมคลินิก (บาท),กำไร-ขาดทุนเทียบราคาขาย (บาท),กำไร-ขาดทุนเทียบต้นทุนจริง (บาท),สรุปผลประกอบการ\n';

        visits.forEach(v => {
          const p = patients.find(x => x.hn === v.hn) || {};
          const b = v.billing || {};
          const dx = ((v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(';') : (v.assessment || '')).replace(/"/g, '""');

          const subtotal = Number(b.subtotal || 0);
          const claimAmt = Number(b.amed_discount || 180.00);
          const paidAmt = Number(b.total || 0);
          const clinicRevenue = claimAmt + paidAmt;

          let costTotal = Number(b.cost_total);
          if (isNaN(costTotal) || costTotal === undefined) {
            costTotal = 0;
            (v.prescriptions || []).forEach(pr => {
              const d = drugsCatalog.find(x => x.drug_id === pr.drug_id || (x.generic_name && pr.generic_name && x.generic_name.toLowerCase().trim() === pr.generic_name.toLowerCase().trim()));
              const cPrice = Number(pr.cost_price !== undefined && pr.cost_price !== null ? pr.cost_price : (d ? (d.purchase_price || d.cost_price) : 0)) || 0;
              costTotal += (cPrice * (Number(pr.qty) || 1));
            });
          }

          const diffVsSale = clinicRevenue - subtotal;
          const diffVsCost = clinicRevenue - costTotal;

          let statusText = '';
          if (diffVsCost >= 0) {
            statusText = (diffVsSale >= 0) ? 'กำไรทั้งราคาขายและต้นทุน' : 'กำไรเนื้อเงิน (คลินิกซับพอร์ตส่วนลดราคาขาย)';
          } else {
            statusText = 'ขาดทุนเข้าเนื้อต้นทุน';
          }

          const aType = b.amed_type === 'AMED_FREE' ? 'A-Med ขาประจำ (ยอด 0 บ.)' : (b.amed_type === 'AMED_COPAY' ? 'A-Med ขาจร (เก็บส่วนต่าง)' : (v.service_type || 'A-Med'));

          csv += '"' + (v.visit_date ? v.visit_date.slice(0, 16) : '') + '","' +
                 v.an + '","' +
                 v.hn + '","' +
                 (p.national_id || '') + '","' +
                 v.patient_name + '","' +
                 aType + '","' +
                 (b.payment_method || 'A-Med') + '","' +
                 dx + '",' +
                 subtotal.toFixed(2) + ',' +
                 costTotal.toFixed(2) + ',' +
                 claimAmt.toFixed(2) + ',' +
                 paidAmt.toFixed(2) + ',' +
                 clinicRevenue.toFixed(2) + ',' +
                 diffVsSale.toFixed(2) + ',' +
                 diffVsCost.toFixed(2) + ',"' +
                 statusText + '"\n';
        });

        const periodSlug = (fromDate && toDate) ? (fromDate + '_to_' + toDate) : (fromDate || toDate || 'All');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'AMed_Profit_Loss_Analysis_' + periodSlug + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      },

      exportAmedCSV() {
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const visits = this.getFilteredVisits().filter(v => (v.billing?.amed_discount || 0) > 0 || (v.service_type && v.service_type.includes('A-Med')) || (v.billing?.payment_method && v.billing.payment_method.includes('A-Med')));
        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];

        if (visits.length === 0) {
          alert('ไม่พบรายการเคลม A-Med ในช่วงวันที่เลือก');
          return;
        }

        let csv = '\uFEFFวันที่รับบริการ,AN,HN,เลขบัตรประชาชน13หลัก,ชื่อ-นามสกุล,สิทธิ,การวินิจฉัยโรค,ยอดเบิกA-Med(บาท)\n';
        visits.forEach(v => {
          const p = patients.find(x => x.hn === v.hn) || {};
          const dx = ((v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(';') : (v.assessment || '')).replace(/"/g, '""');
          csv += '"' + (v.visit_date ? v.visit_date.slice(0, 10) : '') + '","' + v.an + '","' + v.hn + '","' + (p.national_id || '') + '","' + v.patient_name + '","' + (v.service_type || 'A-Med') + '","' + dx + '","' + Number(v.billing?.amed_discount || 0).toFixed(2) + '"\n';
        });

        const periodSlug = (fromDate && toDate) ? (fromDate + '_to_' + toDate) : (fromDate || toDate || 'All');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'A-Med_Claims_' + periodSlug + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      },

      exportFinancialCSV() {
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const visits = this.getFilteredVisits();
        const patients = DB.get(STORAGE_KEYS.PATIENTS) || [];

        if (visits.length === 0) {
          alert('ไม่มีข้อมูลสำหรับส่งออกในช่วงวันที่เลือก');
          return;
        }

        let csv = '\uFEFFวันที่รับบริการ,ลำดับ AN,HN,เลขประจำตัวประชาชน,ชื่อ-นามสกุล,สิทธิการรักษา,การวินิจฉัย,วิธีชำระเงิน,ยอดชำระจริง (บาท),ยอดเบิก A-Med (บาท)\n';
        visits.forEach(v => {
          const p = patients.find(x => x.hn === v.hn) || {};
          const dx = ((v.diagnoses && v.diagnoses.length > 0) ? v.diagnoses.map(d => d.name).join(';') : (v.assessment || '')).replace(/"/g, '""');
          csv += '"' + (v.visit_date || '') + '","' + v.an + '","' + v.hn + '","' + (p.national_id || '') + '","' + v.patient_name + '","' + (v.service_type || 'OPD') + '","' + dx + '","' + (v.billing?.payment_method || 'เงินสด') + '",' + Number(v.billing?.total || 0).toFixed(2) + ',' + Number(v.billing?.amed_discount || 0).toFixed(2) + '\n';
        });

        const periodSlug = (fromDate && toDate) ? (fromDate + '_to_' + toDate) : (fromDate || toDate || 'All');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Financial_Report_' + periodSlug + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      },

      printReport() {
        const fromDate = document.getElementById('rep-from-date')?.value || '';
        const toDate = document.getElementById('rep-to-date')?.value || '';
        const labelText = document.getElementById('rep-period-label')?.textContent || '';
        const cash = document.getElementById('rep-cash')?.textContent || '฿0';
        const transfer = document.getElementById('rep-transfer')?.textContent || '฿0';
        const amed = document.getElementById('rep-amed')?.textContent || '฿0';
        const total = document.getElementById('rep-total')?.textContent || '฿0';
        const count = document.getElementById('rep-count')?.textContent || '0';
        const tableHtml = document.getElementById('rep-table')?.outerHTML || '';

        const w = window.open('', '', 'width=950,height=900');
        w.document.write('<html><head><title>รายงานสรุปการเงินและรายรับคลินิก</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:Sarabun,sans-serif;padding:30px;color:#1e293b;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #94a3b8;padding:6px 8px;font-size:12px;}th{background:#f1f5f9;font-weight:700;}tfoot td{background:#f8fafc;font-weight:700;}.summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:15px;margin-bottom:15px;}.summary-card{border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;background:#f8fafc;}.summary-card h4{margin:0 0 4px 0;font-size:11px;color:#64748b;font-weight:600;}.summary-card .val{font-size:15px;font-weight:700;color:#0f172a;}</style></head><body><div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:10px;"><h2>คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</h2><p style="margin:4px 0;font-size:14px;"><strong>รายงานสรุปรายรับและการเงินคลินิก</strong></p><p style="margin:2px 0;font-size:13px;color:#475569;">' + labelText + ' | พิมพ์เมื่อ: ' + new Date().toLocaleString('th-TH') + '</p></div><div class="summary-grid"><div class="summary-card"><h4>จำนวนเคสผู้ป่วย</h4><div class="val">' + count + ' รายการ</div></div><div class="summary-card"><h4>ยอดเงินสด</h4><div class="val" style="color:#059669;">' + cash + '</div></div><div class="summary-card"><h4>ยอดโอนเงิน / QR</h4><div class="val" style="color:#2563eb;">' + transfer + '</div></div><div class="summary-card"><h4>ยอดเบิก A-Med</h4><div class="val" style="color:#7c3aed;">' + amed + '</div></div><div class="summary-card" style="border:2px solid #059669;background:#f0fdf4;"><h4>ยอดรวมรายรับจริง</h4><div class="val" style="color:#047857;font-size:16px;">' + total + '</div></div></div>' + tableHtml + '<div style="margin-top:40px;display:flex;justify-content:space-between;"><div style="font-size:11px;color:#94a3b8;">* เอกสารสรุปรายรับภายในคลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</div><div style="text-align:center;width:220px;"><div>ผู้จัดทำรายงาน: ____________________</div><div style="font-size:12px;color:#64748b;margin-top:4px;">เจ้าหน้าที่การเงินคลินิก</div></div></div>' + '<' + 'script>window.onload=function(){window.print();window.close();}<' + '/script>' + '</body></html>');
        w.document.close();
      },

      printDailyReport() {
        this.printReport();
      }
    };

    const DFModule = {
      activePreset: 'thisMonth',
      hasInitialized: false,

      initDates() {
        const startInput = document.getElementById('df-filter-date-start');
        const endInput = document.getElementById('df-filter-date-end');
        if (!startInput || !endInput) return;
        if (this.activePreset === 'all') return;
        if (!startInput.value && !endInput.value) {
          this.setRange('thisMonth', false);
        }
      },

      populateStaffFilter() {
        const select = document.getElementById('df-filter-staff');
        if (!select) return;
        const currentVal = select.value;
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        
        let html = '<option value="">-- ทั้งหมด (ทุกคน) --</option>';
        docs.filter(d => d.active !== false).forEach(d => {
          const displayLabel = (d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name;
          const spec = d.specialty ? ' (' + d.specialty + ')' : '';
          html += '<option value="' + displayLabel + '">' + displayLabel + spec + '</option>';
        });
        select.innerHTML = html;
        if (currentVal) select.value = currentVal;
      },

      setRange(type, triggerRender = true) {
        this.activePreset = type;
        const startInput = document.getElementById('df-filter-date-start');
        const endInput = document.getElementById('df-filter-date-end');
        if (!startInput || !endInput) return;

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (dateObj) => dateObj.getFullYear() + '-' + pad(dateObj.getMonth() + 1) + '-' + pad(dateObj.getDate());

        const btnMap = {
          'today': document.getElementById('btn-df-today'),
          'thisMonth': document.getElementById('btn-df-this-month'),
          'lastMonth': document.getElementById('btn-df-last-month'),
          'all': document.getElementById('btn-df-all')
        };

        Object.keys(btnMap).forEach(k => {
          if (btnMap[k]) {
            btnMap[k].className = (k === type) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
          }
        });

        if (type === 'today') {
          const todayStr = toDateStr(now);
          startInput.value = todayStr;
          endInput.value = todayStr;
        } else if (type === 'thisMonth') {
          const firstDay = new Date(y, m, 1);
          const lastDay = new Date(y, m + 1, 0);
          startInput.value = toDateStr(firstDay);
          endInput.value = toDateStr(lastDay);
        } else if (type === 'lastMonth') {
          const firstDay = new Date(y, m - 1, 1);
          const lastDay = new Date(y, m, 0);
          startInput.value = toDateStr(firstDay);
          endInput.value = toDateStr(lastDay);
        } else if (type === 'all') {
          startInput.value = '';
          endInput.value = '';
        }

        if (triggerRender) this.render();
      },

      filterByStaff(staffName) {
        const select = document.getElementById('df-filter-staff');
        if (select) {
          const cleanTarget = staffName.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
          let matched = false;
          for (let i = 0; i < select.options.length; i++) {
            const optVal = select.options[i].value;
            const optText = select.options[i].textContent;
            if (optVal && (optVal === staffName || optVal.includes(cleanTarget) || cleanTarget.includes(optVal) || optText.includes(cleanTarget))) {
              select.selectedIndex = i;
              matched = true;
              break;
            }
          }
          if (!matched) select.value = '';
        }
        this.render();
        document.getElementById('df-transactions-table')?.scrollIntoView({ behavior: 'smooth' });
      },

      parseVisitDate(v) {
        const raw = (v.created_at || v.visit_date || v.date || '').trim();
        if (!raw) return '';

        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          let y = parseInt(raw.slice(0, 4), 10);
          if (y >= 2500) y -= 543;
          return y + raw.slice(4, 10);
        }

        const parts = raw.split(/[\/\-\s]/);
        if (parts.length >= 3) {
          let d = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          let y = parseInt(parts[2], 10);
          if (y >= 2500) y -= 543;
          else if (y < 100) y = (y + 2500) - 543;
          if (d && m && y) {
            return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
          }
        }

        return raw.slice(0, 10);
      },

      canonicalStaffName(rawName) {
        if (!rawName) return 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
        const str = String(rawName).trim();
        if (str.includes('กชณัฐ')) {
          return 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
        }
        if (str.includes('กาญจนา')) {
          return 'ผช. กาญจนา บุญมา';
        }
        if (str.includes('พิมลดา') || str.includes('ศิรัญญา')) {
          const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
          const matched = docs.find(d => d.first_name && str.includes(d.first_name));
          if (matched) return ((matched.title ? matched.title + ' ' : '') + matched.first_name + ' ' + matched.last_name).trim();
          return 'พว. ศิรัญญา โพธิ์นาค';
        }
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const cleanRaw = str.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
        const matched = docs.find(d => {
          const fullName = ((d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name).trim();
          const cleanDoc = (d.first_name + ' ' + d.last_name).trim();
          return str === fullName || cleanRaw === cleanDoc || (d.first_name && cleanRaw.includes(d.first_name));
        });
        if (matched) {
          return ((matched.title ? matched.title + ' ' : '') + matched.first_name + ' ' + matched.last_name).trim();
        }
        return str;
      },

      getFilteredData() {
        const startVal = document.getElementById('df-filter-date-start')?.value || '';
        const endVal = document.getElementById('df-filter-date-end')?.value || '';
        const staffVal = document.getElementById('df-filter-staff')?.value || '';
        const catVal = document.getElementById('df-filter-category')?.value || '';

        const visits = DB.get(STORAGE_KEYS.VISITS) || [];
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const masterProcs = DB.get(STORAGE_KEYS.PROCEDURES) || [];
        const transactions = [];

        visits.forEach(v => {
          const vDate = this.parseVisitDate(v);
          if (startVal && vDate && vDate < startVal) return;
          if (endVal && vDate && vDate > endVal) return;

          const defaultDoc = v.doctor || (docs[0] ? (docs[0].title ? docs[0].title + ' ' : '') + docs[0].first_name + ' ' + docs[0].last_name : 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน');
          const procs = Array.isArray(v.procedures) ? v.procedures : [];
          let hasExplicitConsultation = false;

          procs.forEach(p => {
            const rawPerformer = p.performer_name || defaultDoc;
            const performer = this.canonicalStaffName(rawPerformer);
            const isConsult = (p.proc_id === 'PR001' || p.proc_id === 'PROC1' || (p.category && p.category.includes('ตรวจ')) || (p.name && (p.name.includes('ตรวจรักษา') || p.name.includes('ตรวจโรค') || p.name.includes('Consultation') || p.name.includes('ตรวจสุขภาพ'))));
            if (isConsult) hasExplicitConsultation = true;

            // Apply category filter
            if (catVal) {
              if (catVal === 'ตรวจโรค') {
                if (!isConsult && (p.category || '') !== 'ตรวจโรค' && !(p.name || '').includes('ตรวจโรค')) return;
              } else {
                if ((p.category || 'บริการทั่วไป') !== catVal && !(p.category || '').includes(catVal)) return;
              }
            }

            // Apply staff filter
            if (staffVal) {
              const cleanStaff = staffVal.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
              const cleanPerformer = performer.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
              const match = performer.includes(staffVal) || 
                            staffVal.includes(performer) ||
                            performer.includes(cleanStaff) || 
                            cleanPerformer.includes(cleanStaff) || 
                            cleanStaff.includes(cleanPerformer);
              if (!match) return;
            }

            const price = Number(p.price) || 0;
            const masterP = masterProcs.find(x => x.proc_id === p.proc_id || x.name === p.name);
            let dfPrice = 0;
            if (p.df_price !== undefined && p.df_price !== null && p.df_price !== '') {
              dfPrice = Number(p.df_price);
            } else if (masterP) {
              if (masterP.df_type === 'PERCENT') {
                dfPrice = Math.round(price * ((Number(masterP.df_value) || 0) / 100));
              } else if (masterP.df_type === 'FIXED') {
                dfPrice = Number(masterP.df_value) || 0;
              } else {
                dfPrice = Number(masterP.df_price) || Math.round(price * 0.35);
              }
            } else {
              dfPrice = isConsult ? Math.round(price * 0.5) : Math.round(price * 0.35);
            }
            const clinicShare = Math.max(0, price - dfPrice);

            transactions.push({
              visit_id: v.visit_id,
              an: v.an || '-',
              hn: v.hn || '-',
              patient_name: v.patient_name || 'ผู้ป่วยทั่วไป',
              date: vDate,
              time: (v.created_at || v.visit_date || '').slice(11, 16) || '09:00',
              item_name: p.name || (isConsult ? 'ตรวจรักษาโรคทั่วไป OPD' : 'หัตถการทั่วไป'),
              category: p.category || (isConsult ? 'ตรวจโรค' : 'หัตถการทั่วไป'),
              is_consult: isConsult,
              staff: performer,
              price: price,
              df_amount: dfPrice,
              clinic_amount: clinicShare,
              status: (v.status === 'CLOSED' || v.billing?.paid) ? 'ชำระแล้ว' : 'รอชำระ'
            });
          });

          // Strictly calculate only recorded procedures - no synthetic fallback injection
        });

        return transactions;
      },

      render() {
        this.initDates();
        this.populateStaffFilter();

        const transactions = this.getFilteredData();

        let totalRevenue = 0;
        let totalDf = 0;
        let totalClinic = 0;
        let totalCount = transactions.length;

        transactions.forEach(t => {
          totalRevenue += t.price;
          totalDf += t.df_amount;
          totalClinic += t.clinic_amount;
        });

        // 4 KPI Stat Tiles in tab-df-reports
        const setTxt = (id, txt) => {
          const el = document.getElementById(id);
          if (el) el.textContent = txt;
        };

        setTxt('df-stat-total-df', '฿' + totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        setTxt('df-stat-proc-count', totalCount.toLocaleString() + ' รายการ');
        setTxt('df-stat-billed-amount', '฿' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
        setTxt('df-stat-clinic-share', '฿' + totalClinic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

        this.renderStaffCards(transactions, totalDf);
        this.renderTransactionsTable(transactions, totalRevenue, totalDf, totalClinic);

        lucide.createIcons();
      },

      renderStaffCards(transactions, totalDf) {
        const container = document.getElementById('df-staff-cards-container');
        if (!container) return;

        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const staffMap = new Map();

        transactions.forEach(t => {
          const canonical = this.canonicalStaffName(t.staff);
          if (!staffMap.has(canonical)) {
            const cleanStaff = canonical.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
            const docObj = docs.find(d => {
              const fullName = ((d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name).trim();
              return fullName === canonical || canonical.includes(d.first_name) || cleanStaff.includes(d.first_name);
            });
            staffMap.set(canonical, {
              name: canonical,
              title: docObj?.title || '',
              specialty: docObj?.specialty || 'แพทย์ / บุคลากรทางการแพทย์',
              license_no: docObj?.license_no || '',
              count: 0,
              revenue: 0,
              df: 0,
              clinic: 0
            });
          }
          const s = staffMap.get(canonical);
          s.count += 1;
          s.revenue += t.price;
          s.df += t.df_amount;
          s.clinic += t.clinic_amount;
        });

        if (staffMap.size === 0) {
          container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; color: #64748b;">' +
            '<i data-lucide="coins" style="width: 40px; height: 40px; color: #94a3b8; margin-bottom: 8px; stroke-width: 1.5;"></i>' +
            '<h4 style="font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 4px;">ไม่พบข้อมูลค่าตอบแทน DF ในช่วงเวลาที่เลือก</h4>' +
            '<p style="font-size: 0.8rem; color: #94a3b8;">ลองเปลี่ยนตัวกรองวันที่หรือเลือก "ทั้งหมด" เพื่อดูข้อมูลย้อนหลัง</p>' +
            '</div>';
          return;
        }

        let html = '';
        staffMap.forEach((s) => {
          const pct = totalDf > 0 ? ((s.df / totalDf) * 100).toFixed(1) : '0.0';
          const isNurse = s.name.includes('พว.') || s.name.includes('พยาบาล') || s.name.includes('ผช.');
          const licenseBadge = s.license_no && s.license_no !== '-' 
            ? '<span style="font-size: 0.72rem; background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-weight: 600;">ว./พ. ' + s.license_no + '</span>' 
            : '';

          html += '<div class="card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">' +
            '<div>' +
              '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                  '<div style="width: 42px; height: 42px; border-radius: 10px; background: ' + (isNurse ? '#ecfdf5' : '#e0f2fe') + '; color: ' + (isNurse ? '#059669' : '#0284c7') + '; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem;">' +
                    '<i data-lucide="' + (isNurse ? 'activity' : 'stethoscope') + '" style="width: 22px; height: 22px;"></i>' +
                  '</div>' +
                  '<div>' +
                    '<h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0;">' + s.name + '</h4>' +
                    '<div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">' +
                      '<span style="font-size: 0.74rem; color: #64748b;">' + s.specialty + '</span>' +
                      licenseBadge +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<span class="badge badge-emerald" style="font-size: 0.76rem; font-weight: 700;">' + pct + '% ของ DF รวม</span>' +
              '</div>' +

              '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #edf2f7;">' +
                '<div>' +
                  '<div style="font-size: 0.72rem; color: #64748b;">จำนวนหัตถการ</div>' +
                  '<div style="font-size: 0.95rem; font-weight: 700; color: #0284c7;">' + s.count.toLocaleString() + ' เคส</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size: 0.72rem; color: #64748b;">ยอดเรียกเก็บรวม</div>' +
                  '<div style="font-size: 0.95rem; font-weight: 700; color: #334155;">฿' + s.revenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size: 0.72rem; color: #065f46; font-weight: 600;">ค่าตอบแทน DF สุทธิ</div>' +
                  '<div style="font-size: 1.15rem; font-weight: 800; color: #047857;">฿' + s.df.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size: 0.72rem; color: #92400e;">ส่วนแบ่งคลินิก</div>' +
                  '<div style="font-size: 0.95rem; font-weight: 700; color: #b45309;">฿' + s.clinic.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) + '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div style="display: flex; gap: 6px; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 10px;">' +
              '<button type="button" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 5px 10px;" onclick="DFModule.filterByStaff(\'' + s.name.replace(/\'/g, "\\\'") + '\')"><i data-lucide="filter"></i> กรองดูเฉพาะคนนี้</button>' +
              '<button type="button" class="btn btn-emerald btn-sm" style="font-size: 0.78rem; padding: 5px 10px;" onclick="DFModule.printSingleStaffSlip(\'' + s.name.replace(/\'/g, "\\\'") + '\')"><i data-lucide="printer"></i> สลิป DF</button>' +
            '</div>' +
          '</div>';
        });

        container.innerHTML = html;
      },

      renderTransactionsTable(transactions, totalRevenue, totalDf, totalClinic) {
        const tbody = document.querySelector('#df-transactions-table tbody');
        if (!tbody) return;

        if (transactions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 28px; color: #94a3b8;"><i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:6px;opacity:0.5;"></i><div>ไม่พบรายการบันทึกหัตถการหรือสัดส่วนค่าตอบแทน DF ในช่วงเวลาและเงื่อนไขที่เลือก</div></td></tr>';
          return;
        }

        let html = '';
        const displayList = transactions.slice(0, 300);

        displayList.forEach((t) => {
          const isPaid = (t.status === 'ชำระแล้ว');
          const statusBadge = isPaid 
            ? '<span class="badge badge-success" style="font-size:0.72rem;">ชำระแล้ว</span>' 
            : '<span class="badge badge-warning" style="font-size:0.72rem;">รอชำระ</span>';

          const catBadge = t.is_consult
            ? '<span class="badge badge-primary" style="font-size:0.7rem; margin-left: 4px;">🩺 ตรวจโรค</span>'
            : '<span class="badge badge-gray" style="font-size:0.7rem; margin-left: 4px;">💉 ' + t.category + '</span>';

          html += '<tr style="border-bottom: 1px solid #f1f5f9; font-size: 0.84rem;">' +
            '<td style="white-space: nowrap; color: #475569;">' + Utils.formatDateShort(t.date) + ' <span style="font-size: 0.75rem; color: #94a3b8;">' + t.time + '</span></td>' +
            '<td style="white-space: nowrap;"><strong style="color: #0f766e; font-family: monospace;">' + t.an + '</strong> <span style="color: #94a3b8; font-size: 0.74rem;">(' + t.hn + ')</span></td>' +
            '<td style="font-weight: 600; color: #0f172a;">' + t.patient_name + '</td>' +
            '<td><strong>' + t.item_name + '</strong> ' + catBadge + '</td>' +
            '<td style="color: #0d9488; font-weight: 500;"><i data-lucide="user-check" style="width:13px;height:13px;vertical-align:middle;margin-right:2px;"></i>' + t.staff + '</td>' +
            '<td style="text-align: right; color: #475569; font-weight: 500;">฿' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td style="text-align: right; font-weight: 700; color: #047857; background: #ecfdf5;">฿' + t.df_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td style="text-align: right; color: #1e40af; font-weight: 600;">฿' + t.clinic_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td style="text-align: center;">' + statusBadge + '</td>' +
          '</tr>';
        });

        tbody.innerHTML = html;

        // Update / Create TFoot with Grand Totals
        let tfoot = document.querySelector('#df-transactions-table tfoot');
        if (!tfoot) {
          tfoot = document.createElement('tfoot');
          document.querySelector('#df-transactions-table').appendChild(tfoot);
        }
        tfoot.innerHTML = '<tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1; font-size: 0.86rem;">' +
          '<td colspan="5" style="text-align: right; padding: 10px 12px; color: #334155;">รวมยอดทั้งหมด (' + transactions.length.toLocaleString() + ' รายการ):</td>' +
          '<td style="text-align: right; padding: 10px 12px; color: #0f172a;">฿' + (totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
          '<td style="text-align: right; padding: 10px 12px; color: #047857; background: #d1fae5; font-size: 0.95rem;">฿' + (totalDf || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
          '<td style="text-align: right; padding: 10px 12px; color: #1e40af;">฿' + (totalClinic || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
          '<td></td>' +
        '</tr>';
      },

      printSingleStaffSlip(staffName) {
        const transactions = this.getFilteredData();
        const cleanStaff = staffName.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
        
        const staffTx = transactions.filter(t => {
          const cleanPerformer = t.staff.replace(/^(นพ\.|นายแพทย์|พญ\.|แพทย์หญิง|พว\.|ผช\.|ภก\.|ภญ\.|ทพ\.|ทพญ\.|จนท\.|นาย|นาง|น\.ส\.)\s*/g, '').trim();
          return t.staff.includes(staffName) || 
                 staffName.includes(t.staff) || 
                 cleanPerformer.includes(cleanStaff) || 
                 cleanStaff.includes(cleanPerformer);
        });

        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const docObj = docs.find(d => {
          const fullName = (d.title ? d.title + ' ' : '') + d.first_name + ' ' + d.last_name;
          return fullName.includes(cleanStaff) || cleanStaff.includes(d.first_name);
        }) || { title: '', first_name: staffName, last_name: '', license_no: '-', specialty: 'แพทย์ / บุคลากรทางการแพทย์' };

        const startVal = document.getElementById('df-filter-date-start')?.value || '';
        const endVal = document.getElementById('df-filter-date-end')?.value || '';
        const dateRangeLabel = (startVal && endVal) 
          ? Utils.formatDateThai(startVal) + ' ถึง ' + Utils.formatDateThai(endVal)
          : (startVal ? 'ตั้งแต่ ' + Utils.formatDateThai(startVal) : 'ข้อมูลทุกช่วงเวลา');

        let totalRev = 0;
        let totalDf = 0;
        let totalClinic = 0;
        staffTx.forEach(t => {
          totalRev += t.price;
          totalDf += t.df_amount;
          totalClinic += t.clinic_amount;
        });

        const modal = document.getElementById('modal-df-payslip');
        const content = document.getElementById('df-payslip-print-content');
        if (!modal || !content) return;

        let rowsHtml = '';
        staffTx.forEach((t, i) => {
          rowsHtml += '<tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.82rem;">' +
            '<td style="text-align: center; padding: 6px 8px;">' + (i + 1) + '</td>' +
            '<td style="white-space: nowrap; padding: 6px 8px;">' + Utils.formatDateShort(t.date) + ' ' + t.time + '</td>' +
            '<td style="padding: 6px 8px; font-family: monospace; font-weight: 600; color: #0f766e;">' + t.an + '</td>' +
            '<td style="padding: 6px 8px;">' + t.patient_name + '</td>' +
            '<td style="padding: 6px 8px; font-weight: 600;">' + t.item_name + ' <span style="font-size:0.7rem; color:#64748b;">(' + t.category + ')</span></td>' +
            '<td style="text-align: right; padding: 6px 8px;">฿' + t.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td style="text-align: right; padding: 6px 8px; font-weight: 700; color: #047857; background: #ecfdf5;">฿' + t.df_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
          '</tr>';
        });

        if (staffTx.length === 0) {
          rowsHtml = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">ไม่พบรายการหัตถการสำหรับบุคลากรท่านนี้ในช่วงเวลาที่เลือก</td></tr>';
        }

        content.innerHTML = `
          <div style="font-family: 'Prompt', 'Inter', sans-serif; color: #0f172a;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${CLINIC_LOGO}" alt="Logo" style="width: 54px; height: 54px; object-fit: contain; border-radius: 8px;">
                <div>
                  <h3 style="font-size: 1.12rem; font-weight: 800; color: #0f766e; margin: 0;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</h3>
                  <p style="font-size: 0.78rem; color: #64748b; margin: 2px 0 0 0;">ง.69/151 ถ.ดาวดึงส์ ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์ | โทร. 098-3825767</p>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="background: #0f766e; color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.84rem; font-weight: 700; display: inline-block;">
                  ใบแจ้งยอดค่าตอบแทนแพทย์ (DF Payslip)
                </div>
                <div style="font-size: 0.74rem; color: #64748b; margin-top: 4px;">พิมพ์เมื่อ: ${Utils.formatDateThai(new Date().toISOString().slice(0, 10))}</div>
              </div>
            </div>

            <!-- Doctor / Period Metadata Box -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 0.85rem;">
              <div>
                <div style="margin-bottom: 4px;"><strong>ชื่อแพทย์/ผู้ปฏิบัติงาน:</strong> <span style="color: #0f766e; font-weight: 700; font-size: 0.95rem;">${(docObj.title ? docObj.title + ' ' : '') + docObj.first_name + ' ' + docObj.last_name}</span></div>
                <div><strong>ตำแหน่ง / วิชาชีพ:</strong> <span>${docObj.specialty || 'แพทย์เวชปฏิบัติทั่วไป'}</span></div>
              </div>
              <div style="text-align: right;">
                <div style="margin-bottom: 4px;"><strong>เลขที่ใบประกอบวิชาชีพ (ว./พ.):</strong> <span style="font-weight: 700; font-family: monospace;">${docObj.license_no || '-'}</span></div>
                <div><strong>ประจำงวดวันที่:</strong> <span style="color: #0f766e; font-weight: 600;">${dateRangeLabel}</span></div>
              </div>
            </div>

            <!-- Summary KPIs -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
              <div style="background: #f0fdf4; border: 1.5px solid #10b981; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 0.75rem; color: #166534; font-weight: 600;">ยอดรวมค่าตอบแทน DF สุทธิ</div>
                <div style="font-size: 1.35rem; font-weight: 800; color: #047857; margin-top: 2px;">฿${totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 0.75rem; color: #075985;">จำนวนเคสทั้งหมด</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #0284c7; margin-top: 2px;">${staffTx.length.toLocaleString()} เคส</div>
              </div>
              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 0.75rem; color: #6b21a8;">ยอดเรียกเก็บค่าบริการรวม</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #7c3aed; margin-top: 2px;">฿${totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
            </div>

            <!-- Itemized Table -->
            <div style="margin-bottom: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background: #0f766e; color: white; font-size: 0.8rem;">
                    <th style="padding: 8px; text-align: center; width: 35px;">#</th>
                    <th style="padding: 8px; text-align: left;">วันที่-เวลา</th>
                    <th style="padding: 8px; text-align: left;">AN</th>
                    <th style="padding: 8px; text-align: left;">ชื่อผู้ป่วย</th>
                    <th style="padding: 8px; text-align: left;">รายการหัตถการ / บริการ</th>
                    <th style="padding: 8px; text-align: right;">ราคา (฿)</th>
                    <th style="padding: 8px; text-align: right;">ค่า DF (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
                <tfoot style="background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1; font-size: 0.85rem;">
                  <tr>
                    <td colspan="5" style="text-align: right; padding: 8px;">รวมค่าตอบแทน DF ทั้งสิ้น (${staffTx.length} รายการ):</td>
                    <td style="text-align: right; padding: 8px;">฿${totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="text-align: right; padding: 8px; color: #047857; background: #dcfce7; font-size: 0.95rem;">฿${totalDf.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Signatures Box -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 25px; padding-top: 10px;">
              <div style="text-align: center; font-size: 0.82rem;">
                <div style="margin-bottom: 45px;">ลงชื่อ............................................................ผู้รับเงิน/แพทย์</div>
                <div>(${(docObj.title ? docObj.title + ' ' : '') + docObj.first_name + ' ' + docObj.last_name})</div>
                <div style="color: #64748b; font-size: 0.76rem; margin-top: 2px;">วันที่ ........ / ........ / ................</div>
              </div>
              <div style="text-align: center; font-size: 0.82rem;">
                <div style="margin-bottom: 45px;">ลงชื่อ............................................................ผู้อนุมัติ/ผู้จ่ายเงิน</div>
                <div>(ผู้มีอำนาจลงนาม / ฝ่ายการเงินคลินิก)</div>
                <div style="color: #64748b; font-size: 0.76rem; margin-top: 2px;">วันที่ ........ / ........ / ................</div>
              </div>
            </div>
          </div>
        `;

        modal.classList.add('active');
        lucide.createIcons();
      },

      printStaffPayslip(staffName) {
        this.printSingleStaffSlip(staffName);
      },

      closePayslipModal() {
        document.getElementById('modal-df-payslip')?.classList.remove('active');
      },

      printSinglePayslipFromModal() {
        window.print();
      },

      exportCSV() {
        const transactions = this.getFilteredData();
        if (transactions.length === 0) { alert('ไม่มีข้อมูลสำหรับส่งออก'); return; }

        let csv = '\uFEFFวันที่,เวลา,AN,HN,ชื่อผู้ป่วย,รายการหัตถการ,หมวดหมู่,แพทย์/ผู้ปฏิบัติงาน,ราคาบริการ,ค่าตอบแทนDF,ส่วนแบ่งคลินิก,สถานะ\n';
        transactions.forEach(t => {
          csv += [
            t.date,
            t.time,
            t.an,
            t.hn,
            '"' + t.patient_name + '"',
            '"' + t.item_name + '"',
            '"' + t.category + '"',
            '"' + t.staff + '"',
            t.price,
            t.df_amount,
            t.clinic_amount,
            t.status
          ].join(',') + '\n';
        });

        const startVal = document.getElementById('df-filter-date-start')?.value || 'start';
        const endVal = document.getElementById('df-filter-date-end')?.value || 'end';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Doctor_Fee_Report_' + startVal + '_to_' + endVal + '.csv';
        a.click();
        URL.revokeObjectURL(url);
      },

      exportDFExcel() {
        this.exportCSV();
      },

      printDFSummary() {
        window.print();
      },

      printReport() {
        window.print();
      }
    };