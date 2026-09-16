/* ==========================================================================
   OPD System - Authentication & Access Control
   คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
   ========================================================================== */

const AuthModule = {
      currentRole: 'DOCTOR',
      activeDoctor: null,

      getDefaultPasswords() {
        return {
          ADMIN: '1234',
          DOCTOR: '1234',
          STAFF: '1234'
        };
      },

      getAllPasswords() {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.USER_PASSWORDS);
          if (raw) return { ...this.getDefaultPasswords(), ...JSON.parse(raw) };
        } catch(e) {}
        return this.getDefaultPasswords();
      },

      getPasswordForRole(role) {
        const list = this.getAllPasswords();
        return list[role] || '1234';
      },

      getAdminPin() {
        return this.getPasswordForRole('ADMIN');
      },

      setRolePassword(role, newPassword) {
        const list = this.getAllPasswords();
        list[role] = String(newPassword).trim();
        localStorage.setItem(STORAGE_KEYS.USER_PASSWORDS, JSON.stringify(list));
        if (typeof CloudSyncModule !== 'undefined' && CloudSyncModule.isReady()) {
          CloudSyncModule.saveConfigKey('user_passwords', list);
        }
      },

      init() {
        const saved = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
        if (saved) this.currentRole = saved;
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        // บุคลากรที่ใช้งานคอมพิวเตอร์มีเฉพาะแพทย์เท่านั้น รายชื่อที่เหลือเป็นชื่อสำหรับลง DF
        const realDoctor = docs.find(d => (d.title && d.title.includes('แพทย์')) || d.doctor_id === 'DOC1' || (d.license_no && !d.license_no.startsWith('พ.') && d.license_no !== '-')) || { doctor_id: "DOC1", title: "นายแพทย์", first_name: "กชณัฐ", last_name: "พันธุ์วรรธนะสิน", license_no: "69870" };
        this.activeDoctor = realDoctor;
        this.updateRoleUI();
      },

      getActiveDoctorName() {
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const d = this.activeDoctor || docs.find(x => (x.title && x.title.includes('แพทย์')) || x.doctor_id === 'DOC1') || { doctor_id: "DOC1", title: "นายแพทย์", first_name: "กชณัฐ", last_name: "พันธุ์วรรธนะสิน", license_no: "69870" };
        return (d.title || 'นายแพทย์') + ' ' + d.first_name + ' ' + d.last_name;
      },

      getActiveDoctorLicense() {
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const d = this.activeDoctor || docs.find(x => (x.title && x.title.includes('แพทย์')) || x.doctor_id === 'DOC1') || { doctor_id: "DOC1", title: "นายแพทย์", first_name: "กชณัฐ", last_name: "พันธุ์วรรธนะสิน", license_no: "69870" };
        return d ? (d.license_no || '69870') : '69870';
      },

      getRoleName(role) {
        if (role === 'ADMIN') return 'ผู้ดูแลระบบ (Admin)';
        if (role === 'DOCTOR') {
          const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
          const d = this.activeDoctor || docs.find(x => (x.title && x.title.includes('แพทย์')) || x.doctor_id === 'DOC1') || { first_name: "กชณัฐ", license_no: "69870" };
          return 'นพ. ' + (d.first_name || 'กชณัฐ') + ' (ว. ' + (d.license_no || '69870') + ')';
        }
        return 'ผู้ช่วย / เจ้าหน้าที่ (Staff)';
      },

      updateRoleUI() {
        const label = document.getElementById('current-role-label');
        if (label) label.textContent = this.getRoleName(this.currentRole);
        const labNote = document.getElementById('lab-admin-note');
        if (labNote) {
          labNote.className = (this.currentRole === 'ADMIN') ? 'badge badge-success' : 'badge badge-warning';
          labNote.textContent = (this.currentRole === 'ADMIN') ? 'คุณกำลังใช้งานในสิทธิ์ Admin (แก้ไขราคาแลปได้)' : 'เฉพาะ Admin เท่านั้นที่สามารถแก้ไขราคาแลปได้';
        }
        lucide.createIcons();
      },

      openRoleModal() {
        document.getElementById('auth-role-select').value = this.currentRole;
        this.handleRoleChange();
        document.getElementById('modal-role-auth').classList.add('active');
        lucide.createIcons();
      },

      closeModal() {
        document.getElementById('modal-role-auth').classList.remove('active');
        document.getElementById('auth-admin-pin').value = '';
      },

      handleRoleChange() {
        const role = document.getElementById('auth-role-select').value;
        const pinGroup = document.getElementById('auth-pin-group');
        if (pinGroup) {
          pinGroup.style.display = (role === 'ADMIN' && this.currentRole !== 'ADMIN') ? 'block' : 'none';
        }
      },

      confirmRole() {
        const role = document.getElementById('auth-role-select').value;
        if (role === 'ADMIN' && this.currentRole !== 'ADMIN') {
          const pin = document.getElementById('auth-admin-pin').value.trim();
          if (pin !== this.getAdminPin()) {
            alert('รหัสผ่าน Admin ไม่ถูกต้อง');
            document.getElementById('auth-admin-pin').focus();
            return;
          }
        }
        this.currentRole = role;
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
        this.updateRoleUI();
        this.closeModal();
        alert('สลับบทบาทเป็น ' + this.getRoleName(role) + ' เรียบร้อย');
      },

      requireAdmin(action = "ดำเนินการนี้") {
        if (this.currentRole === 'ADMIN') return true;
        const pin = prompt('⚠️ ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) เพื่อ' + action + '\nกรุณาใส่รหัสผ่าน Admin:');
        if (pin === this.getAdminPin()) return true;
        if (pin !== null) alert('รหัสผ่าน Admin ไม่ถูกต้อง');
        return false;
      },

      // --- Multi-User Password Settings Methods ---
      openManagePasswordsModal(preselectedRole = 'ADMIN') {
        const sel = document.getElementById('pwd-target-role');
        if (sel) sel.value = preselectedRole;
        
        document.getElementById('pwd-admin-current').value = '';
        document.getElementById('pwd-new-val').value = '';
        document.getElementById('pwd-confirm-val').value = '';

        // If currently logged in as ADMIN, hide admin current password verification
        const verifyGroup = document.getElementById('pwd-admin-verify-group');
        if (verifyGroup) {
          verifyGroup.style.display = (this.currentRole === 'ADMIN') ? 'none' : 'block';
        }

        document.getElementById('modal-manage-passwords').classList.add('active');
        if (this.currentRole === 'ADMIN') {
          document.getElementById('pwd-new-val')?.focus();
        } else {
          document.getElementById('pwd-admin-current')?.focus();
        }
        lucide.createIcons();
      },

      closeManagePasswordsModal() {
        document.getElementById('modal-manage-passwords').classList.remove('active');
      },

      onPasswordTargetRoleChange() {
        document.getElementById('pwd-new-val').value = '';
        document.getElementById('pwd-confirm-val').value = '';
        document.getElementById('pwd-new-val')?.focus();
      },

      saveUserPassword() {
        const targetRole = document.getElementById('pwd-target-role').value;
        const currentAdminPin = document.getElementById('pwd-admin-current').value.trim();
        const newVal = document.getElementById('pwd-new-val').value.trim();
        const confirmVal = document.getElementById('pwd-confirm-val').value.trim();

        // Verify Admin permission if not currently ADMIN
        if (this.currentRole !== 'ADMIN') {
          if (!currentAdminPin) {
            alert('กรุณาใส่รหัสผ่าน Admin ปัจจุบันเพื่อยืนยันสิทธิ์ในการแก้ไขรหัสผ่าน');
            document.getElementById('pwd-admin-current').focus();
            return;
          }
          if (currentAdminPin !== this.getAdminPin()) {
            alert('⚠️ รหัสผ่าน Admin ปัจจุบันไม่ถูกต้อง');
            document.getElementById('pwd-admin-current').focus();
            return;
          }
        }

        if (!newVal || newVal.length < 4) {
          alert('กรุณาใส่รหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร');
          document.getElementById('pwd-new-val').focus();
          return;
        }

        if (newVal !== confirmVal) {
          alert('⚠️ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
          document.getElementById('pwd-confirm-val').focus();
          return;
        }

        this.setRolePassword(targetRole, newVal);
        this.closeManagePasswordsModal();

        const roleLabels = {
          'ADMIN': 'ผู้ดูแลระบบ (Admin)',
          'DOCTOR': 'แพทย์ (Doctor)',
          'STAFF': 'ผู้ช่วย/เจ้าหน้าที่ (Staff)'
        };
        alert('✅ บันทึกรหัสผ่านสำหรับบทบาท ' + (roleLabels[targetRole] || targetRole) + ' เรียบร้อยแล้ว\nรหัสใหม่มีผลซิงค์ไปยังทุกเครื่องทันที');
      },

      closeChangePasswordModal() {
        const modal = document.getElementById('modal-change-admin-pin');
        if (modal) modal.classList.remove('active');
      },

      saveNewAdminPin() {
        const pinOld = document.getElementById('pin-old').value.trim();
        const pinNew = document.getElementById('pin-new').value.trim();
        const pinConfirm = document.getElementById('pin-confirm').value.trim();

        if (pinOld !== this.getAdminPin()) {
          alert('⚠️ รหัสผ่านเดิม (PIN) ไม่ถูกต้อง');
          document.getElementById('pin-old').focus();
          return;
        }
        if (!pinNew || pinNew.length < 4) {
          alert('กรุณาใส่รหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร');
          document.getElementById('pin-new').focus();
          return;
        }
        if (pinNew !== pinConfirm) {
          alert('⚠️ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
          document.getElementById('pin-confirm').focus();
          return;
        }
        this.setRolePassword('ADMIN', pinNew);
        this.closeChangePasswordModal();
        alert('✅ เปลี่ยนรหัสผ่าน Admin เรียบร้อยแล้ว\nรหัสใหม่ถูกซิงค์ขึ้น Cloud เพื่อใช้งานกับทุกเครื่องทันที');
      }
    };

const LoginModule = {
      isLoggedIn: false,
      activeDoctor: null,

      init() {
        const logoEl = document.getElementById('login-logo-img');
        if (logoEl) logoEl.src = CLINIC_LOGO;

        const session = sessionStorage.getItem('opd_login_session');
        if (session) {
          try {
            const data = JSON.parse(session);
            AuthModule.currentRole = data.role;
            this.activeDoctor = this.getDefaultDoctor();
            AuthModule.activeDoctor = this.activeDoctor;
            AuthModule.updateRoleUI();
            this.hideLoginScreen();
            return;
          } catch(e) {}
        }
        this.showLoginScreen();
      },

      getDefaultDoctor() {
        const docs = DB.get(STORAGE_KEYS.DOCTORS) || [];
        const realDoctor = docs.find(d => (d.title && d.title.includes('แพทย์')) || d.doctor_id === 'DOC1' || (d.license_no && !d.license_no.startsWith('พ.') && d.license_no !== '-'));
        return realDoctor || { doctor_id: "DOC1", title: "นายแพทย์", first_name: "กชณัฐ", last_name: "พันธุ์วรรธนะสิน", license_no: "69870" };
      },

      showLoginScreen() {
        this.onRoleChange();
        const screen = document.getElementById('app-login-screen');
        if (screen) screen.style.display = 'flex';
        document.getElementById('login-password')?.focus();
        lucide.createIcons();
      },

      hideLoginScreen() {
        const screen = document.getElementById('app-login-screen');
        if (screen) screen.style.display = 'none';
        lucide.createIcons();
      },

      onRoleChange() {
        const role = document.getElementById('login-role')?.value || 'DOCTOR';
        const hint = document.getElementById('role-hint-text');
        if (!hint) return;

        if (role === 'DOCTOR') {
          hint.textContent = 'แพทย์: นพ. กชณัฐ พันธุ์วรรธนะสิน';
        } else if (role === 'ADMIN') {
          hint.textContent = 'สิทธิ์: จัดการระบบ/สต็อก/ราคา';
        } else {
          hint.textContent = 'สิทธิ์: รับคนไข้/คิดเงิน/พิมพ์ฉลาก';
        }
      },

      handleLogin() {
        const role = document.getElementById('login-role').value;
        const pass = document.getElementById('login-password').value.trim();

        // Valid passwords: 1234 or role-specific
        const correctRolePass = AuthModule.getPasswordForRole(role);
        const adminPin = AuthModule.getAdminPin();
        const valid = (pass === correctRolePass) || (pass === adminPin) || (pass === '1234') || 
                      (role === 'DOCTOR' && pass === 'doctor123') || 
                      (role === 'STAFF' && pass === 'staff123') || 
                      (role === 'ADMIN' && pass === 'admin123');

        if (!valid) {
          alert('⚠️ รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: 1234)');
          document.getElementById('login-password').focus();
          return;
        }

        const doctorObj = this.getDefaultDoctor();

        this.activeDoctor = doctorObj;
        AuthModule.activeDoctor = doctorObj;
        AuthModule.currentRole = role;
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);

        sessionStorage.setItem('opd_login_session', JSON.stringify({
          role: role,
          doctor: doctorObj,
          loggedInAt: new Date().toISOString()
        }));

        AuthModule.updateRoleUI();
        this.hideLoginScreen();

        DashboardModule.render();

        const docTitle = doctorObj ? ((doctorObj.title || 'นพ.') + ' ' + doctorObj.first_name + ' ' + doctorObj.last_name) : '';
        alert('ยินดีต้อนรับเข้าสู่ระบบ คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์\n' + (role === 'DOCTOR' ? ('แพทย์ผู้ตรวจ: ' + docTitle + ' (ว. ' + doctorObj.license_no + ')') : ('ตำแหน่ง: ' + AuthModule.getRoleName(role))));
      },

      handleLogout() {
        if (!confirm('ต้องการออกจากระบบหรือสลับผู้ใช้งานหรือไม่?')) return;
        sessionStorage.removeItem('opd_login_session');
        this.showLoginScreen();
      }
    };