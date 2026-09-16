// รายการหัตถการและบริการทางการแพทย์มาตรฐาน (คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์)
const OPD_DEFAULT_PROCEDURES = [
  {
    "proc_id": "PROC1",
    "name": "ตรวจรักษาโรคทั่วไป OPD",
    "category": "บริการทั่วไป",
    "price": 150,
    "df_price": 150,
    "active": true
  },
  {
    "proc_id": "PROC2",
    "name": "ฉีดยาเข้ากล้ามเนื้อ (IM Injection)",
    "category": "ฉีดยา/น้ำเกลือ",
    "price": 50,
    "df_price": 20,
    "active": true
  },
  {
    "proc_id": "PROC3",
    "name": "ฉีดยาเข้าหลอดเลือดดำ (IV Injection)",
    "category": "ฉีดยา/น้ำเกลือ",
    "price": 100,
    "df_price": 40,
    "active": true
  },
  {
    "proc_id": "PROC4",
    "name": "ให้น้ำเกลือ NSS 100ml IV Drip",
    "category": "ฉีดยา/น้ำเกลือ",
    "price": 250,
    "df_price": 80,
    "active": true
  },
  {
    "proc_id": "PROC5",
    "name": "ล้างแผล / ทำแผลเล็ก",
    "category": "ทำแผล/เย็บแผล",
    "price": 80,
    "df_price": 30,
    "active": true
  },
  {
    "proc_id": "PROC6",
    "name": "ล้างแผล / ทำแผลใหญ่",
    "category": "ทำแผล/เย็บแผล",
    "price": 150,
    "df_price": 60,
    "active": true
  },
  {
    "proc_id": "PROC7",
    "name": "เจาะเลือดตรวจน้ำตาลปลายนิ้ว (DTX)",
    "category": "ตรวจแล็บ/ตรวจพิเศษ",
    "price": 50,
    "df_price": 20,
    "active": true
  },
  {
    "proc_id": "PROC8",
    "name": "พ่นยาขยายหลอดลม (Nebulizer)",
    "category": "บริการทั่วไป",
    "price": 150,
    "df_price": 50,
    "active": true
  },
  {
    "proc_id": "PROC9",
    "name": "เย็บแผล (Suture <= 3 เข็ม)",
    "category": "ทำแผล/เย็บแผล",
    "price": 300,
    "df_price": 100,
    "active": true
  },
  {
    "proc_id": "PROC10",
    "name": "ตัดไหม (Stitch Off)",
    "category": "ทำแผล/เย็บแผล",
    "price": 100,
    "df_price": 40,
    "active": true
  },
  {
    "proc_id": "PROC11",
    "name": "ตรวจปัสสาวะ (Urine Dipstick)",
    "category": "ตรวจแล็บ/ตรวจพิเศษ",
    "price": 100,
    "df_price": 30,
    "active": true
  },
  {
    "proc_id": "PROC12",
    "name": "ตรวจการตั้งครรภ์ (UPT)",
    "category": "ตรวจแล็บ/ตรวจพิเศษ",
    "price": 120,
    "df_price": 30,
    "active": true
  },
  {
    "proc_id": "PROC13",
    "name": "ค่าธรรมเนียมใบรับรองแพทย์",
    "category": "เอกสาร/ใบรับรอง",
    "price": 100,
    "df_price": 50,
    "active": true
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = OPD_DEFAULT_PROCEDURES;
}
