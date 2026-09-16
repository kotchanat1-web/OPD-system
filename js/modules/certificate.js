/* ==========================================================================
   OPD System - Medical Certificates (3 Standard Formats)
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const PDF_FORMS = { sick: "", driving: "", job: "" };

const CertificateModule = {
      render() {
        this.init();
      },
      init() {
        this.populateSelect();
        
        if (!document.getElementById('cert-rest-start').value) {
          const today = new Date().toISOString().slice(0, 10);
          document.getElementById('cert-rest-start').value = today;
          document.getElementById('cert-rest-end').value = today;
        }
        if (!document.getElementById('cert-doctor-opinion').value) {
          document.getElementById('cert-doctor-opinion').value = 'สุขภาพร่างกายแข็งแรงสมบูรณ์ดี';
        }
        this.handleTypeChange();
      },
      onRestDaysChange() {
        const days = parseInt(document.getElementById('cert-rest-days').value || '1', 10);
        const startVal = document.getElementById('cert-rest-start').value;
        if (startVal && days >= 1) {
          const s = new Date(startVal);
          s.setDate(s.getDate() + (days - 1));
          const yyyy = s.getFullYear();
          const mm = String(s.getMonth() + 1).padStart(2, '0');
          const dd = String(s.getDate()).padStart(2, '0');
          document.getElementById('cert-rest-end').value = yyyy + '-' + mm + '-' + dd;
        }
        this.renderPreview();
      },
      onRestStartChange() {
        const days = parseInt(document.getElementById('cert-rest-days').value || '1', 10);
        const startVal = document.getElementById('cert-rest-start').value;
        if (startVal && days >= 1) {
          const s = new Date(startVal);
          s.setDate(s.getDate() + (days - 1));
          const yyyy = s.getFullYear();
          const mm = String(s.getMonth() + 1).padStart(2, '0');
          const dd = String(s.getDate()).padStart(2, '0');
          document.getElementById('cert-rest-end').value = yyyy + '-' + mm + '-' + dd;
        }
        this.renderPreview();
      },
      onRestEndChange() {
        const startVal = document.getElementById('cert-rest-start').value;
        const endVal = document.getElementById('cert-rest-end').value;
        if (startVal && endVal) {
          const s = new Date(startVal);
          const e = new Date(endVal);
          const diffTime = e.getTime() - s.getTime();
          const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
          if (diffDays >= 1) {
            document.getElementById('cert-rest-days').value = diffDays;
          }
        }
        this.renderPreview();
      },
      populateSelect() {
        const select = document.getElementById('cert-visit-select');
        if (!select) return;

        // Strictly filter only visits with AN >= AN02-01500
        const visits = (DB.get(STORAGE_KEYS.VISITS) || []).filter(v => {
          if (!v || !v.an) return false;
          const m = v.an.match(/(\d+)$/);
          return m && parseInt(m[1], 10) >= 1500;
        });

        let optionsHtml = '';
        if (visits.length === 0) {
          optionsHtml = '<option value="">-- ยังไม่มี Visit ในระบบ (กรุณาส่งตรวจเพื่อรับ AN02-01500) --</option>';
        } else {
          optionsHtml = '<option value="">-- เลือก Visit การตรวจ (AN) --</option>';
          const sortedVisits = [...visits].reverse();
          sortedVisits.forEach(v => {
            const isSel = State.selectedVisit?.visit_id === v.visit_id;
            const dxLabel = v.assessment ? v.assessment.replace(/^[★A-Z0-9.\s]+/, '') : (v.chief_complaint || 'ตรวจรักษา');
            optionsHtml += '<option value="visit:' + v.visit_id + '" ' + (isSel ? 'selected' : '') + '>' + (v.an || 'AN') + ' - ' + (v.patient_name || 'ผู้ป่วย') + ' [HN: ' + (v.hn || '-') + '] (' + dxLabel + ')</option>';
          });
        }

        select.innerHTML = optionsHtml;
      },
      handleTypeChange() {
        const type = document.getElementById('cert-type-select').value;
        const sickOpts = document.getElementById('cert-sick-options');
        const vitalsGrp = document.getElementById('cert-vitals-group');
        const opinionGrp = document.getElementById('cert-opinion-group');

        if (sickOpts) sickOpts.style.display = (type === 'sick') ? 'block' : 'none';
        if (vitalsGrp) vitalsGrp.style.display = (type === 'sick') ? 'none' : 'block';
        if (opinionGrp) opinionGrp.style.display = (type === 'sick') ? 'none' : 'block';

        this.renderPreview();
      },
      onSelectTarget(val) {
        if (!val) return;
        if (val.startsWith('visit:')) {
          const visitId = val.replace('visit:', '');
          const v = (DB.get(STORAGE_KEYS.VISITS) || []).find(x => x.visit_id === visitId);
          if (v) {
            State.selectedVisit = v;
            // auto-fill diagnosis without asterisk or icd code
            const cleanDx = v.assessment ? v.assessment.replace(/^[★\s]*[A-Z0-9.]*\s*/, '') : 'ตรวจร่างกายทั่วไป';
            const dxInput = document.getElementById('cert-dx-input');
            if (dxInput) dxInput.value = cleanDx;

            // auto-fill vitals
            if (v.vitals) {
              if (v.vitals.bp) document.getElementById('cert-vital-bp').value = v.vitals.bp;
              if (v.vitals.pr) document.getElementById('cert-vital-pr').value = v.vitals.pr;
              if (v.vitals.weight) document.getElementById('cert-vital-wt').value = v.vitals.weight;
              if (v.vitals.height) document.getElementById('cert-vital-ht').value = v.vitals.height;
            }
          }
        } else if (val.startsWith('patient:')) {
          const hn = val.replace('patient:', '');
          const p = (DB.get(STORAGE_KEYS.PATIENTS) || []).find(x => x.hn === hn);
          if (p) {
            // Find recent visit for this patient if any
            const v = (DB.get(STORAGE_KEYS.VISITS) || []).find(x => x.hn === hn);
            State.selectedVisit = v || {
              visit_id: 'temp_' + Date.now(),
              hn: p.hn,
              patient_name: (p.title || '') + ' ' + (p.first_name || '') + ' ' + (p.last_name || ''),
              visit_date: new Date().toISOString(),
              assessment: 'ตรวจร่างกายทั่วไป',
              vitals: { bp: '120/80', pr: '76', weight: '65', height: '165' }
            };
            const dxInput = document.getElementById('cert-dx-input');
            if (dxInput) dxInput.value = 'ตรวจร่างกายทั่วไป';
          }
        }
        this.renderPreview();
      },
      renderPreview() {
        const type = document.getElementById('cert-type-select').value;
        const v = State.selectedVisit || (DB.get(STORAGE_KEYS.VISITS)[0] || null);
        const doctorName = AuthModule.getActiveDoctorName() || 'นายแพทย์ กชณัฐ พันธุ์วรรธนะสิน';
        const doctorNameOnly = doctorName.replace(/^นายแพทย์\s*/, '');
        const licenseNo = AuthModule.getActiveDoctorLicense() || '69870';
        
        // Editable values from UI
        const customDx = document.getElementById('cert-dx-input')?.value || (v?.assessment ? v.assessment.replace(/^[★\s]*[A-Z0-9.]*\s*/, '') : 'ตรวจร่างกายทั่วไป');
        const doctorOpinion = document.getElementById('cert-doctor-opinion')?.value || 'สุขภาพร่างกายแข็งแรงสมบูรณ์ดี';
        // Auto pull vitals directly from visit OPD card
        const bp = v?.vitals?.bp || (v?.vitals?.sbp && v?.vitals?.dbp ? (v.vitals.sbp + '/' + v.vitals.dbp) : '120/80');
        const pr = v?.vitals?.pr || v?.vitals?.pulse || '76';
        const wt = v?.vitals?.weight || v?.vitals?.wt || '65';
        const ht = v?.vitals?.height || v?.vitals?.ht || '165';

        let patient = null;
        if (v) {
          patient = DB.get(STORAGE_KEYS.PATIENTS).find(p => p.hn === v.hn);
        }
        if (!patient) {
          const allPatients = DB.get(STORAGE_KEYS.PATIENTS);
          patient = (allPatients && allPatients.length > 0) ? allPatients[0] : {
            title: 'นาย',
            first_name: 'หนุ่ม',
            last_name: 'ดวงแก้ว',
            hn: '02-00001',
            national_id: '3150200119854',
            dob: '1978-04-18',
            address: '83 หมู่ที่ 4 ตำบลแม่เล่ย์ อำเภอแม่วงก์ จังหวัดนครสวรรค์'
          };
        }

        const now = new Date(v?.visit_date || new Date());
        const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const day = now.getDate();
        const month = thaiMonths[now.getMonth()];
        const year = now.getFullYear() + 543;
        const fullDateThai = day + " " + month + " " + year;

        let age = "35";
        if (patient.dob) {
          const a = Utils.calcAge(patient.dob);
          if (a !== '-') age = a;
        }

        const hnCode = patient?.hn || '02-00001';
        const idOrPassport = patient?.national_id || '-';
        const patientTitle = patient.title || 'คุณ';
        const patientName = patient.first_name + ' ' + patient.last_name;
        const patientAddress = patient.address || '-';

        let formHtml = '';

        if (type === 'sick') {
          const days = document.getElementById('cert-rest-days').value || 1;
          const sDate = new Date(document.getElementById('cert-rest-start').value || new Date());
          const eDate = new Date(document.getElementById('cert-rest-end').value || new Date());
          const startThai = sDate.getDate() + " " + thaiMonths[sDate.getMonth()] + " " + (sDate.getFullYear() + 543);
          const endThai = eDate.getDate() + " " + thaiMonths[eDate.getMonth()] + " " + (eDate.getFullYear() + 543);

          formHtml = `
            <div class="cert-a4-page">
              <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 12px;">
                <div class="cert-header-title" style="font-size: 22pt;">ใบรับรองแพทย์</div>
              </div>

              <div style="margin-top: 18px;">
                <div class="cert-row">
                  <span class="cert-label">สถานพยาบาลที่ตรวจ</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.4;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span>
                  <span class="cert-label" style="margin-left: 20px;">วันที่</span>
                  <span class="cert-fill" style="text-align: center; flex: 1;">${fullDateThai}</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">ข้าพเจ้า</span>
                  <span class="cert-fill" style="font-weight: bold;">${doctorName}</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">ได้ตรวจ</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 2;">${patientTitle} ${patientName}</span>
                  <span class="cert-label" style="margin-left: 15px;">อายุ</span>
                  <span class="cert-fill" style="width: 60px; text-align: center; flex: none; font-weight: bold;">${age}</span>
                  <span class="cert-label" style="margin-left: 6px;">ปี</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">เมื่อวันที่</span>
                  <span class="cert-fill" style="text-align: center; flex: 1.2;">${fullDateThai}</span>
                  <span style="flex: 1.8;"></span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">มีความเห็นว่า</span>
                  <span class="cert-fill" style="font-weight: bold;">${customDx}</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">เห็นควรอนุญาตให้</span>
                  <span class="cert-fill" style="font-weight: bold;">พักฟื้น ${days} วัน</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">มีกำหนดตั้งแต่ วันที่</span>
                  <span class="cert-fill" style="text-align: center;">${startThai}</span>
                  <span class="cert-label" style="margin-left: 15px;">ถึง</span>
                  <span class="cert-fill" style="text-align: center;">${endThai}</span>
                </div>

                <div class="cert-row" style="margin-top: 12px;">
                  <span class="cert-label">หมายเหตุ</span>
                  <span class="cert-fill">-</span>
                </div>
              </div>

              <!-- Single clean signature block -->
              <div style="margin-top: 120px; display: flex; justify-content: flex-end;">
                <div style="text-align: center; width: 340px; font-size: 14pt;">
                  <div style="display: flex; align-items: baseline; justify-content: center;">
                    <span>ลงชื่อ</span>
                    <span style="display: inline-block; width: 180px; border-bottom: 1px dotted #000; margin-left: 8px;"></span>
                    <span style="margin-left: 8px;">แพทย์ผู้ตรวจร่างกาย</span>
                  </div>
                  <div style="margin-top: 12px; font-weight: bold;">( ${doctorName} )</div>
                </div>
              </div>
            </div>
          `;

        } else if (type === 'driving') {
          formHtml = `
            <div class="cert-a4-page">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="width: 80px;"></div>
                <div class="cert-header-title" style="flex: 1; font-size: 18pt;">
                  ใบรับรองแพทย์ (สำหรับใบอนุญาตขับรถ)
                </div>
                <div style="width: 90px; text-align: right; font-size: 11pt; line-height: 1.3; font-weight: bold;">
                  <div>HN: <span style="font-weight: normal;">${hnCode}</span></div>
                </div>
              </div>

              <!-- ส่วนที่ 1 -->
              <div style="margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                  <span class="cert-badge">ส่วนที่ 1</span>
                  <span class="cert-section-title">ของผู้ขอรับใบรับรองสุขภาพ</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">ข้าพเจ้า</span>
                  <span class="cert-fill" style="font-weight: bold;">${patientTitle} ${patientName}</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">สถานที่อยู่ (ที่สามารถติดต่อได้)</span>
                  <span class="cert-fill">${patientAddress}</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">หมายเลขบัตรประจำตัวประชาชน</span>
                  <span class="cert-fill" style="letter-spacing: 1px; font-weight: bold;">${idOrPassport}</span>
                </div>

                <div style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  ข้าพเจ้าขอใบรับรองสุขภาพ โดยมีประวัติสุขภาพดังนี้
                </div>

                <!-- Empty Checkboxes without Tick marks -->
                <div style="font-size: 13pt; margin-left: 10px; line-height: 1.4;">
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">1. โรคประจำตัว</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">2. อุบัติเหตุ และ ผ่าตัด</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">3. เคยเข้ารับการรักษาในโรงพยาบาล</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">4. โรคลมชัก *</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">5. ประวัติอื่นที่สำคัญ</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                </div>

                <div style="font-size: 10.5pt; color: #444; margin-left: 10px; margin-top: 1px;">
                  * ในกรณีมีโรคลมชัก ให้แนบประวัติการรักษาจากแพทย์ผู้รักษาว่าท่านปลอดจากอาการชักมากกว่า ๑ ปี เพื่ออนุญาตให้ขับรถได้
                </div>

                <!-- Signature Part 1 with clean alignment -->
                <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
                  <div style="text-align: center; font-size: 13pt; width: 340px;">
                    <div>ลงชื่อ <span style="display: inline-block; width: 150px; border-bottom: 1px dotted #000;"></span> ผู้ขอรับใบรับรองสุขภาพ</div>
                    <div style="margin-top: 4px;">
                      วันที่ <span class="cert-fill-fixed" style="min-width: 28px;">${day}</span> 
                      เดือน <span class="cert-fill-fixed" style="min-width: 65px;">${month}</span> 
                      พ.ศ. <span class="cert-fill-fixed" style="min-width: 40px;">${year}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cert-divider"></div>

              <!-- ส่วนที่ 2 -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="cert-badge">ส่วนที่ 2</span>
                    <span class="cert-section-title">ของแพทย์</span>
                  </div>
                  <div style="font-size: 13pt;">
                    สถานที่ตรวจ <span class="cert-fill-fixed" style="font-weight: bold; width: 185px;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span>
                    วันที่ <span class="cert-fill-fixed" style="min-width: 26px;">${day}</span> 
                    เดือน <span class="cert-fill-fixed" style="min-width: 60px;">${month}</span> 
                    พ.ศ. <span class="cert-fill-fixed" style="min-width: 38px;">${year}</span>
                  </div>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">(1) ข้าพเจ้า นายแพทย์/แพทย์หญิง</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.5;">${doctorNameOnly}</span>
                  <span class="cert-label" style="margin-left: 10px;">ใบอนุญาตประกอบวิชาชีพเวชกรรมเลขที่</span>
                  <span class="cert-fill" style="width: 75px; text-align: center; font-weight: bold; flex: none;">${licenseNo}</span>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">สถานพยาบาลชื่อ</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.2;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span>
                  <span class="cert-label" style="margin-left: 10px;">ที่อยู่</span>
                  <span class="cert-fill" style="flex: 1.8;">ง.69/151 ถ.ดาวดึงส์ ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์</span>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">ได้ตรวจร่างกาย</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.5;">${patientTitle} ${patientName}</span>
                  <span class="cert-label" style="margin-left: 8px;">แล้วเมื่อ</span>
                  <span class="cert-label" style="margin-left: 4px;">วันที่ <span class="cert-fill-fixed" style="min-width: 26px;">${day}</span> เดือน <span class="cert-fill-fixed" style="min-width: 60px;">${month}</span> พ.ศ. <span class="cert-fill-fixed" style="min-width: 38px;">${year}</span></span>
                  <span class="cert-label" style="margin-left: 6px;">มีรายละเอียดดังนี้</span>
                </div>

                <div style="font-size: 13pt; margin-left: 12px; margin-top: 2px;">
                  น้ำหนักตัว <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${wt}</span> กก. 
                  ความสูง <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${ht}</span> เซนติเมตร 
                  ความดันโลหิต <span class="cert-fill-fixed" style="font-weight: bold; width: 75px;">${bp}</span> มม.ปรอท 
                  ชีพจร <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${pr}</span> ครั้ง/นาที
                </div>

                <!-- Empty Checkboxes for Physical condition -->
                <div style="font-size: 13pt; margin-left: 12px; margin-top: 2px;">
                  สภาพร่างกายทั่วไปอยู่ในเกณฑ์ &nbsp;&nbsp;
                  <span><span class="cert-checkbox-box"></span> ปกติ</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <span><span class="cert-checkbox-box"></span> ผิดปกติ (ระบุ) <span style="display: inline-block; width: 200px; border-bottom: 1px dotted #000;"></span></span>
                </div>

                <div style="font-size: 12pt; text-align: justify; margin-top: 3px; line-height: 1.3;">
                  ขอรับรองว่า บุคคลดังกล่าว ไม่เป็นผู้มีร่างกายทุพพลภาพจนไม่สามารถปฏิบัติหน้าที่ได้ ไม่ปรากฏอาการของโรคจิต หรือจิตฟั่นเฟือน หรือปัญญาอ่อน ไม่ปรากฏอาการของการติดยาเสพติดให้โทษ และอาการของโรคพิษสุราเรื้อรัง และไม่ปรากฏอาการและอาการแสดงของโรคต่อไปนี้
                </div>

                <div style="font-size: 12pt; margin-left: 15px; line-height: 1.3; margin-top: 1px;">
                  <div>1. โรคเรื้อนในระยะติดต่อ หรือในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม</div>
                  <div>2. วัณโรคในระยะอันตราย</div>
                  <div>3. โรคเท้าช้างในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม</div>
                  <div>4. อื่น ๆ (ถ้ามี) <span style="display: inline-block; width: 250px; border-bottom: 1px dotted #000;">-</span></div>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">(2) สรุปความเห็นและข้อแนะนำของแพทย์</span>
                  <span class="cert-fill" style="font-weight: bold;">${doctorOpinion}</span>
                </div>

                <!-- Signature Part 2 with clean alignment -->
                <div style="display: flex; justify-content: flex-end; margin-top: 22px;">
                  <div style="text-align: center; font-size: 13pt; width: 340px;">
                    <div>ลงชื่อ <span style="display: inline-block; width: 160px; border-bottom: 1px dotted #000;"></span> แพทย์ผู้ตรวจร่างกาย</div>
                    <div style="margin-top: 8px; font-weight: bold;">( ${doctorName} )</div>
                  </div>
                </div>
              </div>

              <!-- หมายเหตุท้ายแผ่น -->
              <div class="cert-footer-notes">
                <div><b>หมายเหตุ:</b> (1) ต้องเป็นแพทย์ซึ่งได้ขึ้นทะเบียนรับใบอนุญาตประกอบวิชาชีพเวชกรรม</div>
                <div>(2) ให้แสดงว่าเป็นผู้มีร่างกายสมบูรณ์เพียงใด ใบรับรองแพทย์ฉบับนี้ให้ใช้ได้ 1 เดือนนับแต่วันที่ตรวจร่างกาย</div>
                <div>(3) คำรับรองนี้เป็นการตรวจวินิจฉัยเบื้องต้น และใบรับรองแพทย์นี้ ใช้สำหรับใบอนุญาตขับรถและปฏิบัติหน้าที่เป็นผู้ประจำรถ</div>
                <div>แบบฟอร์มนี้ได้รับการรับรองจากมติคณะกรรมการแพทยสภาในการประชุมครั้งที่ 2/2564 วันที่ 4 กุมภาพันธ์ 2564</div>
              </div>
            </div>
          `;

        } else {
          // Job / 5-disease (Header title is simply 'ใบรับรองแพทย์')
          formHtml = `
            <div class="cert-a4-page">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="width: 80px;"></div>
                <div class="cert-header-title" style="flex: 1; font-size: 20pt;">
                  ใบรับรองแพทย์
                </div>
                <div style="width: 90px; text-align: right; font-size: 11pt; line-height: 1.3; font-weight: bold;">
                  <div>HN: <span style="font-weight: normal;">${hnCode}</span></div>
                </div>
              </div>

              <!-- ส่วนที่ 1 -->
              <div style="margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                  <span class="cert-badge">ส่วนที่ 1</span>
                  <span class="cert-section-title">ของผู้ขอรับใบรับรองสุขภาพ</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">ข้าพเจ้า</span>
                  <span class="cert-fill" style="font-weight: bold;">${patientTitle} ${patientName}</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">สถานที่อยู่ (ที่สามารถติดต่อได้)</span>
                  <span class="cert-fill">${patientAddress}</span>
                </div>

                <div class="cert-row" style="font-size: 13.5pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">หมายเลขบัตรประจำตัวประชาชน</span>
                  <span class="cert-fill" style="letter-spacing: 1px; font-weight: bold;">${idOrPassport}</span>
                </div>

                <div style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  ข้าพเจ้าขอใบรับรองสุขภาพ โดยมีประวัติสุขภาพดังนี้
                </div>

                <!-- Empty Checkboxes without Tick marks -->
                <div style="font-size: 13pt; margin-left: 10px; line-height: 1.4;">
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">1. โรคประจำตัว</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">2. อุบัติเหตุ และ ผ่าตัด</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">3. เคยเข้ารับการรักษาในโรงพยาบาล</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <div style="width: 230px;">4. โรคสำคัญอื่นๆ</div>
                    <div style="width: 100px;"><span class="cert-checkbox-box"></span> ไม่มี</div>
                    <div style="flex: 1;"><span class="cert-checkbox-box"></span> มี (ระบุ) <span style="display: inline-block; width: 140px; border-bottom: 1px dotted #000;"></span></div>
                  </div>
                </div>

                <!-- Signature Part 1 with clean alignment -->
                <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                  <div style="text-align: center; font-size: 13pt; width: 340px;">
                    <div>ลงชื่อ <span style="display: inline-block; width: 150px; border-bottom: 1px dotted #000;"></span> ผู้ขอรับใบรับรองสุขภาพ</div>
                    <div style="margin-top: 4px;">
                      วันที่ <span class="cert-fill-fixed" style="min-width: 28px;">${day}</span> 
                      เดือน <span class="cert-fill-fixed" style="min-width: 65px;">${month}</span> 
                      พ.ศ. <span class="cert-fill-fixed" style="min-width: 40px;">${year}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cert-divider"></div>

              <!-- ส่วนที่ 2 -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="cert-badge">ส่วนที่ 2</span>
                    <span class="cert-section-title">ของแพทย์</span>
                  </div>
                  <div style="font-size: 13pt;">
                    สถานที่ตรวจ <span class="cert-fill-fixed" style="font-weight: bold; width: 185px;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span>
                    วันที่ <span class="cert-fill-fixed" style="min-width: 26px;">${day}</span> 
                    เดือน <span class="cert-fill-fixed" style="min-width: 60px;">${month}</span> 
                    พ.ศ. <span class="cert-fill-fixed" style="min-width: 38px;">${year}</span>
                  </div>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">(1) ข้าพเจ้า นายแพทย์/แพทย์หญิง</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.5;">${doctorNameOnly}</span>
                  <span class="cert-label" style="margin-left: 10px;">ใบอนุญาตประกอบวิชาชีพเวชกรรมเลขที่</span>
                  <span class="cert-fill" style="width: 75px; text-align: center; font-weight: bold; flex: none;">${licenseNo}</span>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">สถานพยาบาลชื่อ</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.2;">คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์</span>
                  <span class="cert-label" style="margin-left: 10px;">ที่อยู่</span>
                  <span class="cert-fill" style="flex: 1.8;">ง.69/151 ถ.ดาวดึงส์ ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์</span>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 2px; margin-bottom: 2px;">
                  <span class="cert-label">ได้ตรวจร่างกาย</span>
                  <span class="cert-fill" style="font-weight: bold; flex: 1.5;">${patientTitle} ${patientName}</span>
                  <span class="cert-label" style="margin-left: 8px;">แล้วเมื่อ</span>
                  <span class="cert-label" style="margin-left: 4px;">วันที่ <span class="cert-fill-fixed" style="min-width: 26px;">${day}</span> เดือน <span class="cert-fill-fixed" style="min-width: 60px;">${month}</span> พ.ศ. <span class="cert-fill-fixed" style="min-width: 38px;">${year}</span></span>
                  <span class="cert-label" style="margin-left: 6px;">มีรายละเอียดดังนี้</span>
                </div>

                <div style="font-size: 13pt; margin-left: 12px; margin-top: 2px;">
                  น้ำหนักตัว <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${wt}</span> กก. 
                  ความสูง <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${ht}</span> เซนติเมตร 
                  ความดันโลหิต <span class="cert-fill-fixed" style="font-weight: bold; width: 75px;">${bp}</span> มม.ปรอท 
                  ชีพจร <span class="cert-fill-fixed" style="font-weight: bold; width: 45px;">${pr}</span> ครั้ง/นาที
                </div>

                <!-- Empty Checkboxes for Physical condition -->
                <div style="font-size: 13pt; margin-left: 12px; margin-top: 2px;">
                  สภาพร่างกายทั่วไปอยู่ในเกณฑ์ &nbsp;&nbsp;
                  <span><span class="cert-checkbox-box"></span> ปกติ</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <span><span class="cert-checkbox-box"></span> ผิดปกติ (ระบุ) <span style="display: inline-block; width: 200px; border-bottom: 1px dotted #000;"></span></span>
                </div>

                <div style="font-size: 12pt; text-align: justify; margin-top: 3px; line-height: 1.3;">
                  ขอรับรองว่า บุคคลดังกล่าว ไม่เป็นผู้มีร่างกายทุพพลภาพจนไม่สามารถปฏิบัติหน้าที่ได้ ไม่ปรากฏอาการของโรคจิต หรือจิตฟั่นเฟือน หรือปัญญาอ่อน และไม่ปรากฏอาการและอาการแสดงของโรคต้องห้ามตามกฎ ก.พ. ดังต่อไปนี้
                </div>

                <div style="font-size: 12pt; margin-left: 15px; line-height: 1.3; margin-top: 1px;">
                  <div>1. โรคเรื้อนในระยะติดต่อ หรือในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม</div>
                  <div>2. วัณโรคในระยะอันตราย</div>
                  <div>3. โรคเท้าช้างในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม</div>
                  <div>4. โรคติดยาเสพติดให้โทษ</div>
                  <div>5. โรคพิษสุราเรื้อรัง</div>
                </div>

                <div class="cert-row" style="font-size: 13pt; margin-top: 3px; margin-bottom: 3px;">
                  <span class="cert-label">(2) สรุปความเห็นและข้อแนะนำของแพทย์</span>
                  <span class="cert-fill" style="font-weight: bold;">${doctorOpinion}</span>
                </div>

                <!-- Signature Part 2 with clean alignment -->
                <div style="display: flex; justify-content: flex-end; margin-top: 22px;">
                  <div style="text-align: center; font-size: 13pt; width: 340px;">
                    <div>ลงชื่อ <span style="display: inline-block; width: 160px; border-bottom: 1px dotted #000;"></span> แพทย์ผู้ตรวจร่างกาย</div>
                    <div style="margin-top: 8px; font-weight: bold;">( ${doctorName} )</div>
                  </div>
                </div>
              </div>

              <!-- หมายเหตุท้ายแผ่น -->
              <div class="cert-footer-notes">
                <div><b>หมายเหตุ:</b> (1) ต้องเป็นแพทย์ซึ่งได้ขึ้นทะเบียนรับใบอนุญาตประกอบวิชาชีพเวชกรรม</div>
                <div>(2) ให้แสดงว่าเป็นผู้มีร่างกายสมบูรณ์เพียงใด ใบรับรองแพทย์ฉบับนี้ให้ใช้ได้ 1 เดือนนับแต่วันที่ตรวจร่างกาย</div>
                <div>(3) คำรับรองนี้เป็นการตรวจวินิจฉัยเบื้องต้นตามมาตรฐานการตรวจสุขภาพผู้เข้าทำงาน</div>
              </div>
            </div>
          `;
        }

        const target = document.getElementById('cert-render-target') || document.getElementById('certificate-paper-a4');
        if (target) target.innerHTML = formHtml;
      },
      printCurrentCertificate() {
        const target = document.getElementById('cert-render-target') || document.getElementById('certificate-paper-a4');
        const content = target ? target.innerHTML : '';
        const w = window.open('', '', 'width=850,height=1100');
        w.document.write(`
          <html>
          <head>
            <title>พิมพ์ใบรับรองแพทย์</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                font-family: 'AngsanaUPC', 'Angsana New', 'Sarabun', sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .cert-a4-page {
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding: 14mm 18mm 12mm 18mm !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                overflow: hidden !important;
                line-height: 1.34;
              }
              .cert-header-title { text-align: center; font-weight: bold; color: #000; margin-bottom: 2px; }
              .cert-badge { background: #000; color: #fff !important; font-weight: bold; padding: 1px 7px; font-size: 13pt; border-radius: 2px; display: inline-block; }
              .cert-section-title { font-size: 14pt; font-weight: bold; display: inline-block; vertical-align: middle; }
              .cert-row { display: flex; align-items: baseline; font-size: 14pt; margin-top: 5px; margin-bottom: 5px; width: 100%; }
              .cert-label { white-space: nowrap; flex-shrink: 0; }
              .cert-fill { border-bottom: 1px dotted #000; flex: 1; padding: 0 6px; min-height: 20px; color: #000; }
              .cert-fill-fixed { border-bottom: 1px dotted #000; padding: 0 4px; display: inline-block; text-align: center; }
              .cert-checkbox-box { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.2px solid #000; margin-right: 5px; vertical-align: middle; font-size: 11pt; line-height: 1; font-weight: bold; }
              .cert-divider { border-top: 1px dashed #999; margin: 10px 0; }
              .cert-footer-notes { font-size: 10pt; color: #333; border-top: 1px solid #aaa; padding-top: 4px; margin-top: 8px; line-height: 1.25; }
            </style>
          </head>
          <body>
            <div>${content}</div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            <' + '/script>
          </body>
          </html>
        `);
        w.document.close();
      }
    };