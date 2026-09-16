// รายการรหัสการวินิจฉัยโรคมาตรฐาน ICD-10 (คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์)
const OPD_ICD10_DATA = [
  {
    "code": "J00",
    "name_en": "Acute nasopharyngitis [common cold]",
    "name_th": "ไข้หวัดธรรมดา (Common Cold)"
  },
  {
    "code": "J02.9",
    "name_en": "Acute pharyngitis, unspecified",
    "name_th": "คออักเสบเฉียบพลัน (Acute Pharyngitis)"
  },
  {
    "code": "J03.9",
    "name_en": "Acute tonsillitis, unspecified",
    "name_th": "ต่อมทอนซิลอักเสบ (Acute Tonsillitis)"
  },
  {
    "code": "J06.9",
    "name_en": "Acute upper respiratory infection, unspecified",
    "name_th": "ติดเชื้อทางเดินหายใจส่วนบน (URI)"
  },
  {
    "code": "J20.9",
    "name_en": "Acute bronchitis, unspecified",
    "name_th": "หลอดลมอักเสบเฉียบพลัน (Acute Bronchitis)"
  },
  {
    "code": "J30.4",
    "name_en": "Allergic rhinitis, unspecified",
    "name_th": "ภูมิแพ้อากาศ (Allergic Rhinitis)"
  },
  {
    "code": "J45.9",
    "name_en": "Asthma, unspecified",
    "name_th": "โรคหอบหืด (Asthma)"
  },
  {
    "code": "I10",
    "name_en": "Essential (primary) hypertension",
    "name_th": "โรคความดันโลหิตสูง (Hypertension)"
  },
  {
    "code": "E11.9",
    "name_en": "Type 2 diabetes mellitus without complications",
    "name_th": "โรคเบาหวานชนิดที่ 2 (Type 2 DM)"
  },
  {
    "code": "E78.5",
    "name_en": "Hyperlipidaemia, unspecified",
    "name_th": "ไขมันในเลือดสูง (Dyslipidemia)"
  },
  {
    "code": "K29.7",
    "name_en": "Gastritis, unspecified",
    "name_th": "โรคกระเพาะอาหารอักเสบ (Gastritis)"
  },
  {
    "code": "K21.9",
    "name_en": "Gastro-oesophageal reflux disease without oesophagitis",
    "name_th": "โรคกรดไหลย้อน (GERD)"
  },
  {
    "code": "K30",
    "name_en": "Functional dyspepsia",
    "name_th": "อาหารไม่ย่อย ท้องอืด (Dyspepsia)"
  },
  {
    "code": "A09",
    "name_en": "Infectious gastroenteritis and colitis, unspecified",
    "name_th": "อุจจาระร่วงเฉียบพลัน (Acute Diarrhea / AGE)"
  },
  {
    "code": "M79.1",
    "name_en": "Myalgia",
    "name_th": "ปวดกล้ามเนื้อ (Myalgia)"
  },
  {
    "code": "M54.5",
    "name_en": "Low back pain",
    "name_th": "ปวดหลังส่วนล่าง (Low Back Pain)"
  },
  {
    "code": "M25.5",
    "name_en": "Pain in joint",
    "name_th": "ปวดข้อ (Arthralgia)"
  },
  {
    "code": "N39.0",
    "name_en": "Urinary tract infection, site not specified",
    "name_th": "กระเพาะปัสสาวะอักเสบ / ติดเชื้อทางเดินปัสสาวะ (UTI)"
  },
  {
    "code": "L30.9",
    "name_en": "Dermatitis, unspecified",
    "name_th": "ผิวหนังอักเสบ (Dermatitis / Eczema)"
  },
  {
    "code": "L50.9",
    "name_en": "Urticaria, unspecified",
    "name_th": "ลมพิษ (Urticaria)"
  },
  {
    "code": "L03.9",
    "name_en": "Cellulitis, unspecified",
    "name_th": "เนื้อเยื่อใต้ผิวหนังอักเสบ (Cellulitis)"
  },
  {
    "code": "L02.9",
    "name_en": "Cutaneous abscess, furuncle and carbuncle, unspecified",
    "name_th": "ฝี / ฝีหนองที่ผิวหนัง (Abscess)"
  },
  {
    "code": "R50.9",
    "name_en": "Fever, unspecified",
    "name_th": "ไข้ไม่ทราบสาเหตุ (Fever)"
  },
  {
    "code": "R51",
    "name_en": "Headache",
    "name_th": "ปวดศีรษะ (Headache)"
  },
  {
    "code": "G43.9",
    "name_en": "Migraine, unspecified",
    "name_th": "ปวดศีรษะไมเกรน (Migraine)"
  },
  {
    "code": "R42",
    "name_en": "Dizziness and giddiness",
    "name_th": "เวียนศีรษะ / บ้านหมุน (Dizziness / Vertigo)"
  },
  {
    "code": "H10.9",
    "name_en": "Conjunctivitis, unspecified",
    "name_th": "ตาแดง / เยื่อบุตาอักเสบ (Conjunctivitis)"
  },
  {
    "code": "H66.9",
    "name_en": "Otitis media, unspecified",
    "name_th": "หูชั้นกลางอักเสบ (Otitis Media)"
  },
  {
    "code": "H60.9",
    "name_en": "Otitis externa, unspecified",
    "name_th": "หูชั้นนอกอักเสบ (Otitis Externa)"
  },
  {
    "code": "K12.0",
    "name_en": "Recurrent aphthous stomatitis",
    "name_th": "แผลร้อนในในปาก (Aphthous Ulcer)"
  },
  {
    "code": "T14.0",
    "name_en": "Superficial injury of unspecified body region",
    "name_th": "แผลถลอก / บาดเจ็บภายนอก (Abrasion Wound)"
  },
  {
    "code": "T14.1",
    "name_en": "Open wound of unspecified body region",
    "name_th": "แผลเปิด / แผลฉีกขาด (Laceration Wound)"
  },
  {
    "code": "S60.0",
    "name_en": "Contusion of finger or body part",
    "name_th": "ฟกช้ำ (Contusion)"
  },
  {
    "code": "Z00.0",
    "name_en": "General medical examination",
    "name_th": "ตรวจสุขภาพทั่วไป (General Health Checkup)"
  },
  {
    "code": "Z02.7",
    "name_en": "Issue of medical certificate",
    "name_th": "ขอใบรับรองแพทย์ทั่วไป (Medical Certificate)"
  },
  {
    "code": "Z02.8",
    "name_en": "Examination for driver's licence",
    "name_th": "ตรวจสุขภาพขอใบขับขี่ (Driver's License Checkup)"
  },
  {
    "code": "Z02.1",
    "name_en": "Pre-employment examination",
    "name_th": "ตรวจสุขภาพก่อนเข้าทำงาน (Pre-employment Exam)"
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = OPD_ICD10_DATA;
}
