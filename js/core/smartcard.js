/* ==========================================================================
   OPD System - Thai Smart Card Reader Integration
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const SmartCardModule = {
      bridgeUrls: ['http://127.0.0.1:8181', 'http://localhost:8181'],
      wsUrls: ['ws://127.0.0.1:8181/ws', 'ws://localhost:8181/ws'],

      queryBridgeWs(action = 'read', timeoutMs = 2500) {
        return new Promise((resolve) => {
          let resolved = false;
          let ws = null;

          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              try { if (ws) ws.close(); } catch(e) {}
              resolve({ success: false });
            }
          }, timeoutMs);

          try {
            const url = this.wsUrls[0];
            ws = new WebSocket(url);

            ws.onopen = () => {
              ws.send(action);
            };

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.event === 'connected' && action !== 'health' && action !== 'status') {
                  return;
                }
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  try { ws.close(); } catch(e) {}
                  resolve({ success: true, data, source: 'ws' });
                }
              } catch(e) {}
            };

            ws.onerror = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve({ success: false });
              }
            };
          } catch(err) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve({ success: false });
            }
          }
        });
      },
      cardSamples: {
        "1": { cid: "3570501055363", title: "นาย", first_name: "อ้วน", last_name: "แสนคำ", sex: "ชาย", dob: "1955-08-10", address: "130 หมู่ที่ 1 ตำบลวอแก้ว อำเภอห้างฉัตร จังหวัดลำปาง" },
        "2": { cid: "3150200119854", title: "นาย", first_name: "หนุ่ม", last_name: "ดวงแก้ว", sex: "ชาย", dob: "1978-04-18", address: "83 หมู่ที่ 4 ตำบลแม่เล่ย์ อำเภอแม่วงก์ จังหวัดนครสวรรค์" },
        "3": { cid: "1609900280141", title: "น.ส.", first_name: "พีรดา", last_name: "สัตระ", sex: "หญิง", dob: "1994-03-13", address: "34/1 หมู่ที่ 8 ตำบลบ้านมะเกลือ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์" },
        "new1": { cid: "1709900123456", title: "น.ส.", first_name: "วิภาดา", last_name: "แจ่มใส", sex: "หญิง", dob: "1995-07-22", address: "94 หมู่ที่ 1 ตำบลบ้านมะเกลือ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์" }
      },
      currentCardData: null,
      pollTimer: null,
      isPolling: false,
      isBridgeOnline: false,

      playSuccessSound() {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 0.08);
          osc2.start(ctx.currentTime + 0.08);
          osc2.stop(ctx.currentTime + 0.35);
        } catch (e) {}
      },

      openModal() {
        this.stopPolling();
        document.getElementById('sc-sample-select').value = '';
        const manualInput = document.getElementById('sc-modal-manual-cid');
        if (manualInput) manualInput.value = '';
        document.getElementById('sc-card-details').style.display = 'none';
        document.getElementById('sc-btn-proceed').style.display = 'none';
        document.getElementById('sc-btn-manual-read').style.display = 'none';
        document.getElementById('modal-smartcard').classList.add('active');
        lucide.createIcons();

        this.checkBridgeAndInit(false);
      },

      closeModal() {
        this.stopPolling();
        document.getElementById('modal-smartcard').classList.remove('active');
      },

      stopPolling() {
        if (this.pollTimer) {
          clearTimeout(this.pollTimer);
          this.pollTimer = null;
        }
        this.isPolling = false;
      },

      async queryBridge(endpoint = '/read') {
        const action = endpoint.includes('health') || endpoint.includes('status') ? 'health' : 'read';

        // 1. Try WebSocket first (bypasses HTTPS mixed-content restrictions in modern browsers)
        try {
          const wsRes = await this.queryBridgeWs(action, 1800);
          if (wsRes && wsRes.success) {
            return wsRes;
          }
        } catch(e) {}

        // 2. Fallback to HTTP fetch
        for (const base of this.bridgeUrls) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${base}${endpoint}`, { 
              method: 'GET', 
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            if (res && res.ok) {
              const data = await res.json();
              return { success: true, data, base, source: 'http' };
            }
          } catch (e) {}
        }
        return { success: false };
      },

      async checkBridgeAndInit(isManualCheck = false) {
        const dotEl = document.getElementById('sc-status-dot');
        const textEl = document.getElementById('sc-status-text');
        const readerBox = document.getElementById('sc-reader-box');
        const manualReadBtn = document.getElementById('sc-btn-manual-read');

        if (dotEl && textEl) {
          dotEl.style.background = '#f59e0b';
          textEl.innerHTML = '<i data-lucide="loader" class="spin" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i> กำลังตรวจสอบการเชื่อมต่อ Bridge (พอร์ต 8181)...';
          lucide.createIcons();
        }

        const healthRes = await this.queryBridge('/health');

        if (!healthRes.success) {
          this.isBridgeOnline = false;
          if (dotEl && textEl) {
            dotEl.style.background = '#ef4444';
            textEl.innerHTML = '<span style="color:#dc2626;font-weight:700;">🔴 ไม่พบ Smart Card Bridge (พอร์ต 8181)</span>';
          }
          if (manualReadBtn) manualReadBtn.style.display = 'none';

          if (readerBox) {
            readerBox.innerHTML = 
              '<div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 12px; padding: 16px; color: #9f1239;">' +
                '<div style="display: flex; align-items: flex-start; gap: 10px;">' +
                  '<div style="width: 38px; height: 38px; background: #ffe4e6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">' +
                    '<i data-lucide="alert-circle" style="color: #e11d48; width: 22px; height: 22px;"></i>' +
                  '</div>' +
                  '<div style="flex: 1;">' +
                    '<div style="font-weight: 700; font-size: 0.96rem; color: #9f1239; margin-bottom: 4px;">ยังไม่ได้เริ่มบริการอ่านบัตรประชาชน (Smart Card Bridge)</div>' +
                    '<p style="font-size: 0.82rem; color: #475569; margin: 0 0 10px; line-height: 1.45;">' +
                      'หากต้องการอ่านบัตรประชาชนจริง กรุณาเปิดไฟล์ <code>เปิดระบบOPD.bat</code> หรือ <code>start-card-reader.bat</code> ในโฟลเดอร์โปรแกรม' +
                    '</p>' +
                    '<div style="display: flex; gap: 8px; flex-wrap: wrap;">' +
                      '<button class="btn btn-primary btn-sm" onclick="SmartCardModule.checkBridgeAndInit(true)"><i data-lucide="refresh-cw"></i> ตรวจสอบการเชื่อมต่ออีกครั้ง</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>';
            lucide.createIcons();
          }
          return;
        }

        this.isBridgeOnline = true;
        const hData = healthRes.data;

        if (hData.status === 'no_reader' || (hData.readers && hData.readers.length === 0)) {
          if (dotEl && textEl) {
            dotEl.style.background = '#f59e0b';
            textEl.innerHTML = '<span style="color:#d97706;font-weight:700;">🟡 เชื่อมต่อ Bridge สำเร็จ แต่ยังไม่พบเครื่องอ่าน USB</span>';
          }
          if (manualReadBtn) manualReadBtn.style.display = 'none';

          if (readerBox) {
            readerBox.innerHTML = 
              '<div style="background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 12px; padding: 16px; color: #92400e;">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                  '<div style="width: 38px; height: 38px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">' +
                    '<i data-lucide="usb" style="color: #d97706; width: 22px; height: 22px;"></i>' +
                  '</div>' +
                  '<div style="flex: 1;">' +
                    '<div style="font-weight: 700; font-size: 0.95rem; color: #92400e;">Bridge พร้อมแล้ว แต่ยังไม่พบเครื่องอ่านบัตรประชาชน USB</div>' +
                    '<p style="font-size: 0.82rem; color: #78350f; margin: 2px 0 8px;">กรุณาเสียบสาย USB เครื่องอ่านบัตรเข้ากับคอมพิวเตอร์</p>' +
                    '<button class="btn btn-warning btn-sm" onclick="SmartCardModule.checkBridgeAndInit(true)"><i data-lucide="refresh-cw"></i> ตรวจสอบเครื่องอ่าน USB</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            lucide.createIcons();
          }
          return;
        }

        // Bridge & USB Reader are ready!
        const readerName = (hData.readers && hData.readers.length > 0) ? hData.readers[0] : 'USB Smart Card Reader';
        if (dotEl && textEl) {
          dotEl.style.background = '#10b981';
          textEl.innerHTML = '<span style="color:#059669;font-weight:700;">🟢 เชื่อมต่อเครื่องอ่านสำเร็จ (' + readerName + ')</span>';
        }
        if (manualReadBtn) manualReadBtn.style.display = 'inline-flex';

        this.startCardPolling();
      },

      startCardPolling() {
        this.stopPolling();
        this.isPolling = true;
        this.pollCardLoop();
      },

      async pollCardLoop() {
        if (!this.isPolling) return;
        const readerBox = document.getElementById('sc-reader-box');

        const readRes = await this.queryBridge('/read');
        if (!this.isPolling) return;

        if (!readRes.success) {
          this.checkBridgeAndInit(false);
          return;
        }

        const data = readRes.data;

        if (!data.error && (data.cid || data.status === 'success')) {
          // Success read!
          this.stopPolling();
          this.playSuccessSound();
          if (readerBox) {
            readerBox.innerHTML = 
              '<div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; color: #065f46;">' +
                '<div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem;">' +
                  '<i data-lucide="check-circle" style="color: #059669; width: 18px; height: 18px;"></i> อ่านข้อมูลจากบัตรประชาชนสำเร็จ!' +
                '</div>' +
                '<button class="btn btn-outline btn-sm" onclick="SmartCardModule.startCardPolling()"><i data-lucide="refresh-cw"></i> เสียบบัตรอื่นใหม่</button>' +
              '</div>';
            lucide.createIcons();
          }
          this.displayCardResult(data);
          return;
        }

        if (data.status === 'waiting_card' || data.code === -2146434967 || data.code === -2146435060 || !data.cid) {
          // Waiting for card insertion
          if (readerBox) {
            readerBox.innerHTML = 
              '<div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; color: #065f46;">' +
                '<div style="width: 52px; height: 52px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.15);">' +
                  '<i data-lucide="credit-card" style="width: 26px; height: 26px; color: #059669;"></i>' +
                '</div>' +
                '<div style="font-weight: 700; font-size: 1.05rem; color: #065f46;">เครื่องอ่านบัตรพร้อมใช้งาน (พอร์ต 8181)</div>' +
                '<p style="font-size: 0.92rem; font-weight: 600; color: #047857; margin: 5px 0 3px;">💳 กรุณาเสียบบัตรประชาชนเข้ากับเครื่องอ่าน</p>' +
                '<p style="font-size: 0.78rem; color: #64748b; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">' +
                  '<i data-lucide="loader" class="spin" style="width: 13px; height: 13px; color: #059669;"></i> ระบบจะตรวจจับและโหลดข้อมูลให้อัตโนมัติทันทีที่เสียบบัตร' +
                '</p>' +
              '</div>';
            lucide.createIcons();
          }
          this.pollTimer = setTimeout(() => this.pollCardLoop(), 1200);
          return;
        }

        // Other reader warning
        if (readerBox) {
          readerBox.innerHTML = 
            '<div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px; color: #be123c;">' +
              '<strong>⚠️ ข้อความจากเครื่องอ่าน:</strong> ' + (data.message || 'ไม่สามารถอ่านข้อมูลได้') +
              '<p style="font-size: 0.78rem; margin: 4px 0 8px; color: #475569;">กรุณาเสียบบัตรประชาชนให้แน่น หรือลองถอดแล้วเสียบใหม่อีกครั้ง</p>' +
              '<button class="btn btn-primary btn-sm" onclick="SmartCardModule.pollCardLoop()"><i data-lucide="refresh-cw"></i> ลองอ่านใหม่</button>' +
            '</div>';
          lucide.createIcons();
        }
        this.pollTimer = setTimeout(() => this.pollCardLoop(), 2000);
      },

      async manualReadOnce() {
        this.stopPolling();
        const readerBox = document.getElementById('sc-reader-box');
        if (readerBox) {
          readerBox.innerHTML = 
            '<div style="background: #eef8f8; border: 1px solid #aee0de; border-radius: 10px; padding: 16px; text-align: center; color: #0f766e;">' +
              '<i data-lucide="loader" class="spin" style="width: 24px; height: 24px; color: #0d9488; margin-bottom: 8px;"></i>' +
              '<div style="font-weight: 700; font-size: 0.95rem;">กำลังอ่านข้อมูลจากชิปการ์ด...</div>' +
            '</div>';
          lucide.createIcons();
        }

        const readRes = await this.queryBridge('/read');
        if (readRes.success && readRes.data && !readRes.data.error && (readRes.data.cid || readRes.data.status === 'success')) {
          this.playSuccessSound();
          if (readerBox) {
            readerBox.innerHTML = 
              '<div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; color: #065f46;">' +
                '<div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem;">' +
                  '<i data-lucide="check-circle" style="color: #059669; width: 18px; height: 18px;"></i> อ่านข้อมูลสำเร็จ!' +
                '</div>' +
                '<button class="btn btn-outline btn-sm" onclick="SmartCardModule.startCardPolling()"><i data-lucide="refresh-cw"></i> อ่านบัตรอื่น</button>' +
              '</div>';
            lucide.createIcons();
          }
          this.displayCardResult(readRes.data);
        } else {
          const msg = (readRes.data && readRes.data.message) ? readRes.data.message : 'ยังไม่ได้เสียบบัตร หรือเครื่องอ่านไม่ตอบสนอง';
          alert('แจ้งเตือน: ' + msg);
          this.startCardPolling();
        }
      },

      readRealCardAndOpenVisit() {
        this.openModal();
      },

      readRealCard() {
        this.openModal();
      },

      onSelectSample(key) {
        this.stopPolling();
        if (!key || !this.cardSamples[key]) {
          document.getElementById('sc-card-details').style.display = 'none';
          document.getElementById('sc-btn-proceed').style.display = 'none';
          return;
        }
        this.playSuccessSound();
        const readerBox = document.getElementById('sc-reader-box');
        if (readerBox) {
          readerBox.innerHTML = 
            '<div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; color: #3730a3;">' +
              '<div style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; font-weight: 600;">' +
                '<i data-lucide="sparkles" style="width: 16px; height: 16px; color: #4f46e5;"></i> โหลดข้อมูลจากบัตรประชาชนตัวอย่างเรียบร้อย' +
              '</div>' +
              '<button class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:3px 8px;" onclick="SmartCardModule.startCardPolling()"><i data-lucide="scan"></i> สลับไปอ่านบัตรจริง</button>' +
            '</div>';
          lucide.createIcons();
        }
        this.displayCardResult(this.cardSamples[key]);
      },

      searchByCID(rawCid) {
        const query = (rawCid || '').trim();
        if (!query) { 
          alert('กรุณากรอกเลขประจำตัวประชาชน หรือ Passport'); 
          return; 
        }

        // Clean digits for 13-digit Thai CID search, or keep alphanumeric for Passport
        const cleanDigits = query.replace(/[^0-9]/g, '');
        const isThaiCID = cleanDigits.length === 13;

        this.stopPolling();
        
        // Open the Smart Card modal so the user can see the details and action buttons!
        const modal = document.getElementById('modal-smartcard');
        if (modal) modal.classList.add('active');
        
        // Update readerBox to reflect manual search
        const readerBox = document.getElementById('sc-reader-box');
        if (readerBox) {
          readerBox.innerHTML = 
            '<div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; color: #065f46;">' +
              '<div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem;">' +
                '<i data-lucide="search" style="color: #059669; width: 18px; height: 18px;"></i> ค้นหาด้วย ' + (isThaiCID ? 'เลขบัตรประชาชน' : 'เลข Passport') + ': ' + query +
              '</div>' +
              '<button class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:3px 8px;" onclick="SmartCardModule.startCardPolling()"><i data-lucide="scan"></i> สลับไปอ่านบัตรจริง</button>' +
            '</div>';
          lucide.createIcons();
        }

        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const existing = patients.find(p => {
          if (!p.national_id) return false;
          const pCidClean = p.national_id.replace(/[^0-9]/g, '');
          if (isThaiCID && pCidClean === cleanDigits) return true;
          return p.national_id.trim().toLowerCase() === query.toLowerCase();
        });

        if (existing) {
          this.displayCardResult({
            cid: existing.national_id,
            title: existing.title || '',
            first_name: existing.first_name,
            last_name: existing.last_name,
            sex: existing.sex || 'ไม่ระบุ',
            dob: existing.dob || '',
            age: Utils.calcAge(existing.dob),
            address: existing.address || 'ไม่ระบุที่อยู่',
            existing_patient: existing
          });
        } else {
          this.displayCardResult({
            cid: query,
            title: 'นาย/นาง/น.ส.',
            first_name: 'ผู้ป่วยใหม่',
            last_name: '(รอลงทะเบียน)',
            sex: 'ไม่ระบุ',
            dob: '',
            age: '-',
            address: 'จังหวัดนครสวรรค์',
            existing_patient: null
          });
        }
      },

      displayCardResult(data) {
        if (data.dob && (data.age === undefined || data.age === null || data.age === '-' || data.age === '')) {
          data.age = Utils.calcAge(data.dob);
        }
        this.currentCardData = data;
        const detailsEl = document.getElementById('sc-card-details');
        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        const existing = data.existing_patient || patients.find(p => p.national_id === data.cid || (p.first_name === data.first_name && p.last_name === data.last_name));
        data.existing_patient = existing;

        let statusHtml = '';
        let buttonText = '';
        let newPatientFormHtml = '';

        if (existing) {
          statusHtml = '<div class="badge badge-success" style="font-size: 0.84rem; padding: 4px 10px;"><i data-lucide="check-circle"></i> พบประวัติผู้ป่วยเดิม (HN: ' + existing.hn + ')</div>';
          buttonText = '<i data-lucide="stethoscope"></i> ⚡ ยืนยันเปิด Visit ตรวจทันที (ออก AN)';
        } else {
          statusHtml = '<div class="badge badge-blue" style="font-size: 0.84rem; padding: 4px 10px;"><i data-lucide="user-plus"></i> ผู้ป่วยใหม่ (พร้อมลงทะเบียน HN)</div>';
          buttonText = '<i data-lucide="user-check"></i> ⚡ บันทึกทะเบียนผู้ป่วย & เปิด Visit ตรวจทันที';

          newPatientFormHtml = 
            '<div style="margin-top: 12px; background: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 10px; padding: 14px;">' +
              '<div style="font-weight: 700; font-size: 0.92rem; color: #0f766e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">' +
                '<i data-lucide="clipboard-check" style="width: 18px; height: 18px; color: #0d9488;"></i> ข้อมูลเพิ่มเติมสำหรับผู้ป่วยใหม่ (กรอกเพื่อบันทึกลงทะเบียนครบถ้วนในครั้งเดียว):' +
              '</div>' +
              '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">' +
                '<div class="form-group" style="margin-bottom: 0;">' +
                  '<label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: #134e4a;">📱 เบอร์โทรศัพท์มือถือ:</label>' +
                  '<input type="tel" id="sc-new-phone" class="form-input" placeholder="เช่น 081-234-5678" style="background: white; font-size: 0.85rem;" value="' + (data.phone || '') + '">' +
                '</div>' +
                '<div class="form-group" style="margin-bottom: 0;">' +
                  '<label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: #134e4a;">🏥 สิทธิการรักษา:</label>' +
                  '<select id="sc-new-rights" class="form-select" style="background: white; font-size: 0.85rem;">' +
                    '<option value="UC" selected>UC (บัตรทอง 30 บาท)</option>' +
                    '<option value="ประกันสังคม">ประกันสังคม (SSS)</option>' +
                    '<option value="ข้าราชการ/เบิกตรง">ข้าราชการ / เบิกตรง (OFC)</option>' +
                    '<option value="ชำระเอง">ชำระเงินเอง (Self-Pay)</option>' +
                    '<option value="A-Med">A-Med (สปสช.)</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">' +
                '<div class="form-group" style="margin-bottom: 0;">' +
                  '<label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: #b91c1c;">⚠️ ประวัติแพ้ยา (Allergy):</label>' +
                  '<input type="text" id="sc-new-allergy" class="form-input" placeholder="ระบุชื่อยาที่แพ้ (หรือ ปฏิเสธแพ้ยา)" style="background: white; font-size: 0.85rem;" value="' + (data.drug_allergy || '') + '">' +
                  '<div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-allergy\').value=\'ปฏิเสธการแพ้ยา\'">ปฏิเสธแพ้ยา</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-allergy\').value=\'Penicillin\'">Penicillin</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-allergy\').value=\'Sulfa\'">Sulfa</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-allergy\').value=\'NSAIDs\'">NSAIDs</button>' +
                  '</div>' +
                '</div>' +
                '<div class="form-group" style="margin-bottom: 0;">' +
                  '<label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: #1e3a8a;">🩺 โรคประจำตัว (Chronic):</label>' +
                  '<input type="text" id="sc-new-chronic" class="form-input" placeholder="เช่น HT, DM, DLP (หรือ ไม่มี)" style="background: white; font-size: 0.85rem;" value="' + (data.chronic || '') + '">' +
                  '<div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-chronic\').value=\'ไม่มีโรคประจำตัว\'">ไม่มี</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-chronic\').value=\'HT (ความดันโลหิตสูง)\'">HT</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-chronic\').value=\'DM (เบาหวาน)\'">DM</button>' +
                    '<button type="button" class="badge" style="cursor:pointer; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; font-size:0.7rem; padding: 2px 6px;" onclick="document.getElementById(\'sc-new-chronic\').value=\'DLP (ไขมันในเลือดสูง)\'">DLP</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        }

        detailsEl.style.display = 'block';
        detailsEl.innerHTML = 
          '<div style="background: white; border: 1.5px solid #10b981; border-radius: var(--radius-md); padding: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);">' +
            '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">' +
              '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<div style="width: 38px; height: 38px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #059669; font-weight: 700; font-size: 1.1rem;">' +
                  (data.sex === 'หญิง' ? '👩' : '👨') +
                '</div>' +
                '<div>' +
                  '<div style="font-size: 1.18rem; font-weight: 700; color: #0f766e;">' + (data.title || '') + data.first_name + ' ' + data.last_name + '</div>' +
                  '<div style="font-size: 0.76rem; color: #64748b;">ข้อมูลบัตรประชาชน / Passport พร้อมใช้งาน ⚡</div>' +
                '</div>' +
              '</div>' +
              '<div>' + statusHtml + '</div>' +
            '</div>' +
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.86rem; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">' +
              '<div><strong>เลขบัตร ปชช. / Passport:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">' + data.cid + '</span></div>' +
              '<div><strong>เพศ:</strong> ' + (data.sex || '-') + ' | <strong>อายุ:</strong> <span style="font-weight:700;color:#047857;">' + (data.age !== undefined && data.age !== '-' ? (data.age + ' ปี') : (Utils.calcAge(data.dob) !== '-' ? (Utils.calcAge(data.dob) + ' ปี') : '-')) + '</span></div>' +
              '<div><strong>วันเกิด:</strong> ' + Utils.formatDateShort(data.dob) + '</div>' +
              '<div><strong>สิทธิการรักษา:</strong> <span class="badge badge-emerald" style="font-size: 0.76rem;">UC (บัตรทอง 30 บาท)</span></div>' +
            '</div>' +
            '<div style="font-size: 0.82rem; color: #334155; margin-top: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;"><strong>📍 ที่อยู่ตามบัตร:</strong> ' + (data.address || '-') + '</div>' +
            newPatientFormHtml +
          '</div>';

        const proceedBtn = document.getElementById('sc-btn-proceed');
        proceedBtn.style.display = 'inline-flex';
        proceedBtn.className = 'btn btn-emerald';
        proceedBtn.style.fontWeight = '700';
        proceedBtn.style.fontSize = '0.94rem';
        proceedBtn.style.padding = '8px 18px';
        proceedBtn.innerHTML = buttonText;
        lucide.createIcons();
      },

      proceedWithCard() {
        if (!this.currentCardData) return;
        const data = this.currentCardData;
        const patients = DB.get(STORAGE_KEYS.PATIENTS);
        let patientObj = data.existing_patient;

        if (!patientObj) {
          // Create new HN for new patient
          patientObj = {
            patient_id: 'P_' + Date.now(),
            hn: Utils.generateHN(patients),
            national_id: data.cid,
            title: data.title || '',
            first_name: data.first_name,
            last_name: data.last_name,
            sex: data.sex || 'ชาย',
            dob: data.dob || '',
            phone: '',
            rights: 'UC',
            chronic: '',
            drug_allergy: '',
            address: data.address || ''
          };
          patients.push(patientObj);
          DB.upsertItem(STORAGE_KEYS.PATIENTS, patientObj);
          PatientModule.render();
          DashboardModule.render();
        }

        App.setActivePatient(patientObj);
        this.closeModal();

        // Immediately Open New Visit Modal for today
        App.switchTab('tab-opd');
        VisitModule.openNewVisitModal(patientObj.patient_id);
      }
    };