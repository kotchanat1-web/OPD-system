/* ==========================================================================
   OPD System - Core Database & Utilities
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const CLINIC_LOGO = (typeof OPD_CLINIC_LOGO !== "undefined") ? OPD_CLINIC_LOGO : "";
    const ICD10_DATA = (typeof OPD_ICD10_DATA !== "undefined") ? OPD_ICD10_DATA : [];
    const DEFAULT_LABS = (typeof OPD_DEFAULT_LABS !== "undefined") ? OPD_DEFAULT_LABS : [];

    const STORAGE_KEYS = {
      STOCK_TRANSACTIONS: 'opd_nakhonsawan_stock_tx_v1',
      DRUG_PRICE_HISTORY: 'opd_nakhonsawan_drug_price_history_v1',
      USER_PASSWORDS: 'opd_nakhonsawan_user_passwords_v2',
      ADMIN_PIN: 'opd_nakhonsawan_admin_pin_v1',
      PATIENTS: 'opd_nakhonsawan_patients_v5',
      VISITS: 'opd_nakhonsawan_visits_v7',
      DRUGS: 'opd_nakhonsawan_drugs_v7',
      LABS: 'opd_nakhonsawan_labs_v4',
      LAB_SETS: 'opd_nakhonsawan_lab_sets_v1',
      PROCEDURES: 'opd_nakhonsawan_procedures_v4',
      DRUG_GROUPS: 'opd_nakhonsawan_drug_groups_v4',
      APPOINTMENTS: 'opd_nakhonsawan_appointments_v5',
      DOCTORS: 'opd_nakhonsawan_doctors_v4',
      PE_TEMPLATES: 'opd_nakhonsawan_pe_templates_v5',
      USER_ROLE: 'opd_nakhonsawan_user_role_v4',
      AUDIT_LOGS: 'opd_nakhonsawan_audit_logs_v4',
      CLOUD_CONFIG: 'opd_nakhonsawan_cloud_cfg_v4'
    };

    const DEFAULT_LAB_SETS = (typeof OPD_DEFAULT_LAB_SETS !== "undefined") ? OPD_DEFAULT_LAB_SETS : [];
    const DEFAULT_PROCEDURES = (typeof OPD_DEFAULT_PROCEDURES !== "undefined") ? OPD_DEFAULT_PROCEDURES : [];
    const REAL_PATIENTS_DB = (typeof OPD_SEED_PATIENTS !== "undefined") ? OPD_SEED_PATIENTS : [];
    const REAL_VISITS_DB = [];
    const REAL_DRUGS_DB = (typeof OPD_MASTER_DRUGS !== "undefined") ? OPD_MASTER_DRUGS : [];

    const SEED_DATA = {
      patients: REAL_PATIENTS_DB,
      visits: REAL_VISITS_DB,
      drugs: REAL_DRUGS_DB
    };

    const DEFAULT_STAFF = (typeof OPD_DEFAULT_STAFF !== "undefined") ? OPD_DEFAULT_STAFF : [];

    /* IndexedDB Lab Files Storage Manager (Prevents LocalStorage Quota Crashes) */
    const LabStorageDB = {
      dbName: 'OPD_HEALTHCARE_FILES_DB',
      storeName: 'lab_files',
      db: null,
      async init() {
        if (this.db) return this.db;
        return new Promise((resolve) => {
          try {
            if (typeof indexedDB === 'undefined') { resolve(null); return; }
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: 'id' });
              }
            };
            req.onsuccess = (e) => {
              this.db = e.target.result;
              resolve(this.db);
            };
            req.onerror = () => resolve(null);
          } catch (err) {
            resolve(null);
          }
        });
      },
      async saveFile(fileObj) {
        if (!fileObj || !fileObj.id || !fileObj.data) return;
        const db = await this.init();
        if (!db) return;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(fileObj);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) { resolve(false); }
        });
      },
      async saveFilesBatch(files) {
        if (!Array.isArray(files) || files.length === 0) return;
        for (const f of files) {
          if (f && f.id && f.data) await this.saveFile(f);
        }
      },
      async getFile(fileId) {
        if (!fileId) return null;
        const db = await this.init();
        if (!db) return null;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(fileId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch (e) { resolve(null); }
        });
      },
      async deleteFile(fileId) {
        if (!fileId) return;
        const db = await this.init();
        if (!db) return;
        try {
          const tx = db.transaction([this.storeName], 'readwrite');
          tx.objectStore(this.storeName).delete(fileId);
        } catch (e) {}
      }
    };

    /* Smart Image Optimization Helper: Resizes large camera photos to crisp 1600px Max with high legibility */
    function compressImageFile(file, maxDimension = 1600, quality = 0.85) {
      return new Promise((resolve) => {
        if (!file.type || !file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ data: e.target.result, size: file.size, type: file.type || 'application/pdf' });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const approxSize = Math.round((compressedDataUrl.length * 3) / 4);
            resolve({ data: compressedDataUrl, size: approxSize, type: 'image/jpeg' });
          };
          img.onerror = () => resolve({ data: e.target.result, size: file.size, type: file.type });
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    const DB = {
      _cache: {},
      _saveQueue: 0,
      async init() {
        LabStorageDB.init();
        
        // 1. Synchronously pre-load all keys from localStorage into _cache immediately
        const allKeys = Object.values(STORAGE_KEYS);
        for (const k of allKeys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) this._cache[k] = JSON.parse(raw);
          } catch(e) {}
        }

        window.addEventListener('beforeunload', (e) => {
          if (DB._saveQueue > 0) {
            e.preventDefault();
            e.returnValue = 'กำลังบันทึกข้อมูล กรุณารอสักครู่...';
          }
        });

        // 2. Synchronously ensure 196 Master Drugs are in _cache and localStorage immediately
        const currentDrugs = this._cache[STORAGE_KEYS.DRUGS];
        if (!Array.isArray(currentDrugs) || currentDrugs.length < 196 || currentDrugs.some(d => d.drug_id === 'D1' || d.drug_id === 'D5')) {
          ['opd_nakhonsawan_drugs_v1', 'opd_nakhonsawan_drugs_v2', 'opd_nakhonsawan_drugs_v3', 'opd_nakhonsawan_drugs_v4', 'opd_nakhonsawan_drugs_v5', 'opd_nakhonsawan_drugs_v6'].forEach(k => {
            try { localStorage.removeItem(k); } catch(e) {}
            try { if (typeof localforage !== 'undefined') localforage.removeItem(k); } catch(e) {}
          });
          this.set(STORAGE_KEYS.DRUGS, SEED_DATA.drugs);
        }

        // 3. Clean and purge all legacy test/mock visit keys
        ['opd_nakhonsawan_visits_v1', 'opd_nakhonsawan_visits_v2', 'opd_nakhonsawan_visits_v3', 'opd_nakhonsawan_visits_v4', 'opd_nakhonsawan_visits_v5', 'opd_nakhonsawan_visits_v6', 'opd_visits_data'].forEach(k => {
          try { localStorage.removeItem(k); } catch(e) {}
        });

        // 4. Always ensure patients are initialized
        const currentPatients = this.get(STORAGE_KEYS.PATIENTS);
        if (!Array.isArray(currentPatients) || currentPatients.length === 0) {
          this.set(STORAGE_KEYS.PATIENTS, SEED_DATA.patients);
        }

        // 5. Load data from localForage into memory cache to bypass localStorage 5MB limit
        if (typeof localforage !== 'undefined') {
          localforage.config({
            name: 'OPDSystem',
            storeName: 'primary_store'
          });

          for (const k of allKeys) {
            try {
              const val = await localforage.getItem(k);
              if (val !== null) {
                if (k === STORAGE_KEYS.DRUGS && Array.isArray(val) && val.length < 196) {
                  await localforage.setItem(k, SEED_DATA.drugs);
                  this._cache[k] = SEED_DATA.drugs;
                } else {
                  this._cache[k] = val;
                }
              } else if (this._cache[k]) {
                await localforage.setItem(k, this._cache[k]);
              }
            } catch(e) {
              console.warn('Error loading key from localForage', k, e);
            }
          }
        }

        // Strict visit filter: Only keep visits with AN >= AN02-01500, purge all older ANs
        let visits = this.get(STORAGE_KEYS.VISITS) || [];
        visits = visits.filter(v => {
          if (!v || !v.an) return false;
          const m = v.an.match(/(\d+)$/);
          return m && parseInt(m[1], 10) >= 1500;
        });
        this.set(STORAGE_KEYS.VISITS, visits);

        if (!this._cache[STORAGE_KEYS.LABS]) this.set(STORAGE_KEYS.LABS, DEFAULT_LABS);
        if (!this._cache[STORAGE_KEYS.LAB_SETS]) this.set(STORAGE_KEYS.LAB_SETS, DEFAULT_LAB_SETS);
        
        // Init / Migrate Procedures with DF
        if (!this._cache[STORAGE_KEYS.PROCEDURES]) {
          this.set(STORAGE_KEYS.PROCEDURES, DEFAULT_PROCEDURES);
        } else {
          const procs = this.get(STORAGE_KEYS.PROCEDURES);
          let procMigrated = false;
          procs.forEach(p => {
            if (p.df_price === undefined || p.df_price === null) {
              const def = DEFAULT_PROCEDURES.find(dp => dp.name === p.name || dp.proc_id === p.proc_id);
              p.df_price = def ? def.df_price : Math.round(Number(p.price || 0) * 0.35);
              procMigrated = true;
            }
          });
          if (procMigrated) this.set(STORAGE_KEYS.PROCEDURES, procs);
        }

        if (!this._cache[STORAGE_KEYS.DRUG_GROUPS]) this.set(STORAGE_KEYS.DRUG_GROUPS, []);
        if (!this._cache[STORAGE_KEYS.PE_TEMPLATES]) this.set(STORAGE_KEYS.PE_TEMPLATES, [{"template_id":"PE_1","title":"ตรวจปกติทุกระบบ (Normal PE)","category":"ทั่วไป","content":"HEENT: not pale, no jaundice, pharynx not injected. Heart: regular, normal S1S2, no murmur. Lungs: clear, equal breath sounds, no adventitious sounds. Abd: soft, non-tender, normal active bowel sounds. Ext: no edema, good capillary refill."},{"template_id":"PE_2","title":"คออักเสบ / ไข้หวัด (URI / Pharyngitis)","category":"ทางเดินหายใจ","content":"HEENT: mild injected pharynx, tonsils 1+ not enlarged, no exudate, no cervical lymphadenopathy. Heart: regular rhythm, normal S1S2. Lungs: clear to auscultation, no wheezing, no crepitation. Abd: soft, non-tender."},{"template_id":"PE_3","title":"หลอดลมอักเสบ / หอบหืด (Bronchitis / Asthma)","category":"ทางเดินหายใจ","content":"HEENT: mildly injected pharynx. Heart: regular rhythm. Lungs: occasional rhonchi / wheezing both lower lungs, prolonged expiratory phase. Abd: soft, not distended, non-tender."},{"template_id":"PE_4","title":"โรคกระเพาะ / แน่นท้อง (Dyspepsia / Gastritis)","category":"ทางเดินอาหาร","content":"HEENT: normal. Heart & Lungs: clear, normal. Abd: soft, mild tenderness at epigastrium, no guarding, no rebound tenderness, normal active bowel sounds."},{"template_id":"PE_5","title":"อุจจาระร่วงเฉียบพลัน (Acute Diarrhea / AGE)","category":"ทางเดินอาหาร","content":"HEENT: dry lips, tongue not dry. Heart: normal S1S2. Lungs: clear. Abd: soft, generalized mild tenderness, hyperactive bowel sounds, no peritoneal signs. Ext: good skin turgor."},{"template_id":"PE_6","title":"ปวดเมื่อยกล้ามเนื้อ (Myalgia / Back Pain)","category":"กล้ามเนื้อและกระดูก","content":"Musculoskeletal: tenderness over trapezius / lumbar paraspinal muscles, full range of motion, no joint swelling, no erythema, no deformity. Neuro: motor power grade V, sensation intact."},{"template_id":"PE_7","title":"ตรวจสุขภาพทั่วไป (General Health Checkup)","category":"ตรวจสุขภาพ","content":"General: good consciousness, well-oriented, not pale, no jaundice. Heart: regular rhythm, no murmur. Lungs: clear both lung fields. Abd: soft, no hepatosplenomegaly. Ext: no edema."}]);
        
        let currentDocs = this.get(STORAGE_KEYS.DOCTORS);
        if (!Array.isArray(currentDocs) || currentDocs.length === 0) {
          currentDocs = [...DEFAULT_STAFF];
        }
        // Actively remove any legacy staff 'กาญจนา' / 'DOC3'
        currentDocs = currentDocs.filter(d => d && d.doctor_id !== 'DOC3' && !(d.first_name && d.first_name.includes('กาญจนา')));
        const hasDoc1 = currentDocs.some(d => d.doctor_id === 'DOC1' || (d.first_name && d.first_name.includes('กชณัฐ')));
        if (!hasDoc1) {
          currentDocs.unshift(DEFAULT_STAFF[0]);
        }
        this.set(STORAGE_KEYS.DOCTORS, currentDocs, true);
        
        // Auto migrate any existing visits with procedures missing performer or df_price, and standardize doctor/performer names
        visits = this.get(STORAGE_KEYS.VISITS);
        let visitMigrated = false;
        const allProcs = this.get(STORAGE_KEYS.PROCEDURES);
        visits.forEach(v => {
          if (v.doctor && v.doctor.includes('กชณัฐ') && v.doctor !== 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน') {
            v.doctor = 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
            visitMigrated = true;
          }
          if (Array.isArray(v.procedures) && v.procedures.length > 0) {
            v.procedures.forEach(pr => {
              if (!pr.performer_name || pr.performer_name.includes('กชณัฐ')) {
                if (pr.performer_name !== 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน') {
                  pr.performer_name = 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
                  visitMigrated = true;
                }
              }
              if (pr.df_price === undefined || pr.df_price === null) {
                const foundMaster = allProcs.find(x => x.name === pr.name || x.proc_id === pr.proc_id);
                pr.df_price = foundMaster ? (foundMaster.df_price || 0) : Math.round(Number(pr.price || 0) * 0.35);
                visitMigrated = true;
              }
            });
          }
        });
        if (visitMigrated) this.set(STORAGE_KEYS.VISITS, visits);

        // Initialize appointments cleanly with no mock data and purge incomplete ones
        let storedApps = this.get(STORAGE_KEYS.APPOINTMENTS);
        if (Array.isArray(storedApps)) {
          const invalidIds = ['APP_1788751869666', 'APP_1788852384050', 'APP_1788936837185'];
          const cleaned = storedApps.filter(a => {
            if (!a) return false;
            const aid = a.appointment_id || a.app_id;
            if (invalidIds.includes(aid)) return false;
            const d = (a.date || a.appt_date || '').trim();
            return d !== '';
          });
          if (cleaned.length !== storedApps.length) {
            this.set(STORAGE_KEYS.APPOINTMENTS, cleaned, true);
          }
        } else {
          this.set(STORAGE_KEYS.APPOINTMENTS, []);
        }
        ['opd_nakhonsawan_appointments_v1', 'opd_nakhonsawan_appointments_v2', 'opd_nakhonsawan_appointments_v3', 'opd_nakhonsawan_appointments_v4', 'opd_appointments_data'].forEach(k => localStorage.removeItem(k));
        if (!this._cache[STORAGE_KEYS.AUDIT_LOGS]) this.set(STORAGE_KEYS.AUDIT_LOGS, []);
      },
      get(key) {
        if (this._cache[key] !== undefined) {
          // Return a deep copy to prevent accidental mutations by reference
          return JSON.parse(JSON.stringify(this._cache[key]));
        }
        return [];
      },
      set(key, data, skipCloudSync = false) {
        // Update in-memory cache immediately
        this._cache[key] = JSON.parse(JSON.stringify(data));
        
        // Save to localForage asynchronously
        if (typeof localforage !== 'undefined') {
          this._saveQueue++;
          localforage.setItem(key, data)
            .catch(e => console.warn('localforage save error', e))
            .finally(() => { this._saveQueue--; });
        }

        // Save to localStorage as fallback but without throwing QuotaExceededError
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
          if (key === STORAGE_KEYS.VISITS && Array.isArray(data)) {
            try {
              // Strip heavy base64 data from historical items in localStorage
              const sanitized = data.map(v => {
                if (v && Array.isArray(v.lab_attachments) && v.lab_attachments.length > 0) {
                  return {
                    ...v,
                    lab_attachments: v.lab_attachments.map(f => ({
                      id: f.id,
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      uploaded_at: f.uploaded_at
                    }))
                  };
                }
                return v;
              });
              localStorage.setItem(key, JSON.stringify(sanitized));
            } catch (err2) {
              console.warn('LocalStorage save fallback warning:', err2);
            }
          }
        }

        if (!skipCloudSync && typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady()) {
          CloudSyncModule.syncKeyToCloud(key, data);
        }
      },
      upsertItem(storageKey, item, pkField = null) {
        if (!item) return;
        const list = this.get(storageKey) || [];
        const conf = (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.TABLE_MAP) ? CloudSyncModule.TABLE_MAP[storageKey] : null;
        const pk = pkField || (conf ? conf.pk : 'id');
        const idx = list.findIndex(x => x[pk] === item[pk]);
        if (idx >= 0) {
          list[idx] = item;
        } else {
          list.unshift(item);
        }
        this.set(storageKey, list, true);
        if (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady() && conf) {
          CloudSyncModule.upsertRecord(conf.table, item);
        }
      },
      deleteItem(storageKey, pkValue, pkField = null) {
        let list = this.get(storageKey) || [];
        const conf = (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.TABLE_MAP) ? CloudSyncModule.TABLE_MAP[storageKey] : null;
        const pk = pkField || (conf ? conf.pk : 'id');
        list = list.filter(x => x[pk] !== pkValue);
        this.set(storageKey, list, true);
        if (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady() && conf) {
          CloudSyncModule.deleteRecord(conf.table, pk, pkValue);
        }
      }
    };

const Utils = {
      formatDateThai(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        return d.getDate() + " " + months[d.getMonth()] + " " + (d.getFullYear() + 543) + " " + d.toTimeString().slice(0, 5);
      },
      formatDateShort(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.getDate() + "/" + (d.getMonth() + 1) + "/" + (d.getFullYear() + 543);
      },
      bahtText(num) {
        if (!num || isNaN(num) || num === 0) return "ศูนย์บาทถ้วน";
        const thaiNum = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
        const thaiUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
        let [baht, satang] = Number(num).toFixed(2).split(".");
        let res = "";
        function convertGroup(nStr) {
          let str = "";
          const len = nStr.length;
          for (let i = 0; i < len; i++) {
            const digit = parseInt(nStr[i], 10);
            const pos = len - i - 1;
            if (digit !== 0) {
              if (pos === 1 && digit === 1) str += "สิบ";
              else if (pos === 1 && digit === 2) str += "ยี่สิบ";
              else if (pos === 0 && digit === 1 && len > 1 && nStr[i - 1] !== '0') str += "เอ็ด";
              else str += thaiNum[digit] + thaiUnit[pos];
            }
          }
          return str;
        }
        res += convertGroup(baht) + "บาท";
        res += (satang === "00") ? "ถ้วน" : (convertGroup(satang) + "สตางค์");
        return res;
      },
      generateHN(patients) { return "02-" + String(patients.length + 1).padStart(5, '0'); },
      generateAN(visits) {
        const list = (visits || []).filter(v => {
          if (!v || !v.an) return false;
          const m = v.an.match(/(\d+)$/);
          return m && parseInt(m[1], 10) >= 1500;
        });
        let maxNum = 1499;
        for (const v of list) {
          if (v && v.an) {
            const m = v.an.match(/(\d+)$/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            }
          }
        }
        const nextNum = Math.max(maxNum + 1, 1500);
        return "AN02-" + String(nextNum).padStart(5, '0');
      },
      calcAge(dob) {
        if (!dob) return '-';
        const birth = new Date(dob);
        if (isNaN(birth.getTime())) return '-';
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return Math.max(0, age);
      }
    };

    const State = {
      currentTab: 'tab-dashboard',
      selectedPatient: null,
      selectedVisit: null,
      selectedDrugToAdd: null
    };